import { Worker } from 'bullmq';
import { redis } from '../utils/redis';
import { autoReleaseExpiredHold } from '../services/seatHoldService';
import { expireWaitlistOffer } from '../services/waitlistService';
import { SeatReleaseJobData, WaitlistOfferJobData } from './queues';

const seatReleaseWorker = new Worker<SeatReleaseJobData>(
  'seat-release',
  async (job) => {
    await autoReleaseExpiredHold(job.data.showSeatId);
  },
  { connection: redis }
);

const waitlistOfferWorker = new Worker<WaitlistOfferJobData>(
  'waitlist-offer',
  async (job) => {
    await expireWaitlistOffer(job.data.waitlistId);
  },
  { connection: redis }
);

seatReleaseWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[seat-release] job ${job?.id} failed:`, err.message);
});
waitlistOfferWorker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[waitlist-offer] job ${job?.id} failed:`, err.message);
});

// eslint-disable-next-line no-console
console.log('Workers started: seat-release, waitlist-offer');
