import React, { useEffect, useState } from 'react';
import { GuideDefinition, DOWNLOADER_PAGES } from '../config/downloaders';
import { getDownloaderDataForLocale } from '../translations/downloadersData';
import { SupportedLanguage, DownloaderSlug, InstagramMediaResult } from '../types';
import { DownloaderBox } from './DownloaderBox';
import { ResultCard } from './ResultCard';
import { ArrowLeft, Clock, Smartphone, Monitor } from 'lucide-react';

interface GuidePageViewProps {
  guide: GuideDefinition;
  locale: SupportedLanguage;
  onNavigateHome: () => void;
  onNavigateTool: (slug: DownloaderSlug) => void;
  onBack: () => void;
}

const ARABIC_GUIDE_TITLES: Record<string, string> = {
  'how-to-download-instagram-reels-on-iphone': 'كيفية تحميل ريلز انستقرام على الآيفون والآيباد',
  'how-to-download-instagram-reels-on-android': 'كيفية تحميل ريلز انستقرام على هواتف أندرويد',
  'how-to-download-instagram-stories-anonymously': 'كيفية مشاهدة وتحميل ستوري انستقرام بشكل مجهول',
  'how-to-save-instagram-photos-in-hd': 'كيفية حفظ صور وألبومات انستقرام بأعلى جودة HD',
  'how-to-use-insta1000gram-url-shortcut': 'كيفية استخدام اختصار الرابط 1kgram.com للتحميل الفوري',
};

export const GuidePageView: React.FC<GuidePageViewProps> = ({
  guide,
  locale,
  onNavigateHome,
  onNavigateTool,
  onBack,
}) => {
  const [downloadResult, setDownloadResult] = useState<InstagramMediaResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isAr = locale === 'ar';
  const displayTitle = isAr ? ARABIC_GUIDE_TITLES[guide.slug] || guide.title : guide.title;

  useEffect(() => {
    document.title = isAr
      ? `${displayTitle} | 1kgram`
      : `${guide.title} (Step-by-Step Guide) | 1kgram`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [guide, isAr, displayTitle]);

  // Find matching tool
  const matchingTool = DOWNLOADER_PAGES.find((p) => p.type === guide.category) || DOWNLOADER_PAGES[0];
  const localizedMatchingTool = getDownloaderDataForLocale(locale, matchingTool.slug);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top breadcrumb */}
      <nav className="bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between text-xs sm:text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-slate-700 hover:text-pink-600 font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>{isAr ? 'رجوع' : 'Back'}</span>
            </button>
            <span>/</span>
            <button onClick={onNavigateHome} className="hover:text-pink-600 transition-colors">
              {isAr ? 'الرئيسية' : 'Home'}
            </button>
            <span>/</span>
            <span className="text-pink-600 font-bold truncate max-w-xs">{displayTitle}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{isAr ? 'دقيقتان للقراءة' : guide.readTime}</span>
          </div>
        </div>
      </nav>

      {/* Guide Content Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase bg-pink-100 text-pink-700 mb-4">
          <span>{isAr ? 'دليل الاستخدام' : 'Tutorial'}</span>
          <span>•</span>
          <span className="uppercase">{guide.category}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          {displayTitle}
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
          {isAr
            ? 'تعرف على كيفية حفظ مقاطع ريلز وفيديوهات وصور وستوري انستقرام بسهولة على هاتفك أو جهاز الكمبيوتر بجودة 1080p الأصلية بدون علامة مائية أو تثبيت أي تطبيقات خارجية.'
            : 'Learn how to save Instagram content effortlessly to your phone or computer in original 1080p high definition without watermarks or installing untrusted third-party apps.'}
        </p>

        {/* Embedded Downloader Box for instant action */}
        <div className="my-8">
          <DownloaderBox
            activeTab={guide.category}
            onSelectTab={() => {}}
            onResult={(res) => setDownloadResult(res)}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </div>

        {downloadResult && (
          <div className="my-8">
            <ResultCard
              result={downloadResult}
              onClear={() => setDownloadResult(null)}
            />
          </div>
        )}

        {/* Step-by-Step Walkthrough */}
        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm mt-10">
          <h2 className="text-2xl font-bold text-slate-900 border-b border-slate-100 pb-4">
            {isAr ? 'خطوات التحميل التفصيلية' : 'Step-by-Step Instructions'}
          </h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-pink-500 text-white font-black flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {isAr ? 'افتح انستقرام وانسخ رابط المنشور' : 'Open Instagram & Copy the Share Link'}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base mt-1.5 leading-relaxed">
                  {isAr ? (
                    <>
                      افتح تطبيق انستقرام على هاتفك الآيفون أو أندرويد (أو موقع instagram.com على الكمبيوتر). انتقل إلى مقطع الريلز أو الفيديو أو الصورة أو الستوري التي ترغب بحفظها، ثم اضغط على أيقونة <strong>المشاركة</strong> أو <strong>النقاط الثلاث (...)</strong> واختر <strong>نسخ الرابط (Copy Link)</strong>.
                    </>
                  ) : (
                    <>
                      Open the Instagram app on iOS or Android (or visit instagram.com in any desktop browser). Find the Reel, post, story, or video you wish to save. Tap the <strong>Share</strong> icon (paper airplane) or the <strong>three dots (...)</strong> in the top-right corner, then tap <strong>Copy Link</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {isAr ? 'الصق الرابط في موقع 1kgram' : 'Paste the URL into 1kgram'}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base mt-1.5 leading-relaxed">
                  {isAr ? (
                    <>
                      انتقل إلى موقع <strong>1kgram.com</strong> في متصفحك (سفاري أو كروم أو فايرفوكس). الصق رابط انستقرام المنسوخ في مربع البحث أعلاه واضغط على <strong>جلب وتحميل</strong>.
                    </>
                  ) : (
                    <>
                      Navigate to <strong>1kgram.com</strong> in your browser (Safari, Chrome, Firefox, or Edge). Paste the copied Instagram link into the search box above and press <strong>Fetch &amp; Download</strong>.
                    </>
                  )}
                </p>
                <div className="mt-3 p-3 bg-pink-50 rounded-xl border border-pink-200/80 text-xs sm:text-sm text-pink-900">
                  {isAr ? (
                    <>
                      💡 <strong>اختصار احترافي:</strong> يمكنك أيضاً استبدال كلمة{' '}
                      <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-pink-200">insta</code> بـ{' '}
                      <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-pink-200">1k</code> في رابط انستقرام مباشرة (مثال:{' '}
                      <code className="font-mono" dir="ltr">1kgram.com/reels/...</code>) والضغط على إدخال!
                    </>
                  ) : (
                    <>
                      💡 <strong>Pro Shortcut:</strong> You can also just replace <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-pink-200">insta</code> with <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-pink-200">1k</code> in the Instagram URL (e.g. <code className="font-mono">1kgram.com/reels/...</code>) and hit Enter!
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {isAr ? 'احفظ الفيديو 1080p MP4 أو الصورة في ألبوم الكاميرا' : 'Save 1080p MP4 or JPG to Your Camera Roll'}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base mt-1.5 leading-relaxed">
                  {isAr ? (
                    <>
                      سيقوم النظام باستخراج الفيديو بأعلى دقة 1080p 60fps أو الصورة الأصلية JPG. اضغط على زر <strong>تحميل</strong> لحفظ الملف مباشرة في تطبيق الصور على الآيفون أو معرض أندرويد أو مجلد التنزيلات على الكمبيوتر.
                    </>
                  ) : (
                    <>
                      Our system will extract the highest resolution 1080p 60fps video stream or master JPG photo. Click the <strong>Download</strong> button to save directly to your iPhone Photos app, Android Gallery, or computer Downloads folder.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Device-Specific Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                {isAr ? 'نصيحة لمستخدمي آيفون وآيباد (iOS)' : 'iOS (iPhone & iPad) Tip'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isAr ? (
                <>
                  استخدم متصفح Safari للحصول على أفضل تجربة على نظام iOS. عند الضغط على تحميل، وافق على تنزيل الملف ثم اضغط على سهم التنزيلات الأزرق في شريط Safari واختر <strong>حفظ الفيديو (Save Video)</strong> لنقله إلى ألبوم الصور.
                </>
              ) : (
                <>
                  Always use Safari for best results on iOS. When you tap Download, Safari will prompt "Do you want to download this file?". Tap <strong>Download</strong>, then tap the blue download arrow in the Safari address bar, select the video, tap the Share icon, and choose <strong>Save Video</strong> to put it in your camera roll.
                </>
              )}
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                {isAr ? 'نصيحة لمستخدمي أندرويد والكمبيوتر' : 'Android & PC Tip'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isAr
                ? 'على هواتف أندرويد، يقوم متصفح Google Chrome بحفظ الفيديو والصور تلقائياً في ذاكرة الهاتف وتظهر فوراً في تطبيق المعرض (Gallery) وصور جوجل دون الحاجة لأي صلاحيات إضافية.'
                : 'On Android, Google Chrome will automatically save the video to your internal storage and make it immediately visible in Google Photos, Samsung Gallery, or VLC Player without needing extra permissions.'}
            </p>
          </div>
        </div>

        {/* Related Tool CTA */}
        <div className="mt-10 p-8 rounded-3xl bg-linear-to-r from-slate-900 to-purple-950 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-pink-400">
              {isAr ? 'جاهز للتحميل الآن؟' : 'Ready to Download?'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black mt-1">
              {isAr ? `استخدم أداة ${localizedMatchingTool.h1}` : `Use the Dedicated ${matchingTool.name}`}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md">
              {isAr
                ? 'تحميل سريع ومجاني وبدون علامة مائية وبخصوصية تامة.'
                : 'Fast, anonymous, and watermark-free Instagram media downloads.'}
            </p>
          </div>
          <button
            onClick={() => onNavigateTool(matchingTool.slug)}
            className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-pink-600/30 transition-all shrink-0"
          >
            {isAr ? `افتح ${localizedMatchingTool.h1}` : `Open ${matchingTool.shortName} Downloader`}
          </button>
        </div>
      </article>
    </div>
  );
};
