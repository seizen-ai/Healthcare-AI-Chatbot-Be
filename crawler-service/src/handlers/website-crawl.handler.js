import { chromium } from 'playwright';
import { isUrlSafe } from '../lib/ssrf-guard.js';
import { chunkText } from '../lib/chunker.js';
import { generateEmbeddings, VECTOR_SIZE } from '../lib/embeddings.js';
import {
    ensureCollection,
    deletePointsByHospital,
    upsertEmbeddedChunks,
} from '../../../shared/qdrant/qdrant.client.js';

const MAX_PAGES = 50;
const MAX_DEPTH = 3;
const PAGE_TIMEOUT_MS = 60_000;

export const handleWebsiteCrawl = async (event) => {
    const { hospitalId, websiteUrl } = event;

    console.log(`[WebsiteCrawl] Starting for hospital ${hospitalId}: ${websiteUrl}`);

    const origin = new URL(websiteUrl).origin;
    const visited = new Set();
    const queue = [{ url: websiteUrl, depth: 0 }];
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

            if (!isUrlSafe(cleanUrl)) {
                console.warn(`[WebsiteCrawl] Blocked unsafe URL: ${cleanUrl}`);
                continue;
            }

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

                await page.goto(cleanUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: PAGE_TIMEOUT_MS,
                });

                pageText = await page.evaluate(() => {
                    document
                        .querySelectorAll('nav, footer, script, style, noscript, iframe, [aria-hidden="true"]')
                        .forEach((el) => el.remove());
                    return document.body?.innerText?.trim() || '';
                });

                if (depth < MAX_DEPTH) {
                    links = await page.evaluate((orig) => {
                        return Array.from(document.querySelectorAll('a[href]'))
                            .map((a) => a.href)
                            .filter((href) => href.startsWith(orig));
                    }, origin);
                }

                await page.close();
            } catch (err) {
                console.warn(`[WebsiteCrawl] Failed to scrape ${cleanUrl}: ${err.message}`);
                continue;
            }

            if (pageText.length > 50) {
                pages.push({ url: cleanUrl, text: pageText });
                console.log(`[WebsiteCrawl] Scraped (${pages.length}/${MAX_PAGES}): ${cleanUrl}`);
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

    if (!pages.length) {
        throw new Error(`No content scraped from ${websiteUrl}. Check if the URL is accessible.`);
    }

    console.log(`[WebsiteCrawl] Scraped ${pages.length} page(s).`);

    const allChunks = pages.flatMap(({ url, text }) => chunkText(text, url));
    console.log(`[WebsiteCrawl] ${allChunks.length} chunk(s) created.`);

    const embeddedChunks = await generateEmbeddings(allChunks);

    await ensureCollection(VECTOR_SIZE);
    await deletePointsByHospital(hospitalId);
    const vectorCount = await upsertEmbeddedChunks(hospitalId, embeddedChunks);

    console.log(`[WebsiteCrawl] Done. ${vectorCount} vector(s) stored.`);

    return { pagesOrFiles: pages.length, chunks: allChunks.length };
};
