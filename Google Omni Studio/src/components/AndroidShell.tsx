import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Film,
  Music,
  Folder,
  Smartphone,
  Monitor,
  Download,
  Share2,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Code,
} from 'lucide-react';
import { StudioTab } from '../types';
import { LayoutContext } from '../LayoutContext';
import { useGoogleAuth } from '../GoogleAuthContext';

interface Props {
  currentTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  onOpenInstallGuide: () => void;
  children: React.ReactNode;
}

export const AndroidShell: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  onOpenInstallGuide,
  children,
}) => {
  const { user, openAuthModal } = useGoogleAuth();
  // View mode for desktop users who want to toggle mobile preview
  const [viewMode, setViewMode] = useState<'web' | 'mobile'>('web');
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [currentTimeStr, setCurrentTimeStr] = useState('12:45');

  const mobileScrollRef = React.useRef<HTMLElement | null>(null);
  const desktopScrollRef = React.useRef<HTMLDivElement | null>(null);

  // Scroll container to top on tab switch
  useEffect(() => {
    try {
      if (mobileScrollRef.current) {
        mobileScrollRef.current.scrollTop = 0;
      }
      if (desktopScrollRef.current) {
        desktopScrollRef.current.scrollTop = 0;
      }
    } catch {}
  }, [currentTab]);

  // Detect real mobile screen width
  useEffect(() => {
    const checkScreen = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Real-time clock for authentic mobile status
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
    } catch {}
  };

  const navItems = [
    {
      id: 'flow' as StudioTab,
      label: 'Google Flow',
      shortLabel: 'Flow',
      icon: Sparkles,
      desc: '이미지 + Veo 영상 통합 스튜디오',
      color: 'text-indigo-400',
      activeBg: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40',
      activeMobile: 'text-indigo-400 bg-indigo-500/15',
    },
    {
      id: 'music' as StudioTab,
      label: 'Flow Music',
      shortLabel: 'Music',
      icon: Music,
      desc: 'Lyria 3.5 기반 음악 전용 스튜디오',
      color: 'text-purple-400',
      activeBg: 'bg-purple-600/20 text-purple-300 border-purple-500/40',
      activeMobile: 'text-purple-400 bg-purple-500/15',
    },
    {
      id: 'vault' as StudioTab,
      label: '통합 보관함 (Vault)',
      shortLabel: '보관함',
      icon: Folder,
      desc: '3종 에셋 & 프로젝트 묶음',
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
      activeMobile: 'text-emerald-400 bg-emerald-500/15',
    },
  ];

  const currentTabObj = navItems.find((n) => n.id === currentTab) || navItems[0];
  const ActiveIcon = currentTabObj.icon;

  // Render authentic Android Native Mobile layout if on a mobile viewport or mobile mode
  const renderNativeMobile = isMobileScreen || viewMode === 'mobile';

  return (
    <div className="h-full h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. Global Production Top Navigation Bar */}
      <header className="flex-shrink-0 z-40 w-full bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
                Gemini OmniStudio
              </h1>
              {/* Desktop Active Module Badge */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                순수 클라이언트 무서버 단독 구동 지원
              </span>
            </div>
            {/* Mobile active tab indicator */}
            <div className="flex sm:hidden items-center gap-1.5 text-[11px] text-slate-400">
              <ActiveIcon className={`w-3 h-3 ${currentTabObj.color}`} />
              <span className="text-white font-medium truncate">{currentTabObj.label}</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Desktop Dual View Mode Switcher (Visible on desktop monitors >= 1024px only) */}
          {!isMobileScreen && (
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('web')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition ${
                  viewMode === 'web'
                    ? 'bg-indigo-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="실제 웹 프로덕션 와이드 모드"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>데스크톱 웹 뷰</span>
              </button>

              <button
                onClick={() => setViewMode('mobile')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition ${
                  viewMode === 'mobile'
                    ? 'bg-indigo-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="안드로이드 모바일 기기 프레임 모드"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>모바일 폰 프레임 뷰</span>
              </button>
            </div>
          )}

          {/* Google Account & CORS Proxy Manager Button */}
          <button
            onClick={openAuthModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 transition active:scale-95 shadow-sm"
            title="Google 로그인 및 CORS 우회 프록시 매니저"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'G'}
            </div>
            <span className="hidden md:inline font-medium text-[11px] truncate max-w-[110px]">
              {user?.name || 'Google 로그인'}
            </span>
            {user?.isPro && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[9px] border border-emerald-500/30">
                PRO
              </span>
            )}
          </button>

          {/* Android PWA Install button */}
          <button
            onClick={onOpenInstallGuide}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition active:scale-95"
            title="스마트폰 홈 화면에 안드로이드 앱으로 설치"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden xs:inline">앱 설치</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      {!isMobileScreen && viewMode === 'web' ? (
        /* Real Web Production Studio: Wide responsive desktop & tablet container with dedicated smooth scroll */
        <div ref={desktopScrollRef} className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex flex-col justify-between">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
            {/* Desktop Left Navigation Rail */}
            <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-1">
                <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  스튜디오 모듈
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        triggerHaptic();
                        onSelectTab(item.id);
                      }}
                      onClick={() => {
                        triggerHaptic();
                        onSelectTab(item.id);
                      }}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition ${
                        isActive
                          ? `${item.activeBg} border font-bold`
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-black/30' : 'bg-slate-800'}`}>
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                        </div>
                        <div>
                          <div className="text-xs">{item.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                        </div>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
                    </button>
                  );
                })}
              </div>

              {/* Cross-Modal Linking Highlights Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-900/40 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>상호 연계 파이프라인</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  이미지에서 Veo 비디오로, 영상에서 Lyria 사운드트랙으로 파일이 원클릭 전송되어 유기적으로 연결됩니다.
                </p>
                <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Web & Android PWA 동시 호환</span>
                </div>
              </div>
            </aside>

            {/* Center Main Stage */}
            <main className="flex-1 min-w-0">
              <LayoutContext.Provider value={{ isMobileView: false }}>
                {children}
              </LayoutContext.Provider>
            </main>
          </div>

          {/* Desktop Global Footer */}
          <footer className="w-full border-t border-slate-800/80 py-3 px-4 lg:px-8 bg-slate-950/90 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
            <div className="flex items-center gap-2">
              <span>Gemini OmniStudio © 2026</span>
              <span>·</span>
              <span>Google Gemini 3.8 Flash, Veo (Omni Flash), Lyria & Imagen 통합</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                엔터프라이즈 멀티모달 파이프라인
              </span>
            </div>
          </footer>
        </div>
      ) : !isMobileScreen && viewMode === 'mobile' ? (
        /* Desktop Simulated Phone Container (Centered preview on wide desktop monitors) */
        <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-6 px-4">
          <div className="w-full max-w-md h-[840px] max-h-[92vh] rounded-[44px] border-[8px] border-slate-800 bg-slate-950 flex flex-col relative overflow-hidden shadow-2xl ring-1 ring-slate-700/60">
            {/* Android Speaker & Camera Hole */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 pointer-events-none">
              <div className="w-10 h-1 rounded-full bg-slate-700/60" />
              <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-indigo-950" />
              </div>
            </div>

            {/* Android Status Bar */}
            <div className="w-full pt-3 px-6 pb-2 flex items-center justify-between text-xs font-semibold text-slate-300 bg-slate-950/90 backdrop-blur-md z-30 select-none flex-shrink-0">
              <span className="font-mono text-white text-xs">{currentTimeStr}</span>
              <div className="flex items-center gap-2 text-slate-300 text-[10px]">
                <span className="font-bold text-indigo-400">5G</span>
                <span>98%</span>
              </div>
            </div>

            {/* Scrollable Mobile Content inside simulated frame */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3.5 sm:px-4 pt-2 pb-24 overscroll-y-contain"
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
            >
              <LayoutContext.Provider value={{ isMobileView: true }}>
                {children}
              </LayoutContext.Provider>
            </div>

            {/* Simulated Phone Bottom Nav */}
            <nav className="flex-shrink-0 z-30 px-2 py-2 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 flex items-center justify-around select-none">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      triggerHaptic();
                      onSelectTab(item.id);
                    }}
                    onClick={() => {
                      triggerHaptic();
                      onSelectTab(item.id);
                    }}
                    className="flex flex-col items-center gap-1 py-1 px-2.5"
                  >
                    <div className={`p-1.5 rounded-full transition ${isActive ? item.activeMobile : 'text-slate-400'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] tracking-tight ${isActive ? 'text-white font-bold' : 'text-slate-400'}`}>
                      {item.shortLabel}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      ) : (
        /* Real Mobile Viewport (Native Android Full Screen Experience - 100% Momentum Touch Scrolling) */
        <div className="flex-1 min-h-0 flex flex-col w-full relative overflow-hidden">
          {/* Native Mobile Content Container: 100% dedicated touch-scrollable element */}
          <main
            ref={mobileScrollRef}
            id="mobile-scroll-container"
            className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden px-3.5 sm:px-5 pt-3 pb-8 overscroll-y-contain"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
          >
            <LayoutContext.Provider value={{ isMobileView: true }}>
              {children}
            </LayoutContext.Provider>
          </main>

          {/* Native Android Material 3 Bottom Navigation Bar - flex-shrink-0 so it NEVER overlaps content! */}
          <nav className="flex-shrink-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 px-1.5 py-1.5 flex items-center justify-around shadow-2xl select-none pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    triggerHaptic();
                    onSelectTab(item.id);
                  }}
                  onClick={() => {
                    triggerHaptic();
                    onSelectTab(item.id);
                  }}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 px-1 transition active:scale-95 cursor-pointer"
                >
                  <div className={`px-3 py-1 rounded-full transition flex items-center justify-center ${
                    isActive ? item.activeMobile : 'text-slate-400 hover:text-slate-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] tracking-tight ${
                    isActive ? 'text-white font-bold' : 'text-slate-400'
                  }`}>
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
};
