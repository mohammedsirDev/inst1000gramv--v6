import type { Request, Response } from 'express';
import { handleDownloadStream } from '../../server.ts';

export default function handler(req: Request, res: Response) {
  return handleDownloadStream(req, res);
}
