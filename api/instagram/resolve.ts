import type { Request, Response } from 'express';
import { handleInstagramResolve } from '../../server.ts';

export default function handler(req: Request, res: Response) {
  return handleInstagramResolve(req, res);
}
