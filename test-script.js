import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import crypto from 'crypto';

const API_URL = 'http://localhost:5000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYjEzMjg5NjI1MzIxYmFiMjQyMmUxZSIsInJvbGUiOiJ1c2VyIiwidXNlcm5hbWUiOiJ0ZXN0LTExIiwiaWF0IjoxNzkwNTkwMDU0LCJleHAiOjE3OTA1OTA5NTQsImp0aSI6IjNkMzQ3ZjE1LTU5ZjctNGVlZS1iNWE3LTg4ZGFhNDZiZGJmOSJ9.7inOR-oABVadf4pozTYvaVs_2r8KubZXpY3wzLpf_iI'; // Paste a real token here
const HOSPITAL_ID = '6ab76b763aad7ee674760006'; // Paste a real hospital ID here

const runTest = async () => {
    try {
        console.log('1. Creating a dummy file...');
        fs.writeFileSync('test.txt', 'This is a test document for the healthcare chatbot. It contains test medical data.');

        // Calculate hash like the frontend would
        const fileBuffer = fs.readFileSync('test.txt');
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        console.log(`2. Uploading file (Hash: ${hash})...`);
        const form = new FormData();
        form.append('hash', hash); // IMPORTANT: Hash first!
        form.append('documents', fs.createReadStream('test.txt'), {
            filename: 'test.txt',
            contentType: 'text/plain'
        });

        const uploadRes = await axios.post(`${API_URL}/hospital/${HOSPITAL_ID}/file/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        const fileRef = uploadRes.data.fileRef;
        console.log(`✅ Upload Success! FileRef: ${fileRef}`);

        console.log('3. Activating the Chatbot Crawler...');
        const activateRes = await axios.post(`${API_URL}/hospital/${HOSPITAL_ID}/activate`, {
            type: 'document_crawl',
            documents: [{ fileRef }]
        }, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

        console.log('✅ Activation Success!', activateRes.data);
        console.log('\nNow check your core-service and crawler-service terminals to watch the Kafka events and processing logs!');

    } catch (err) {
        console.error('❌ Test failed:', err.response?.data || err.message);
    } finally {
        if (fs.existsSync('test.txt')) fs.unlinkSync('test.txt');
    }
};

runTest();
