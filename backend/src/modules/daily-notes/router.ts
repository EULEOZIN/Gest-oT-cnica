import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { validateBody } from '../../middleware/validate.js';
import { formatDailyNoteCategory, formatDailyNoteStatus, formatDeadlinePreset, parseDailyNoteCategory, parseDailyNoteStatus, parseDeadlinePreset } from '../shared/mappers.js';

const router = Router();

const noteSchema = z.object({
  legacyId: z.number().int().optional(),
  text: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['Em Análise', 'Realizado']).default('Em Análise'),
  category: z.enum(['Alta Prioridade', 'Operacional', 'Documentação']).optional().nullable(),
  deadlinePreset: z.enum(['1 Dia', '1 Semana', 'Personalizado']).optional().nullable(),
  deadlineAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  createdAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

const serialize = (note: Awaited<ReturnType<typeof prisma.dailyNote.findFirstOrThrow>>) => ({
  id: note.id,
  legacyId: note.legacyId,
  text: note.text,
  date: note.date.toISOString().slice(0, 10),
  status: formatDailyNoteStatus(note.status),
  category: formatDailyNoteCategory(note.category),
  deadlinePreset: formatDeadlinePreset(note.deadlinePreset),
  deadlineAt: note.deadlineAt?.toISOString().slice(0, 10) ?? null,
  createdAt: note.createdAt,
  completedAt: note.completedAt,
  updatedAt: note.updatedAt,
});

router.get('/', asyncHandler(async (req, res) => {
  const data = await prisma.dailyNote.findMany({ where: { userId: req.user!.id }, orderBy: [{ createdAt: 'desc' }] });
  res.json(data.map(serialize));
}));

router.post('/', validateBody(noteSchema), asyncHandler(async (req, res) => {
  const created = await prisma.dailyNote.create({
    data: {
      userId: req.user!.id,
      legacyId: req.body.legacyId,
      text: req.body.text,
      date: new Date(`${req.body.date}T00:00:00.000Z`),
      status: parseDailyNoteStatus(req.body.status),
      category: parseDailyNoteCategory(req.body.category),
      deadlinePreset: parseDeadlinePreset(req.body.deadlinePreset),
      deadlineAt: req.body.deadlineAt ? new Date(`${req.body.deadlineAt}T00:00:00.000Z`) : null,
      createdAt: req.body.createdAt ? new Date(req.body.createdAt) : undefined,
      completedAt: req.body.completedAt ? new Date(req.body.completedAt) : null,
    },
  });
  res.status(201).json(serialize(created));
}));

router.put('/:id', validateBody(noteSchema.partial().refine((value) => Object.keys(value).length > 0)), asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.dailyNote.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Daily note not found.');

  const updated = await prisma.dailyNote.update({
    where: { id: current.id },
    data: {
      legacyId: req.body.legacyId,
      text: req.body.text,
      date: req.body.date ? new Date(`${req.body.date}T00:00:00.000Z`) : undefined,
      status: req.body.status ? parseDailyNoteStatus(req.body.status) : undefined,
      category: req.body.category !== undefined ? parseDailyNoteCategory(req.body.category) : undefined,
      deadlinePreset: req.body.deadlinePreset !== undefined ? parseDeadlinePreset(req.body.deadlinePreset) : undefined,
      deadlineAt: req.body.deadlineAt ? new Date(`${req.body.deadlineAt}T00:00:00.000Z`) : req.body.deadlineAt === null ? null : undefined,
      completedAt: req.body.completedAt ? new Date(req.body.completedAt) : req.body.completedAt === null ? null : undefined,
    },
  });
  res.json(serialize(updated));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.dailyNote.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Daily note not found.');
  await prisma.dailyNote.delete({ where: { id: current.id } });
  res.status(204).send();
}));

export { router as dailyNotesRouter };
