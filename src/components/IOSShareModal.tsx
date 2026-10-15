import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Share2,
  Copy,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Smartphone,
  Info,
  ArrowRight,
  HelpCircle,
  Clipboard,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface IOSShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSShareModal: React.FC<IOSShareModalProps> = ({ isOpen, onClose }) => {
  const { currentLang } = useLanguage();
  const isAr = currentLang === 'ar';
  const [activeTab, setActiveTab] = useState<'shortcut' | 'clipboard' | 'url'>('shortcut');
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.sssclips.com';
  const shortcutTargetUrl = `${originUrl}/share-target?url=`;

  const handleCopyShortcutUrl = () => {
    navigator.clipboard.writeText(shortcutTargetUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100">
        {/* Glow decoration */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/30 mb-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>{isAr ? 'دليل مستخدمي الآيفون' : 'iPhone & iOS Guide'}</span>
              </div>
              <h3 className="text-lg font-black text-white leading-tight">
                {isAr ? 'المشاركة والتحميل المباشر على الآيفون' : 'Share & Download on iPhone'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Apple Restriction Explanation Notice */}
        <div className="mb-5 p-3.5 bg-amber-950/40 border border-amber-600/50 rounded-2xl text-xs text-amber-200/90 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300 text-xs mb-1">
                {isAr
                  ? 'لماذا لا يظهر sssclips في قائمة "المشاركة عبر" تلقائياً على الآيفون؟'
                  : 'Why doesn\'t sssclips appear in the iOS "Share via" menu automatically?'}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-300">
                {isAr
                  ? 'نظام iOS من آبل يقصر قائمة المشاركة التلقائية على تطبيقات متجر App Store فقط، ولا يدعم ميزة Web Share Target لتطبيقات الويب (PWA) بعكس الأندرويد. لكن يمكنك إضافته لقائمة المشاركة بضغطة زر واحدة عبر تطبيق الاختصارات الرسمي!'
                  : 'Apple\'s iOS restricts the Share Sheet app row exclusively to native App Store apps and does not support Web Share Target for PWAs (unlike Android). You can easily add sssclips to your iOS Share Sheet using the native Apple Shortcuts app!'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('shortcut')}
            className={`flex-1 py-2 px-2.5 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'shortcut'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? '1. اختصار آبل (Share Sheet)' : '1. Apple Shortcut'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clipboard')}
            className={`flex-1 py-2 px-2.5 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'clipboard'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? '2. النسخ الذكي (الأسهل)' : '2. Smart Clipboard'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2 px-2.5 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'url'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAr ? '3. اختصار الرابط' : '3. URL Shortcut'}
          </button>
        </div>

        {/* Tab 1: Apple Shortcut */}
        {activeTab === 'shortcut' && (
          <div className="space-y-4 text-xs sm:text-sm text-slate-300">
            <div className="p-3 bg-pink-950/30 border border-pink-700/40 rounded-2xl">
              <span className="font-extrabold text-pink-300 text-xs block mb-1">
                {isAr
                  ? '🌟 الطريقة الموصى بها: يظهر sssclips داخل قائمة مشاركة انستقرام مباشرة!'
                  : '🌟 Recommended: Puts sssclips directly inside your Instagram Share Sheet!'}
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isAr
                  ? 'من خلال إضافة اختصار بسيط في تطبيق "الاختصارات" (Shortcuts) المدمج في الآيفون، سيظهر خيار "Download with sssclips" عند الضغط على مشاركة أي ريلز أو بوست في انستقرام.'
                  : 'By creating a simple 10-second shortcut in iOS Shortcuts, "Download with sssclips" will appear in your Share Sheet every time you tap Share on Instagram.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div className="leading-snug">
                  <p className="font-bold text-white text-xs mb-0.5">
                    {isAr ? 'افتح تطبيق "الاختصارات" (Shortcuts) على آيفون' : 'Open Apple "Shortcuts" on iPhone'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'اضغط على علامة (+) لإنشاء اختصار جديد، وسمّه "Download with sssclips".'
                      : 'Tap (+) to create a new shortcut and name it "Download with sssclips".'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div className="leading-snug">
                  <p className="font-bold text-white text-xs mb-0.5">
                    {isAr ? 'فعّل "إظهار في قائمة المشاركة" (Show in Share Sheet)' : 'Enable "Show in Share Sheet"'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'في إعدادات تفاصيل الاختصار (أيقونة i)، فعّل خيار "إظهار في صفحة المشاركة" لتظهر في انستقرام.'
                      : 'In the shortcut details (i icon), toggle ON "Show in Share Sheet" so it appears in Instagram.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </span>
                <div className="leading-snug">
                  <p className="font-bold text-white text-xs mb-0.5">
                    {isAr ? 'أضف إجراء "فتح العناوين" (Open URLs)' : 'Add Action "Open URLs"'}
                  </p>
                  <p className="text-[11px] text-slate-400 mb-2">
                    {isAr
                      ? 'أضف إجراء فتح الرابط والصق العنوان التالي متبوعاً بـ "مدخلات الاختصار" (Shortcut Input):'
                      : 'Add the "Open URLs" action and paste this target link with Shortcut Input:'}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-mono bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800 text-pink-300 break-all select-all flex-1">
                      {shortcutTargetUrl}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyShortcutUrl}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/30 border border-emerald-700/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isAr
                  ? 'الآن عند الضغط على مشاركة في انستقرام، اختر "Download with sssclips" وسيفتح التحميل فوراً!'
                  : 'Done! Now in Instagram, tap Share -> "Download with sssclips" to download instantly!'}
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Smart Clipboard Method */}
        {activeTab === 'clipboard' && (
          <div className="space-y-4 text-xs sm:text-sm text-slate-300">
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <h4 className="font-extrabold text-white text-xs mb-1">
                {isAr ? 'أسرع طريقة بدون أي إعدادات (نقرتين فقط):' : 'The Fastest Zero-Setup Method (2 Taps):'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'إذا كنت لا ترغب في إعداد اختصار، فإن sssclips يحتوي على كاشف حافظة ذكي يتعرف على رابط انستقرام فور فتح التطبيق.'
                  : 'If you prefer no setup, sssclips automatically detects copied Instagram links the moment you open the app!'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div className="leading-snug">
                  <p className="font-bold text-white text-xs mb-0.5">
                    {isAr ? 'في انستقرام: اضغط على زر المشاركة ثم "نسخ الرابط" (Copy link)' : 'In Instagram: Tap Share, then "Copy link"'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'يتم نسخ رابط مقطع الريلز أو المنشور إلى حافظة الآيفون مباشرة.'
                      : 'The Instagram Reel or post URL is copied to your iPhone clipboard.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div className="leading-snug">
                  <p className="font-bold text-white text-xs mb-0.5">
                    {isAr ? 'افتح تطبيق sssclips من شاشتك الرئيسية' : 'Tap sssclips on your Home Screen'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'ستظهر لك لافتة فورية تخبرك باكتشاف الرابط، اضغط "تحميل الآن" لتحميل الفيديو بدقة 1080p Full HD!'
                      : 'A prompt will appear with your copied link. Tap "Download Now" to save your 1080p video immediately!'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-pink-950/30 border border-pink-700/40 rounded-xl flex items-center gap-2 text-xs text-pink-300">
              <Clipboard className="w-4 h-4 text-pink-400 shrink-0" />
              <span>
                {isAr
                  ? 'يتوفر أيضاً زر "لصق الرابط" في مربع التحميل لتوفير وقتك.'
                  : 'There is also a 1-tap "Paste" button directly inside the download box.'}
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: URL Replacement Trick */}
        {activeTab === 'url' && (
          <div className="space-y-4 text-xs sm:text-sm text-slate-300">
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <h4 className="font-extrabold text-white text-xs mb-1">
                {isAr ? 'طريقة استبدال الرابط في متصفح سفاري:' : 'The Safari URL Replacement Trick:'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'عند تصفح انستقرام من خلال متصفح سفاري على الآيفون:'
                  : 'When viewing any Instagram link in your Safari browser:'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
              <div className="text-slate-400 text-[11px]">
                {isAr ? 'الرابط الأصلي:' : 'Original URL:'}
              </div>
              <div className="text-rose-400 line-through truncate text-[11px]">
                https://www.instagram.com/reel/C7xY9...
              </div>
              <div className="text-emerald-400 text-[11px] font-bold">
                {isAr ? 'غيّر instagram إلى sssclips:' : 'Change instagram to sssclips:'}
              </div>
              <div className="text-white bg-slate-900 p-2 rounded-lg border border-pink-500/40 font-bold truncate text-[11px]">
                https://www.sssclips.com/reel/C7xY9...
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {isAr
                ? 'سيتم تحويلك إلى صفحة التنزيل الفورية مع استخراج الفيديو الأصلي بدون علامة مائية.'
                : 'You will instantly be redirected to the download screen with the uncompressed 1080p MP4 ready.'}
            </p>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            {isAr ? 'متوافق مع جميع إصدارات iOS 15 - 18+' : 'Compatible with iOS 15 - 18+ on all iPhones'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
          >
            {isAr ? 'فهمت، شكراً!' : 'Got it, thanks!'}
          </button>
        </div>
      </div>
    </div>
  );
};
