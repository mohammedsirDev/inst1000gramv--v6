import { handleDownloadProxy } from '../_core.js';

export default async function handler(req, res) {
  return handleDownloadProxy(req, res);
}
