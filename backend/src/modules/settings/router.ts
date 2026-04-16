import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { prisma } from '../../lib/prisma.js';
import { validateBody } from '../../middleware/validate.js';
import { formatDefaultView, parseDefaultView } from '../shared/mappers.js';

const router = Router();

const settingsSchema = z.object({
  profileName: z.string().trim().min(1).optional(),
  profileRole: z.string().trim().min(1).optional(),
  profilePhoto: z.string().trim().optional().nullable(),
  defaultView: z.enum(['dashboard', 'daily-notes', 'agents', 'complaints', 'meetings', 'agenda', 'schedule', 'reports']).optional(),
  meetingsNotificationsEnabled: z.boolean().optional(),
});

const serializeSettings = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { settings: true } });
  return {
    profileName: user.fullName,
    profileRole: user.role,
    profilePhoto: user.profilePhoto,
    defaultView: formatDefaultView(user.settings?.defaultView ?? parseDefaultView('dashboard')),
    meetingsNotificationsEnabled: user.settings?.meetingsNotificationsEnabled ?? true,
    authUsername: user.username,
  };
};

router.get('/', asyncHandler(async (req, res) => {
  res.json(await serializeSettings(req.user!.id));
}));

router.put('/', validateBody(settingsSchema), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const body = req.body;

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: body.profileName,
      role: body.profileRole,
      profilePhoto: body.profilePhoto ?? undefined,
      settings: {
        upsert: {
          update: {
            defaultView: body.defaultView ? parseDefaultView(body.defaultView) : undefined,
            meetingsNotificationsEnabled: body.meetingsNotificationsEnabled,
          },
          create: {
            defaultView: parseDefaultView(body.defaultView),
            meetingsNotificationsEnabled: body.meetingsNotificationsEnabled ?? true,
          },
        },
      },
    },
  });

  res.json(await serializeSettings(userId));
}));

export { router as settingsRouter };
