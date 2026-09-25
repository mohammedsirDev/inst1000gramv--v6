import { handleDownloadStream } from '../../src/lib/instagramCore.ts';

export default async function handler(req: any, res: any) {
  return handleDownloadStream(req, res);
}
