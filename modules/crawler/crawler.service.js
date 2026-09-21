import { chromium } from 'playwright';
import { EmbeddingModel, FlagEmbedding } from 'fastembed';
import { v4 as uuidv4 } from 'uuid';
import { Hospital } from '../hospital/hospital.model.js';
import { ensureCollection, upsertPoints } from './qdrant.client.js';
import kafkaProducer from '../../kafka/producer/kafka.producer.js';
import { KAFKA_TOPICS } from '../../kafka/topics/kafka.topics.js';

const VECTOR_SIZE = 384;
const MAX_PAGES = 50;
const MAX_DEPTH = 3;
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const EMBED_BATCH_SIZE = 32;

let embeddingModel = null;

const getEmbeddingModel = async () => {
    if (!embeddingModel) {
        embeddingModel = await FlagEmbedding.init({
            model: EmbeddingModel.BGESmallENV15,
            cacheDir: '/root/.cache/fastembed',
        });
    }
    return embeddingModel;
};

const scrapeWebsite = async (startUrl) => {
    const origin = new URL(startUrl).origin;
    const visited = new Set();
    const queue = [{ url: startUrl, depth: 0 }];
    const pages = [];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'SeizeAI-Crawler/1.0 (healthcare chatbot indexer)',
    });

    try {
        while (queue.length > 0 && pages.length < MAX_PAGES) {
            const { url, depth } = queue.shift();

            const cleanUrl = url.split('#')[0].split('?')[0];
            if (visited.has(cleanUrl)) continue;
            visited.add(cleanUrl);

            let pageText = '';
            let links = [];

            try {
                const page = await context.newPage();

                await page.route('**/*', (route) => {
                    const type = route.request().resourceType();
                    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                        route.abort();
                    } else {
                        route.continue();
                    }
                });

                await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });

                pageText = await page.evaluate(() => {
                    document.querySelectorAll('nav, footer, script, style, noscript, iframe, [aria-hidden="true"]').forEach((el) => el.remove());
                    return document.body?.innerText?.trim() || '';
                });

                if (depth < MAX_DEPTH) {
                    links = await page.evaluate((origin) => {
                        return Array.from(document.querySelectorAll('a[href]'))
                            .map((a) => a.href)
                            .filter((href) => href.startsWith(origin));
                    }, origin);
                }

                await page.close();
            } catch (err) {
                console.warn(`[Crawler] Failed to scrape ${cleanUrl}: ${err.message}`);
                continue;
            }

            if (pageText.length > 50) {
                pages.push({ url: cleanUrl, text: pageText });
                console.log(`[Crawler] Scraped (${pages.length}/${MAX_PAGES}): ${cleanUrl}`);
            }

            for (const link of links) {
                const cleanLink = link.split('#')[0].split('?')[0];
                if (!visited.has(cleanLink)) {
                    queue.push({ url: cleanLink, depth: depth + 1 });
                }
            }
        }
    } finally {
        await browser.close();
    }

    console.log(`[Crawler] Finished scraping. Total pages: ${pages.length}`);
    return pages;
};

const chunkText = (text, url) => {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks = [];
    let i = 0;

    while (i < words.length) {
        chunks.push({
            text: words.slice(i, i + CHUNK_SIZE).join(' '),
            sourceUrl: url,
        });
        i += CHUNK_SIZE - CHUNK_OVERLAP;
    }

    return chunks;
};

const generateEmbeddings = async (chunks) => {
    const model = await getEmbeddingModel();
    const texts = chunks.map((c) => c.text);
    const results = [];
    let idx = 0;

    for await (const batch of model.embed(texts, EMBED_BATCH_SIZE)) {
        for (const vector of batch) {
            results.push({
                ...chunks[idx],
                embedding: Array.from(vector),
            });
            idx++;
        }
    }

    console.log(`[Embeddings] Generated ${results.length} embedding(s).`);
    return results;
};

const storeInQdrant = async (publicKey, hospitalId, hospitalName, embeddedChunks) => {
    await ensureCollection(publicKey, VECTOR_SIZE);

    const points = embeddedChunks.map((chunk) => ({
        id: uuidv4(),
        vector: chunk.embedding,
        payload: {
            text: chunk.text,
            sourceUrl: chunk.sourceUrl,
            hospitalId: hospitalId.toString(),
            hospitalName,
        },
    }));

    const UPSERT_BATCH = 100;
    for (let i = 0; i < points.length; i += UPSERT_BATCH) {
        await upsertPoints(publicKey, points.slice(i, i + UPSERT_BATCH));
    }

    console.log(`[Qdrant] Stored ${points.length} vector(s) for hospital "${hospitalName}" (collection: ${publicKey}).`);
    return points.length;
};

class CrawlerService {
    async process(payload) {
        const { hospitalId, websiteUrl, publicKey, hospitalName } = payload;

        console.log(`\n[CrawlerService] ▶ Starting pipeline for hospital "${hospitalName}" (${websiteUrl})`);

        try {
            const scrapedPages = await scrapeWebsite(websiteUrl);

            if (!scrapedPages.length) {
                throw new Error(`No content scraped from ${websiteUrl}. Check if the URL is accessible.`);
            }

            const allChunks = scrapedPages.flatMap(({ url, text }) => chunkText(text, url));
            console.log(`[CrawlerService] Total chunks: ${allChunks.length}`);

            const embeddedChunks = await generateEmbeddings(allChunks);

            const vectorCount = await storeInQdrant(publicKey, hospitalId, hospitalName, embeddedChunks);

            await Hospital.findByIdAndUpdate(hospitalId, {
                $set: {
                    'onboarding.step': 'knowledge_ready',
                    'onboarding.completedAt': new Date(),
                    status: 'active',
                },
            });

            console.log(`[CrawlerService] Pipeline complete for "${hospitalName}". Vectors: ${vectorCount}`);

            await kafkaProducer.publish(KAFKA_TOPICS.CHATBOT_ACTIVATED, {
                hospitalId,
                publicKey,
                hospitalName,
                vectorCount,
                completedAt: new Date().toISOString(),
            });

        } catch (error) {
            console.error(`[CrawlerService] Pipeline failed for hospital "${hospitalName}":`, error.message);

            await Hospital.findByIdAndUpdate(hospitalId, {
                $set: { 'onboarding.step': 'crawler_failed' },
            }).catch(() => { });
        }
    }
}

export default new CrawlerService();
