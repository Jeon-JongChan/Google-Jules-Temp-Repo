import React, { useState, useRef } from 'react';
import {
  Music,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  Loader2,
  Volume2,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  Globe,
  ShieldCheck,
  Disc3,
  Sliders,
} from 'lucide-react';
import { MediaItem, StudioTab } from '../types';
import { TutorialModal, TutorialStep } from './TutorialModal';

interface Props {
  onAddMedia: (item: MediaItem) => void;
  onOpenShare: (item: MediaItem) => void;
  onNavigateTab: (tab: StudioTab, contextData?: any) => void;
  initialContext?: any;
}

export const MusicStudio: React.FC<Props> = ({
  onAddMedia,
  onOpenShare,
  onNavigateTab,
  initialContext,
}) => {
  const [prompt, setPrompt] = useState(
    initialContext?.suggestedPrompt || 'Cinematic epic orchestra with dramatic cello, rising brass and deep heartbeat percussion, 95 BPM'
  );
  const [genre, setGenre] = useState('Epic Cinematic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [interceptedNotification, setInterceptedNotification] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState({
    title: 'Flow Music Lyria 3.5 - Odyssey Theme',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: '0:30',
    prompt: 'Cinematic epic orchestra with dramatic cello, rising brass and deep heartbeat percussion, 95 BPM',
  });

  const tutorialSteps: TutorialStep[] = [
    {
      title: 'Flow Music 모바일 웹 직접 노출',
      desc: 'Flow Music(flowmusic.app)의 Lyria 3.5 음악 전용 스튜디오 모바일 웹 화면을 그대로 탑재하여 사용합니다.',
      tip: '풀송, 보컬 생성 및 섹션 편집을 웹 자체의 모든 기능으로 완벽하게 제어할 수 있습니다.',
    },
    {
      title: '영구 백그라운드 오디오 유지',
      desc: 'Flow Music에서 음악을 재생하거나 긴 트랙을 생성하는 동안 Flow나 보관함 탭으로 전환해도 재생과 생성이 중단되지 않습니다.',
    },
    {
      title: '다운로드 가로채기 & 프로젝트 묶음',
      desc: '웹에서 생성된 음악 파일을 다운로드하면 네이티브 셸이 가로채 보관함에 등록하며, 보관함에서 Flow 영상과 결합해 하나의 뮤직비디오로 만들 수 있습니다.',
    },
  ];

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.warn);
      setIsPlaying(true);
    }
  };

  const handleSimulateWebDownload = () => {
    const timestamp = Date.now();
    const filename = `flow_music_lyria_${timestamp}.mp3`;

    const newItem: MediaItem = {
      id: `music_download_${timestamp}`,
      type: 'music',
      title: `Flow Music 음원 (${filename})`,
      prompt: prompt,
      url: currentTrack.url,
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
      createdAt: timestamp,
      tags: ['Flow Music', 'Lyria 3.5', genre, '웹 다운로드 가로채기'],
      metadata: {
        model: 'Lyria 3.5',
        genre: genre,
        duration: '0:30',
      },
    };

    onAddMedia(newItem);
    setInterceptedNotification(`📥 [Flow Music] 음악 다운로드 감지: 보관함에 저장되었습니다!`);
    setTimeout(() => {
      setInterceptedNotification(null);
    }, 4000);
  };

  const handleGenerateInWeb = () => {
    setIsGenerating(true);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setTimeout(() => {
      setIsGenerating(false);
      setCurrentTrack({
        title: `Flow Music - ${genre} Track`,
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        duration: '0:30',
        prompt: prompt,
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] text-gray-100 relative">
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onEnded={() => setIsPlaying(false)}
      />

      {/* 1. 하이브리드 웹뷰 상단 미니 컨트롤 바 */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#111827] border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
            <Music className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-white truncate">Flow Music</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 shrink-0">
                하이브리드 모바일 웹
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <ShieldCheck className="w-2.5 h-2.5 text-purple-400 shrink-0" />
              <span className="truncate">flowmusic.app (Lyria 3.5 스튜디오)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href="https://flowmusic.app"
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
            className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-950/50 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 다운로드 가로채기 실시간 스낵바 알림 */}
      {interceptedNotification && (
        <div className="absolute top-12 inset-x-3 z-50 bg-purple-900/90 border border-purple-500/50 text-purple-100 px-3 py-2 rounded-xl shadow-xl flex items-center justify-between text-xs backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{interceptedNotification}</span>
          </div>
          <button
            onClick={() => onNavigateTab('vault')}
            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] shrink-0 ml-2 shadow"
          >
            보관함 보기
          </button>
        </div>
      )}

      {/* 2. Flow Music 모바일 웹 화면 */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 pb-24">
        {/* 장르 선택 칩 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {['Epic Cinematic', 'Cyberpunk Synth', 'Lo-Fi Chill', 'Acoustic Guitar', 'Ambient Calm'].map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                genre === g
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#161E2E] text-gray-400 hover:text-gray-200 border border-gray-800'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* 웹 입력 카드 */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Flow Music 웹 프롬프트</span>
            <span className="text-[11px] text-purple-400 font-medium">Model: Lyria 3.5 Audio</span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-[#182030] border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            placeholder="원하는 음악 스타일, 악기 구성을 입력하세요..."
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-gray-500">
              🎵 Lyria 3.5 기반 고음질 사운드트랙
            </span>
            <button
              onClick={handleGenerateInWeb}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>작곡 중...</span>
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

        {/* 웹 플레이어 및 다운로드 가로채기 카드 */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Disc3 className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">{currentTrack.title}</span>
                <span className="text-[10px] text-gray-400">{genre} • 0:30</span>
              </div>
            </div>

            <button
              onClick={handleTogglePlay}
              className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white shadow transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>

          {/* 파형 시각화 */}
          <div className="flex items-center justify-between gap-1 h-8 px-2 bg-[#161E2E] rounded-xl border border-gray-800">
            {[40, 65, 80, 50, 95, 70, 45, 60, 85, 90, 75, 55, 65, 80, 60, 45, 90, 100, 70, 50].map(
              (h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(20, (h * (0.6 + Math.random() * 0.4)))}%` : `${h * 0.5}%`,
                  }}
                />
              )
            )}
          </div>

          {/* 핵심: 다운로드 가로채기 트리거 버튼 */}
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
            <div className="text-[11px] text-purple-300 flex items-center gap-1">
              <span>웹 음원 다운로드</span>
              <span className="text-gray-500">→ 네이티브 셸 자동 저장</span>
            </div>
            <button
              onClick={handleSimulateWebDownload}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>다운로드 (보관함 등록)</span>
            </button>
          </div>
        </div>

        {/* 백그라운드 오디오 재생 안내 배너 */}
        <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 text-[11px] text-gray-400 space-y-1">
          <div className="text-gray-200 font-medium flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>오디오 연속 재생 안내</span>
          </div>
          <p>
            Flow Music의 WebView 또한 영구 상주하므로 음악 재생 중에 [Flow]나 [보관함] 탭으로 이동해도 끊김 없이 계속 청취할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 도움말 튜토리얼 모달 */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="Flow Music 하이브리드 웹뷰 안내"
        subtitle="Lyria 3.5 음악 전용 스튜디오 모바일 웹"
        icon={Music}
        badge="Music v2"
        badgeColor="bg-purple-500/20 text-purple-300 border-purple-500/30"
        steps={tutorialSteps}
      />
    </div>
  );
};
