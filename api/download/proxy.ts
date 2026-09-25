import type { Request, Response } from 'express';
import { handleDownloadProxy } from '../../server.ts';

export default function handler(req: Request, res: Response) {
  return handleDownloadProxy(req, res);
}
