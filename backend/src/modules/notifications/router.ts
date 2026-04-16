import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { validateBody } from '../../middleware/validate.js';
import { formatNotificationSource, parseNotificationKind, parseNotificationSource } from '../shared/mappers.js';

const router = Router();

const notificationSchema = z.object({
  legacyId: z.string().optional(),
  source: z.enum(['meeting', 'daily-note']),
  meetingId: z.number().int().optional().nullable(),
  noteId: z.number().int().optional().nullable(),
  meetingTitle: z.string().optional().nullable(),
  noteText: z.string().optional().nullable(),
  message: z.string().trim().min(1),
  kind: z.enum(['created', 'updated', 'completed', 'deleted', 'morning_alert']),
  createdAt: z.string().datetime(),
  read: z.boolean().default(false),
});

const updateSchema = notificationSchema.partial().extend({ read: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);

const serialize = (notification: Awaited<ReturnType<typeof prisma.notification.findFirstOrThrow>>) => ({
  id: notification.id,
  legacyId: notification.legacyId,
  source: formatNotificationSource(notification.source),
  meetingId: notification.meetingLegacyId,
  noteId: notification.noteLegacyId,
  meetingTitle: notification.meetingTitle,
  noteText: notification.noteText,
  message: notification.message,
  kind: notification.kind,
  createdAt: notification.createdAt,
  read: notification.read,
  updatedAt: notification.updatedAt,
});

router.get('/', asyncHandler(async (req, res) => {
  const data = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: [{ createdAt: 'desc' }] });
  res.json(data.map(serialize));
}));

router.post('/', validateBody(notificationSchema), asyncHandler(async (req, res) => {
  const created = await prisma.notification.create({
    data: {
      userId: req.user!.id,
      legacyId: req.body.legacyId,
      source: parseNotificationSource(req.body.source),
      kind: parseNotificationKind(req.body.kind),
      meetingLegacyId: req.body.meetingId,
      noteLegacyId: req.body.noteId,
      meetingTitle: req.body.meetingTitle,
      noteText: req.body.noteText,
      message: req.body.message,
      createdAt: new Date(req.body.createdAt),
      read: req.body.read,
    },
  });
  res.status(201).json(serialize(created));
}));

router.put('/:id', validateBody(updateSchema), asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.notification.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Notification not found.');

  const updated = await prisma.notification.update({
    where: { id: current.id },
    data: {
      legacyId: req.body.legacyId,
      source: req.body.source ? parseNotificationSource(req.body.source) : undefined,
      kind: req.body.kind ? parseNotificationKind(req.body.kind) : undefined,
      meetingLegacyId: req.body.meetingId,
      noteLegacyId: req.body.noteId,
      meetingTitle: req.body.meetingTitle,
      noteText: req.body.noteText,
      message: req.body.message,
      createdAt: req.body.createdAt ? new Date(req.body.createdAt) : undefined,
      read: req.body.read,
    },
  });

  res.json(serialize(updated));
}));

router.post('/mark-all-read', asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
  res.json({ updatedCount: result.count });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.notification.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Notification not found.');
  await prisma.notification.delete({ where: { id: current.id } });
  res.status(204).send();
}));

export { router as notificationsRouter };
