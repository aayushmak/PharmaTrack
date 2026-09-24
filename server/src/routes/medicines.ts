import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { Prisma } from '@prisma/client';