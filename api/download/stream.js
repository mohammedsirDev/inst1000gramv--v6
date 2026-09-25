import { handleDownloadStream } from '../_core.js';

export default async function handler(req, res) {
  return handleDownloadStream(req, res);
}
