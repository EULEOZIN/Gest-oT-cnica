import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const agentSchema = z.object({
  legacyId: z.number().int().optional(),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  time: z.string().trim().optional().nullable(),
  admissionDate: z.string().optional().nullable(),
  trust: z.number().int().min(0).max(100).optional().nullable(),
  rating: z.number().int().min(0).max(5).optional().nullable(),
  behavior: z.string().trim().optional().nullable(),
  photo: z.string().trim().optional().nullable(),
});

const serialize = (agent: Awaited<ReturnType<typeof prisma.agent.findFirstOrThrow>>) => ({
  id: agent.id,
  legacyId: agent.legacyId,
  name: agent.name,
  role: agent.role,
  time: agent.tenure,
  admissionDate: agent.admissionDate?.toISOString().slice(0, 10) ?? null,
  trust: agent.trust,
  rating: agent.rating,
  behavior: agent.behavior,
  photo: agent.photo,
  createdAt: agent.createdAt,
  updatedAt: agent.updatedAt,
});

router.get('/', asyncHandler(async (req, res) => {
  const data = await prisma.agent.findMany({ where: { userId: req.user!.id }, orderBy: [{ name: 'asc' }] });
  res.json(data.map(serialize));
}));

router.post('/', validateBody(agentSchema), asyncHandler(async (req, res) => {
  const created = await prisma.agent.create({
    data: {
      userId: req.user!.id,
      legacyId: req.body.legacyId,
      name: req.body.name,
      role: req.body.role,
      tenure: req.body.time,
      admissionDate: req.body.admissionDate ? new Date(`${req.body.admissionDate}T00:00:00.000Z`) : null,
      trust: req.body.trust,
      rating: req.body.rating,
      behavior: req.body.behavior,
      photo: req.body.photo,
    },
  });
  res.status(201).json(serialize(created));
}));

router.put('/:id', validateBody(agentSchema.partial().refine((value) => Object.keys(value).length > 0)), asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.agent.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Agent not found.');

  const updated = await prisma.agent.update({
    where: { id: current.id },
    data: {
      legacyId: req.body.legacyId,
      name: req.body.name,
      role: req.body.role,
      tenure: req.body.time,
      admissionDate: req.body.admissionDate ? new Date(`${req.body.admissionDate}T00:00:00.000Z`) : req.body.admissionDate === null ? null : undefined,
      trust: req.body.trust,
      rating: req.body.rating,
      behavior: req.body.behavior,
      photo: req.body.photo,
    },
  });

  res.json(serialize(updated));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.agent.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Agent not found.');
  await prisma.agent.delete({ where: { id: current.id } });
  res.status(204).send();
}));

export { router as agentsRouter };
