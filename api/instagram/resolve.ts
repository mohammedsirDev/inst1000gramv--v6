import { handleInstagramResolve } from '../../src/lib/instagramCore';

export default async function handler(req: any, res: any) {
  return handleInstagramResolve(req, res);
}
