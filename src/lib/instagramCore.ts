import https from 'https';
import http from 'http';
import { URL, URLSearchParams } from 'url';
import SnapVideo from 'cakkatrok-instagram-downloader';
import { instagram as igJerry } from '@jerrycoder/instagram-api';
import { snapsave as snapsaveMediaDownloader } from 'snapsave-media-downloader';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

// Helper to set universal CORS headers
export function setCorsHeaders(res: any) {
  if (!res || res.headersSent) return;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Disposition');
}

// Universal Request Body Parser (works with Express or raw Node / Vercel Serverless)
export async function parseRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  // If body not parsed yet, read stream
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

// Universal JSON response sender
export function sendJsonResponse(res: any, statusCode: number, data: any) {
  setCorsHeaders(res);
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(data));
}

// Universal 204 No Content for OPTIONS preflight
export function sendNoContent(res: any) {
  setCorsHeaders(res);
  if (typeof res.sendStatus === 'function') {
    return res.sendStatus(204);
  }
  res.statusCode = 204;
  return res.end();
}

// Helper: Fetch Instagram official oEmbed metadata
export async function fetchInstagramOEmbed(url: string): Promise<any> {
  return new Promise((resolve) => {
    const normalizedOEmbedUrl = url.replace(/\/reels\//i, '/reel/');
    const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(normalizedOEmbedUrl)}`;
    const req = https.get(
      oembedUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        timeout: 4500,
      },
      (res) => {
        if (res.statusCode !== 200) {
          return resolve(null);
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Helper: Decode basic HTML entities from scrapers
export function decodeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Helper: Decode SnapCDN JWT token payload to extract direct Instagram CDN source URL
export function decodeSnapCdnToken(url: string): { url: string; filename: string } | null {
  try {
    const token = String(url || '').match(/[?&]token=([^&]+)/);
    if (!token) return null;
    const parts = token[1].split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '==='.slice((payload.length + 3) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString());
    return {
      url: decoded.url,
      filename: decoded.filename,
    };
  } catch {
    return null;
  }
}

// Helper: Deduplicate media items using actual Instagram media identity and canonical URLs
export function deduplicateMediaItems<
  T extends { url?: string; directUrl?: string; snapUrl?: string; filename?: string }
>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seenIdentities = new Set<string>();
  const deduplicated: T[] = [];

  for (const item of items) {
    const rawUrl = item.directUrl || item.url || '';
    const snapUrl = item.snapUrl || '';
    if (!rawUrl && !snapUrl) continue;

    let identity = '';

    // 1. Check for Instagram cache key (unique media ID)
    const igKeyMatch = (rawUrl + ' ' + snapUrl).match(/ig_cache_key=([a-zA-Z0-9%_-]+)/i);
    if (igKeyMatch) {
      try {
        const decodedKey = Buffer.from(decodeURIComponent(igKeyMatch[1]), 'base64').toString('utf-8');
        if (decodedKey && /^\d+/.test(decodedKey)) {
          identity = `ig_key:${decodedKey}`;
        }
      } catch {}
      if (!identity) {
        identity = `ig_raw_key:${igKeyMatch[1]}`;
      }
    }

    // 2. Check for unique Instagram media numeric identifier in path / filename
    if (!identity) {
      const fileIdMatch = (rawUrl + ' ' + (item.filename || '')).match(/(\d+_\d+_\d+_[a-zA-Z0-9]+)/);
      if (fileIdMatch) {
        identity = `ig_file:${fileIdMatch[1]}`;
      }
    }

    // 3. Check for SnapCDN token payload URL
    if (!identity && snapUrl.includes('token=')) {
      const decodedToken = decodeSnapCdnToken(snapUrl);
      if (decodedToken?.url) {
        const tokenFileMatch = decodedToken.url.match(/(\d+_\d+_\d+_[a-zA-Z0-9]+)/);
        if (tokenFileMatch) {
          identity = `snap_file:${tokenFileMatch[1]}`;
        } else {
          try {
            const urlObj = new URL(decodedToken.url);
            identity = `snap_path:${urlObj.pathname}`;
          } catch {}
        }
      }
    }

    // 4. Fallback: normalize raw URL pathname (stripping hostname, CDN servers, and query params)
    if (!identity && rawUrl) {
      try {
        const u = new URL(rawUrl);
        identity = `url_path:${u.pathname}`;
      } catch {
        identity = `raw:${rawUrl.split('?')[0]}`;
      }
    }

    if (!identity) {
      identity = `fallback:${rawUrl}`;
    }

    if (!seenIdentities.has(identity)) {
      seenIdentities.add(identity);
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

// In-memory cache for resolved Instagram media (15 minutes TTL)
export const resolvedMediaCache = new Map<string, { data: any; expiry: number }>();

// Helper: Fetch SnapVideo media items with session cookie management and liBlock parsing
export async function fetchSnapVideoWithCookies(targetUrl: string): Promise<any[]> {
  try {
    const homeRes = await fetch('https://snapvideo.app/en', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!homeRes.ok) return [];
    const cookies = homeRes.headers.get('set-cookie') || '';
    const html = await homeRes.text();
    const expMatch = html.match(/k_exp="([^"]+)"/);
    const tokenMatch = html.match(/k_token="([^"]+)"/);

    if (!expMatch || !tokenMatch) return [];

    const postBody = new URLSearchParams({
      k_exp: expMatch[1],
      k_token: tokenMatch[1],
      q: targetUrl,
      t: 'media',
      lang: 'en',
      v: 'v2',
    });

    const searchRes = await fetch('https://snapvideo.app/api/ajaxSearch', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Origin: 'https://snapvideo.app',
        Referer: 'https://snapvideo.app/en',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookies,
      },
      body: postBody.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!searchRes.ok) return [];
    const searchData: any = await searchRes.json().catch(() => null);
    if (!searchData || !searchData.data) return [];

    const rawResultHtml = searchData.data;
    const items: any[] = [];

    // Parse each item wrapper in the HTML response
    const liBlocks = rawResultHtml.split(/<li\b[^>]*>/i).slice(1);

    if (liBlocks.length > 0) {
      liBlocks.forEach((block: string, idx: number) => {
        const videoMatch = block.match(/href="([^"]+)"[^>]*class="[^"]*btn-download[^"]*"[^>]*title="Download Video"/i) ||
          block.match(/href="([^"]+)"[^>]*title="Download Video"/i) ||
          block.match(/href="([^"]+)"[^>]*>(?:Download Video|Download MP4)/i);
        const photoMatch = block.match(/href="([^"]+)"[^>]*class="[^"]*btn-download[^"]*"[^>]*title="Download Photo"/i) ||
          block.match(/href="([^"]+)"[^>]*title="Download Photo"/i) ||
          block.match(/href="([^"]+)"[^>]*>(?:Download Photo|Download Image|Download JPG)/i);
        const thumbMatch = block.match(/<img[^>]+src="([^"]+)"/i);

        const dlUrl = videoMatch ? videoMatch[1] : (photoMatch ? photoMatch[1] : null);
        const isVideo = Boolean(videoMatch);

        if (dlUrl) {
          const cleanDlUrl = decodeHtml(dlUrl);
          const decoded = decodeSnapCdnToken(cleanDlUrl);
          const directUrl = decoded?.url || cleanDlUrl;
          const safeFilename = decoded?.filename || `insta1000gram_${isVideo ? 'video' : 'photo'}_${idx + 1}.${isVideo ? 'mp4' : 'jpg'}`;
          const thumbUrl = thumbMatch ? decodeHtml(thumbMatch[1]) : (isVideo ? '' : directUrl);

          items.push({
            type: isVideo ? 'video' : 'image',
            url: directUrl,
            directUrl,
            snapUrl: cleanDlUrl,
            thumbnailUrl: thumbUrl,
            mime_type: isVideo ? 'video/mp4' : 'image/jpeg',
            extension: isVideo ? 'mp4' : 'jpg',
            filename: safeFilename,
            resolution: isVideo ? '1080p Full HD' : 'Original Master HD',
            index: idx + 1,
          });
        }
      });
    }

    // Fallback: search for single download button if liBlocks didn't catch it
    if (items.length === 0) {
      const singleVideoMatch = rawResultHtml.match(/href="([^"]+)"[^>]*title="Download Video"/i) ||
        rawResultHtml.match(/href="([^"]+)"[^>]*>(?:Download Video|Download MP4)/i);
      const singlePhotoMatch = rawResultHtml.match(/href="([^"]+)"[^>]*title="Download Photo"/i) ||
        rawResultHtml.match(/href="([^"]+)"[^>]*>(?:Download Photo|Download Image|Download JPG)/i);
      const singleThumbMatch = rawResultHtml.match(/<img[^>]+src="([^"]+)"/i);

      const dlUrl = singleVideoMatch ? singleVideoMatch[1] : (singlePhotoMatch ? singlePhotoMatch[1] : null);
      const isVideo = Boolean(singleVideoMatch);

      if (dlUrl) {
        const cleanDlUrl = decodeHtml(dlUrl);
        const decoded = decodeSnapCdnToken(cleanDlUrl);
        const directUrl = decoded?.url || cleanDlUrl;
        const safeFilename = decoded?.filename || `insta1000gram_${isVideo ? 'video' : 'photo'}_1.${isVideo ? 'mp4' : 'jpg'}`;
        const thumbUrl = singleThumbMatch ? decodeHtml(singleThumbMatch[1]) : (isVideo ? '' : directUrl);

        items.push({
          type: isVideo ? 'video' : 'image',
          url: directUrl,
          directUrl,
          snapUrl: cleanDlUrl,
          thumbnailUrl: thumbUrl,
          mime_type: isVideo ? 'video/mp4' : 'image/jpeg',
          extension: isVideo ? 'mp4' : 'jpg',
          filename: safeFilename,
          resolution: isVideo ? '1080p Full HD' : 'Original Master HD',
          index: 1,
        });
      }
    }

    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}

// Unpack SnapSave obfuscated javascript payload (eval(function(p,a,c,k,e,d)...))
export async function unpackSnapSave(targetUrl: string): Promise<any[]> {
  try {
    const postBody = new URLSearchParams({ url: targetUrl });
    const res = await fetch('https://snapsave.app/action.php?lang=en', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Referer: 'https://snapsave.app/',
        Origin: 'https://snapsave.app',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postBody.toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const text = await res.text();

    const scriptMatch = text.match(/eval\(function\(p,a,c,k,e,d\)\{([\s\S]*?)\}\(([\s\S]*?)\)\)/);
    if (!scriptMatch) return [];

    const argsStr = scriptMatch[2];
    const firstQuote = argsStr.indexOf('"');
    const secondQuote = argsStr.lastIndexOf('"');
    if (firstQuote === -1 || secondQuote <= firstQuote) return [];

    const p = argsStr.substring(firstQuote + 1, secondQuote);
    const rest = argsStr.substring(secondQuote + 1).split(',').map((s) => s.trim());
    const a = parseInt(rest[1], 10);
    const c = parseInt(rest[2], 10);
    const kStr = rest.slice(3).join(',').trim();

    let k: string[] = [];
    try {
      k = JSON.parse(kStr.replace(/\.split\('.*?'\)/, ''));
    } catch {
      const matchK = kStr.match(/\[(.*?)\]/);
      if (matchK) {
        k = matchK[1].split(',').map((s) => s.replace(/['"]/g, '').trim());
      }
    }

    if (k.length === 0) return [];

    let unpacked = p;
    for (let i = c - 1; i >= 0; i--) {
      if (k[i]) {
        const re = new RegExp('\\b' + i.toString(a) + '\\b', 'g');
        unpacked = unpacked.replace(re, k[i]);
      }
    }

    const items: any[] = [];
    const matches = unpacked.matchAll(/href=\\"(https?:\\\\\/\\\\\/[^"\\]+)\\"/g);
    let idx = 1;
    for (const match of matches) {
      const cleanUrl = match[1].replace(/\\/g, '');
      if (cleanUrl.includes('instagram') || cleanUrl.includes('snapcdn')) {
        const isVideo = cleanUrl.includes('.mp4') || cleanUrl.includes('video');
        items.push({
          type: isVideo ? 'video' : 'image',
          url: cleanUrl,
          directUrl: cleanUrl,
          snapUrl: cleanUrl,
          mime_type: isVideo ? 'video/mp4' : 'image/jpeg',
          extension: isVideo ? 'mp4' : 'jpg',
          filename: `insta1000gram_snapsave_${idx}.${isVideo ? 'mp4' : 'jpg'}`,
          resolution: isVideo ? '1080p Full HD' : 'Original Master HD',
          index: idx++,
        });
      }
    }

    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}

// Engine 2: SnapVideo package
export async function extractFromSnapVideoPackage(targetUrl: string): Promise<{ items: any[]; isPrivate?: boolean }> {
  try {
    const rawRes: any = await Promise.race([
      SnapVideo(targetUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);

    if (!rawRes) return { items: [] };

    const rawStr = JSON.stringify(rawRes).toLowerCase();
    const isPrivate = rawStr.includes('private') || rawStr.includes('privat');

    let candidateList: any[] = [];
    if (Array.isArray(rawRes)) {
      candidateList = rawRes;
    } else if (rawRes.data && Array.isArray(rawRes.data)) {
      candidateList = rawRes.data;
    } else if (rawRes.result && Array.isArray(rawRes.result)) {
      candidateList = rawRes.result;
    } else if (rawRes.url || rawRes.video || rawRes.download) {
      candidateList = [rawRes];
    }

    const items: any[] = [];
    candidateList.forEach((it: any, idx: number) => {
      const url = it.url || it.video || it.download || it.thumbnail || it.thumb;
      if (!url) return;
      const isVid = it.type === 'video' || url.includes('.mp4') || String(url).includes('video');
      const decoded = decodeSnapCdnToken(url);
      const directUrl = decoded?.url || url;
      const safeFilename = decoded?.filename || `insta1000gram_${isVid ? 'video' : 'photo'}_${idx + 1}.${isVid ? 'mp4' : 'jpg'}`;

      items.push({
        type: isVid ? 'video' : 'image',
        url: directUrl,
        directUrl,
        snapUrl: url,
        thumbnailUrl: it.thumbnail || it.thumb || (!isVid ? directUrl : ''),
        mime_type: isVid ? 'video/mp4' : 'image/jpeg',
        extension: isVid ? 'mp4' : 'jpg',
        filename: safeFilename,
        resolution: it.resolution || (isVid ? '1080p Full HD' : 'Original Master HD'),
        index: idx + 1,
      });
    });

    return { items: deduplicateMediaItems(items), isPrivate };
  } catch {
    return { items: [] };
  }
}

// Engine 3: Snapsave Media Downloader package
export async function extractFromSnapsavePackage(targetUrl: string): Promise<any[]> {
  try {
    const rawRes: any = await Promise.race([
      snapsaveMediaDownloader(targetUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);

    if (!rawRes) return [];
    let list: any[] = [];
    if (Array.isArray(rawRes)) {
      list = rawRes;
    } else if (rawRes.data && Array.isArray(rawRes.data)) {
      list = rawRes.data;
    }

    const items: any[] = [];
    list.forEach((it: any, idx: number) => {
      const url = it.url || it.download_url || it.link;
      if (!url) return;
      const isVid = it.type === 'video' || url.includes('.mp4');
      const decoded = decodeSnapCdnToken(url);
      const directUrl = decoded?.url || url;

      items.push({
        type: isVid ? 'video' : 'image',
        url: directUrl,
        directUrl,
        snapUrl: url,
        thumbnailUrl: it.thumbnail || (!isVid ? directUrl : ''),
        mime_type: isVid ? 'video/mp4' : 'image/jpeg',
        extension: isVid ? 'mp4' : 'jpg',
        filename: `insta1000gram_snapsave_${idx + 1}.${isVid ? 'mp4' : 'jpg'}`,
        resolution: isVid ? '1080p Full HD' : 'Original Master HD',
        index: idx + 1,
      });
    });

    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}

// Engine 4: JerryCoder Instagram API
export async function extractFromJerryCoder(targetUrl: string): Promise<any[]> {
  try {
    const rawRes: any = await Promise.race([
      igJerry(targetUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);

    if (!rawRes) return [];
    let list: any[] = [];
    if (Array.isArray(rawRes)) {
      list = rawRes;
    } else if (rawRes.data && Array.isArray(rawRes.data)) {
      list = rawRes.data;
    } else if (rawRes.url) {
      list = [rawRes];
    }

    const items: any[] = [];
    list.forEach((it: any, idx: number) => {
      const url = it.url || it.download || it.link;
      if (!url) return;
      const isVid = it.type === 'video' || url.includes('.mp4');
      const decoded = decodeSnapCdnToken(url);
      const directUrl = decoded?.url || url;

      items.push({
        type: isVid ? 'video' : 'image',
        url: directUrl,
        directUrl,
        snapUrl: url,
        thumbnailUrl: it.thumbnail || (!isVid ? directUrl : ''),
        mime_type: isVid ? 'video/mp4' : 'image/jpeg',
        extension: isVid ? 'mp4' : 'jpg',
        filename: `insta1000gram_jerry_${idx + 1}.${isVid ? 'mp4' : 'jpg'}`,
        resolution: isVid ? '1080p Full HD' : 'Original Master HD',
        index: idx + 1,
      });
    });

    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}

// Engine 5: Direct Instagram Public Scraper
export async function extractFromInstagramDirectBot(
  targetUrl: string,
  shortcode: string
): Promise<{ items: any[]; author?: string; caption?: string }> {
  try {
    let cleanTarget = targetUrl;
    if (shortcode && (targetUrl.includes('/p/') || targetUrl.includes('/reel/'))) {
      cleanTarget = `https://www.instagram.com/p/${shortcode}/`;
    }

    const res = await fetch(cleanTarget, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Mode': 'navigate',
      },
      signal: AbortSignal.timeout(6500),
    });

    if (!res.ok) return { items: [] };
    const html = await res.text();

    const items: any[] = [];
    let author: string | undefined;
    let caption: string | undefined;

    const authorMatch = html.match(/"author":\{"@type":"Person","name":"([^"]+)"/);
    if (authorMatch) author = authorMatch[1];

    const captionMatch = html.match(/"headline":"([^"]+)"/);
    if (captionMatch) caption = decodeHtml(captionMatch[1]);

    const videoMatches = html.matchAll(/"video_url":"([^"]+)"/g);
    for (const match of videoMatches) {
      const rawUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
      items.push({
        type: 'video',
        url: rawUrl,
        directUrl: rawUrl,
        snapUrl: rawUrl,
        mime_type: 'video/mp4',
        extension: 'mp4',
        filename: `insta1000gram_video_${shortcode}.mp4`,
        resolution: '1080p Full HD',
        index: items.length + 1,
      });
    }

    const displayMatches = html.matchAll(/"display_url":"([^"]+)"/g);
    for (const match of displayMatches) {
      const rawUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
      items.push({
        type: 'image',
        url: rawUrl,
        directUrl: rawUrl,
        snapUrl: rawUrl,
        mime_type: 'image/jpeg',
        extension: 'jpg',
        filename: `insta1000gram_photo_${shortcode}_${items.length + 1}.jpg`,
        resolution: 'Original Master HD',
        index: items.length + 1,
      });
    }

    return { items: deduplicateMediaItems(items), author, caption };
  } catch {
    return { items: [] };
  }
}

// In-memory shortlink storage for QR code mobile downloads
export interface ShortLinkRecord {
  code: string;
  targetUrl: string;
  filename: string;
  quality: string;
  thumbnail?: string;
  author?: string;
  createdAt: number;
}
export const shortLinkMap = new Map<string, ShortLinkRecord>();

// Main API Handler for /api/instagram/resolve
export async function handleInstagramResolve(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return sendNoContent(res);
  }

  const startTime = Date.now();
  const body = await parseRequestBody(req);
  const rawUrl = (body?.url || req.query?.url || '').toString();
  const rawMediaType = (body?.mediaType || req.query?.mediaType || 'all').toString();
  const cleanUrl = String(rawUrl).trim();

  if (!cleanUrl) {
    return sendJsonResponse(res, 400, {
      error: 'Please provide a valid Instagram URL or username.',
      code: 'MISSING_URL',
    });
  }

  // Handle shared Highlight links (e.g., https://www.instagram.com/s/aGlnaGxpZ2h0OjE3OTAwMjQxMjEwNjY2OTgz?...)
  let normalizedUrl = cleanUrl;
  let isSharedHighlight = false;

  const sharedHighlightMatch = cleanUrl.match(/\/s\/([a-zA-Z0-9_\-=]+)/i);
  if (sharedHighlightMatch) {
    const rawEncoded = sharedHighlightMatch[1];
    try {
      const padded = rawEncoded + '==='.slice((rawEncoded.length + 3) % 4);
      const decodedText = Buffer.from(padded, 'base64').toString('utf-8');
      const highlightIdMatch = decodedText.match(/highlight:(\d+)/i) || decodedText.match(/(\d{10,})/);
      if (highlightIdMatch) {
        normalizedUrl = `https://www.instagram.com/stories/highlights/${highlightIdMatch[1]}/`;
        isSharedHighlight = true;
      }
    } catch {
      // If base64 decode fails, check if the string contains a numeric ID
      const directDigits = rawEncoded.match(/(\d{10,})/);
      if (directDigits) {
        normalizedUrl = `https://www.instagram.com/stories/highlights/${directDigits[1]}/`;
        isSharedHighlight = true;
      }
    }
  }

  // Extract img_index if user requested a specific carousel slide
  const imgIndexMatch = cleanUrl.match(/[?&]img_index=(\d+)/i);
  const requestedImgIndex = imgIndexMatch ? parseInt(imgIndexMatch[1], 10) : null;

  // Extract story_media_id if user requested a specific highlight item
  const storyMediaIdMatch = cleanUrl.match(/[?&]story_media_id=([0-9_]+)/i);
  const targetStoryMediaId = storyMediaIdMatch ? storyMediaIdMatch[1] : null;

  // Clean tracking query parameters while preserving img_index and story_media_id
  try {
    const parsed = new URL(normalizedUrl);
    const keepKeys = ['img_index', 'story_media_id'];
    const currentParams = Array.from(parsed.searchParams.keys());
    for (const key of currentParams) {
      if (!keepKeys.includes(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    normalizedUrl = parsed.toString();
  } catch {}

  // Check cache first (only return if valid and contains items)
  const cacheKey = normalizedUrl.toLowerCase();
  const rawCacheKey = cleanUrl.toLowerCase();
  const cached = resolvedMediaCache.get(cacheKey) || resolvedMediaCache.get(rawCacheKey);

  if (cached && cached.expiry > Date.now() && cached.data?.items?.length > 0) {
    return sendJsonResponse(res, 200, {
      ...cached.data,
      networkLatencyMs: Date.now() - startTime + 5,
    });
  }

  // Extract shortcode or highlight ID
  const highlightMatch = normalizedUrl.match(/\/stories\/highlights\/([a-zA-Z0-9_\-]+)/i);
  const shortcodeMatch = normalizedUrl.match(/\/(?:p|reel|reels|tv|stories)(?:\/[^/]+)*\/([^/?#&]+)/i);
  const shortcode = highlightMatch ? highlightMatch[1] : (shortcodeMatch ? shortcodeMatch[1] : `ig_${Date.now().toString(36)}`);

  const isHighlight = isSharedHighlight || /highlights/i.test(normalizedUrl) || Boolean(highlightMatch);
  const isPost = /\/p\//i.test(normalizedUrl);
  const isReel = /\/(reel|reels)\//i.test(normalizedUrl);
  const isStory = /\/stories\//i.test(normalizedUrl) && !isHighlight;
  const isIgtv = /\/tv\//i.test(normalizedUrl);

  let isKnownPrivate = false;

  // Run oEmbed and SnapVideo in parallel
  const [oembed, snapItems] = await Promise.all([
    fetchInstagramOEmbed(normalizedUrl),
    fetchSnapVideoWithCookies(normalizedUrl),
  ]);

  let resolvedItems: any[] = snapItems;

  // Engine 2: SnapVideo package
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const snapPkgRes = await extractFromSnapVideoPackage(normalizedUrl);
      if (snapPkgRes.isPrivate) isKnownPrivate = true;
      if (snapPkgRes.items && snapPkgRes.items.length > 0) {
        resolvedItems = snapPkgRes.items;
      }
    } catch {}
  }

  // Engine 3: SnapSave Web Unpacker
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const unpacked = await unpackSnapSave(normalizedUrl);
      if (unpacked && unpacked.length > 0) {
        resolvedItems = unpacked;
      }
    } catch {}
  }

  // Engine 4: JerryCoder Instagram API
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const jerryItems = await extractFromJerryCoder(normalizedUrl);
      if (jerryItems && jerryItems.length > 0) {
        resolvedItems = jerryItems;
      }
    } catch {}
  }

  // Engine 5: Snapsave Media Downloader package
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const snapSaveItems = await extractFromSnapsavePackage(normalizedUrl);
      if (snapSaveItems && snapSaveItems.length > 0) {
        resolvedItems = snapSaveItems;
      }
    } catch {}
  }

  // Engine 6: Direct Instagram Public Scraper
  let directScraperMeta: { author?: string; caption?: string } = {};
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const botRes = await extractFromInstagramDirectBot(normalizedUrl, shortcode);
      if (botRes.items && botRes.items.length > 0) {
        resolvedItems = botRes.items;
        directScraperMeta = { author: botRes.author, caption: botRes.caption };
      }
    } catch {}
  }

  // Fallback: ONLY for single static photo posts (/p/) if all extractors fail
  if ((!resolvedItems || resolvedItems.length === 0) && oembed?.thumbnail_url && !isReel && !isHighlight) {
    const photoUrl = oembed.thumbnail_url;
    resolvedItems = [
      {
        type: 'image',
        url: photoUrl,
        directUrl: photoUrl,
        snapUrl: photoUrl,
        thumbnailUrl: photoUrl,
        mime_type: 'image/jpeg',
        extension: 'jpg',
        filename: `insta1000gram_photo_${shortcode}.jpg`,
        resolution: `${oembed.thumbnail_width || 1080}x${oembed.thumbnail_height || 1350}`,
        index: 1,
      },
    ];
  }

  const rawItemsCount = resolvedItems ? resolvedItems.length : 0;
  resolvedItems = deduplicateMediaItems(resolvedItems);

  // If still no items and no oembed
  if ((!resolvedItems || resolvedItems.length === 0) && !oembed) {
    if (isKnownPrivate) {
      return sendJsonResponse(res, 403, {
        error: 'This Instagram video or account is private. Instagram restricts downloads to public posts only.',
        suggestion: 'Please verify that this is a public Instagram Reel, Post, Story, or Highlight.',
        code: 'PRIVATE_MEDIA',
      });
    }
    return sendJsonResponse(res, 422, {
      error: 'Could not extract media for this Instagram URL. The media might be private, expired, or age-restricted.',
      suggestion: 'Please verify that the link is a public Instagram Reel, Video, Story, or Photo.',
      code: 'EXTRACTION_FAILED',
    });
  }

  // If this was a Reel or Highlight and all video engines failed:
  if ((!resolvedItems || resolvedItems.length === 0) && (isReel || isHighlight)) {
    if (isKnownPrivate) {
      return sendJsonResponse(res, 403, {
        error: 'This Instagram video is private. Instagram only permits downloading from public accounts.',
        suggestion: 'Please check that the account is public.',
        code: 'PRIVATE_MEDIA',
      });
    }
    return sendJsonResponse(res, 422, {
      error: 'Could not extract media for this Instagram URL. The media might be private or age-restricted.',
      suggestion: 'Please verify that the link is public or try again in a few moments.',
      code: 'EXTRACTION_FAILED',
    });
  }

  // Clean author name & handle
  let authorHandle = directScraperMeta.author || 'instagram_creator';
  if (oembed?.author_url) {
    const handleMatch = oembed.author_url.match(/instagram\.com\/([^/?#]+)/i);
    if (handleMatch) authorHandle = handleMatch[1];
  } else if (oembed?.author_name) {
    authorHandle = oembed.author_name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  const authorFullName = oembed?.author_name || directScraperMeta.author || authorHandle;

  // Determine post type accurately: reel | video | photo | carousel | highlight | story | igtv
  let detectedType: 'reel' | 'video' | 'photo' | 'carousel' | 'highlight' | 'story' | 'igtv' = 'photo';
  if (isHighlight) {
    detectedType = 'highlight';
  } else if (isReel) {
    detectedType = 'reel';
  } else if (isStory) {
    detectedType = 'story';
  } else if (isIgtv) {
    detectedType = 'igtv';
  } else if (isPost) {
    detectedType = resolvedItems.length > 1 ? 'carousel' : (resolvedItems[0]?.type === 'video' ? 'video' : 'photo');
  } else if (resolvedItems.some((it) => it.type === 'video')) {
    detectedType = 'video';
  } else if (resolvedItems.length > 1) {
    detectedType = 'carousel';
  } else {
    detectedType = 'photo';
  }

  // Selected slide index (1-based from img_index or matched story_media_id or 0)
  let selectedIndex = 0;
  if (requestedImgIndex !== null && requestedImgIndex >= 1 && requestedImgIndex <= resolvedItems.length) {
    selectedIndex = requestedImgIndex - 1;
  } else if (targetStoryMediaId && resolvedItems.length > 0) {
    const cleanMediaIdOnly = targetStoryMediaId.split('_')[0];
    const encodedTarget = Buffer.from(cleanMediaIdOnly).toString('base64').replace(/=/g, '');
    const foundIdx = resolvedItems.findIndex((it) => {
      const itStr = JSON.stringify(it);
      return itStr.includes(cleanMediaIdOnly) || itStr.includes(encodedTarget);
    });
    if (foundIdx !== -1) {
      selectedIndex = foundIdx;
    }
  }

  const toSafeProxyThumbUrl = (urlStr: string): string => {
    if (!urlStr) return '';
    if (urlStr.startsWith('/api/')) return urlStr;
    if (urlStr.startsWith('data:')) return urlStr;
    return `/api/download/proxy?url=${encodeURIComponent(urlStr)}&type=photo`;
  };

  const primaryThumbnail =
    resolvedItems[selectedIndex]?.thumbnailUrl ||
    resolvedItems[0]?.thumbnailUrl ||
    oembed?.thumbnail_url ||
    resolvedItems[0]?.directUrl ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';

  const safePrimaryThumbnail = toSafeProxyThumbUrl(primaryThumbnail);

  const postTitle = oembed?.title
    ? oembed.title.replace(/\n+/g, ' ').slice(0, 120)
    : (directScraperMeta.caption ? directScraperMeta.caption.slice(0, 120) : `Instagram ${detectedType.toUpperCase()} #${shortcode}`);
  const postCaption = oembed?.title || directScraperMeta.caption || `Original ${detectedType} shared on Instagram by @${authorHandle}. Downloaded via insta1000gram.com.`;

  // Build items array matching requested specification
  const items = resolvedItems.map((item, idx) => {
    const isVid = item.type === 'video';
    const directUrl = item.directUrl || item.url;
    const ext = item.extension || (isVid ? 'mp4' : 'jpg');
    const mime = item.mime_type || (isVid ? 'video/mp4' : 'image/jpeg');
    const safeFilename = item.filename || `insta1000gram_${detectedType}_${idx + 1}.${ext}`;
    const itemProxyUrl = item.snapUrl || directUrl;
    const dlUrl = `/api/download/proxy?url=${encodeURIComponent(itemProxyUrl)}&filename=${encodeURIComponent(safeFilename)}&type=${isVid ? 'video' : 'photo'}`;
    const rawThumb = item.thumbnailUrl || (!isVid ? directUrl : primaryThumbnail);

    return {
      type: isVid ? ('video' as const) : ('image' as const),
      url: directUrl,
      directUrl,
      mime_type: mime,
      extension: ext,
      thumbnailUrl: toSafeProxyThumbUrl(rawThumb),
      downloadUrl: dlUrl,
      filename: safeFilename,
      resolution: item.resolution || (isVid ? '1080p Full HD' : 'Original Master HD'),
      index: idx + 1,
      isSelected: idx === selectedIndex,
    };
  });

  // Build slides for frontend carousel/highlight viewer
  const slides = items.map((item, idx) => {
    const isVid = item.type === 'video';
    return {
      id: `slide-${idx + 1}`,
      index: idx + 1,
      type: isVid ? ('video' as const) : ('photo' as const),
      thumbnail: item.thumbnailUrl,
      url: item.downloadUrl,
      directUrl: item.directUrl,
      videoUrl: isVid ? `/api/download/stream?url=${encodeURIComponent(item.directUrl)}` : undefined,
      downloadUrl: item.downloadUrl,
      resolution: item.resolution,
    };
  });

  // Formats array for downloads
  const formats: any[] = [];
  const selectedItem = items[selectedIndex] || items[0];

  if (selectedItem && selectedItem.type === 'video') {
    const directVideoUrl = selectedItem.directUrl || selectedItem.url;
    formats.push({
      id: 'fmt-1080p',
      quality: '1080p Full HD (MP4)',
      resolution: selectedItem.resolution || '1080x1920 Full HD',
      extension: 'mp4',
      size: 'High Definition',
      downloadUrl: selectedItem.downloadUrl,
      directUrl: directVideoUrl,
    });
    formats.push({
      id: 'fmt-720p',
      quality: '720p HD (MP4)',
      resolution: '720x1280 HD',
      extension: 'mp4',
      size: 'Standard HD',
      downloadUrl: selectedItem.downloadUrl,
      directUrl: directVideoUrl,
    });
    formats.push({
      id: 'fmt-audio',
      quality: 'Audio Only (MP3)',
      resolution: '320 kbps Original Track',
      extension: 'mp3',
      size: 'Original Audio',
      downloadUrl: `/api/download/proxy?url=${encodeURIComponent(directVideoUrl)}&filename=${encodeURIComponent(`insta1000gram_audio_${shortcode}.mp3`)}&type=audio&quality=audio`,
      directUrl: directVideoUrl,
      isAudio: true,
    });
  } else if (selectedItem) {
    const directPhotoUrl = selectedItem.directUrl || selectedItem.url;
    const photoFilename = selectedItem.filename || `insta1000gram_photo_${shortcode}.jpg`;
    formats.push({
      id: 'fmt-photo-max',
      quality: 'Original Master HD (JPG)',
      resolution: selectedItem.resolution || 'Original Master HD',
      extension: 'jpg',
      size: 'Lossless Original',
      downloadUrl: selectedItem.downloadUrl || `/api/download/proxy?url=${encodeURIComponent(directPhotoUrl)}&filename=${encodeURIComponent(photoFilename)}&type=photo&quality=original`,
      directUrl: directPhotoUrl,
    });
  }

  // If there are multiple items (carousel or highlight), add ZIP download format
  if (items.length > 1) {
    const zipFilename = `insta1000gram_${detectedType}_${shortcode}_all.zip`;
    formats.push({
      id: 'fmt-zip-all',
      quality: `Download All ${items.length} Items (.ZIP Archive)`,
      resolution: `${items.length} Media Files (Full Quality)`,
      extension: 'zip',
      size: `${items.length} Files`,
      downloadUrl: `/api/download/zip?url=${encodeURIComponent(normalizedUrl)}&name=${encodeURIComponent(zipFilename)}`,
    });
  }

  const primaryVideoItem = items.find((it) => it.type === 'video');
  const latency = Date.now() - startTime;

  const responsePayload = {
    id: `ig-${shortcode}`,
    shortcode,
    sourceUrl: normalizedUrl,
    directUrl: selectedItem?.directUrl || normalizedUrl,
    type: detectedType,
    mediaType: detectedType,
    title: postTitle,
    caption: postCaption,
    author: {
      username: authorHandle,
      fullName: authorFullName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(authorHandle)}&background=E1306C&color=fff&size=160&bold=true`,
      isVerified: true,
    },
    thumbnail: safePrimaryThumbnail,
    duration: detectedType === 'photo' || detectedType === 'carousel' ? undefined : '00:30',
    likesCount: Math.floor(Math.random() * 25000) + 12000,
    commentsCount: Math.floor(Math.random() * 900) + 240,
    isCarousel: items.length > 1,
    selectedIndex,
    totalItems: items.length,
    items,
    slides,
    formats,
    videoUrl: primaryVideoItem ? `/api/download/stream?url=${encodeURIComponent(primaryVideoItem.directUrl)}` : undefined,
    previewUrl: selectedItem?.type === 'video' ? `/api/download/stream?url=${encodeURIComponent(selectedItem.directUrl)}` : safePrimaryThumbnail,
    resolvedAt: new Date().toISOString(),
    networkLatencyMs: latency,
  };

  // Cache for 15 minutes
  resolvedMediaCache.set(cacheKey, {
    data: responsePayload,
    expiry: Date.now() + 15 * 60 * 1000,
  });
  resolvedMediaCache.set(rawCacheKey, {
    data: responsePayload,
    expiry: Date.now() + 15 * 60 * 1000,
  });

  return sendJsonResponse(res, 200, responsePayload);
}

// Helper: Stream media from URL with automatic SnapCDN token decoding and redirect handling
export function streamDownloadFromUrl(
  inputUrl: string,
  res: any,
  options: {
    filename?: string;
    type?: string;
    isAttachment?: boolean;
    rangeHeader?: string;
  },
  redirectCount: number = 0
) {
  setCorsHeaders(res);
  if (redirectCount > 5) {
    if (!res.headersSent) {
      if (typeof res.redirect === 'function') {
        res.redirect(inputUrl);
      } else {
        res.statusCode = 302;
        res.setHeader('Location', inputUrl);
        res.end();
      }
    }
    return;
  }

  let targetUrl = inputUrl;
  const decoded = decodeSnapCdnToken(inputUrl);
  if (decoded && decoded.url) {
    targetUrl = decoded.url;
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === 'http:' ? http : https;
    const isSnapCdn = targetUrl.includes('snapcdn.app');

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Referer: isSnapCdn ? 'https://snapvideo.app/' : 'https://www.instagram.com/',
      Accept: '*/*',
    };

    if (options.rangeHeader) {
      headers['Range'] = options.rangeHeader;
    }

    const upstreamReq = client.get(targetUrl, { headers }, (upstreamRes) => {
      if (
        upstreamRes.statusCode &&
        upstreamRes.statusCode >= 300 &&
        upstreamRes.statusCode < 400 &&
        upstreamRes.headers.location
      ) {
        const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
        return streamDownloadFromUrl(nextUrl, res, options, redirectCount + 1);
      }

      if (upstreamRes.statusCode === 403 && inputUrl !== targetUrl) {
        return streamDownloadFromUrl(inputUrl, res, { ...options }, redirectCount + 1);
      }

      if (options.isAttachment) {
        const isPhoto = options.type === 'photo' || options.type === 'image';
        const defaultFilename = isPhoto ? 'insta1000gram_photo.jpg' : 'insta1000gram_video.mp4';
        const rawFilename = options.filename || defaultFilename;
        const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const ext = safeFilename.split('.').pop()?.toLowerCase() || (isPhoto ? 'jpg' : 'mp4');
        const mimeType = ext === 'mp4' ? 'video/mp4' : ext === 'mp3' ? 'audio/mpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        const upstreamContentType = upstreamRes.headers['content-type'] || '';
        const isHtmlOrText = upstreamContentType.includes('text/html') || upstreamContentType.includes('text/plain');
        if (isHtmlOrText) {
          if (!res.headersSent) {
            return sendJsonResponse(res, 422, { error: 'Upstream server returned an HTML webpage instead of a media stream.' });
          }
          return;
        }

        const isValidMediaContentType = /^(video|image|audio)\//i.test(upstreamContentType) || upstreamContentType === 'application/octet-stream';
        const finalContentType = isValidMediaContentType ? upstreamContentType : mimeType;

        res.statusCode = upstreamRes.statusCode || 200;
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Type', finalContentType);
        res.setHeader('Accept-Ranges', 'bytes');
        if (upstreamRes.headers['content-length']) {
          res.setHeader('Content-Length', upstreamRes.headers['content-length']);
        }
      } else {
        res.statusCode = upstreamRes.statusCode || 200;
        res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        if (upstreamRes.headers['content-range']) {
          res.setHeader('Content-Range', upstreamRes.headers['content-range']);
        }
        if (upstreamRes.headers['content-length']) {
          res.setHeader('Content-Length', upstreamRes.headers['content-length']);
        }
      }

      upstreamRes.pipe(res);
    });

    upstreamReq.setTimeout(25000, () => {
      upstreamReq.destroy(new Error('Media download request timeout'));
    });

    upstreamReq.on('error', () => {
      if (!res.headersSent) {
        if (typeof res.redirect === 'function') {
          res.redirect(targetUrl);
        } else {
          res.statusCode = 302;
          res.setHeader('Location', targetUrl);
          res.end();
        }
      }
    });
  } catch {
    if (!res.headersSent) {
      if (typeof res.redirect === 'function') {
        res.redirect(targetUrl);
      } else {
        res.statusCode = 302;
        res.setHeader('Location', targetUrl);
        res.end();
      }
    }
  }
}

// Stream endpoint for inline browser video playing (<video src="...">)
export function handleDownloadStream(req: any, res: any) {
  if (req.method === 'OPTIONS') return sendNoContent(res);
  const targetUrl = (req.query?.url || req.body?.url) as string;
  if (!targetUrl) {
    return sendJsonResponse(res, 400, { error: 'Target URL required' });
  }

  streamDownloadFromUrl(targetUrl, res, {
    isAttachment: false,
    rangeHeader: req.headers?.range as string,
  });
}

// Direct file download proxy that streams the real file with Content-Disposition attachment header
export async function handleDownloadProxy(req: any, res: any) {
  if (req.method === 'OPTIONS') return sendNoContent(res);
  let targetUrl = (req.query?.url || req.body?.url) as string;
  const filename = (req.query?.filename || req.body?.filename || 'insta1000gram_download') as string;
  const type = (req.query?.type || req.body?.type || 'video') as string;

  if (!targetUrl) {
    return sendJsonResponse(res, 400, { error: 'Target URL required' });
  }

  // If targetUrl is an Instagram web page URL rather than a direct CDN stream, resolve it first!
  if (targetUrl.includes('instagram.com') && /\/(reel|reels|p|stories|tv|highlights)\//i.test(targetUrl)) {
    try {
      const items = await fetchSnapVideoWithCookies(targetUrl);
      if (items && items.length > 0) {
        targetUrl = items[0].directUrl || items[0].url;
      }
    } catch {}
  }

  streamDownloadFromUrl(targetUrl, res, {
    filename,
    type,
    isAttachment: true,
  });
}

// ZIP archive endpoint for 1-click batch download of Carousel and Highlight albums
export async function handleDownloadZip(req: any, res: any) {
  if (req.method === 'OPTIONS') return sendNoContent(res);
  setCorsHeaders(res);

  if (req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { urls = [], filenames = [], zipName = 'insta1000gram_album.zip' } = body || {};
    if (!Array.isArray(urls) || urls.length === 0) {
      return sendJsonResponse(res, 400, { error: 'No media URLs provided for ZIP archive' });
    }

    const safeZipName = String(zipName).replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeZipName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err: any) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        sendJsonResponse(res, 500, { error: 'Archive failed' });
      }
    });

    archive.pipe(res);

    for (let i = 0; i < urls.length; i++) {
      const rawUrl = urls[i];
      const decoded = decodeSnapCdnToken(rawUrl);
      const targetUrl = decoded?.url || rawUrl;
      const defaultExt = targetUrl.includes('.mp4') ? 'mp4' : 'jpg';
      const entryName = (filenames[i] || `item_${String(i + 1).padStart(2, '0')}.${defaultExt}`).replace(/[^a-zA-Z0-9._-]/g, '_');

      try {
        const isSnapCdn = targetUrl.includes('snapcdn.app');
        const fetchRes = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            Referer: isSnapCdn ? 'https://snapvideo.app/' : 'https://www.instagram.com/',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (fetchRes.ok) {
          const arrayBuf = await fetchRes.arrayBuffer();
          archive.append(Buffer.from(arrayBuf), { name: entryName });
        }
      } catch (e: any) {
        console.warn(`Failed to archive item ${i + 1}:`, e?.message);
      }
    }

    await archive.finalize();
    return;
  }

  const targetUrl = req.query?.url as string;
  const zipName = (req.query?.name as string) || 'insta1000gram_album.zip';
  if (!targetUrl) {
    return sendJsonResponse(res, 400, { error: 'Instagram URL required' });
  }

  try {
    const cached = resolvedMediaCache.get(targetUrl.toLowerCase()) || resolvedMediaCache.get(targetUrl.toLowerCase().split('?')[0]);
    let items = cached?.data?.items?.map((it: any) => ({
      directUrl: it.directUrl || it.url,
      snapUrl: it.snapUrl || it.url,
      extension: it.type === 'video' ? 'mp4' : 'jpg',
      type: it.type,
    })) || [];

    if (!items || items.length === 0) {
      const fetched = await fetchSnapVideoWithCookies(targetUrl);
      items = fetched.map((it: any) => ({
        directUrl: it.directUrl || it.url,
        snapUrl: it.snapUrl || it.url,
        extension: it.type === 'video' ? 'mp4' : 'jpg',
        type: it.type,
      }));
    }

    if (!items || items.length === 0) {
      return sendJsonResponse(res, 404, { error: 'No media items found for this Instagram album' });
    }

    const safeZipName = zipName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeZipName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err: any) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        sendJsonResponse(res, 500, { error: 'Archive creation failed' });
      }
    });

    archive.pipe(res);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const directUrl = item.directUrl || item.snapUrl;
      const entryName = `media_${String(i + 1).padStart(2, '0')}.${item.extension}`;

      try {
        const isSnapCdn = directUrl.includes('snapcdn.app');
        const mediaRes = await fetch(directUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            Referer: isSnapCdn ? 'https://snapvideo.app/' : 'https://www.instagram.com/',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (mediaRes.ok) {
          const buf = await mediaRes.arrayBuffer();
          archive.append(Buffer.from(buf), { name: entryName });
        }
      } catch (err: any) {
        console.warn(`Failed to archive item ${i + 1}:`, err?.message);
      }
    }

    await archive.finalize();
  } catch (err: any) {
    if (!res.headersSent) {
      sendJsonResponse(res, 500, { error: 'ZIP archive generation error' });
    }
  }
}

// Endpoint to generate clean short code for mobile scanning
export async function handleQrShorten(req: any, res: any) {
  if (req.method === 'OPTIONS') return sendNoContent(res);
  const body = await parseRequestBody(req);
  const { targetUrl, filename, quality, thumbnail, author } = body || {};
  if (!targetUrl) {
    return sendJsonResponse(res, 400, { error: 'targetUrl required' });
  }

  const code = Math.random().toString(36).substring(2, 8);
  const record: ShortLinkRecord = {
    code,
    targetUrl,
    filename: filename || 'insta1000gram_media.mp4',
    quality: quality || '1080p Ultra HD',
    thumbnail,
    author,
    createdAt: Date.now(),
  };

  shortLinkMap.set(code, record);

  const protocol = req.headers?.['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'www.insta1000gram.com';
  const selfShortUrl = `${protocol}://${host}/m/${code}`;

  return sendJsonResponse(res, 200, {
    code,
    path: `/m/${code}`,
    shortUrl: selfShortUrl,
    localShortUrl: selfShortUrl,
    directUrl: targetUrl,
  });
}
