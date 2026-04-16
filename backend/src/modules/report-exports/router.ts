import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { validateBody } from '../../middleware/validate.js';
import { formatReportExportStatus, parseReportExportStatus } from '../shared/mappers.js';

const router = Router();

const exportSchema = z.object({
  legacyId: z.string().optional(),
  fileName: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  sizeLabel: z.string().trim().min(1),
  status: z.enum(['CONCLUÍDO', 'FALHA']),
  module: z.enum(['incidents', 'meetings', 'agents']),
  format: z.enum(['pdf', 'excel', 'csv']),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  fields: z.array(z.string()).default([]),
  errorMessage: z.string().optional().nullable(),
});

const serialize = (record: Awaited<ReturnType<typeof prisma.reportExport.findFirstOrThrow>>) => ({
  id: record.id,
  legacyId: record.legacyId,
  fileName: record.fileName,
  createdAt: record.createdAt,
  sizeLabel: record.sizeLabel,
  status: formatReportExportStatus(record.status),
  module: record.module,
  format: record.format,
  startDate: record.startDate,
  endDate: record.endDate,
  fields: record.fields,
  errorMessage: record.errorMessage,
  updatedAt: record.updatedAt,
});

router.get('/', asyncHandler(async (req, res) => {
  const data = await prisma.reportExport.findMany({ where: { userId: req.user!.id }, orderBy: [{ createdAt: 'desc' }] });
  res.json(data.map(serialize));
}));

router.post('/', validateBody(exportSchema), asyncHandler(async (req, res) => {
  const created = await prisma.reportExport.create({
    data: {
      userId: req.user!.id,
      legacyId: req.body.legacyId,
      fileName: req.body.fileName,
      createdAt: new Date(req.body.createdAt),
      sizeLabel: req.body.sizeLabel,
      status: parseReportExportStatus(req.body.status),
      module: req.body.module,
      format: req.body.format,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      fields: req.body.fields,
      errorMessage: req.body.errorMessage,
    },
  });
  res.status(201).json(serialize(created));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const current = await prisma.reportExport.findFirst({ where: { id, userId: req.user!.id } });
  if (!current) throw new HttpError(404, 'Report export not found.');
  await prisma.reportExport.delete({ where: { id: current.id } });
  res.status(204).send();
}));

router.delete('/', asyncHandler(async (req, res) => {
  const result = await prisma.reportExport.deleteMany({ where: { userId: req.user!.id } });
  res.json({ deletedCount: result.count });
}));

export { router as reportExportsRouter };
