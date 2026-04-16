import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { validateBody } from '../../middleware/validate.js';
import { formatMeetingStatus, parseMeetingCategory, parseMeetingStatus } from '../shared/mappers.js';

const router = Router();

const meetingSchema = z.object({
  legacyId: z.number().int().optional(),
  title: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().trim().min(1),
  attendees: z.string().trim().min(1),
  location: z.string().trim().min(1),
  notes: z.string().default(''),
  status: z.enum(['Confirmada', 'Rascunho', 'Realizada']).default('Confirmada'),
  category: z.enum(['primary', 'secondary', 'tertiary']).default('primary'),
  createdAt: z.string().datetime().optional(),
});

const serialize = (meeting: Awaited<ReturnType<typeof prisma.meeting.findFirstOrThrow>>) => ({
  id: meeting.id,
  legacyId: meeting.legacyId,
  title: meeting.title,
  date: meeting.date.toISOString().slice(0, 10),
  time: meeting.time,
  attendees: meeting.attendees,
  location: meeting.location,
  notes: meeting.notes,
  status: formatMeetingStatus(meeting.status),
  category: meeting.category,
  createdAt: meeting.createdAt,
  updatedAt: meeting.updatedAt,
});

router.get('/', asyncHandler(async (req, res) => {
  const data = await prisma.meeting.findMany({ where: { userId: req.user!.id }, orderBy: [{ date: 'asc' }, { time: 'asc' }] });
  res.json(data.map(serialize));
}));

router.post('/', validateBody(meetingSchema), asyncHandler(async (req, res) => {
  const created = await prisma.meeting.create({
    data: {
      userId: req.user!.id,
      legacyId: req.body.legacyId,
      title: req.body.title,
      date: new Date(`${req.body.date}T00:00:00.000Z`),
      time: req.body.time,
      attendees: req.body.attendees,
      location: req.body.location,
      notes: req.body.notes,
      status: parseMeetingStatus(req.body.status),
      category: parseMeetingCategory(req.body.category),
      createdAt: req.body.createdAt ? new Date(req.body.createdAt) : undefined,
    },
  });
  res.status(201).json(serialize(created));
}));

router.put('/:id', validateBody(meetingSchema.partial().refine((value) => Object.keys(value).length > 0)), asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.meeting.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Meeting not found.');

  const updated = await prisma.meeting.update({
    where: { id: current.id },
    data: {
      legacyId: req.body.legacyId,
      title: req.body.title,
      date: req.body.date ? new Date(`${req.body.date}T00:00:00.000Z`) : undefined,
      time: req.body.time,
      attendees: req.body.attendees,
      location: req.body.location,
      notes: req.body.notes,
      status: req.body.status ? parseMeetingStatus(req.body.status) : undefined,
      category: req.body.category ? parseMeetingCategory(req.body.category) : undefined,
    },
  });

  res.json(serialize(updated));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.meeting.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Meeting not found.');
  await prisma.meeting.delete({ where: { id: current.id } });
  res.status(204).send();
}));

export { router as meetingsRouter };
