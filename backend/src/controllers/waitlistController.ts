import { Request, Response } from 'express';
import { waitlistJoinSchema } from '../utils/schemas';
import { joinWaitlist, listMyWaitlistEntries } from '../services/waitlistService';

export async function postJoinWaitlist(req: Request, res: Response) {
  const data = waitlistJoinSchema.parse(req.body);
  const entry = await joinWaitlist(req.params.eventId, data.category, req.user!.userId);
  res.status(201).json(entry);
}

export async function getMyWaitlist(req: Request, res: Response) {
  const entries = await listMyWaitlistEntries(req.user!.userId);
  res.json(entries);
}
