import { handleDownloadZip } from '../../src/lib/instagramCore';

export default async function handler(req: any, res: any) {
  return handleDownloadZip(req, res);
}
