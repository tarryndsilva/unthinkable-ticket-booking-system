import { Queue } from 'bullmq';
import { redis } from '../utils/redis';

// BullMQ needs its own connection options (ioredis instance works directly)
export const seatReleaseQueue = new Queue('seat-release', { connection: redis });
export const waitlistOfferQueue = new Queue('waitlist-offer', { connection: redis });

export interface SeatReleaseJobData {
  showSeatId: string;
  holdId: string;
}

export interface WaitlistOfferJobData {
  waitlistId: string;
}

export async function scheduleSeatRelease(data: SeatReleaseJobData, delayMs: number) {
  // jobId ties the job to the hold so we can cancel it if the seat is booked/released early
  await seatReleaseQueue.add('release', data, {
    delay: delayMs,
    jobId: `release:${data.showSeatId}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
}

export async function cancelSeatRelease(showSeatId: string) {
  const job = await seatReleaseQueue.getJob(`release:${showSeatId}`);
  if (job) await job.remove();
}

export async function scheduleWaitlistOfferExpiry(data: WaitlistOfferJobData, delayMs: number) {
  await waitlistOfferQueue.add('expire-offer', data, {
    delay: delayMs,
    jobId: `offer:${data.waitlistId}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
}

export async function cancelWaitlistOfferExpiry(waitlistId: string) {
  const job = await waitlistOfferQueue.getJob(`offer:${waitlistId}`);
  if (job) await job.remove();
}
