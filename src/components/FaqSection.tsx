import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const { translations, currentLang } = useLanguage();
  const isAr = currentLang === 'ar';
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const baseFaqs = translations.faqs || [];

  const iosFaq = {
    q: isAr
      ? 'كيف أشارك مقاطع انستقرام مباشرة من الآيفون عبر قائمة المشاركة (Share Sheet)؟'
      : 'Why doesn\'t sssclips appear in the iPhone "Share via" menu automatically, and how do I enable it?',
    a: isAr
      ? 'يقيد نظام Apple iOS قائمة المشاركة على تطبيقات متجر App Store فقط، ولا يدعم ميزة Web Share Target لتطبيقات الويب (بعكس الأندرويد). لتفعيل المشاركة بنقرة واحدة على الآيفون: يمكنك استخدام اختصار آبل الرسمي (Apple Shortcut) الموضح في زر "مشاركة الآيفون"، أو ببساطة الضغط على "نسخ الرابط" في انستقرام وفتح sssclips، حيث سيتعرف الكاشف الذكي على الرابط فوراً دون الحاجة للصق اليدوي.'
      : 'Apple\'s iOS restricts the native Share Sheet app row exclusively to native App Store apps and does not support the Web Share Target API for PWAs (unlike Android). To share in 1 tap on iPhone: you can set up our 10-second Apple Shortcut (via the "iPhone Share" guide button), or simply tap "Copy link" in Instagram and open sssclips — our smart clipboard detector will instantly pop up your download ready in 1080p!',
  };

  const faqs = [...baseFaqs, iosFaq];

  return (
    <section className="py-14 sm:py-20 bg-slate-950 border-t border-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-black tracking-widest text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full">
            {translations.faqTitle || 'FAQ'}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mt-3 tracking-tight">
            {translations.faqTitle}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 font-medium">
            {translations.faqSubtitle}
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-lg transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left rtl:text-right flex items-center justify-between gap-4 font-bold text-white text-sm sm:text-base hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                      isOpen ? 'rotate-180 text-pink-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
