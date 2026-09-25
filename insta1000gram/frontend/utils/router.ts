import { SupportedLanguage, DownloaderSlug, MediaType } from '../types';
import { ALL_SUPPORTED_LANGUAGES } from '../config/languages';
import { DOWNLOADER_PAGES, GUIDE_PAGES } from '../config/downloaders';

export type RouteType =
  | { type: 'home'; locale?: SupportedLanguage }
  | { type: 'smart-media'; mediaType: MediaType; mediaId: string; instagramUrl: string }
  | { type: 'downloader'; locale: SupportedLanguage; slug: DownloaderSlug }
  | { type: 'guide'; locale: SupportedLanguage; guideSlug: string }
  | { type: 'pseo-legacy'; slug: string }
  | { type: 'not-found' };

export const SLUG_ALIASES: Record<string, DownloaderSlug> = {
  'reels-downloader': 'reels-downloader',
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

export function parseCurrentRoute(pathname: string, search: string = ''): RouteType {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // 1. Smart Instagram URLs: /reels/ID, /reel/ID, /p/ID, /stories/username/ID, /tv/ID
  const smartMatch = cleanPath.match(/^\/(reels|reel|p|stories|tv)\/([a-zA-Z0-9_\-\.\/]+)/i);
  if (smartMatch) {
    const rawKind = smartMatch[1].toLowerCase();
    const mediaId = smartMatch[2];

    let mediaType: MediaType = 'reels';
    if (rawKind === 'reels' || rawKind === 'reel') {
      mediaType = 'reels';
    } else if (rawKind === 'p') {
      mediaType = 'photo';
    } else if (rawKind === 'stories') {
      mediaType = 'stories';
    } else if (rawKind === 'tv') {
      mediaType = 'video';
    }

    const instagramUrl = `https://www.instagram.com${pathname}${search}`;
    return {
      type: 'smart-media',
      mediaType,
      mediaId,
      instagramUrl,
    };
  }

  // 2. Localized Downloader pages: /{locale}/{slug} (e.g. /en/reels-downloader, /ar/reels-downloader, /fr/reels-downloader)
  const downloaderMatch = cleanPath.match(/^\/([a-zA-Z]{2}(?:-[a-zA-Z]+)?)\/([a-zA-Z0-9\-]+)$/);
  if (downloaderMatch) {
    const rawLocale = (downloaderMatch[1].includes('-') 
      ? downloaderMatch[1] 
      : downloaderMatch[1].toLowerCase()) as SupportedLanguage;
    const rawSlug = downloaderMatch[2].toLowerCase();
    const canonicalSlug = SLUG_ALIASES[rawSlug];

    if (ALL_SUPPORTED_LANGUAGES.includes(rawLocale) && canonicalSlug) {
      return {
        type: 'downloader',
        locale: rawLocale,
        slug: canonicalSlug,
      };
    }
  }

  // 3. Localized Educational Guide pages: /{locale}/guide/{guideSlug}
  const guideMatch = cleanPath.match(/^\/([a-zA-Z]{2}(?:-[a-zA-Z]+)?)\/guide\/([a-zA-Z0-9\-]+)$/);
  if (guideMatch) {
    const rawLocale = (guideMatch[1].includes('-')
      ? guideMatch[1]
      : guideMatch[1].toLowerCase()) as SupportedLanguage;
    const guideSlug = guideMatch[2].toLowerCase();

    if (ALL_SUPPORTED_LANGUAGES.includes(rawLocale) && GUIDE_PAGES.some((g) => g.slug === guideSlug)) {
      return {
        type: 'guide',
        locale: rawLocale,
        guideSlug,
      };
    }
  }

  // 4. Localized Homepage: /{locale} (e.g. /en, /ar, /fr, /zh-Hans)
  const localeHomeMatch = cleanPath.match(/^\/([a-zA-Z]{2}(?:-[a-zA-Z]+)?)$/);
  if (localeHomeMatch) {
    const rawLocale = (localeHomeMatch[1].includes('-')
      ? localeHomeMatch[1]
      : localeHomeMatch[1].toLowerCase()) as SupportedLanguage;
    if (ALL_SUPPORTED_LANGUAGES.includes(rawLocale)) {
      return {
        type: 'home',
        locale: rawLocale,
      };
    }
  }

  // 5. Root Homepage: /
  if (cleanPath === '/') {
    return {
      type: 'home',
    };
  }

  // 6. Fallback legacy pSEO slug
  const legacySlug = cleanPath.replace(/^\//, '');
  return {
    type: 'pseo-legacy',
    slug: legacySlug,
  };
}

export function navigateTo(path: string) {
  if (typeof window !== 'undefined') {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
