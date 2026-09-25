import type { Request, Response } from 'express';
import { handleDownloadZip } from '../../server.ts';

export default function handler(req: Request, res: Response) {
  return handleDownloadZip(req, res);
}
