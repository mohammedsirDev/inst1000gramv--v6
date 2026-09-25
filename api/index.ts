import type { Request, Response } from 'express';
import app, {
  handleInstagramResolve,
  handleDownloadProxy,
  handleDownloadStream,
  handleDownloadZip,
} from '../server.ts';

export default async function handler(req: Request, res: Response) {
  const url = req.url || '';
  if (url.includes('instagram/resolve')) {
    return handleInstagramResolve(req, res);
  }
  if (url.includes('download/proxy')) {
    return handleDownloadProxy(req, res);
  }
  if (url.includes('download/stream')) {
    return handleDownloadStream(req, res);
  }
  if (url.includes('download/zip')) {
    return handleDownloadZip(req, res);
  }
  return app(req, res);
}
