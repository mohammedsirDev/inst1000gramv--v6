import { handleDownloadProxy } from '../../src/lib/instagramCore';

export default async function handler(req: any, res: any) {
  return handleDownloadProxy(req, res);
}
