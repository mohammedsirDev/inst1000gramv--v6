import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'https://www.insta1000gram.com';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/sitemap_1.xml`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const xml = await res.text();
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }
  } catch (e) {
    // backend offline fallback
  }

  const fallbackKeywords = [
    'download-instagram-reels-online',
    'instagram-story-saver-hd',
    'save-instagram-photos-original',
    'download-instagram-reels-iphone',
    'download-instagram-reels-android',
    'extract-instagram-audio-mp3',
    'save-instagram-highlights-anonymous'
  ];

  const now = new Date().toISOString().split('T')[0];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '  <url>\n';
  xml += `    <loc>${SITE_DOMAIN}/</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += '    <changefreq>daily</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';

  for (const slug of fallbackKeywords) {
    xml += '  <url>\n';
    xml += `    <loc>${SITE_DOMAIN}/${slug}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  }
  xml += '</urlset>';

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
