import { handleQrShorten } from '../_core.js';

export default async function handler(req, res) {
  return handleQrShorten(req, res);
}
