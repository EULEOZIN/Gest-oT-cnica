import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { prisma } from '../../lib/prisma.js';
import { validateBody } from '../../middleware/validate.js';
import {
  parseDailyNoteCategory,
  parseDailyNoteStatus,
  parseDeadlinePreset,
  parseDefaultView,
  parseIncidentHistoryAction,
  parseIncidentPriority,
  parseIncidentRecordType,
  parseIncidentStatus,
  parseIncidentVisualType,
  parseMeetingCategory,
  parseMeetingStatus,
  parseNotificationKind,
  parseNotificationSource,
  parseReportExportStatus,
} from '../shared/mappers.js';

const router = Router();

const payloadSchema = z.object({
  appSettings: z.record(z.any()).optional(),
  agents: z.array(z.record(z.any())).optional(),
  incidents: z.array(z.record(z.any())).optional(),
  meetings: z.array(z.record(z.any())).optional(),
  dashboardDailyNotes: z.array(z.record(z.any())).optional(),
  meetingNotifications: z.array(z.record(z.any())).optional(),
  dailyNoteNotifications: z.array(z.record(z.any())).optional(),
  reportExports: z.array(z.record(z.any())).optional(),
  schedule: z.record(z.any()).optional(),
});

router.post('/local-storage', validateBody(payloadSchema), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const payload = req.body;
  const imported = {
    settings: 0,
    agents: 0,
    incidents: 0,
    incidentHistory: 0,
    meetings: 0,
    dailyNotes: 0,
    notifications: 0,
    reportExports: 0,
    schedules: 0,
  };

  await prisma.$transaction(async (tx: any) => {
    if (payload.appSettings) {
      await tx.user.update({
        where: { id: userId },
        data: {
          fullName: typeof payload.appSettings.profileName === 'string' ? payload.appSettings.profileName : undefined,
          role: typeof payload.appSettings.profileRole === 'string' ? payload.appSettings.profileRole : undefined,
          profilePhoto: typeof payload.appSettings.profilePhoto === 'string' ? payload.appSettings.profilePhoto : undefined,
          username: typeof payload.appSettings.authUsername === 'string' && payload.appSettings.authUsername.trim() ? payload.appSettings.authUsername.trim() : undefined,
          settings: {
            upsert: {
              update: {
                defaultView: parseDefaultView(payload.appSettings.defaultView),
                meetingsNotificationsEnabled: payload.appSettings.meetingsNotificationsEnabled !== false,
              },
              create: {
                defaultView: parseDefaultView(payload.appSettings.defaultView),
                meetingsNotificationsEnabled: payload.appSettings.meetingsNotificationsEnabled !== false,
              },
            },
          },
        },
      });
      imported.settings = 1;
    }

    for (const agent of payload.agents ?? []) {
      const agentData = {
        name: agent.name ?? 'Agente',
        role: agent.role ?? 'Equipe técnica',
        tenure: agent.time ?? null,
        admissionDate: typeof agent.admissionDate === 'string' && agent.admissionDate ? new Date(`${agent.admissionDate}T00:00:00.000Z`) : null,
        trust: typeof agent.trust === 'number' ? agent.trust : null,
        rating: typeof agent.rating === 'number' ? agent.rating : null,
        behavior: typeof agent.behavior === 'string' ? agent.behavior : null,
        photo: typeof agent.photo === 'string' ? agent.photo : null,
      };

      if (typeof agent.id === 'number') {
        await tx.agent.upsert({
          where: { userId_legacyId: { userId, legacyId: agent.id } },
          update: agentData,
          create: { userId, legacyId: agent.id, ...agentData },
        });
      } else {
        await tx.agent.create({ data: { userId, ...agentData } });
      }

      imported.agents += 1;
    }

    for (const incident of payload.incidents ?? []) {
      const incidentData = {
        protocol: incident.protocol ?? null,
        title: incident.title ?? 'Incidente sem título',
        description: incident.description ?? '',
        timeLabel: incident.time ?? null,
        status: parseIncidentStatus(incident.status),
        priority: parseIncidentPriority(incident.priority ?? incident.status),
        reporter: incident.reporter ?? incident.agent ?? null,
        agent: incident.agent ?? incident.reporter ?? null,
        assumedBy: incident.assumedBy ?? null,
        assumedAt: incident.assumedAt ? new Date(incident.assumedAt) : null,
        treatmentNotes: incident.treatmentNotes ?? incident.action ?? null,
        resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt) : null,
        recordType: parseIncidentRecordType(incident.recordType),
        visualType: parseIncidentVisualType(incident.type),
      };

      const record = typeof incident.id === 'number'
        ? await tx.incident.upsert({
            where: { userId_legacyId: { userId, legacyId: incident.id } },
            update: incidentData,
            create: {
              userId,
              legacyId: incident.id,
              ...incidentData,
              createdAt: incident.createdAt ? new Date(incident.createdAt) : undefined,
            },
          })
        : await tx.incident.create({
            data: {
              userId,
              ...incidentData,
              createdAt: incident.createdAt ? new Date(incident.createdAt) : undefined,
            },
          });

      await tx.incidentHistory.deleteMany({ where: { incidentId: record.id } });
      const historyEntries = Array.isArray(incident.history) ? incident.history : [];
      if (historyEntries.length > 0) {
        await tx.incidentHistory.createMany({
          data: historyEntries.map((entry: Record<string, unknown>) => ({
            incidentId: record.id,
            action: parseIncidentHistoryAction(typeof entry.action === 'string' ? entry.action : undefined),
            details: typeof entry.details === 'string' ? entry.details : typeof entry.note === 'string' ? entry.note : null,
            occurredAt: new Date(typeof entry.at === 'string' ? entry.at : new Date().toISOString()),
          })),
        });
        imported.incidentHistory += historyEntries.length;
      }

      imported.incidents += 1;
    }

    for (const meeting of payload.meetings ?? []) {
      const meetingData = {
        title: meeting.title ?? 'Reunião sem título',
        date: new Date(`${meeting.date ?? '2026-01-01'}T00:00:00.000Z`),
        time: meeting.time ?? '09:00',
        attendees: meeting.attendees ?? 'Time técnico',
        location: meeting.location ?? 'Sala principal',
        notes: meeting.notes ?? '',
        status: parseMeetingStatus(meeting.status),
        category: parseMeetingCategory(meeting.category),
      };

      if (typeof meeting.id === 'number') {
        await tx.meeting.upsert({
          where: { userId_legacyId: { userId, legacyId: meeting.id } },
          update: meetingData,
          create: { userId, legacyId: meeting.id, ...meetingData, createdAt: meeting.createdAt ? new Date(meeting.createdAt) : undefined },
        });
      } else {
        await tx.meeting.create({ data: { userId, ...meetingData, createdAt: meeting.createdAt ? new Date(meeting.createdAt) : undefined } });
      }

      imported.meetings += 1;
    }

    for (const note of payload.dashboardDailyNotes ?? []) {
      const noteData = {
        text: note.text ?? 'Anotação',
        date: new Date(`${note.date ?? '2026-01-01'}T00:00:00.000Z`),
        status: parseDailyNoteStatus(note.status),
        category: parseDailyNoteCategory(note.category),
        deadlinePreset: parseDeadlinePreset(note.deadlinePreset),
        deadlineAt: typeof note.deadlineAt === 'string' && note.deadlineAt ? new Date(`${note.deadlineAt}T00:00:00.000Z`) : null,
        completedAt: note.completedAt ? new Date(note.completedAt) : null,
      };

      if (typeof note.id === 'number') {
        await tx.dailyNote.upsert({
          where: { userId_legacyId: { userId, legacyId: note.id } },
          update: noteData,
          create: { userId, legacyId: note.id, ...noteData, createdAt: note.createdAt ? new Date(note.createdAt) : undefined },
        });
      } else {
        await tx.dailyNote.create({ data: { userId, ...noteData, createdAt: note.createdAt ? new Date(note.createdAt) : undefined } });
      }

      imported.dailyNotes += 1;
    }

    const notifications = [...(payload.meetingNotifications ?? []), ...(payload.dailyNoteNotifications ?? [])];
    for (const notification of notifications) {
      const fallbackLegacyId = typeof notification.id === 'string' ? notification.id : `${notification.source ?? 'notification'}-${notification.kind ?? 'created'}-${notification.createdAt ?? Date.now()}`;
      await tx.notification.upsert({
        where: { userId_legacyId: { userId, legacyId: fallbackLegacyId } },
        update: {
          source: parseNotificationSource(notification.source),
          kind: parseNotificationKind(notification.kind),
          message: typeof notification.message === 'string' ? notification.message : 'Notificação importada',
          meetingLegacyId: typeof notification.meetingId === 'number' ? notification.meetingId : null,
          noteLegacyId: typeof notification.noteId === 'number' ? notification.noteId : null,
          meetingTitle: typeof notification.meetingTitle === 'string' ? notification.meetingTitle : null,
          noteText: typeof notification.noteText === 'string' ? notification.noteText : null,
          createdAt: new Date(typeof notification.createdAt === 'string' ? notification.createdAt : new Date().toISOString()),
          read: Boolean(notification.read),
        },
        create: {
          userId,
          legacyId: fallbackLegacyId,
          source: parseNotificationSource(notification.source),
          kind: parseNotificationKind(notification.kind),
          message: typeof notification.message === 'string' ? notification.message : 'Notificação importada',
          meetingLegacyId: typeof notification.meetingId === 'number' ? notification.meetingId : null,
          noteLegacyId: typeof notification.noteId === 'number' ? notification.noteId : null,
          meetingTitle: typeof notification.meetingTitle === 'string' ? notification.meetingTitle : null,
          noteText: typeof notification.noteText === 'string' ? notification.noteText : null,
          createdAt: new Date(typeof notification.createdAt === 'string' ? notification.createdAt : new Date().toISOString()),
          read: Boolean(notification.read),
        },
      });
      imported.notifications += 1;
    }

    for (const report of payload.reportExports ?? []) {
      const fallbackLegacyId = typeof report.id === 'string' ? report.id : `${report.module ?? 'incidents'}-${report.format ?? 'csv'}-${report.createdAt ?? Date.now()}`;
      await tx.reportExport.upsert({
        where: { userId_legacyId: { userId, legacyId: fallbackLegacyId } },
        update: {
          fileName: typeof report.fileName === 'string' ? report.fileName : 'relatorio.csv',
          createdAt: new Date(typeof report.createdAt === 'string' ? report.createdAt : new Date().toISOString()),
          sizeLabel: typeof report.sizeLabel === 'string' ? report.sizeLabel : '—',
          status: parseReportExportStatus(report.status),
          module: report.module === 'meetings' || report.module === 'agents' ? report.module : 'incidents',
          format: report.format === 'pdf' || report.format === 'excel' ? report.format : 'csv',
          startDate: typeof report.startDate === 'string' ? report.startDate : null,
          endDate: typeof report.endDate === 'string' ? report.endDate : null,
          fields: Array.isArray(report.fields) ? report.fields.filter((field: unknown) => typeof field === 'string') : [],
          errorMessage: typeof report.errorMessage === 'string' ? report.errorMessage : null,
        },
        create: {
          userId,
          legacyId: fallbackLegacyId,
          fileName: typeof report.fileName === 'string' ? report.fileName : 'relatorio.csv',
          createdAt: new Date(typeof report.createdAt === 'string' ? report.createdAt : new Date().toISOString()),
          sizeLabel: typeof report.sizeLabel === 'string' ? report.sizeLabel : '—',
          status: parseReportExportStatus(report.status),
          module: report.module === 'meetings' || report.module === 'agents' ? report.module : 'incidents',
          format: report.format === 'pdf' || report.format === 'excel' ? report.format : 'csv',
          startDate: typeof report.startDate === 'string' ? report.startDate : null,
          endDate: typeof report.endDate === 'string' ? report.endDate : null,
          fields: Array.isArray(report.fields) ? report.fields.filter((field: unknown) => typeof field === 'string') : [],
          errorMessage: typeof report.errorMessage === 'string' ? report.errorMessage : null,
        },
      });
      imported.reportExports += 1;
    }

    if (payload.schedule) {
      const referenceMonth = typeof payload.schedule.referenceMonth === 'string' ? payload.schedule.referenceMonth : '2026-01';
      const existing = await tx.schedule.findFirst({ where: { userId, referenceMonth }, orderBy: { updatedAt: 'desc' } });

      if (existing) {
        await tx.schedule.update({
          where: { id: existing.id },
          data: {
            selectedWeekendDate: new Date(`${typeof payload.schedule.selectedWeekendDate === 'string' ? payload.schedule.selectedWeekendDate : '2026-01-03'}T00:00:00.000Z`),
            records: Array.isArray(payload.schedule.records) ? payload.schedule.records : [],
          },
        });
      } else {
        await tx.schedule.create({
          data: {
            userId,
            referenceMonth,
            selectedWeekendDate: new Date(`${typeof payload.schedule.selectedWeekendDate === 'string' ? payload.schedule.selectedWeekendDate : '2026-01-03'}T00:00:00.000Z`),
            records: Array.isArray(payload.schedule.records) ? payload.schedule.records : [],
          },
        });
      }

      imported.schedules = 1;
    }
  });

  res.json({ message: 'Local storage data imported successfully.', imported });
}));

export { router as migrationRouter };
