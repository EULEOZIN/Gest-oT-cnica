import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { prisma } from '../../lib/prisma.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const scheduleRecordSchema = z.object({
  agentId: z.number().int(),
  agentName: z.string(),
  role: z.string(),
  weekendTeam: z.enum(['Equipe 1', 'Equipe 2']),
  entry: z.string(),
  lunchStart: z.string(),
  lunchEnd: z.string(),
  exit: z.string(),
  updatedAt: z.string().datetime().nullable(),
});

const scheduleSchema = z.object({
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
  selectedWeekendDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(scheduleRecordSchema),
});

const serialize = (schedule: Awaited<ReturnType<typeof prisma.schedule.findFirstOrThrow>>) => ({
  id: schedule.id,
  referenceMonth: schedule.referenceMonth,
  selectedWeekendDate: schedule.selectedWeekendDate.toISOString().slice(0, 10),
  records: schedule.records,
  createdAt: schedule.createdAt,
  updatedAt: schedule.updatedAt,
});

router.get('/', asyncHandler(async (req, res) => {
  const referenceMonth = typeof req.query.referenceMonth === 'string' ? req.query.referenceMonth : undefined;
  const data = await prisma.schedule.findMany({
    where: { userId: req.user!.id, referenceMonth },
    orderBy: [{ updatedAt: 'desc' }],
  });
  res.json(data.map(serialize));
}));

router.put('/current', validateBody(scheduleSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.schedule.findFirst({
    where: { userId: req.user!.id, referenceMonth: req.body.referenceMonth },
    orderBy: { updatedAt: 'desc' },
  });

  const saved = existing
    ? await prisma.schedule.update({
        where: { id: existing.id },
        data: {
          selectedWeekendDate: new Date(`${req.body.selectedWeekendDate}T00:00:00.000Z`),
          records: req.body.records,
        },
      })
    : await prisma.schedule.create({
        data: {
          userId: req.user!.id,
          referenceMonth: req.body.referenceMonth,
          selectedWeekendDate: new Date(`${req.body.selectedWeekendDate}T00:00:00.000Z`),
          records: req.body.records,
        },
      });

  res.json(serialize(saved));
}));

export { router as schedulesRouter };
