import { handleDownloadStream } from '../../src/lib/instagramCore';

export default async function handler(req: any, res: any) {
  return handleDownloadStream(req, res);
}
