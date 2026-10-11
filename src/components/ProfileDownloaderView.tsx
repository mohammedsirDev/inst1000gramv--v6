import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  User,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Search,
  Check,
  Copy,
  Users,
  Grid,
} from 'lucide-react';

export interface InstagramProfileData {
  username: string;
  fullName: string;
  biography: string;
  hdProfilePicUrl: string;
  profilePicUrl: string;
  downloadUrl: string;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount?: number | string;
  followingCount?: number | string;
  postsCount?: number | string;
}

export const ProfileDownloaderView: React.FC = () => {
  const { currentLang } = useLanguage();
  const isAr = currentLang === 'ar';

  const [inputVal, setInputVal] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<InstagramProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const sampleUsers = ['cristiano', 'leomessi', 'selenagomez', 'instagram'];

  const handleFetchProfile = async (targetUsername?: string) => {
    const raw = (targetUsername || inputVal).trim();
    if (!raw) {
      setError(
        isAr
          ? 'يرجى إدخال اسم المستخدم أو رابط الحساب (مثال: cristiano أو @cristiano)'
          : 'Please enter an Instagram username or profile link (e.g. cristiano or @cristiano)'
      );
      return;
    }

    setError(null);
    setDownloadSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/instagram/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: raw }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Failed to fetch profile (HTTP ${res.status})`);
      }

      const data: InstagramProfileData = await res.json();
      setProfileData(data);
    } catch (err: any) {
      setError(err?.message || (isAr ? 'تعذر جلب صورة الحساب' : 'Could not fetch profile picture.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPic = async () => {
    if (!profileData) return;
    const filename = `sssclips_${profileData.username}_profile_1080p.jpg`;
    const targetUrl = profileData.downloadUrl || profileData.hdProfilePicUrl;

    try {
      setDownloadSuccess(
        isAr ? 'جاري بدء تحميل الصورة بدقة 1080p...' : 'Starting 1080p profile picture download...'
      );

      const anchor = document.createElement('a');
      anchor.href = targetUrl;
      anchor.download = filename;
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setTimeout(() => {
        setDownloadSuccess(
          isAr
            ? `تم حفظ صورة الحساب ${profileData.username} بدقة 1080p بنجاح!`
            : `Profile picture for @${profileData.username} saved in 1080p!`
        );
      }, 800);
    } catch {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 my-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-pink-500/10 text-pink-400 border border-pink-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAr ? 'تحميل الصورة الشخصية بجودة 1080p HD' : 'Full-Size 1080p HD Profile Picture'}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          {isAr ? 'تحميل صورة بروفايل انستقرام بأعلى دقة' : 'Instagram Profile Picture (DP) Downloader'}
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          {isAr
            ? 'احفظ الصورة الشخصية بالحجم الكامل ودقة 1080x1080 بنقرة واحدة بدون تسجيل وبشكل مجهول.'
            : 'View and save full-size 1080x1080 Instagram avatars in original uncompressed HD quality.'}
        </p>
      </div>

      {/* Input Box Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-4 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFetchProfile();
              }}
              placeholder={
                isAr
                  ? 'أدخل اسم المستخدم أو الرابط (مثال: cristiano أو @selenagomez)...'
                  : 'Enter username or profile URL (e.g. cristiano or @selenagomez)...'
              }
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl py-3.5 pl-12 pr-4 rtl:pl-4 rtl:pr-12 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <button
            onClick={() => handleFetchProfile()}
            disabled={isLoading}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-pink-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isAr ? 'جاري البحث...' : 'Fetching...'}</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>{isAr ? 'عرض الصورة بدقة HD' : 'Get HD Picture'}</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Links */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs text-slate-400">
          <span className="font-semibold">{isAr ? 'حسابات شائعة:' : 'Popular Profiles:'}</span>
          {sampleUsers.map((u) => (
            <button
              key={u}
              onClick={() => {
                setInputVal(u);
                handleFetchProfile(u);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-pink-400 transition-colors font-mono cursor-pointer"
            >
              @{u}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {downloadSuccess && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}
      </div>

      {/* Result Card for Profile */}
      {profileData && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            {/* HD Avatar Display */}
            <div className="relative group shrink-0">
              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-3xl overflow-hidden border-4 border-pink-500/50 shadow-2xl bg-black relative">
                <img
                  src={profileData.hdProfilePicUrl}
                  alt={profileData.username}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback to normal pic url or dicebear
                    (e.target as HTMLImageElement).src = profileData.profilePicUrl;
                  }}
                />
                <span className="absolute bottom-2 right-2 bg-pink-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                  1080x1080 HD
                </span>
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="flex-1 flex flex-col justify-between text-center md:text-left rtl:md:text-right w-full">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {profileData.fullName}
                  </h2>
                  {profileData.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Check className="w-3 h-3" />
                      {isAr ? 'موثق' : 'Verified'}
                    </span>
                  )}
                  {profileData.isPrivate && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                      {isAr ? 'حساب خاص' : 'Private'}
                    </span>
                  )}
                </div>

                <p className="text-sm font-mono text-pink-400 mt-1">
                  @{profileData.username}
                </p>

                {profileData.biography && (
                  <p className="mt-3 text-xs sm:text-sm text-slate-300 whitespace-pre-line bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 max-h-32 overflow-y-auto">
                    {profileData.biography}
                  </p>
                )}

                {/* Followers and Stats */}
                {(profileData.followersCount || profileData.postsCount) && (
                  <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-xs font-semibold text-slate-400">
                    {profileData.followersCount && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-pink-400" />
                        <strong className="text-white">
                          {typeof profileData.followersCount === 'number'
                            ? profileData.followersCount.toLocaleString()
                            : profileData.followersCount}
                        </strong>{' '}
                        {isAr ? 'متابع' : 'followers'}
                      </span>
                    )}
                    {profileData.postsCount && (
                      <span className="flex items-center gap-1">
                        <Grid className="w-3.5 h-3.5 text-pink-400" />
                        <strong className="text-white">
                          {typeof profileData.postsCount === 'number'
                            ? profileData.postsCount.toLocaleString()
                            : profileData.postsCount}
                        </strong>{' '}
                        {isAr ? 'منشور' : 'posts'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Download Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleDownloadPic}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-pink-600/30 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'تحميل الصورة الأصلية (1080p JPG)' : 'Download HD Profile Picture (1080p JPG)'}</span>
                </button>

                <a
                  href={profileData.downloadUrl || profileData.hdProfilePicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isAr ? 'فتح بدقة كاملة' : 'View Full Size'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
