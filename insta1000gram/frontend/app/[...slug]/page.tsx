import type { Metadata } from 'next';
import SlugRenderer from './SlugRenderer';
import { parseCurrentRoute } from '../../utils/router';
import { getDownloaderDataForLocale } from '../../translations/downloadersData';
import { GUIDE_PAGES, DOWNLOADER_PAGES } from '../../config/downloaders';
import { ALL_SUPPORTED_LANGUAGES, LANGUAGES } from '../../config/languages';
import { SupportedLanguage } from '../../types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string[] } | Promise<{ slug: string[] }>;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Server-side dynamic SEO metadata generation
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const rawSlug = resolvedParams?.slug || [];
  const slugPath = Array.isArray(rawSlug) ? rawSlug.join('/') : (rawSlug || '');
  const route = parseCurrentRoute('/' + slugPath);

  // 1. Localized Downloader Page (e.g. /ar/reels-downloader, /fr/reels-downloader)
  if (route.type === 'downloader') {
    const data = getDownloaderDataForLocale(route.locale, route.slug);
    const canonicalUrl = `https://www.insta1000gram.com/${route.locale}/${route.slug}`;

    // Build hreflang alternates for all supported languages
    const languagesMap: Record<string, string> = {
      'x-default': `https://www.insta1000gram.com/en/${route.slug}`,
    };
    for (const lang of ALL_SUPPORTED_LANGUAGES) {
      languagesMap[lang] = `https://www.insta1000gram.com/${lang}/${route.slug}`;
    }

    return {
      title: data.title,
      description: data.description,
      alternates: {
        canonical: canonicalUrl,
        languages: languagesMap,
      },
      openGraph: {
        title: data.title,
        description: data.description,
        type: 'website',
        url: canonicalUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title: data.title,
        description: data.description,
      },
    };
  }

  // 2. Localized Homepage (e.g. /ar, /fr, /es)
  if (route.type === 'home' && route.locale) {
    const langInfo = LANGUAGES[route.locale] || LANGUAGES.en;
    const canonicalUrl = `https://www.insta1000gram.com/${route.locale}/`;
    const title = `${langInfo.name} - Instagram Downloader 1080p Full HD | insta1000gram`;
    const description = `Download Instagram Reels, Videos, Photos, and Stories in 1080p Full HD. Fast, free, anonymous.`;

    const languagesMap: Record<string, string> = {
      'x-default': `https://www.insta1000gram.com/`,
    };
    for (const lang of ALL_SUPPORTED_LANGUAGES) {
      languagesMap[lang] = `https://www.insta1000gram.com/${lang}/`;
    }

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
        languages: languagesMap,
      },
      openGraph: {
        title,
        description,
        type: 'website',
        url: canonicalUrl,
      },
    };
  }

  // 3. Educational Guide Page (e.g. /ar/guide/how-to-download-instagram-reels)
  if (route.type === 'guide') {
    const guide = GUIDE_PAGES.find((g) => g.slug === route.guideSlug) || GUIDE_PAGES[0];
    const canonicalUrl = `https://www.insta1000gram.com/${route.locale}/guide/${guide.slug}`;
    const title = `${guide.title} (Step-by-Step Guide) | Insta1000gram`;
    const description = `Learn ${guide.title.toLowerCase()}. Complete step-by-step tutorial for free on insta1000gram.`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        type: 'article',
        url: canonicalUrl,
      },
    };
  }

  // 4. Legacy pSEO keyword or dynamic Django route
  const isStaticAsset = slugPath.startsWith('_next') || /\.(ico|png|jpg|jpeg|svg|webp|json|js|css|map|txt|xml)$/i.test(slugPath);
  if (!isStaticAsset) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/pseo/page/${slugPath}/`, {
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title,
          description: data.metaDescription,
          alternates: {
            canonical: data.canonicalUrl || `https://www.insta1000gram.com/${slugPath}`,
          },
          openGraph: {
            title: data.title,
            description: data.metaDescription,
            type: 'website',
            url: data.canonicalUrl || `https://www.insta1000gram.com/${slugPath}`,
          },
        };
      }
    } catch (e) {
      // backend not running or fallback
    }
  }

  const formattedName = slugPath.replace(/[-_]/g, ' ');
  return {
    title: `Download Instagram ${formattedName} in 1080p Full HD - insta1000gram`,
    description: `Free Instagram ${formattedName} downloader in MP4 / JPG master quality without login.`,
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const rawSlug = resolvedParams?.slug || [];
  const slugPath = Array.isArray(rawSlug) ? rawSlug.join('/') : (rawSlug || '');
  const route = parseCurrentRoute('/' + slugPath);

  let initialDownloaderData = null;
  let initialGuideData = null;
  let pseoData = null;
  let adsData: Record<string, { name: string; code: string }> = {};

  if (route.type === 'downloader') {
    initialDownloaderData = getDownloaderDataForLocale(route.locale, route.slug);
  } else if (route.type === 'guide') {
    initialGuideData = GUIDE_PAGES.find((g) => g.slug === route.guideSlug) || null;
  }

  const isStaticAsset = slugPath.startsWith('_next') || /\.(ico|png|jpg|jpeg|svg|webp|json|js|css|map|txt|xml)$/i.test(slugPath);

  // Fetch optional ads and pSEO backend data
  try {
    const [pseoRes, adsRes] = await Promise.all([
      (route.type === 'pseo-legacy' && !isStaticAsset)
        ? fetch(`${BACKEND_URL}/api/pseo/page/${slugPath}/`, { next: { revalidate: 3600 } })
        : Promise.resolve(null),
      fetch(`${BACKEND_URL}/api/ads/`, { next: { revalidate: 60 } }),
    ]);

    if (pseoRes && pseoRes.ok) {
      pseoData = await pseoRes.json();
    }
    if (adsRes && adsRes.ok) {
      const adsJson = await adsRes.json();
      adsData = adsJson.ads || {};
    }
  } catch (e) {
    // continue gracefully
  }

  return (
    <SlugRenderer
      initialSlugPath={slugPath}
      initialRoute={route}
      initialDownloaderData={initialDownloaderData}
      initialGuideData={initialGuideData}
      initialPseoData={pseoData}
      ads={adsData}
    />
  );
}
