import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { validateBody } from '../../middleware/validate.js';
import {
  formatIncidentPriority,
  formatIncidentStatus,
  parseIncidentHistoryAction,
  parseIncidentPriority,
  parseIncidentRecordType,
  parseIncidentStatus,
  parseIncidentVisualType,
} from '../shared/mappers.js';

const router = Router();

const historySchema = z.object({
  at: z.string().datetime(),
  action: z.enum(['created', 'assumed', 'quick_resolved', 'status_changed', 'notes_changed']),
  details: z.string().optional(),
});

const incidentSchema = z.object({
  legacyId: z.number().int().optional(),
  protocol: z.string().optional().nullable(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  time: z.string().optional().nullable(),
  status: z.enum(['Crítico', 'Em Análise', 'Resolvido']).default('Em Análise'),
  priority: z.enum(['Crítico', 'Normal']).default('Normal'),
  reporter: z.string().optional().nullable(),
  agent: z.string().optional().nullable(),
  assumedBy: z.string().optional().nullable(),
  assumedAt: z.string().datetime().optional().nullable(),
  treatmentNotes: z.string().optional().nullable(),
  resolvedAt: z.string().datetime().optional().nullable(),
  recordType: z.enum(['error', 'complaint']).default('complaint'),
  type: z.enum(['error', 'warning', 'success']).default('warning'),
  createdAt: z.string().datetime().optional(),
  history: z.array(historySchema).optional().default([]),
});

const serialize = (incident: Awaited<ReturnType<typeof prisma.incident.findFirstOrThrow>> & { history: { id: string; action: any; details: string | null; occurredAt: Date; }[] }) => ({
  id: incident.id,
  legacyId: incident.legacyId,
  protocol: incident.protocol,
  title: incident.title,
  description: incident.description,
  time: incident.timeLabel,
  status: formatIncidentStatus(incident.status),
  priority: formatIncidentPriority(incident.priority),
  reporter: incident.reporter,
  agent: incident.agent,
  assumedBy: incident.assumedBy,
  assumedAt: incident.assumedAt,
  treatmentNotes: incident.treatmentNotes,
  resolvedAt: incident.resolvedAt,
  recordType: incident.recordType,
  type: incident.visualType,
  createdAt: incident.createdAt,
  updatedAt: incident.updatedAt,
  history: incident.history.map((entry: { id: string; action: string; details: string | null; occurredAt: Date }) => ({
    id: entry.id,
    at: entry.occurredAt,
    action: entry.action,
    details: entry.details,
  })),
});

router.get('/', asyncHandler(async (req, res) => {
  const data = await prisma.incident.findMany({
    where: { userId: req.user!.id },
    include: { history: { orderBy: { occurredAt: 'asc' } } },
    orderBy: [{ createdAt: 'desc' }],
  });
  res.json(data.map(serialize));
}));

router.post('/', validateBody(incidentSchema), asyncHandler(async (req, res) => {
  const created = await prisma.incident.create({
    data: {
      userId: req.user!.id,
      legacyId: req.body.legacyId,
      protocol: req.body.protocol,
      title: req.body.title,
      description: req.body.description,
      timeLabel: req.body.time,
      status: parseIncidentStatus(req.body.status),
      priority: parseIncidentPriority(req.body.priority),
      reporter: req.body.reporter,
      agent: req.body.agent,
      assumedBy: req.body.assumedBy,
      assumedAt: req.body.assumedAt ? new Date(req.body.assumedAt) : null,
      treatmentNotes: req.body.treatmentNotes,
      resolvedAt: req.body.resolvedAt ? new Date(req.body.resolvedAt) : null,
      recordType: parseIncidentRecordType(req.body.recordType),
      visualType: parseIncidentVisualType(req.body.type),
      createdAt: req.body.createdAt ? new Date(req.body.createdAt) : undefined,
      history: {
        create: req.body.history.map((entry: { at: string; action: 'created' | 'assumed' | 'quick_resolved' | 'status_changed' | 'notes_changed'; details?: string }) => ({
          action: parseIncidentHistoryAction(entry.action),
          details: entry.details,
          occurredAt: new Date(entry.at),
        })),
      },
    },
    include: { history: { orderBy: { occurredAt: 'asc' } } },
  });

  res.status(201).json(serialize(created));
}));

router.put('/:id', validateBody(incidentSchema.partial().refine((value) => Object.keys(value).length > 0)), asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.incident.findFirst({ where: { id, userId: req.user!.id }, include: { history: true } });
  if (!current) throw new HttpError(404, 'Incident not found.');

  const updated = await prisma.$transaction(async (tx: any) => {
    if (req.body.history) {
      await tx.incidentHistory.deleteMany({ where: { incidentId: current.id } });
    }

    return tx.incident.update({
      where: { id: current.id },
      data: {
        legacyId: req.body.legacyId,
        protocol: req.body.protocol,
        title: req.body.title,
        description: req.body.description,
        timeLabel: req.body.time,
        status: req.body.status ? parseIncidentStatus(req.body.status) : undefined,
        priority: req.body.priority ? parseIncidentPriority(req.body.priority) : undefined,
        reporter: req.body.reporter,
        agent: req.body.agent,
        assumedBy: req.body.assumedBy,
        assumedAt: req.body.assumedAt ? new Date(req.body.assumedAt) : req.body.assumedAt === null ? null : undefined,
        treatmentNotes: req.body.treatmentNotes,
        resolvedAt: req.body.resolvedAt ? new Date(req.body.resolvedAt) : req.body.resolvedAt === null ? null : undefined,
        recordType: req.body.recordType ? parseIncidentRecordType(req.body.recordType) : undefined,
        visualType: req.body.type ? parseIncidentVisualType(req.body.type) : undefined,
        history: req.body.history ? {
          create: req.body.history.map((entry: { at: string; action: 'created' | 'assumed' | 'quick_resolved' | 'status_changed' | 'notes_changed'; details?: string }) => ({
            action: parseIncidentHistoryAction(entry.action),
            details: entry.details,
            occurredAt: new Date(entry.at),
          })),
        } : undefined,
      },
      include: { history: { orderBy: { occurredAt: 'asc' } } },
    });
  });

  res.json(serialize(updated));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.incident.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Incident not found.');
  await prisma.incident.delete({ where: { id: current.id } });
  res.status(204).send();
}));

export { router as incidentsRouter };
