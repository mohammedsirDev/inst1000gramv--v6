import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Bookmark, Copy, Check, X, BookmarkCheck, ExternalLink, Sparkles, Monitor } from 'lucide-react';

interface BookmarkletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BOOKMARKLET_CODE = `javascript:(function(){var url=window.location.href;if(url.indexOf('instagram.com')===-1)return alert('Open an Instagram post first!');window.open(url.replace('instagram.com','sssclips.com'),'_blank');})();`;

export const BookmarkletModal: React.FC<BookmarkletModalProps> = ({ isOpen, onClose }) => {
  const { currentLang } = useLanguage();
  const isAr = currentLang === 'ar';
  const [copied, setCopied] = useState(false);
  const [showClickNotice, setShowClickNotice] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(BOOKMARKLET_CODE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {isAr ? 'اختصار متصفح الكمبيوتر (Bookmarklet)' : 'Desktop 1-Click Bookmarklet'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'تحميل أي ريلز أو منشور بضغطة زر واحدة من شريط الإشارات' : 'Download any Instagram post with 1 click from your browser bar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Draggable button */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-center">
            <p className="text-xs text-slate-300 font-semibold mb-3">
              {isAr ? 'اسحب هذا الزر مباشرة إلى شريط الإشارات (Bookmarks Bar):' : 'Drag this button directly to your Bookmarks Bar:'}
            </p>
            <a
              href={BOOKMARKLET_CODE}
              onClick={(e) => {
                e.preventDefault();
                setShowClickNotice(true);
                setTimeout(() => setShowClickNotice(false), 4000);
              }}
              draggable
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-pink-600/30 cursor-grab active:cursor-grabbing border border-pink-400/30 select-none"
            >
              <Sparkles className="w-4 h-4" />
              <span>📥 SSSClips 1-Click</span>
            </a>
            {showClickNotice && (
              <p className="text-xs text-pink-400 font-medium mt-2 bg-pink-500/10 py-1 px-2 rounded-lg border border-pink-500/20">
                {isAr
                  ? 'اسحب هذا الزر إلى شريط إشارات متصفحك (Bookmarks Bar) أو انسخ الكود بالأسفل.'
                  : 'Drag this button up to your browser Bookmarks Bar, or copy the code below!'}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-2">
              {isAr ? 'اضغط Ctrl+Shift+B (أو Cmd+Shift+B في ماك) لإظهار شريط الإشارات' : 'Press Ctrl+Shift+B (Cmd+Shift+B on Mac) to show Bookmarks Bar'}
            </p>
          </div>

          {/* Instructions Steps */}
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-pink-950/80 border border-pink-600/50 text-pink-400 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
              <p>{isAr ? 'تصفح موقع انستقرام على جهاز الكمبيوتر وافتح أي مقطع ريلز أو منشور أو ستوري.' : 'Browse Instagram on your computer and open any Reel, Post, or Story.'}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-pink-950/80 border border-pink-600/50 text-pink-400 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
              <p>{isAr ? 'اضغط على اختصار "SSSClips 1-Click" في شريط الإشارات.' : 'Click the "SSSClips 1-Click" bookmark on your browser bar.'}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-pink-950/80 border border-pink-600/50 text-pink-400 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
              <p>{isAr ? 'سيفتح الفيديو مباشرة بجودة 1080p Full HD جاهزاً للتحميل دون الحاجة لنسخ الرابط!' : 'It opens directly in 1080p Full HD ready to download with zero copying required!'}</p>
            </div>
          </div>

          {/* Manual Code Copy */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-slate-400">
              <span>{isAr ? 'أو انسخ كود الـ JavaScript يدوياً:' : 'Or copy bookmarklet code manually:'}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy Code')}</span>
              </button>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400 break-all select-all max-h-24 overflow-y-auto">
              {BOOKMARKLET_CODE}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
