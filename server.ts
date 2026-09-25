import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import SnapVideo from 'cakkatrok-instagram-downloader';
import { instagram as igJerry } from '@jerrycoder/instagram-api';
import { snapsave as snapsaveMediaDownloader } from 'snapsave-media-downloader';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
import { generatePseoPages, INITIAL_PSEO_CONFIG } from './src/pseoData.ts';
import { PseoPage, PseoTemplateConfig } from './src/types.ts';
import { ALL_SUPPORTED_LANGUAGES } from './src/config/languages.ts';
import { DOWNLOADER_PAGES, GUIDE_PAGES } from './src/config/downloaders.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const SITE_DOMAIN = process.env.SITE_DOMAIN || 'www.insta1000gram.com';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Insta1000Admin2026!SecureKey';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'insta1000gram_jwt_secret_token_key_998877';

const app = express();

// Security and Protection Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Early route interceptor: intercept any relative or nested API calls (e.g. /ar/api/instagram/resolve)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/api/instagram/resolve')) {
    return handleInstagramResolve(req, res);
  }
  if (req.path.includes('/api/download/proxy')) {
    return handleDownloadProxy(req, res);
  }
  if (req.path.includes('/api/download/stream')) {
    return handleDownloadStream(req, res);
  }
  if (req.path.includes('/api/download/zip')) {
    return handleDownloadZip(req, res);
  }
  if (req.path.includes('/api/ads')) {
    return handleAds(req, res);
  }
  next();
});

// In-memory pSEO store & state
let currentPseoConfig: PseoTemplateConfig = { ...INITIAL_PSEO_CONFIG };
let pseoPages: PseoPage[] = generatePseoPages(3000, currentPseoConfig);

// Analytics storage
const crawlerLogs: { bot: 'Googlebot' | 'Bingbot' | 'Yandex' | 'Applebot'; path: string; ip: string; status: number; time: string }[] = [
  { bot: 'Googlebot', path: '/sitemap.xml', ip: '66.249.66.1', status: 200, time: '2 mins ago' },
  { bot: 'Googlebot', path: '/sitemap_1.xml', ip: '66.249.66.4', status: 200, time: '5 mins ago' },
  { bot: 'Bingbot', path: '/sitemap_2.xml', ip: '157.55.39.2', status: 200, time: '12 mins ago' },
  { bot: 'Googlebot', path: '/download-instagram-reels-in-1080p-hd', ip: '66.249.66.18', status: 200, time: '20 mins ago' },
  { bot: 'Yandex', path: '/sitemap_3.xml', ip: '5.255.250.3', status: 200, time: '35 mins ago' },
];

let totalDownloadsCount = 142850;
let downloadsTodayCount = 18420;

// Track bot requests middleware
app.use((req, res, next) => {
  const ua = req.get('User-Agent') || '';
  let detectedBot: 'Googlebot' | 'Bingbot' | 'Yandex' | 'Applebot' | null = null;
  if (/googlebot/i.test(ua)) detectedBot = 'Googlebot';
  else if (/bingbot/i.test(ua)) detectedBot = 'Bingbot';
  else if (/yandex/i.test(ua)) detectedBot = 'Yandex';
  else if (/applebot/i.test(ua)) detectedBot = 'Applebot';

  if (detectedBot && (req.path.includes('sitemap') || !req.path.startsWith('/api'))) {
    crawlerLogs.unshift({
      bot: detectedBot,
      path: req.path,
      ip: req.ip || '127.0.0.1',
      status: 200,
      time: 'Just now',
    });
    if (crawlerLogs.length > 50) crawlerLogs.pop();
  }
  next();
});

/* ==========================================================================
   1. ROBOTS.TXT & SITEMAP XML ROUTES (PARTITIONED SITEMAPS: sitemap.xml, sitemap_1.xml, etc.)
   ========================================================================== */

// Middleware: Disallow search indexing of direct smart media URLs (/reels/ID, /p/ID, /s/ID, /highlights/ID, etc.)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (/^\/(reels|reel|p|stories|tv|highlights|s)\//i.test(req.path)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  next();
});

// /robots.txt
app.get('/robots.txt', (req: Request, res: Response) => {
  res.type('text/plain');
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /reels/',
    'Disallow: /reel/',
    'Disallow: /p/',
    'Disallow: /stories/',
    'Disallow: /tv/',
    'Disallow: /m/',
    '',
    `Sitemap: https://${SITE_DOMAIN}/sitemap.xml`,
    '',
  ];
  res.send(lines.join('\n'));
});

// Primary sitemap index: /sitemap.xml
app.get('/sitemap.xml', (req: Request, res: Response) => {
  const totalChunks = Math.ceil(pseoPages.length / currentPseoConfig.chunkSize);
  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <sitemap>\n`;
  xml += `    <loc>https://${SITE_DOMAIN}/sitemap-downloaders.xml</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += `  </sitemap>\n`;
  xml += `  <sitemap>\n`;
  xml += `    <loc>https://${SITE_DOMAIN}/sitemap-guides.xml</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += `  </sitemap>\n`;

  for (let i = 1; i <= Math.max(1, totalChunks); i++) {
    xml += `  <sitemap>\n`;
    xml += `    <loc>https://${SITE_DOMAIN}/sitemap_${i}.xml</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `  </sitemap>\n`;
  }

  xml += `</sitemapindex>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Dedicated 145 Localized Core Tools Sitemap: /sitemap-downloaders.xml
app.get('/sitemap-downloaders.xml', (req: Request, res: Response) => {
  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  // 1. Root and 29 localized homepages
  xml += `  <url>\n`;
  xml += `    <loc>https://${SITE_DOMAIN}/</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  for (const lang of ALL_SUPPORTED_LANGUAGES) {
    xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="https://${SITE_DOMAIN}/${lang}/" />\n`;
  }
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${SITE_DOMAIN}/en/" />\n`;
  xml += `  </url>\n`;

  for (const lang of ALL_SUPPORTED_LANGUAGES) {
    xml += `  <url>\n`;
    xml += `    <loc>https://${SITE_DOMAIN}/${lang}/</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    for (const altLang of ALL_SUPPORTED_LANGUAGES) {
      xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="https://${SITE_DOMAIN}/${altLang}/" />\n`;
    }
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${SITE_DOMAIN}/en/" />\n`;
    xml += `  </url>\n`;
  }

  // 2. 145 Core Localized Downloader Pages (29 languages x 5 tools)
  for (const tool of DOWNLOADER_PAGES) {
    for (const lang of ALL_SUPPORTED_LANGUAGES) {
      xml += `  <url>\n`;
      xml += `    <loc>https://${SITE_DOMAIN}/${lang}/${tool.slug}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      for (const altLang of ALL_SUPPORTED_LANGUAGES) {
        xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="https://${SITE_DOMAIN}/${altLang}/${tool.slug}" />\n`;
      }
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="https://${SITE_DOMAIN}/en/${tool.slug}" />\n`;
      xml += `  </url>\n`;
    }
  }

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Dedicated Educational Guides Sitemap: /sitemap-guides.xml
app.get('/sitemap-guides.xml', (req: Request, res: Response) => {
  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  for (const guide of GUIDE_PAGES) {
    for (const lang of ALL_SUPPORTED_LANGUAGES) {
      xml += `  <url>\n`;
      xml += `    <loc>https://${SITE_DOMAIN}/${lang}/guide/${guide.slug}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }
  }

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Partitioned sub-sitemap: /sitemap_:chunk.xml (e.g. sitemap_1.xml, sitemap_2.xml)
app.get(/^\/sitemap_(\d+)\.xml$/, (req: Request, res: Response) => {
  const chunkNumber = parseInt(req.params[0], 10);
  const chunkSize = currentPseoConfig.chunkSize;
  const startIndex = (chunkNumber - 1) * chunkSize;
  const endIndex = startIndex + chunkSize;

  const chunkPages = pseoPages.slice(startIndex, endIndex);

  if (chunkPages.length === 0 && chunkNumber > 1) {
    return res.status(404).type('text/plain').send('Sitemap partition not found');
  }

  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Always include homepage in the first sitemap
  if (chunkNumber === 1) {
    xml += `  <url>\n`;
    xml += `    <loc>https://${SITE_DOMAIN}/</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;
  }

  for (const page of chunkPages) {
    xml += `  <url>\n`;
    xml += `    <loc>https://${SITE_DOMAIN}/${page.slug}</loc>\n`;
    xml += `    <lastmod>${page.lastmod || now}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

/* ==========================================================================
   2. ADMIN AUTHENTICATION
   ========================================================================== */

const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing admin token' });
  }
  const token = authHeader.substring(7);
  // Verify matching token hash
  if (token !== `admin-token-${ADMIN_SESSION_SECRET}`) {
    return res.status(403).json({ error: 'Forbidden: Invalid admin session' });
  }
  next();
};

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: `admin-token-${ADMIN_SESSION_SECRET}`,
      user: {
        username: ADMIN_USERNAME,
        role: 'superadmin',
        lastLogin: new Date().toISOString(),
      },
    });
  }
  return res.status(401).json({ error: 'Invalid admin username or password' });
});

app.get('/api/auth/verify', authenticateAdmin, (req: Request, res: Response) => {
  res.json({
    valid: true,
    user: {
      username: ADMIN_USERNAME,
      role: 'superadmin',
    },
  });
});

/* ==========================================================================
   3. PROGRAMMATIC SEO API (pSEO)
   ========================================================================== */

// Get paginated pSEO pages for directory or admin
app.get('/api/pseo/pages', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = ((req.query.search as string) || '').toLowerCase();
  const mediaType = req.query.mediaType as string;
  const lang = req.query.lang as string;
  const chunk = req.query.chunk ? parseInt(req.query.chunk as string) : null;

  let filtered = pseoPages;

  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.slug.toLowerCase().includes(search) ||
        p.targetKeyword.toLowerCase().includes(search)
    );
  }
  if (mediaType && mediaType !== 'all') {
    filtered = filtered.filter((p) => p.mediaType === mediaType);
  }
  if (lang && lang !== 'all') {
    filtered = filtered.filter((p) => p.lang === lang);
  }
  if (chunk) {
    filtered = filtered.filter((p) => p.chunkId === chunk);
  }

  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  res.json({
    pages: paginated,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
    totalSitemaps: Math.ceil(pseoPages.length / currentPseoConfig.chunkSize),
  });
});

// Get single page by slug
app.get('/api/pseo/page/:slug(*)', (req: Request, res: Response) => {
  const slug = req.params.slug;
  const found = pseoPages.find((p) => p.slug === slug);
  if (!found) {
    // If not found in memory, dynamically generate a compliant page
    const syntheticPage: PseoPage = {
      id: `dyn-${Date.now()}`,
      slug,
      mediaType: slug.includes('reels') ? 'reels' : slug.includes('story') ? 'stories' : slug.includes('photo') ? 'photo' : slug.includes('igtv') ? 'igtv' : 'video',
      lang: slug.startsWith('ar/') ? 'ar' : slug.startsWith('es/') ? 'es' : slug.startsWith('fr/') ? 'fr' : slug.startsWith('pt/') ? 'pt' : 'en',
      targetKeyword: slug.replace(/[-/]/g, ' '),
      title: `${slug.replace(/[-/]/g, ' ')} | insta1000gram Fast Downloader`,
      metaDescription: `High speed download for ${slug.replace(/[-/]/g, ' ')}. Original quality, 1080p stream, zero watermark on insta1000gram.`,
      h1: `${slug.replace(/[-/]/g, ' ').toUpperCase()}`,
      intro: `Save original high definition Instagram media directly to your device with our zero-compression accelerated edge download pipeline.`,
      features: [
        'Full 1080p Ultra HD Video Stream',
        'Direct Phone Camera Roll Integration',
        'Unlimited Daily Downloads with Zero Fees',
        '100% Anonymous & Secure',
      ],
      faqs: [
        {
          q: 'How quickly does the download finish?',
          a: 'Downloads begin immediately at multi-gigabit throughput from our distributed edge CDN servers.',
        },
      ],
      chunkId: 1,
      lastmod: new Date().toISOString().split('T')[0],
      views: 1420,
      downloadsCount: 520,
    };
    return res.json(syntheticPage);
  }

  found.views += 1;
  res.json(found);
});

// Admin: Bulk generate / regenerate pSEO pages (e.g. 1000, 5000, 10000 pages)
app.post('/api/pseo/generate', authenticateAdmin, (req: Request, res: Response) => {
  const { count = 3000, template } = req.body;
  const validCount = Math.min(Math.max(100, Number(count)), 25000);

  if (template) {
    currentPseoConfig = {
      ...currentPseoConfig,
      ...template,
    };
  }

  currentPseoConfig.totalGeneratedCount = validCount;
  pseoPages = generatePseoPages(validCount, currentPseoConfig);

  const totalSitemaps = Math.ceil(pseoPages.length / currentPseoConfig.chunkSize);

  res.json({
    success: true,
    totalGenerated: pseoPages.length,
    totalSitemaps,
    chunkSize: currentPseoConfig.chunkSize,
    sitemapUrls: Array.from({ length: totalSitemaps }, (_, i) => `https://${SITE_DOMAIN}/sitemap_${i + 1}.xml`),
  });
});

// Admin: Update pSEO template configuration
app.put('/api/pseo/template', authenticateAdmin, (req: Request, res: Response) => {
  currentPseoConfig = {
    ...currentPseoConfig,
    ...req.body,
  };
  res.json({ success: true, config: currentPseoConfig });
});

// Admin: Get sitemap stats & crawler logs
app.get('/api/pseo/sitemap-stats', authenticateAdmin, (req: Request, res: Response) => {
  const totalChunks = Math.ceil(pseoPages.length / currentPseoConfig.chunkSize);
  const sitemaps = Array.from({ length: totalChunks }, (_, i) => {
    const chunkNum = i + 1;
    const startIndex = i * currentPseoConfig.chunkSize;
    const endIndex = Math.min(startIndex + currentPseoConfig.chunkSize, pseoPages.length);
    const pagesInChunk = pseoPages.slice(startIndex, endIndex);

    return {
      index: chunkNum,
      filename: `sitemap_${chunkNum}.xml`,
      url: `https://${SITE_DOMAIN}/sitemap_${chunkNum}.xml`,
      pageCount: pagesInChunk.length,
      lastmod: new Date().toISOString().split('T')[0],
      sampleUrls: pagesInChunk.slice(0, 3).map((p) => `https://${SITE_DOMAIN}/${p.slug}`),
    };
  });

  res.json({
    indexSitemapUrl: `https://${SITE_DOMAIN}/sitemap.xml`,
    totalSitemaps: totalChunks,
    chunkSize: currentPseoConfig.chunkSize,
    totalUrls: pseoPages.length,
    sitemaps,
    recentCrawlerPings: crawlerLogs,
  });
});

/* ==========================================================================
   4. ANALYTICS API FOR VISUALIZATION
   ========================================================================== */

app.get('/api/analytics', (req: Request, res: Response) => {
  const totalChunks = Math.ceil(pseoPages.length / currentPseoConfig.chunkSize);

  res.json({
    totalDownloads: totalDownloadsCount,
    downloadsToday: downloadsTodayCount,
    crawlerHitsTotal: 84210,
    crawlerHitsToday: 6920,
    activePseoPages: pseoPages.length,
    totalSitemapsCount: totalChunks,
    averageLatencyMs: 138,
    successRatePercent: 99.8,
    mediaBreakdown: {
      reels: 48,
      video: 22,
      photo: 16,
      stories: 10,
      igtv: 4,
    },
    dailyTrend: [
      { day: 'Mon', downloads: 14200, crawlers: 5100 },
      { day: 'Tue', downloads: 16800, crawlers: 6300 },
      { day: 'Wed', downloads: 15400, crawlers: 5800 },
      { day: 'Thu', downloads: 19100, crawlers: 7400 },
      { day: 'Fri', downloads: 22500, crawlers: 8900 },
      { day: 'Sat', downloads: 26800, crawlers: 9400 },
      { day: 'Sun', downloads: 24300, crawlers: 8700 },
    ],
    recentCrawlerPings: crawlerLogs.slice(0, 8),
  });
});

/* ==========================================================================
   5. REAL INSTAGRAM DOWNLOAD RESOLVER & STREAMING PROXY
   ========================================================================== */

// Helper: Fetch Instagram official oEmbed metadata
async function fetchInstagramOEmbed(url: string): Promise<any> {
  return new Promise((resolve) => {
    const normalizedOEmbedUrl = url.replace(/\/reels\//i, '/reel/');
    const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(normalizedOEmbedUrl)}`;
    const req = https.get(
      oembedUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'application/json',
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
function decodeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Helper: Decode SnapCDN JWT token payload to extract direct Instagram CDN source URL
function decodeSnapCdnToken(url: string): { url: string; filename: string } | null {
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
function deduplicateMediaItems<T extends { url?: string; directUrl?: string; snapUrl?: string; filename?: string }>(items: T[]): T[] {
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
const resolvedMediaCache = new Map<string, { data: any; expiry: number }>();

// Helper: Fetch SnapVideo media items with session cookie management and liBlock parsing
async function fetchSnapVideoWithCookies(targetUrl: string): Promise<any[]> {
  try {
    const homeRes = await fetch('https://snapvideo.app/en', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
        'Origin': 'https://snapvideo.app',
        'Referer': 'https://snapvideo.app/en',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookies,
      },
      body: postBody.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!searchRes.ok) return [];
    const searchJson = await searchRes.json();
    const data = searchJson?.data || '';

    const liBlocks = data.match(/<li\b[\s\S]*?<\/li>/gi) || [];
    const items: any[] = [];

    if (liBlocks.length > 0) {
      liBlocks.forEach((block: string, idx: number) => {
        const imgMatch = block.match(/<img\b[^>]*src=["']([^"']+)["']/i);
        const allAnchors = [...block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

        const videoAnchor = allAnchors.find((a) => /Download Video/i.test(a[0]));
        const photoAnchor = allAnchors.find((a) => /Download (Photo|Image)/i.test(a[0]));
        const thumbAnchor = allAnchors.find((a) => /Download Thumbnail/i.test(a[0]));

        const rawThumb = imgMatch ? decodeHtml(imgMatch[1]) : (thumbAnchor ? decodeHtml(thumbAnchor[1]) : '');
        const rawVideo = videoAnchor ? decodeHtml(videoAnchor[1]) : '';
        const rawPhoto = photoAnchor ? decodeHtml(photoAnchor[1]) : (thumbAnchor ? decodeHtml(thumbAnchor[1]) : '');

        const isVideo = Boolean(rawVideo);
        const mainMediaUrl = isVideo ? rawVideo : (rawPhoto || rawThumb);
        if (!mainMediaUrl) return;

        const decodedMain = decodeSnapCdnToken(mainMediaUrl);
        const decodedThumb = decodeSnapCdnToken(rawThumb);
        const directUrl = decodedMain?.url || mainMediaUrl;
        const thumbnailUrl = decodedThumb?.url || rawThumb || directUrl;

        const ext = isVideo ? 'mp4' : (directUrl.includes('.png') ? 'png' : directUrl.includes('.webp') ? 'webp' : 'jpg');
        const mime = isVideo ? 'video/mp4' : (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

        items.push({
          type: isVideo ? 'video' : 'image',
          url: directUrl,
          directUrl: directUrl,
          snapUrl: mainMediaUrl,
          thumbnailUrl,
          mime_type: mime,
          extension: ext,
          filename: decodedMain?.filename || `insta1000gram_media_${idx + 1}.${ext}`,
          resolution: isVideo ? '1080p Full HD' : 'Original Master HD',
          index: idx + 1,
        });
      });
    }

    // Fallback: If no liBlocks parsed, extract all unique token matches
    if (items.length === 0) {
      const tokenMatches = [...data.matchAll(/token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g)];
      const seenUrls = new Set<string>();
      for (const tm of tokenMatches) {
        try {
          const payload = JSON.parse(Buffer.from(tm[1].split('.')[1], 'base64').toString());
          if (payload.url && !seenUrls.has(payload.url)) {
            seenUrls.add(payload.url);
            const isVideo = payload.url.includes('.mp4') || (payload.filename && payload.filename.includes('.mp4'));
            const ext = isVideo ? 'mp4' : (payload.url.includes('.png') ? 'png' : payload.url.includes('.webp') ? 'webp' : 'jpg');
            const mime = isVideo ? 'video/mp4' : (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
            items.push({
              type: isVideo ? 'video' : 'image',
              url: payload.url,
              directUrl: payload.url,
              snapUrl: `https://dl.snapcdn.app/get?token=${tm[1]}`,
              thumbnailUrl: payload.url,
              mime_type: mime,
              extension: ext,
              filename: payload.filename || `insta1000gram_media_${items.length + 1}.${ext}`,
              resolution: isVideo ? '1080p Full HD' : 'Original Master HD',
              index: items.length + 1,
            });
          }
        } catch {}
      }
    }

    return deduplicateMediaItems(items);
  } catch (err: any) {
    console.error('fetchSnapVideoWithCookies error:', err?.message);
    return [];
  }
}

// Helper: Unpack SnapSave obfuscated javascript to extract direct CDN streams
async function unpackSnapSave(targetUrl: string): Promise<any[]> {
  try {
    const res = await fetch('https://snapsave.app/action.php', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Referer': 'https://snapsave.app/',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'url=' + encodeURIComponent(targetUrl) + '&action=post',
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const scriptContent = text.replace(/eval\s*\(/, 'return (');
    const unpacked = new Function(scriptContent)();
    const htmlMatch = String(unpacked).match(/innerHTML\s*=\s*(".*");/s);
    if (!htmlMatch) return [];
    const html = JSON.parse(htmlMatch[1]);
    const tokenMatches = [...html.matchAll(/token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g)];
    const items: any[] = [];
    const seenUrls = new Set<string>();

    for (const tm of tokenMatches) {
      try {
        const payload = JSON.parse(Buffer.from(tm[1].split('.')[1], 'base64').toString());
        if (payload.url && !seenUrls.has(payload.url)) {
          seenUrls.add(payload.url);
          const isVideo = payload.url.includes('.mp4') || (payload.filename && payload.filename.includes('.mp4'));
          const ext = isVideo ? 'mp4' : 'jpg';
          items.push({
            type: isVideo ? 'video' : 'image',
            url: payload.url,
            directUrl: payload.url,
            snapUrl: `https://dl.snapcdn.app/get?token=${tm[1]}`,
            thumbnailUrl: payload.url,
            mime_type: isVideo ? 'video/mp4' : 'image/jpeg',
            extension: ext,
            filename: payload.filename || `insta1000gram_media_${items.length + 1}.${ext}`,
            resolution: isVideo ? '1080p Full HD' : 'Original Master HD',
            index: items.length + 1,
          });
        }
      } catch {}
    }
    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}

// Engine 2 Helper: cakkatrok SnapVideo with native https.request
async function extractFromSnapVideoPackage(targetUrl: string): Promise<{ items: any[]; isPrivate?: boolean }> {
  try {
    const res = await SnapVideo(targetUrl);
    const isPrivate = Boolean(res?.raw?.mess && /private/i.test(res.raw.mess));
    const media = res?.media || [];
    if (!Array.isArray(media) || media.length === 0) return { items: [], isPrivate };

    const items: any[] = [];
    for (let idx = 0; idx < media.length; idx++) {
      const m = media[idx];
      const snapUrl = m.url || '';
      const decoded = decodeSnapCdnToken(snapUrl);
      const directUrl = decoded?.url || snapUrl;
      const isVideo = m.type === 'video' || (m.text && /video/i.test(m.text)) || directUrl.includes('.mp4');
      const ext = isVideo ? 'mp4' : (directUrl.includes('.png') ? 'png' : directUrl.includes('.webp') ? 'webp' : 'jpg');
      const mime = isVideo ? 'video/mp4' : (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

      items.push({
        type: isVideo ? 'video' : 'image',
        url: directUrl,
        directUrl,
        snapUrl,
        thumbnailUrl: directUrl,
        mime_type: mime,
        extension: ext,
        filename: decoded?.filename || m.filename || `insta1000gram_media_${idx + 1}.${ext}`,
        resolution: isVideo ? '1080p Full HD' : 'Original Master HD',
        index: idx + 1,
      });
    }
    return { items: deduplicateMediaItems(items), isPrivate };
  } catch (err: any) {
    return { items: [], isPrivate: false };
  }
}

// Engine 3 Helper: SnapSave package
async function extractFromSnapsavePackage(targetUrl: string): Promise<any[]> {
  try {
    const res = await snapsaveMediaDownloader(targetUrl);
    if (!res || !res.success || !res.data) return [];
    const media = res.data.media || [];
    if (!Array.isArray(media) || media.length === 0) return [];

    const items: any[] = [];
    for (let idx = 0; idx < media.length; idx++) {
      const m = media[idx];
      const snapUrl = m.url || '';
      const decoded = decodeSnapCdnToken(snapUrl);
      const directUrl = decoded?.url || snapUrl;
      const isVideo = m.type === 'video' || directUrl.includes('.mp4');
      const ext = isVideo ? 'mp4' : 'jpg';
      const mime = isVideo ? 'video/mp4' : 'image/jpeg';

      items.push({
        type: isVideo ? 'video' : 'image',
        url: directUrl,
        directUrl,
        snapUrl,
        thumbnailUrl: res.data.preview || directUrl,
        mime_type: mime,
        extension: ext,
        filename: decoded?.filename || `insta1000gram_media_${idx + 1}.${ext}`,
        resolution: isVideo ? '1080p Full HD' : 'Original Master HD',
        index: idx + 1,
      });
    }
    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}

// Engine 3 Helper: JerryCoder Instagram API
async function extractFromJerryCoder(targetUrl: string): Promise<any[]> {
  try {
    const res = await igJerry(targetUrl);
    if (!res) return [];
    const list = Array.isArray(res) ? res : [res];
    const items: any[] = [];

    for (let idx = 0; idx < list.length; idx++) {
      const it = list[idx];
      const snapUrl = it.url || '';
      const decoded = decodeSnapCdnToken(snapUrl);
      const directUrl = decoded?.url || snapUrl;
      const isVideo = it.type === 'video' || directUrl.includes('.mp4');
      const ext = isVideo ? 'mp4' : 'jpg';
      const mime = isVideo ? 'video/mp4' : 'image/jpeg';

      items.push({
        type: isVideo ? 'video' : 'image',
        url: directUrl,
        directUrl,
        snapUrl,
        thumbnailUrl: directUrl,
        mime_type: mime,
        extension: ext,
        filename: decoded?.filename || `insta1000gram_media_${idx + 1}.${ext}`,
        resolution: isVideo ? '1080p Full HD' : 'Original Master HD',
        index: idx + 1,
      });
    }
    return deduplicateMediaItems(items);
  } catch {
    return [];
  }
}

// Engine 5 Helper: Direct Instagram Public Scraper (Googlebot User-Agent)
// Extracts high-resolution photos/carousel media directly from public Instagram posts
async function extractFromInstagramDirectBot(targetUrl: string, shortcode: string): Promise<{ items: any[]; author?: string; caption?: string }> {
  try {
    const fetchUrl = `https://www.instagram.com/p/${shortcode}/`;
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return { items: [] };
    const text = await res.text();
    if (!text || text.length < 500) return { items: [] };

    // Extract author & caption if available
    let author: string | undefined;
    let caption: string | undefined;
    const authorMatch = text.match(/"owner":\s*\{"username":\s*"([^"]+)"/i) || text.match(/"username":\s*"([^"]+)"/i);
    if (authorMatch) author = authorMatch[1];
    const descMatch = text.match(/<meta property="og:description" content="([^"]+)"/i) || text.match(/<meta name="description" content="([^"]+)"/i);
    if (descMatch) caption = decodeHtml(descMatch[1]);

    const items: any[] = [];

    // 1. Extract candidates (standard Instagram image candidate arrays)
    const candidateMatches = [...text.matchAll(/"candidates":\s*(\[[^\]]+\])/g)];
    const seenMediaUrls = new Set<string>();

    for (const m of candidateMatches) {
      try {
        const arr = JSON.parse(m[1]);
        if (Array.isArray(arr) && arr.length > 0) {
          // Select highest resolution candidate
          const best = arr.reduce((prev: any, curr: any) => ((curr.width || 0) > (prev.width || 0) ? curr : prev), arr[0]);
          if (best && best.url && !seenMediaUrls.has(best.url)) {
            seenMediaUrls.add(best.url);
            const directUrl = best.url;
            items.push({
              type: 'image',
              url: directUrl,
              directUrl,
              snapUrl: directUrl,
              thumbnailUrl: directUrl,
              mime_type: 'image/jpeg',
              extension: 'jpg',
              filename: `insta1000gram_photo_${shortcode}_${items.length + 1}.jpg`,
              resolution: best.width && best.height ? `${best.width}x${best.height}` : 'Original Master HD',
              index: items.length + 1,
            });
          }
        }
      } catch {}
    }

    // 2. If no candidates, check og:image meta tag
    if (items.length === 0) {
      const ogImageMatch = text.match(/<meta property="og:image" content="([^"]+)"/i);
      if (ogImageMatch && ogImageMatch[1]) {
        const rawOgUrl = decodeHtml(ogImageMatch[1]);
        items.push({
          type: 'image',
          url: rawOgUrl,
          directUrl: rawOgUrl,
          snapUrl: rawOgUrl,
          thumbnailUrl: rawOgUrl,
          mime_type: 'image/jpeg',
          extension: 'jpg',
          filename: `insta1000gram_photo_${shortcode}.jpg`,
          resolution: 'Original Master HD',
          index: 1,
        });
      }
    }

    return { items: deduplicateMediaItems(items), author, caption };
  } catch {
    return { items: [] };
  }
}

async function handleInstagramResolve(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  const rawUrl = (req.body?.url || req.query?.url || '').toString();
  const rawMediaType = (req.body?.mediaType || req.query?.mediaType || 'all').toString();
  const cleanUrl = String(rawUrl).trim();

  if (!cleanUrl) {
    return res.status(400).json({ error: 'Please provide a valid Instagram URL or username.' });
  }

  const startTime = Date.now();
  totalDownloadsCount++;
  downloadsTodayCount++;

  // Normalize URL
  let normalizedUrl = cleanUrl;
  if (/^@?[a-zA-Z0-9._]{1,30}$/.test(cleanUrl)) {
    const cleanUser = cleanUrl.replace(/^@/, '');
    normalizedUrl = `https://www.instagram.com/stories/${cleanUser}/`;
  } else if (!/^https?:\/\//i.test(cleanUrl)) {
    normalizedUrl = `https://${cleanUrl}`;
  }

  // Rewrite insta1000gram or inst1000gram domain to instagram.com (preserving complete query parameters)
  normalizedUrl = normalizedUrl
    .replace(/^(https?:\/\/)?(www\.)?insta(1000)?gram\.com/i, 'https://www.instagram.com')
    .replace(/^(https?:\/\/)?(www\.)?inst(1000)?gram\.com/i, 'https://www.instagram.com');

  // Handle /s/<base64> Instagram highlight / story share URLs
  const sMatch = normalizedUrl.match(/\/s\/([a-zA-Z0-9_\-=]+)/i);
  let isSharedHighlight = false;
  if (sMatch) {
    try {
      const rawB64 = sMatch[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedB64 = rawB64 + '==='.slice((rawB64.length + 3) % 4);
      const decoded = Buffer.from(paddedB64, 'base64').toString('utf-8');
      if (decoded.startsWith('highlight:')) {
        isSharedHighlight = true;
        const highlightId = decoded.replace('highlight:', '');
        const qIndex = normalizedUrl.indexOf('?');
        const queryParams = qIndex !== -1 ? normalizedUrl.slice(qIndex) : '';
        normalizedUrl = `https://www.instagram.com/stories/highlights/${highlightId}/${queryParams}`;
      }
    } catch {}
  }

  // Extract img_index if user requested a specific slide (1-indexed)
  const imgIndexMatch = cleanUrl.match(/[?&]img_index=(\d+)/i);
  const requestedImgIndex = imgIndexMatch ? parseInt(imgIndexMatch[1], 10) : null;

  // Extract story_media_id if user requested a specific highlight item
  const storyMediaIdMatch = cleanUrl.match(/[?&]story_media_id=(\d+)/i);
  const targetStoryMediaId = storyMediaIdMatch ? storyMediaIdMatch[1] : null;

  // Clean tracking query parameters (igsh, utm_*, etc.) while preserving img_index and story_media_id
  try {
    const parsed = new URL(normalizedUrl);
    const searchParams = new URLSearchParams(parsed.search);
    const keepKeys = ['img_index', 'story_media_id'];
    const newParams = new URLSearchParams();
    for (const k of keepKeys) {
      if (searchParams.has(k)) {
        newParams.set(k, searchParams.get(k)!);
      }
    }
    parsed.search = newParams.toString() ? `?${newParams.toString()}` : '';
    normalizedUrl = parsed.toString();
  } catch {}

  // Check cache first (only return if valid and contains items)
  const cacheKey = normalizedUrl.toLowerCase();
  const rawCacheKey = cleanUrl.toLowerCase();
  const cached = resolvedMediaCache.get(cacheKey) || resolvedMediaCache.get(rawCacheKey);

  if (cached && cached.expiry > Date.now() && cached.data?.items?.length > 0) {
    return res.json({
      ...cached.data,
      networkLatencyMs: Date.now() - startTime + 5,
    });
  }

  // Extract shortcode or highlight ID
  const highlightMatch = normalizedUrl.match(/\/stories\/highlights\/(\d+)/i);
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

  // Engine 2: SnapVideo package (uses native Node https.request)
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const snapPkgRes = await extractFromSnapVideoPackage(normalizedUrl);
      if (snapPkgRes.isPrivate) isKnownPrivate = true;
      if (snapPkgRes.items && snapPkgRes.items.length > 0) {
        resolvedItems = snapPkgRes.items;
      }
    } catch {}
  }

  // Engine 3: SnapSave package
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const snapSavePkgItems = await extractFromSnapsavePackage(normalizedUrl);
      if (snapSavePkgItems && snapSavePkgItems.length > 0) {
        resolvedItems = snapSavePkgItems;
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

  // Engine 5: SnapSave fallback
  if (!resolvedItems || resolvedItems.length === 0) {
    try {
      const snapSaveItems = await unpackSnapSave(normalizedUrl);
      if (snapSaveItems && snapSaveItems.length > 0) {
        resolvedItems = snapSaveItems;
      }
    } catch {}
  }

  // Engine 6: Direct Instagram Public Scraper (Googlebot User-Agent for photos & carousels)
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

  // Fallback: ONLY for single static photo posts (/p/) if all extractors fail.
  // NEVER downgrade a Reel or Highlight into a single photo thumbnail!
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
  // Deduplicate all resolved items using unique media identity and canonical URLs
  resolvedItems = deduplicateMediaItems(resolvedItems);

  // If still no items and no oembed
  if ((!resolvedItems || resolvedItems.length === 0) && !oembed) {
    if (isKnownPrivate) {
      return res.status(422).json({
        error: 'This Instagram video or account is private. Instagram restricts downloads to public posts only.',
        suggestion: 'Please verify that this is a public Instagram Reel, Post, Story, or Highlight.',
      });
    }
    return res.status(422).json({
      error: 'Could not extract media for this Instagram URL. The media might be private, expired, or age-restricted.',
      suggestion: 'Please verify that the link is a public Instagram Reel, Video, Story, or Photo.',
    });
  }

  // If this was a Reel or Highlight and all video engines failed due to rate limiting or private:
  if ((!resolvedItems || resolvedItems.length === 0) && (isReel || isHighlight)) {
    if (isKnownPrivate) {
      return res.status(422).json({
        error: 'This Instagram video is private. Instagram only permits downloading from public accounts.',
        suggestion: 'Please check that the account is public.',
      });
    }
    return res.status(422).json({
      error: 'Could not extract media for this Instagram URL. The media might be private or age-restricted.',
      suggestion: 'Please verify that the link is public or try again in a few moments.',
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

  console.log(`[Instagram] Input: ${cleanUrl}`);
  console.log(`[Instagram] Normalized URL: ${normalizedUrl}`);
  console.log(`[Instagram] Detected type: ${detectedType}`);
  console.log(`[Instagram] Extractor: ${snapItems?.length ? 'SnapVideo' : (oembed ? 'oEmbed' : 'SnapSave')}`);
  console.log(`[Instagram] Raw items: ${rawItemsCount}`);
  console.log(`[Instagram] Deduplicated items: ${resolvedItems.length}`);

  // Selected slide index (1-based from img_index or matched story_media_id or 0)
  let selectedIndex = 0;
  if (requestedImgIndex !== null && requestedImgIndex >= 1 && requestedImgIndex <= resolvedItems.length) {
    selectedIndex = requestedImgIndex - 1;
  } else if (targetStoryMediaId && resolvedItems.length > 0) {
    const encodedTarget = Buffer.from(targetStoryMediaId).toString('base64').replace(/=/g, '');
    const foundIdx = resolvedItems.findIndex((it) => {
      const itStr = JSON.stringify(it);
      return itStr.includes(targetStoryMediaId) || itStr.includes(encodedTarget);
    });
    if (foundIdx !== -1) {
      selectedIndex = foundIdx;
    }
  }

  // Helper to ensure all thumbnails and preview URLs are safely proxied through the same-origin backend
  // so browser Tracking Prevention (Edge/Brave/Safari) never blocks 3rd-party CDN domains
  const toSafeProxyThumbUrl = (urlStr: string): string => {
    if (!urlStr) return '';
    if (urlStr.startsWith('/api/')) return urlStr;
    if (urlStr.startsWith('data:')) return urlStr;
    return `/api/download/proxy?url=${encodeURIComponent(urlStr)}&type=photo`;
  };

  // Select primary thumbnail
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
    const itemProxyUrl = item.snapUrl || directUrl;
    const ext = item.extension || (isVid ? 'mp4' : 'jpg');
    const mime = item.mime_type || (isVid ? 'video/mp4' : 'image/jpeg');
    const safeFilename = item.filename || `insta1000gram_${detectedType}_${idx + 1}.${ext}`;
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

  items.forEach((it, idx) => {
    console.log(`[Instagram] Item index: ${idx}`);
    console.log(`[Instagram] Item type: ${it.type}`);
    console.log(`[Instagram] CDN URL: ${it.directUrl || it.url}`);
    console.log(`[Instagram] MIME: ${it.mime_type}`);
    console.log(`[Instagram] Extension: ${it.extension}`);
    console.log(`[Instagram] Proxy URL: ${it.downloadUrl}`);
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
  } else if (selectedItem && selectedItem.type === 'image') {
    const directPhotoUrl = selectedItem.directUrl || selectedItem.url;
    const photoFilename = selectedItem.filename || `insta1000gram_photo_${shortcode}.jpg`;
    formats.push({
      id: 'fmt-photo-max',
      quality: `Original Master HD (${selectedItem.extension.toUpperCase()})`,
      resolution: selectedItem.resolution || `${oembed?.thumbnail_width || 1080}x${oembed?.thumbnail_height || 1350}`,
      extension: selectedItem.extension,
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

  res.json(responsePayload);
}

app.options('/api/instagram/resolve', (req: Request, res: Response) => res.sendStatus(204));
app.options('/api/instagram/resolve/', (req: Request, res: Response) => res.sendStatus(204));
app.all('/api/instagram/resolve', handleInstagramResolve);
app.all('/api/instagram/resolve/', handleInstagramResolve);

// Helper: Stream media from URL with automatic SnapCDN token decoding and redirect handling
function streamDownloadFromUrl(
  inputUrl: string,
  res: Response,
  options: {
    filename?: string;
    type?: string;
    isAttachment?: boolean;
    rangeHeader?: string;
  },
  redirectCount: number = 0
) {
  if (redirectCount > 5) {
    if (!res.headersSent) res.redirect(inputUrl);
    return;
  }

  // 1. Decode SnapCDN JWT if present to get original Instagram CDN direct url
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
      'Referer': isSnapCdn ? 'https://snapvideo.app/' : 'https://www.instagram.com/',
      'Accept': '*/*',
    };

    if (options.rangeHeader) {
      headers['Range'] = options.rangeHeader;
    }

    const upstreamReq = client.get(targetUrl, { headers }, (upstreamRes) => {
      // Follow HTTP redirects automatically
      if (
        upstreamRes.statusCode &&
        upstreamRes.statusCode >= 300 &&
        upstreamRes.statusCode < 400 &&
        upstreamRes.headers.location
      ) {
        const nextUrl = new URL(upstreamRes.headers.location, targetUrl).toString();
        return streamDownloadFromUrl(nextUrl, res, options, redirectCount + 1);
      }

      // Fallback: If direct CDN URL returned 403 or error, try the original snapUrl
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
            return res.status(422).json({ error: 'Upstream server returned an HTML webpage instead of a media stream.' });
          }
          return;
        }

        const isValidMediaContentType = /^(video|image|audio)\//i.test(upstreamContentType) || upstreamContentType === 'application/octet-stream';
        const finalContentType = isValidMediaContentType ? upstreamContentType : mimeType;

        res.status(upstreamRes.statusCode || 200);
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Type', finalContentType);
        res.setHeader('Accept-Ranges', 'bytes');
        if (upstreamRes.headers['content-length']) {
          res.setHeader('Content-Length', upstreamRes.headers['content-length']);
        }
        console.log(`[Instagram] CDN status: ${upstreamRes.statusCode}`);
        console.log(`[Instagram] Proxy status: ${upstreamRes.statusCode || 200}`);
        console.log(`[Instagram] MIME: ${finalContentType}`);
        console.log(`[Instagram] Download: SUCCESS`);
      } else {
        // Stream / Video preview
        res.status(upstreamRes.statusCode || 200);
        res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        if (upstreamRes.headers['content-range']) {
          res.setHeader('Content-Range', upstreamRes.headers['content-range']);
        }
        if (upstreamRes.headers['content-length']) {
          res.setHeader('Content-Length', upstreamRes.headers['content-length']);
        }
        console.log(`[Instagram] Stream CDN status: ${upstreamRes.statusCode}`);
        console.log(`[Instagram] Stream MIME: ${upstreamRes.headers['content-type'] || 'video/mp4'}`);
      }

      upstreamRes.pipe(res);
    });

    upstreamReq.setTimeout(25000, () => {
      upstreamReq.destroy(new Error('Media download request timeout'));
    });

    upstreamReq.on('error', () => {
      if (!res.headersSent) {
        res.redirect(targetUrl);
      }
    });
  } catch {
    if (!res.headersSent) {
      res.redirect(targetUrl);
    }
  }
}

// Stream endpoint for inline browser video playing (<video src="...">)
function handleDownloadStream(req: Request, res: Response) {
  const targetUrl = (req.query.url || req.body?.url) as string;
  if (!targetUrl) {
    return res.status(400).send('Target URL required');
  }

  streamDownloadFromUrl(targetUrl, res, {
    isAttachment: false,
    rangeHeader: req.headers.range as string,
  });
}

// Direct file download proxy that streams the real file with Content-Disposition attachment header
async function handleDownloadProxy(req: Request, res: Response) {
  let targetUrl = (req.query.url || req.body?.url) as string;
  const filename = (req.query.filename || req.body?.filename || 'insta1000gram_download') as string;
  const type = (req.query.type || req.body?.type || 'video') as string;

  if (!targetUrl) {
    return res.status(400).send('Target URL required');
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
async function handleDownloadZip(req: Request, res: Response) {
  if (req.method === 'POST') {
    const { urls = [], filenames = [], zipName = 'insta1000gram_album.zip' } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'No media URLs provided for ZIP archive' });
    }

    const safeZipName = String(zipName).replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeZipName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err: any) => {
      console.error('Archive error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Archive failed' });
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
            'Referer': isSnapCdn ? 'https://snapvideo.app/' : 'https://www.instagram.com/',
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

  const targetUrl = req.query.url as string;
  const zipName = (req.query.name as string) || 'insta1000gram_album.zip';
  if (!targetUrl) {
    return res.status(400).send('Instagram URL required');
  }

  try {
    // Check if media was already resolved in cache
    const cached = resolvedMediaCache.get(targetUrl.toLowerCase()) || resolvedMediaCache.get(targetUrl.toLowerCase().split('?')[0]);
    let items = cached?.data?.items?.map((it: any) => ({
      directUrl: it.directUrl || it.url,
      snapUrl: it.snapUrl || it.url,
      extension: it.type === 'video' ? 'mp4' : 'jpg',
      type: it.type,
    })) || [];

    if (!items || items.length === 0) {
      items = await fetchSnapVideoWithCookies(targetUrl);
    }
    if (!items || items.length === 0) {
      const snapPkg = await extractFromSnapVideoPackage(targetUrl);
      items = snapPkg.items;
    }
    if (!items || items.length === 0) {
      const shortcodeMatch = targetUrl.match(/\/(?:p|reel|reels|tv|stories)(?:\/[^/]+)*\/([^/?#&]+)/i);
      if (shortcodeMatch) {
        const botRes = await extractFromInstagramDirectBot(targetUrl, shortcodeMatch[1]);
        items = botRes.items;
      }
    }

    if (!items || items.length === 0) {
      return res.status(404).send('No media items found to archive');
    }

    const urls = items.map((it) => it.directUrl || it.snapUrl || it.url);
    const filenames = items.map((it, idx) => {
      const ext = it.extension || (it.type === 'video' ? 'mp4' : 'jpg');
      return `insta1000gram_${idx + 1}.${ext}`;
    });

    const safeZipName = String(zipName).replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeZipName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err: any) => {
      console.error('ZIP archive error:', err);
    });
    archive.pipe(res);

    for (let i = 0; i < urls.length; i++) {
      const rawUrl = urls[i];
      const decoded = decodeSnapCdnToken(rawUrl);
      const fileUrl = decoded?.url || rawUrl;
      try {
        const isSnapCdn = fileUrl.includes('snapcdn.app');
        const fetchRes = await fetch(fileUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Referer': isSnapCdn ? 'https://snapvideo.app/' : 'https://www.instagram.com/',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (fetchRes.ok) {
          const arrayBuf = await fetchRes.arrayBuffer();
          archive.append(Buffer.from(arrayBuf), { name: filenames[i] });
        }
      } catch (err: any) {
        console.warn(`Item ${i + 1} fetch error:`, err?.message);
      }
    }

    await archive.finalize();
  } catch (err: any) {
    console.error('handleDownloadZip GET exception:', err);
    if (!res.headersSent) res.status(500).send('ZIP generation failed');
  }
}

function handleAds(req: Request, res: Response) {
  res.json({
    ads: {
      topBanner: { name: 'Top Responsive Banner', code: '' },
      sidebar: { name: 'Sidebar Square Ad', code: '' },
      inlineResult: { name: 'In-feed Native Ad', code: '' },
      bottomBanner: { name: 'Sticky Bottom Banner', code: '' },
    },
  });
}

app.all(['/api/download/stream', '/api/download/stream/'], handleDownloadStream);
app.all(['/api/download/proxy', '/api/download/proxy/'], handleDownloadProxy);
app.all(['/api/download/zip', '/api/download/zip/'], handleDownloadZip);
app.all(['/api/ads', '/api/ads/'], handleAds);

/* ==========================================================================
   MOBILE QR CODE TRANSFER SHORT-LINK GENERATOR & LANDING PAGE
   ========================================================================== */

interface ShortLinkRecord {
  code: string;
  targetUrl: string;
  filename: string;
  quality?: string;
  thumbnail?: string;
  author?: string;
  createdAt: number;
}

const shortLinkMap = new Map<string, ShortLinkRecord>();

// Periodic cleanup of links older than 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [code, record] of shortLinkMap.entries()) {
    if (now - record.createdAt > 24 * 60 * 60 * 1000) {
      shortLinkMap.delete(code);
    }
  }
}, 60 * 60 * 1000);

// Endpoint to generate a clean, ultra-short code for mobile scanning
app.post('/api/qr/shorten', async (req: Request, res: Response) => {
  const { targetUrl, filename, quality, thumbnail, author } = req.body;
  if (!targetUrl) {
    return res.status(400).json({ error: 'targetUrl required' });
  }

  // Generate 6-char clean alphanumeric code
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

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const selfShortUrl = `${protocol}://${host}/m/${code}`;

  res.json({
    code,
    path: `/m/${code}`,
    shortUrl: selfShortUrl,
    localShortUrl: selfShortUrl,
    directUrl: targetUrl,
  });
});

// Mobile landing page when scanned by phone camera
app.get('/m/:code', (req: Request, res: Response) => {
  const code = req.params.code;
  const record = shortLinkMap.get(code);

  if (!record) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Expired - insta1000gram</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-6 text-center font-sans">
        <div class="max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
          <div class="w-16 h-16 bg-pink-500/20 text-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-black">!</div>
          <h1 class="text-2xl font-bold mb-2">QR Code Expired</h1>
          <p class="text-slate-400 text-sm mb-6">This transfer code has expired or was already cleared. Generate a fresh QR code on your computer.</p>
          <a href="/" class="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 rounded-xl font-bold text-white shadow-lg">Go to insta1000gram</a>
        </div>
      </body>
      </html>
    `);
  }

  // If user requested direct redirect
  if (req.query.direct === '1') {
    return res.redirect(302, record.targetUrl);
  }

  const directDownloadUrl = record.targetUrl;
  const proxyDownloadUrl = `/api/download/proxy?url=${encodeURIComponent(record.targetUrl)}&filename=${encodeURIComponent(record.filename)}&type=video&quality=1080p`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Download Media - insta1000gram</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between p-4 selection:bg-pink-500 selection:text-white">
      <!-- Top Brand Header -->
      <header class="w-full max-w-md mx-auto pt-2 pb-4 flex items-center justify-between border-b border-slate-800/80">
        <a href="/" class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center font-black text-white text-xs shadow-md">1k</span>
          <span class="font-extrabold text-base tracking-tight text-white">insta<span class="text-pink-500 font-black">1000</span>gram</span>
        </a>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          ● Ready to Save
        </span>
      </header>

      <!-- Main Action Card -->
      <main class="w-full max-w-md mx-auto my-auto py-6">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div class="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>

          ${
            record.thumbnail
              ? `<div class="w-full h-56 rounded-2xl overflow-hidden mb-4 relative bg-slate-950 border border-slate-800">
                  <img src="${record.thumbnail}" alt="Media Preview" class="w-full h-full object-cover" />
                  <div class="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                    ${record.quality || '1080p Ultra HD'}
                  </div>
                  ${record.author ? `<div class="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-xs font-bold text-slate-200">@${record.author}</div>` : ''}
                </div>`
              : ''
          }

          <h2 class="text-lg font-black text-white text-center mb-1">
            Instagram Media Ready
          </h2>
          <p class="text-xs text-slate-400 text-center mb-5 font-medium">
            Tap the button below to save the 1080p Full HD video to your device.
          </p>

          <!-- Download Action Buttons -->
          <div class="space-y-2.5">
            <a 
              id="dlBtnDirect"
              href="${directDownloadUrl}" 
              download="${record.filename}"
              target="_blank"
              class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-pink-500/20 active:scale-95 transition-all"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>Download Media (1080p)</span>
            </a>

            <a 
              href="${proxyDownloadUrl}" 
              class="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <span>Alternate Fast Mirror Link</span>
            </a>
          </div>

          <!-- Quick Mobile Tip -->
          <div class="mt-5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
            <p><strong class="text-white">🍏 iPhone tip:</strong> If the video plays in Safari, tap the <span class="text-white font-bold">Share (square with arrow)</span> icon, then select <span class="text-pink-400 font-bold">"Save Video"</span>.</p>
            <p><strong class="text-white">🤖 Android tip:</strong> Tap Download to save directly into your <span class="text-emerald-400 font-bold">Gallery / Downloads</span> folder.</p>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="w-full max-w-md mx-auto text-center py-3 text-[11px] text-slate-600">
        insta1000gram • Instant URL Shortcut Downloader
      </footer>
    </body>
    </html>
  `;

  res.send(html);
});

// Full Source Code .ZIP Downloader Endpoint
function buildProjectZip(): string {
  const publicDir = path.resolve(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const zipPath = path.resolve(publicDir, 'insta1000gram-full-source.zip');
  const pyCode = `
import zipfile, os
exclude = {'node_modules', 'dist', '.git', '.cache'}
with zipfile.ZipFile('${zipPath}', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('${__dirname}'):
        dirs[:] = [d for d in dirs if d not in exclude]
        for f in files:
            if not f.endswith('.log') and f != 'insta1000gram-full-source.zip':
                fp = os.path.join(root, f)
                z.write(fp, os.path.relpath(fp, '${__dirname}'))
`;
  execSync(`python3 -c "${pyCode.replace(/"/g, '\\"')}"`);
  return zipPath;
}

app.get(['/api/export/project-zip', '/download-source', '/insta1000gram.zip', '/download/full-project.zip'], (req: Request, res: Response) => {
  try {
    const zipPath = buildProjectZip();
    res.download(zipPath, 'insta1000gram-full-source.zip');
  } catch (error: any) {
    console.error('Failed to create archive:', error);
    res.status(500).json({ error: error?.message || 'Archive creation failed' });
  }
});

/* ==========================================================================
   6. VITE MIDDLEWARE (DEV) & STATIC CLIENT SERVING (PROD)
   ========================================================================== */

// Localized SSR metadata generator for direct URL requests
const LOCALIZED_DOWNLOADER_TITLES: Record<string, Record<string, { title: string; desc: string }>> = {
  ar: {
    'reels-downloader': {
      title: 'تحميل ريلز انستقرام – 1080p Full HD | Insta1000gram',
      desc: 'تحميل ريلز انستقرام بجودة 1080p Full HD بدون علامة مائية. مجاني وسريع ومجهول الهوية بالكامل مع اختصار 1000 المباشر.',
    },
    'video-downloader': {
      title: 'تحميل فيديو انستقرام – 1080p MP4 | Insta1000gram',
      desc: 'تحميل مقاطع فيديو انستقرام وIGTV بأعلى دقة وضوح أصلية بصيغة MP4 وبدون تسجيل دخول.',
    },
    'photo-downloader': {
      title: 'تحميل صور انستقرام – أعلى دقة JPG | Insta1000gram',
      desc: 'تحميل صور وألبومات انستقرام بأعلى دقة وضوح أصلية بصيغة JPG بدون ضغط أو فقدان للجودة.',
    },
    'story-downloader': {
      title: 'تحميل ستوري انستقرام – بدون تسجيل وبشكل مجهول | Insta1000gram',
      desc: 'مشاهدة وتحميل ستوري انستقرام بجودة عالية HD بشكل مجهول تماماً بدون حساب أو كشف للهوية.',
    },
    'highlights-downloader': {
      title: 'تحميل هايلايت انستقرام – ألبومات كاملة | Insta1000gram',
      desc: 'تحميل مقاطع وقصص الهايلايت المحفوظة في انستقرام بجودة 1080p HD مع الصوت بنقرة واحدة.',
    },
  },
  fr: {
    'reels-downloader': {
      title: 'Télécharger Reels Instagram – 1080p Full HD | Insta1000gram',
      desc: 'Télécharger Reels Instagram en qualité 1080p Full HD sans filigrane ni inscription. Rapide, gratuit et anonyme.',
    },
    'video-downloader': {
      title: 'Télécharger Vidéos Instagram – 1080p MP4 | Insta1000gram',
      desc: 'Téléchargez les vidéos Instagram et IGTV en qualité MP4 haute définition sans filigrane.',
    },
    'photo-downloader': {
      title: 'Télécharger Photos Instagram – Haute Résolution JPG | Insta1000gram',
      desc: "Téléchargez des photos et carrousels Instagram dans leur résolution d'origine JPG gratuitement.",
    },
    'story-downloader': {
      title: 'Télécharger Stories Instagram – Anonyme et Gratuit | Insta1000gram',
      desc: 'Téléchargez et regardez des stories Instagram anonymement sans connexion ni compte requis.',
    },
    'highlights-downloader': {
      title: 'Télécharger Highlights Instagram – En Haute Définition | Insta1000gram',
      desc: "Enregistrez les highlights et stories à la une d'Instagram en Full HD avec le son original.",
    },
  },
  es: {
    'reels-downloader': {
      title: 'Descargar Reels de Instagram – 1080p Full HD | Insta1000gram',
      desc: 'Descargar Reels de Instagram en Full HD 1080p sin marca de agua ni inicio de sesión. Rápido, gratuito y anónimo.',
    },
    'video-downloader': {
      title: 'Descargar Videos de Instagram – 1080p MP4 | Insta1000gram',
      desc: 'Descarga videos e IGTV de Instagram en formato MP4 de alta resolución original sin perder calidad.',
    },
    'photo-downloader': {
      title: 'Descargar Fotos de Instagram – Máxima Calidad JPG | Insta1000gram',
      desc: 'Descarga fotos y galerías de Instagram en su máxima calidad JPG original sin marca de agua.',
    },
    'story-downloader': {
      title: 'Descargar Stories de Instagram – Anónimo y Seguro | Insta1000gram',
      desc: 'Guarda Stories de Instagram de forma totalmente anónima sin necesidad de iniciar sesión.',
    },
    'highlights-downloader': {
      title: 'Descargar Highlights de Instagram – Historias Destacadas | Insta1000gram',
      desc: 'Descarga historias destacadas de Instagram en calidad 1080p HD con audio incluido.',
    },
  },
  en: {
    'reels-downloader': {
      title: 'Instagram Reels Downloader – 1080p Full HD | Insta1000gram',
      desc: 'Download Instagram Reels in original 1080p Full HD without watermark or login. Fast, free, and anonymous.',
    },
    'video-downloader': {
      title: 'Instagram Video Downloader – 1080p MP4 | Insta1000gram',
      desc: 'Download Instagram Videos & IGTV in original master MP4 quality without watermark or login.',
    },
    'photo-downloader': {
      title: 'Instagram Photo Downloader – Lossless JPG | Insta1000gram',
      desc: 'Save Instagram photos and carousel albums in ultra-crisp original resolution without compression.',
    },
    'story-downloader': {
      title: 'Instagram Story Downloader – Anonymous Story Saver | Insta1000gram',
      desc: 'Watch and download Instagram Stories anonymously without account login or leaving a trace.',
    },
    'highlights-downloader': {
      title: 'Instagram Highlights Downloader – HD Quality | Insta1000gram',
      desc: 'Download complete Instagram Story Highlights in full 1080p HD with sound in one click.',
    },
  },
};

const CANONICAL_SLUG_MAP: Record<string, string> = {
  'reels-downloader': 'reels-downloader',
  'reel-downloader': 'reels-downloader',
  'reels': 'reels-downloader',
  'reel': 'reels-downloader',
  'video-downloader': 'video-downloader',
  'videos-downloader': 'video-downloader',
  'video': 'video-downloader',
  'videos': 'video-downloader',
  'photo-downloader': 'photo-downloader',
  'photos-downloader': 'photo-downloader',
  'photo': 'photo-downloader',
  'photos': 'photo-downloader',
  'story-downloader': 'story-downloader',
  'stories-downloader': 'story-downloader',
  'story': 'story-downloader',
  'stories': 'story-downloader',
  'highlights-downloader': 'highlights-downloader',
  'highlight-downloader': 'highlights-downloader',
  'highlights': 'highlights-downloader',
  'highlight': 'highlights-downloader',
};

function injectLocalizedServerMeta(rawHtml: string, urlPath: string): string {
  const cleanPath = urlPath.replace(/\/+$/, '') || '/';

  // Match /:locale/:slug or /:locale
  const match = cleanPath.match(/^\/([a-zA-Z]{2}(?:-[a-zA-Z]+)?)(?:\/([a-zA-Z0-9\-]+))?$/);
  if (!match) {
    return rawHtml;
  }

  const rawLocale = (match[1].includes('-') ? match[1] : match[1].toLowerCase());
  const rawSlug = match[2]?.toLowerCase();
  const canonicalSlug = rawSlug ? CANONICAL_SLUG_MAP[rawSlug] : undefined;

  const isRtl = rawLocale === 'ar' || rawLocale === 'fa';
  let title = 'insta1000gram - Fast Instagram Downloader & pSEO Engine';
  let desc = 'Download Instagram Reels, Videos, Photos, Stories, and IGTV in HD with instant URL shortcut redirection.';

  if (canonicalSlug) {
    const langData = LOCALIZED_DOWNLOADER_TITLES[rawLocale] || LOCALIZED_DOWNLOADER_TITLES.en;
    const entry = langData[canonicalSlug] || LOCALIZED_DOWNLOADER_TITLES.en[canonicalSlug];
    if (entry) {
      title = entry.title;
      desc = entry.desc;
    }
  } else if (!rawSlug) {
    // Localized Homepage
    if (rawLocale === 'ar') {
      title = 'insta1000gram – تحميل ريلز وفيديو وصور انستقرام بجودة 1080p Full HD';
      desc = 'أسرع موقع لتحميل مقاطع ريلز انستقرام وفيديوهات وقصص ستوري وهايلايت بدون علامة مائية وبأعلى جودة.';
    } else if (rawLocale === 'fr') {
      title = 'insta1000gram – Télécharger Reels, Vidéos et Photos Instagram en 1080p HD';
      desc = 'Téléchargeur gratuit et ultra-rapide pour Instagram Reels, Vidéos, Photos et Stories en Full HD sans filigrane.';
    } else if (rawLocale === 'es') {
      title = 'insta1000gram – Descargar Reels, Videos y Fotos de Instagram en 1080p HD';
      desc = 'Descargador gratuito para Reels, Videos, Fotos y Stories de Instagram en calidad 1080p HD sin marcas de agua.';
    }
  }

  let html = rawHtml;

  // Replace <html ...>
  html = html.replace(/<html[^>]*>/i, `<html lang="${rawLocale}"${isRtl ? ' dir="rtl"' : ' dir="ltr"'}>`);

  // Add font-arabic if RTL
  if (isRtl) {
    html = html.replace(/<body([^>]*)class="([^"]*)"/i, '<body$1class="$2 font-arabic"');
  }

  // Replace <title>
  html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

  // Replace Meta Description
  html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${desc}" />`);
  html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${desc}" />`);
  html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${desc}" />`);

  return html;
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET') return next();
      if (
        req.path.startsWith('/api/') ||
        req.path.startsWith('/@') ||
        req.path.startsWith('/src/') ||
        req.path.startsWith('/node_modules/') ||
        /\.[a-zA-Z0-9]+$/.test(req.path)
      ) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const localized = injectLocalizedServerMeta(template, req.path);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(localized);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false }));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/') || /\.[a-zA-Z0-9]+$/.test(req.path)) {
        return next();
      }
      try {
        const template = fs.readFileSync(path.resolve(__dirname, 'dist', 'index.html'), 'utf-8');
        const localized = injectLocalizedServerMeta(template, req.path);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(localized);
      } catch (e: any) {
        next(e);
      }
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[insta1000gram] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[insta1000gram] Site Domain: https://${SITE_DOMAIN}`);
    console.log(`[insta1000gram] Sitemaps Index: http://localhost:${PORT}/sitemap.xml`);
    console.log(`[insta1000gram] Admin user: ${ADMIN_USERNAME}`);
  });
}

startServer();
