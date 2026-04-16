import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { comparePassword, hashPassword, signAccessToken } from '../../lib/auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { formatDefaultView } from '../shared/mappers.js';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4),
});

const authRouter = Router();

const serializeAuthUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });

  if (!user) {
    throw new HttpError(404, 'User not found.');
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
      profilePhoto: user.profilePhoto,
      settings: {
      defaultView: formatDefaultView((user.settings?.defaultView ?? 'dashboard') as Parameters<typeof formatDefaultView>[0]),
      meetingsNotificationsEnabled: user.settings?.meetingsNotificationsEnabled ?? true,
    },
  };
};

const ensureDefaultAdmin = async () => {
  const existing = await prisma.user.findUnique({ where: { username: env.DEFAULT_ADMIN_USERNAME } });
  if (existing) return existing;

  const totalUsers = await prisma.user.count();
  if (totalUsers > 0) {
    throw new HttpError(401, 'Invalid credentials.');
  }

  const passwordHash = await hashPassword(env.DEFAULT_ADMIN_PASSWORD);
  return prisma.user.create({
    data: {
      username: env.DEFAULT_ADMIN_USERNAME,
      passwordHash,
      fullName: env.DEFAULT_ADMIN_NAME,
      role: env.DEFAULT_ADMIN_ROLE,
      settings: {
        create: {
          defaultView: 'dashboard',
          meetingsNotificationsEnabled: true,
        },
      },
    },
  });
};

authRouter.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  let user = await prisma.user.findUnique({ where: { username } });
  if (!user && username === env.DEFAULT_ADMIN_USERNAME) {
    user = await ensureDefaultAdmin();
  }

  if (!user) {
    throw new HttpError(401, 'Invalid credentials.');
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid credentials.');
  }

  const accessToken = signAccessToken({ sub: user.id, username: user.username });
  res.json({ accessToken, user: await serializeAuthUser(user.id) });
}));

authRouter.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: await serializeAuthUser(req.user!.id) });
}));

authRouter.post('/change-password', authenticate, validateBody(changePasswordSchema), asyncHandler(async (req, res) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body;
  const passwordMatches = await comparePassword(currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new HttpError(400, 'Current password is incorrect.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  res.json({ message: 'Password updated successfully.' });
}));

authRouter.post('/logout', authenticate, asyncHandler(async (_req, res) => {
  res.json({ message: 'Logout acknowledged. JWT invalidation strategy is client-side until refresh token revocation is introduced.' });
}));

export { authRouter };
