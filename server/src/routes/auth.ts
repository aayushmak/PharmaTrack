import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {prisma } from '../lib/prisma';
import { signToken, requireAuth } from '../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login - exchange credentials for a JWT token
authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({error: "username and password are required"});
  }

  const { username, password } = parsed.data;

  // Find the user by username
  const user = await prisma.user.findUnique({
    where: { username },
  });

  // Same response whether user is missing or password is wrong - no user enumeration.
  if (!user || !user.isActive) {
    return res.status(401).json({error: "Invalid username or password"});
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({error: "Invalid username or password"});
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    username: user.username,
  });

  return res.josn({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    }
  })
})

// GET /api/auth/me - return the current authenticated user.
authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({error: "User no longer active"});
  }

  return res.json({user});
})
