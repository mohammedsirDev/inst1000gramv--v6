import type { Request, Response } from 'express';
import app, { handleInstagramResolve } from '../../server.ts';

export default function handler(req: Request, res: Response) {
  if (req.method === 'POST' || req.method === 'OPTIONS') {
    return handleInstagramResolve(req, res);
  }
  return app(req, res);
}
