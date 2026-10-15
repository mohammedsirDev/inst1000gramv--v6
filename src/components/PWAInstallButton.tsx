import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../context/LanguageContext';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'footer';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const { currentLang } = useLanguage();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const isAr = currentLang === 'ar';

  // Do not render if already running in standalone PWA mode
  if (isInstalled) {
    return null;
  }

  // If not installable and not on a mobile device (e.g. desktop browser with no prompt yet)
  if (!isInstallable && !isIOS && !isAndroid) {
    return null;
  }

  const handleInstallClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else if (isAndroid) {
      setShowAndroidModal(true);
    }
  };

  const buttonLabel = isAr
    ? isIOS
      ? 'تثبيت التطبيق على آيفون'
      : isAndroid
      ? 'تثبيت التطبيق على أندرويد'
      : 'تثبيت التطبيق'
    : isIOS
    ? 'Install on iPhone'
    : isAndroid
    ? 'Install on Android'
    : 'Install App';

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={
          className ||
          (variant === 'header'
            ? 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl transition-all shadow-md shadow-pink-500/20 cursor-pointer'
            : 'flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl transition-all shadow-lg hover:shadow-pink-500/30 cursor-pointer')
        }
        title={buttonLabel}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>{buttonLabel}</span>
      </button>

      {/* Android Installation & Share Sheet Guide Modal */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setShowAndroidModal(false)}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                <span className="font-black text-white text-base">sss</span>
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">
                  {isAr ? 'تثبيت sssclips على الأندرويد' : 'Install sssclips on Android'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAr ? 'لإضافته للشاشة الرئيسية وقائمة المشاركة' : 'Add to home screen & native share menu'}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 my-5 text-sm text-slate-300">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div className="leading-snug">
                  <span>{isAr ? 'اضغط على زر القائمة ' : 'Tap the '}</span>
                  <span className="font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded text-xs mx-0.5">
                    ⋮
                  </span>
                  <span>{isAr ? ' (النقاط الثلاث) أعلى يمين متصفح Chrome.' : ' (three dots) in Chrome.'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  2
                </div>
                <div className="leading-snug">
                  <span>{isAr ? 'اختر ' : 'Select '}</span>
                  <span className="font-semibold text-white bg-slate-700 px-1.5 py-0.5 rounded text-xs mx-0.5">
                    {isAr ? 'تثبيت التطبيق (Install app)' : 'Install app / Add to Home screen'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  3
                </div>
                <div className="leading-snug">
                  <span>
                    {isAr
                      ? 'سيظهر تطبيق sssclips في شاشتك الرئيسية، وعند مشاركة أي ريلز من انستقرام سيظهر sssclips في قائمة المشاركة فوراً!'
                      : 'Once installed, sssclips appears on your home screen and in the native Android Share Menu from Instagram!'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (isInstallable) {
                  install();
                }
                setShowAndroidModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold text-sm text-white transition cursor-pointer shadow-md"
            >
              {isAr ? 'فهمت، شكراً!' : 'Got it!'}
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                <span className="font-black text-white text-base">sss</span>
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">
                  {isAr ? 'تثبيت sssclips على الآيفون' : 'Install sssclips on iPhone'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAr ? 'يعمل كتطبيق سريع بدون متجر تطبيقات' : 'Fast standalone web app experience'}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 my-5 text-sm text-slate-300">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div className="leading-snug">
                  <span>{isAr ? 'اضغط على زر المشاركة ' : 'Tap the '}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-white bg-slate-700 px-1.5 py-0.5 rounded text-xs mx-0.5">
                    <Share2 className="w-3.5 h-3.5 text-blue-400" />
                    {isAr ? 'مشاركة' : 'Share'}
                  </span>
                  <span>{isAr ? ' في شريط سفاري السفلي.' : ' in the Safari bottom toolbar.'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  2
                </div>
                <div className="leading-snug">
                  <span>{isAr ? 'مرّر لأسفل واختر ' : 'Scroll down and tap '}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-white bg-slate-700 px-1.5 py-0.5 rounded text-xs mx-0.5">
                    <PlusSquare className="w-3.5 h-3.5 text-pink-400" />
                    {isAr ? 'إضافة إلى الصفحة الرئيسية' : 'Add to Home Screen'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  3
                </div>
                <div className="leading-snug">
                  <span>{isAr ? 'اضغط على ' : 'Tap '}</span>
                  <span className="font-bold text-white mx-0.5">
                    {isAr ? '"إضافة" (Add)' : '"Add"'}
                  </span>
                  <span>
                    {isAr
                      ? ' في الزاوية العلوية ليظهر التطبيق بأيقونة sssclips على شاشتك.'
                      : ' in the top-right corner to place sssclips on your home screen.'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold text-sm text-white transition cursor-pointer shadow-md"
            >
              {isAr ? 'فهمت، شكراً!' : 'Got it!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
