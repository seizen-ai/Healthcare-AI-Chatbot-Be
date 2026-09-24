import cron from 'node-cron';
import hospitalRepository from './hospital.repository.js';
import { cacheService } from '../../../../shared/redis/index.js';

const TIMEOUT_MINUTES = 30;

export const startActivationTimeoutCron = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);
            const stale = await hospitalRepository.findStaleActivations(cutoff);

            for (const hospital of stale) {
                const eventId = hospital.botActivation?.eventId;
                if (!eventId) continue;

                await hospitalRepository.setBotActivationFailed(
                    hospital._id,
                    eventId,
                    `Activation timed out after ${TIMEOUT_MINUTES} minutes with no response from the crawler service.`
                );

                await cacheService.delete(`hospital:${hospital._id}`);
                console.log(`[ActivationTimeout] Hospital ${hospital._id} marked FAILED (timeout).`);
            }

            if (stale.length > 0) {
                console.log(`[ActivationTimeout] Timed out ${stale.length} stale activation(s).`);
            }
        } catch (err) {
            console.error('[ActivationTimeout] Cron error:', err.message);
        }
    });

    console.log(`[ActivationTimeout] Cron started (every 5 min, timeout = ${TIMEOUT_MINUTES} min).`);
};
