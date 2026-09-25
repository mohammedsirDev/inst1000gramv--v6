import {
  handleInstagramResolve,
  handleDownloadProxy,
  handleDownloadStream,
  handleDownloadZip,
  handleQrShorten,
  sendJsonResponse,
  sendNoContent,
} from './_core.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendNoContent(res);
  }

  const urlPath = String(req.url || '');

  if (urlPath.includes('instagram/resolve')) {
    return handleInstagramResolve(req, res);
  }
  if (urlPath.includes('download/proxy')) {
    return handleDownloadProxy(req, res);
  }
  if (urlPath.includes('download/stream')) {
    return handleDownloadStream(req, res);
  }
  if (urlPath.includes('download/zip')) {
    return handleDownloadZip(req, res);
  }
  if (urlPath.includes('qr/shorten')) {
    return handleQrShorten(req, res);
  }

  return sendJsonResponse(res, 200, {
    status: 'ok',
    engine: 'insta1000gram-serverless-v6',
  });
}
