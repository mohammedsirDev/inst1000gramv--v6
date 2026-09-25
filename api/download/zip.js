import { handleDownloadZip } from '../_core.js';

export default async function handler(req, res) {
  return handleDownloadZip(req, res);
}
