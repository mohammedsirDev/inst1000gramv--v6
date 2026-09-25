import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { generatePseoPages, INITIAL_PSEO_CONFIG } from './src/pseoData.ts';
import type { PseoPage, PseoTemplateConfig } from './src/types.ts';
import { ALL_SUPPORTED_LANGUAGES } from './src/config/languages.ts';
import { DOWNLOADER_PAGES, GUIDE_PAGES } from './src/config/downloaders.ts';
import {
  handleInstagramResolve,
  handleDownloadProxy,
  handleDownloadStream,
  handleDownloadZip,
  handleQrShorten,
  shortLinkMap,
} from './src/lib/instagramCore.ts';

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
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Early route interceptor: intercept any relative or nested API calls (e.g. /ar/api/instagram/resolve, /api/instagram/resolve, or serverless /instagram/resolve)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('instagram/resolve')) {
    return handleInstagramResolve(req, res);
  }
  if (req.path.includes('download/proxy')) {
    return handleDownloadProxy(req, res);
  }
  if (req.path.includes('download/stream')) {
    return handleDownloadStream(req, res);
  }
  if (req.path.includes('download/zip')) {
    return handleDownloadZip(req, res);
  }
  if (req.path.includes('qr/shorten')) {
    return handleQrShorten(req, res);
  }
  if (req.path.includes('api/ads') || req.path.includes('/ads')) {
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
   5. REAL INSTAGRAM DOWNLOAD RESOLVER & STREAMING PROXY (via instagramCore.ts)
   ========================================================================== */

app.options("/api/instagram/resolve", (req: Request, res: Response) => res.sendStatus(204));
app.options("/api/instagram/resolve/", (req: Request, res: Response) => res.sendStatus(204));
app.all("/api/instagram/resolve", handleInstagramResolve);
app.all("/api/instagram/resolve/", handleInstagramResolve);

app.options("/api/download/proxy", (req: Request, res: Response) => res.sendStatus(204));
app.options("/api/download/proxy/", (req: Request, res: Response) => res.sendStatus(204));
app.all("/api/download/proxy", handleDownloadProxy);
app.all("/api/download/proxy/", handleDownloadProxy);

app.options("/api/download/stream", (req: Request, res: Response) => res.sendStatus(204));
app.options("/api/download/stream/", (req: Request, res: Response) => res.sendStatus(204));
app.all("/api/download/stream", handleDownloadStream);
app.all("/api/download/stream/", handleDownloadStream);

app.options("/api/download/zip", (req: Request, res: Response) => res.sendStatus(204));
app.options("/api/download/zip/", (req: Request, res: Response) => res.sendStatus(204));
app.all("/api/download/zip", handleDownloadZip);
app.all("/api/download/zip/", handleDownloadZip);

app.options("/api/qr/shorten", (req: Request, res: Response) => res.sendStatus(204));
app.options("/api/qr/shorten/", (req: Request, res: Response) => res.sendStatus(204));
app.all("/api/qr/shorten", handleQrShorten);
app.all("/api/qr/shorten/", handleQrShorten);

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
   MOBILE QR CODE TRANSFER SHORT-LINK LANDING PAGE
   ========================================================================== */

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
  try {
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
    execSync(`python3 -c "${pyCode.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
  } catch (err: any) {
    if (!fs.existsSync(zipPath)) {
      throw err;
    }
  }
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
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
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

// In local / standard server mode, launch Express listener.
// In Vercel serverless mode, Vercel invokes the exported app handler.
if (!process.env.VERCEL) {
  startServer();
}

export { app, handleInstagramResolve, handleDownloadProxy, handleDownloadStream, handleDownloadZip };
export default app;
