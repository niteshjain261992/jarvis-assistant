import type { Request, Response } from 'express';
import { SuccessResponse } from '@/utils/api-response.js';

export function getHealth(_req: Request, res: Response): void {
  SuccessResponse.HEALTH_OK(res, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
