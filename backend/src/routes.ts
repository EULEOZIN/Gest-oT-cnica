import { Router } from 'express';
import { authenticate } from './middleware/authenticate.js';
import { authRouter } from './modules/auth/router.js';
import { settingsRouter } from './modules/settings/router.js';
import { agentsRouter } from './modules/agents/router.js';
import { incidentsRouter } from './modules/incidents/router.js';
import { meetingsRouter } from './modules/meetings/router.js';
import { dailyNotesRouter } from './modules/daily-notes/router.js';
import { notificationsRouter } from './modules/notifications/router.js';
import { reportExportsRouter } from './modules/report-exports/router.js';
import { schedulesRouter } from './modules/schedules/router.js';
import { migrationRouter } from './modules/migration/router.js';

export const router = Router();

router.use('/auth', authRouter);
router.use(authenticate);
router.use('/settings', settingsRouter);
router.use('/agents', agentsRouter);
router.use('/incidents', incidentsRouter);
router.use('/meetings', meetingsRouter);
router.use('/daily-notes', dailyNotesRouter);
router.use('/notifications', notificationsRouter);
router.use('/report-exports', reportExportsRouter);
router.use('/schedules', schedulesRouter);
router.use('/migration', migrationRouter);
