import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Film,
  Image as ImageIcon,
  Play,
  Pause,
  RotateCcw,
  Share2,
  Download,
  Loader2,
  ExternalLink,
  HelpCircle,
  Video,
  Music,
  CheckCircle2,
  Globe,
  ShieldCheck,
  Check,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react';
import { MediaItem, StudioTab } from '../types';
import { TutorialModal, TutorialStep } from './TutorialModal';

interface Props {
  onAddMedia: (item: MediaItem) => void;
  onOpenShare: (item: MediaItem) => void;
  onNavigateTab: (tab: StudioTab, contextData?: any) => void;
  initialContext?: any;
}

export const FlowStudio: React.FC<Props> = ({
  onAddMedia,
  onOpenShare,
  onNavigateTab,
  initialContext,
}) => {
  const [activeMode, setActiveMode] = useState<'video' | 'image'>('video');
  const [prompt, setPrompt] = useState(
    initialContext?.suggestedPrompt || 'Cinematic aerial drone flight weaving between futuristic skyscrapers at night, neon reflections, 4K 60fps'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [interceptedNotification, setInterceptedNotification] = useState<string | null>(null);

  // Flow 웹 UI 샘플 결과물 상태
  const [currentResult, setCurrentResult] = useState<{
    type: 'video' | 'image';
    url: string;
    title: string;
    prompt: string;
  }>({
    type: 'video',
    url: '/assets/neon_city_veo3.mp4',
    title: 'Flow Veo 3.1 생성 영상 (네온 시티)',
    prompt: 'Cinematic aerial drone flight weaving between futuristic skyscrapers at night, neon reflections, 4K 60fps',
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Synchronize video player loading cleanly without unhandled autoplay de-sync
  useEffect(() => {
    setVideoError(false);
    setIsPlaying(false);
    if (videoRef.current && currentResult.type === 'video') {
      videoRef.current.load();
    }
  }, [currentResult.url, currentResult.type]);

  const handleTogglePlayVideo = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Video play error:', err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const tutorialSteps: TutorialStep[] = [
    {
      title: 'Google Flow 모바일 웹 직접 노출',
      desc: '별도의 프롬프트 매핑 스크립트 없이 Google Flow(flow.google)의 모바일 웹 화면을 네이티브 웹뷰로 그대로 표시합니다.',
      tip: '사용자의 Google AI Pro 계정 로그인 상태가 유지되어 유료 혜택을 그대로 받습니다.',
    },
    {
      title: '영구 백그라운드 생성 유지',
      desc: 'Flow에서 고화질 Veo 영상을 생성하는 도중 Flow Music이나 보관함 탭으로 전환해도 웹뷰가 파괴되지 않고 백그라운드에서 계속 실행됩니다.',
    },
    {
      title: '다운로드 가로채기 (Download Interception)',
      desc: 'Flow 웹에서 완성된 결과물의 [다운로드] 버튼을 누르면, 네이티브 셸의 브릿지가 이를 가로채 로컬 보관함(Vault)에 자동 등록합니다.',
    },
  ];

  const handleSimulateWebDownload = (type: 'video' | 'image') => {
    const timestamp = Date.now();
    const isVid = type === 'video';
    const filename = isVid ? `flow_veo3_${timestamp}.mp4` : `flow_imagen3_${timestamp}.png`;
    const mediaUrl = isVid
      ? '/assets/neon_city_veo3.mp4'
      : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80';

    const newItem: MediaItem = {
      id: `flow_download_${timestamp}`,
      type: isVid ? 'video' : 'image',
      title: isVid ? `Flow Veo 3.1 영상 (${filename})` : `Flow Imagen 3 이미지 (${filename})`,
      prompt: prompt,
      url: mediaUrl,
      thumbnail: isVid
        ? 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80'
        : mediaUrl,
      createdAt: timestamp,
      tags: ['Google Flow', isVid ? 'Veo 3.1' : 'Imagen 3', '웹 다운로드 가로채기'],
      metadata: {
        model: isVid ? 'Veo 3.1' : 'Imagen 3',
        duration: isVid ? '0:10' : undefined,
        aspectRatio: '16:9',
      },
    };

    onAddMedia(newItem);
    setInterceptedNotification(`📥 [Google Flow] ${isVid ? '영상' : '이미지'} 다운로드 감지: 보관함에 저장되었습니다!`);
    setTimeout(() => {
      setInterceptedNotification(null);
    }, 4000);
  };

  const handleGenerateInWeb = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      if (activeMode === 'video') {
        setCurrentResult({
          type: 'video',
          url: '/assets/neon_city_veo3.mp4',
          title: 'Flow Veo 3.1 생성 결과 (네온 시티)',
          prompt: prompt,
        });
      } else {
        setCurrentResult({
          type: 'image',
          url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
          title: 'Flow Imagen 3 생성 결과',
          prompt: prompt,
        });
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] text-gray-100 relative">
      {/* 1. 하이브리드 웹뷰 상단 미니 컨트롤 바 */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#111827] border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-white truncate">Google Flow</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 shrink-0">
                하이브리드 모바일 웹
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
              <span className="truncate">flow.google (Google AI Pro 세션 유지)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href="https://flow.google"
            target="_blank"
            rel="noopener noreferrer"
            title="공식 웹페이지 새 창 열기"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => handleGenerateInWeb()}
            title="웹 새로고침"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsTutorialOpen(true)}
            title="사용법 튜토리얼"
            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 다운로드 가로채기 실시간 스낵바 알림 */}
      {interceptedNotification && (
        <div className="absolute top-12 inset-x-3 z-50 bg-indigo-900/90 border border-indigo-500/50 text-indigo-100 px-3 py-2 rounded-xl shadow-xl flex items-center justify-between text-xs backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{interceptedNotification}</span>
          </div>
          <button
            onClick={() => onNavigateTab('vault')}
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] shrink-0 ml-2 shadow"
          >
            보관함 보기
          </button>
        </div>
      )}

      {/* 2. 실제 Flow 모바일 웹 화면 (웹뷰 레이아웃) */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 pb-24">
        {/* 모드 선택 (Flow 웹 모드 칩) */}
        <div className="flex items-center gap-2 bg-[#161E2E] p-1.5 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveMode('video')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'video'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>🎬 영상 모드 (Veo 3.1)</span>
          </button>
          <button
            onClick={() => setActiveMode('image')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'image'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>🖼️ 이미지 모드 (Imagen 3)</span>
          </button>
        </div>

        {/* Flow 웹 입력 및 모델 정보 카드 */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Google Flow 웹 프롬프트</span>
            <span className="text-[11px] text-indigo-400 font-medium">
              {activeMode === 'video' ? 'Model: Veo 3.1 High-Def' : 'Model: Imagen 3'}
            </span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-[#182030] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            placeholder="생성할 장면을 입력하세요..."
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-gray-500">
              💡 Pro 계정 웹 세션으로 고품질 무제한 생성
            </span>
            <button
              onClick={handleGenerateInWeb}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>웹 생성 실행</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Flow 웹 뷰 결과물 & 다운로드 가로채기 테스트 카드 */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              {currentResult.type === 'video' ? (
                <Film className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              )}
              {currentResult.title}
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-2.5 h-2.5" />
              웹 렌더링 완료
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-gray-800 group">
            {currentResult.type === 'video' ? (
              videoError ? (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2.5 bg-gray-950/90 w-full h-full">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                  <p className="text-xs text-rose-300 font-semibold">미디어를 재생할 수 없습니다.</p>
                  <button
                    onClick={() => {
                      setVideoError(false);
                      setCurrentResult((prev) => ({ ...prev, url: '/assets/neon_city_veo3.mp4' }));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow transition"
                  >
                    샘플 영상 다시 로드
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    key={currentResult.url}
                    src={currentResult.url}
                    controls
                    loop
                    muted={isMuted}
                    playsInline
                    preload="auto"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={handleTogglePlayVideo}
                    onError={() => {
                      console.warn('Video failed to load:', currentResult.url);
                      setVideoError(true);
                    }}
                    className="w-full h-full object-cover cursor-pointer"
                  >
                    <source src={currentResult.url} type="video/mp4" />
                    브라우저가 HTML5 비디오 재생을 지원하지 않습니다.
                  </video>

                  {/* Immediate 1-Click Large Play Overlay Button */}
                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={handleTogglePlayVideo}
                      onPointerDown={handleTogglePlayVideo}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 hover:bg-black/30 transition-all z-20 cursor-pointer group select-none"
                      title="Veo 3.1 비디오 재생 시작"
                    >
                      <div className="w-14 h-14 rounded-full bg-indigo-600/90 group-hover:bg-indigo-500 group-hover:scale-110 flex items-center justify-center text-white shadow-2xl transition-all">
                        <Play className="w-7 h-7 ml-1 fill-white" />
                      </div>
                      <span className="mt-2 text-xs font-semibold text-white bg-black/75 px-3 py-1 rounded-full border border-white/20 shadow">
                        클릭하여 Veo 3.1 재생
                      </span>
                    </button>
                  )}

                  {/* Overlaid quick audio toggle button */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 pointer-events-auto">
                    <button
                      onClick={handleToggleMute}
                      title={isMuted ? '음소거 해제 (사운드 켜기)' : '음소거'}
                      className="px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs backdrop-blur-md border border-white/20 transition flex items-center gap-1 shadow"
                    >
                      {isMuted ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-gray-300" />
                          <span className="text-[10px] text-gray-200">음소거</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span className="text-[10px] text-indigo-300">소리 켜짐</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )
            ) : (
              <img
                src={currentResult.url}
                alt="Flow result"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <p className="text-[11px] text-gray-300 line-clamp-2">
            {currentResult.prompt}
          </p>

          {/* 핵심: 다운로드 가로채기 트리거 버튼 */}
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
            <div className="text-[11px] text-indigo-300 flex items-center gap-1">
              <span>웹 다운로드 이벤트</span>
              <span className="text-gray-500">→ 네이티브 셸이 자동 가로채기</span>
            </div>
            <button
              onClick={() => handleSimulateWebDownload(currentResult.type)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>다운로드 (보관함 등록)</span>
            </button>
          </div>
        </div>

        {/* 탭 지속성 안내 배너 */}
        <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 text-[11px] text-gray-400 space-y-1">
          <div className="text-gray-200 font-medium flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>백그라운드 세션 보존 안내</span>
          </div>
          <p>
            하단 내비게이션으로 [Flow Music]이나 [보관함]으로 이동해도 Flow 웹뷰의 렌더링 세션은 백그라운드에 그대로 상주합니다.
            장시간 소요되는 Veo 영상 생성이 탭 전환으로 인해 취소되지 않습니다.
          </p>
        </div>
      </div>

      {/* 도움말 튜토리얼 모달 */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="Google Flow 하이브리드 웹뷰 안내"
        subtitle="공식 모바일 웹 기반 창작 & 다운로드 가로채기"
        icon={Sparkles}
        badge="Flow v2"
        badgeColor="bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
        steps={tutorialSteps}
      />
    </div>
  );
};
