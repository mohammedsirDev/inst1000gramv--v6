import { handleQrShorten } from '../../src/lib/instagramCore.ts';

export default async function handler(req: any, res: any) {
  return handleQrShorten(req, res);
}
