import cron from 'node-cron';
import axios from 'axios';

export const startKeepAliveCron = () => {
    // Run every 10 minutes to hit the health route and keep the Render free tier awake
    cron.schedule('*/10 * * * *', async () => {
        try {
            // Use RENDER_EXTERNAL_URL if deployed on Render, otherwise fallback to localhost
            const url = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

            console.log(`[Cron] Sending keep-alive ping to ${url}/health`);
            const response = await axios.get(`${url}/health`);

            if (response.status === 200) {
                console.log(`[Cron] Keep-alive ping successful. Status: ${response.status}`);
            }
        } catch (error) {
            console.error(`[Cron] Keep-alive ping failed:`, error.message);
        }
    });

    console.log('[Cron] Keep-alive cron job initialized. Will run every 10 minutes.');
};
