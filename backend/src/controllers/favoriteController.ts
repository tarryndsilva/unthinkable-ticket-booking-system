import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export async function listMyFavorites(req: Request, res: Response) {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.userId },
    include: { event: { include: { venue: true, pricing: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(favorites.map((f) => f.event));
}

export async function listMyFavoriteIds(req: Request, res: Response) {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user!.userId },
    select: { eventId: true },
  });
  res.json(favorites.map((f) => f.eventId));
}

export async function addFavorite(req: Request, res: Response) {
  const eventId = req.params.id;
  const userId = req.user!.userId;
  await prisma.favorite.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: {},
    create: { userId, eventId },
  });
  res.status(201).json({ favorited: true });
}

export async function removeFavorite(req: Request, res: Response) {
  const eventId = req.params.id;
  const userId = req.user!.userId;
  await prisma.favorite.deleteMany({ where: { userId, eventId } });
  res.status(204).send();
}
