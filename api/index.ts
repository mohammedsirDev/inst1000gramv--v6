import {
  handleInstagramResolve,
  handleDownloadProxy,
  handleDownloadStream,
  handleDownloadZip,
  handleQrShorten,
  sendJsonResponse,
  sendNoContent,
} from '../src/lib/instagramCore.ts';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return sendNoContent(res);
  }

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
  if (url.includes('qr/shorten')) {
    return handleQrShorten(req, res);
  }

  return sendJsonResponse(res, 404, {
    error: `API route not found: ${url}`,
    status: 404,
  });
}
