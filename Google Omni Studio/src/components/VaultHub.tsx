import React, { useState, useRef } from 'react';
import {
  Folder,
  Search,
  Film,
  Music,
  Image as ImageIcon,
  Sparkles,
  Share2,
  Download,
  Trash2,
  Play,
  Pause,
  HelpCircle,
  Maximize2,
  X,
  Plus,
  Volume2,
} from 'lucide-react';
import { MediaItem, MediaType, StudioTab } from '../types';
import { useLayout } from '../LayoutContext';
import { TutorialModal, TutorialStep } from './TutorialModal';
import {
  SPACE_STATION_THUMBNAIL_BASE64,
  ORBIT_SYNTHWAVE_BUNDLE_THUMBNAIL_BASE64,
  NEON_SEOUL_IMAGE_THUMBNAIL_BASE64,
} from '../mockData';

export const getSafeMediaThumbnail = (item: MediaItem): string => {
  if (
    item.thumbnail &&
    !item.thumbnail.endsWith('.mp4') &&
    !item.thumbnail.includes('.mp4') &&
    !item.thumbnail.startsWith('/assets/') &&
    !item.thumbnail.startsWith('data:image/svg+xml;utf8')
  ) {
    return item.thumbnail;
  }
  if (item.type === 'image' && item.url && !item.url.endsWith('.mp4')) {
    return item.url;
  }
  if (item.title?.includes('우주') || item.title?.includes('궤도 유영')) {
    return SPACE_STATION_THUMBNAIL_BASE64;
  }
  if (item.title?.includes('궤도 스테이션') || item.type === 'project') {
    return ORBIT_SYNTHWAVE_BUNDLE_THUMBNAIL_BASE64;
  }
  return SPACE_STATION_THUMBNAIL_BASE64;
};

interface Props {
  mediaItems: MediaItem[];
  onOpenShare: (item: MediaItem) => void;
  onNavigateTab: (tab: StudioTab, contextData?: any) => void;
  onDeleteMedia: (id: string) => void;
  onAddMedia?: (item: MediaItem) => void;
}

export const VaultHub: React.FC<Props> = ({
  mediaItems,
  onOpenShare,
  onNavigateTab,
  onDeleteMedia,
  onAddMedia,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | MediaType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Audio Playback state for music cards
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Modals
  const [previewProject, setPreviewProject] = useState<MediaItem | null>(null);
  const [previewSingleItem, setPreviewSingleItem] = useState<MediaItem | null>(null);
  const [isBundleCreateOpen, setIsBundleCreateOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Bundle Create Form state
  const [bundleTitle, setBundleTitle] = useState('사이버 시티 오디세이 MV');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedMusicId, setSelectedMusicId] = useState<string>('');

  const videos = mediaItems.filter((m) => m.type === 'video');
  const musics = mediaItems.filter((m) => m.type === 'music');

  const tutorialSteps: TutorialStep[] = [
    {
      title: '미디어 검색 & 서비스별 필터',
      desc: '상단 필터 칩으로 Flow 이미지, Flow 영상, Flow Music, 프로젝트 묶음을 선택해 즉시 확인할 수 있습니다.',
    },
    {
      title: '새 프로젝트 묶음 (Project Bundle) 생성',
      desc: '상단 [+ 프로젝트 묶음] 버튼을 눌러 보관함의 Flow 영상 1개와 Flow Music 음원 1개를 골라 나만의 뮤직비디오 프로젝트로 결합합니다.',
    },
    {
      title: '영상 + BGM 동기화 동시 상영',
      desc: '프로젝트 카드의 [동시 상영 보기]를 누르면 비디오와 오디오가 동기화되어 하나의 완성작으로 실시간 재생됩니다.',
    },
  ];

  const handleTogglePlayAudio = (item: MediaItem) => {
    if (playingAudioId === item.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = item.url;
        audioPlayerRef.current.play().catch(console.warn);
      }
      setPlayingAudioId(item.id);
    }
  };

  const handleCreateBundle = () => {
    if (!onAddMedia) return;
    const chosenVideo = videos.find((v) => v.id === selectedVideoId) || videos[0];
    const chosenMusic = musics.find((m) => m.id === selectedMusicId) || musics[0];

    if (!chosenVideo || !chosenMusic) {
      return;
    }

    const timestamp = Date.now();
    const newBundle: MediaItem = {
      id: `project_bundle_${timestamp}`,
      type: 'project',
      title: bundleTitle || '새 프로젝트 묶음',
      prompt: `Flow 영상 [${chosenVideo.title}] + Flow Music [${chosenMusic.title}] 결합 프로젝트`,
      url: chosenVideo.url,
      thumbnail: chosenVideo.thumbnail || chosenVideo.url,
      createdAt: timestamp,
      tags: ['프로젝트 묶음', 'Google Flow', 'Flow Music'],
      metadata: {
        bundleVideoUrl: chosenVideo.url,
        bundleMusicUrl: chosenMusic.url,
        projectTitle: bundleTitle || '새 프로젝트 묶음',
        duration: chosenMusic.metadata?.duration || '0:30',
      },
    };

    onAddMedia(newBundle);
    setIsBundleCreateOpen(false);
  };

  const filteredItems = mediaItems.filter((item) => {
    if (selectedFilter !== 'all' && item.type !== selectedFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchPrompt = item.prompt.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchPrompt || matchTags;
    }
    return true;
  });

  const { isMobileView } = useLayout();

  return (
    <div className="space-y-4 pb-20">
      {/* Hidden Global Audio Element for Grid Playback */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setPlayingAudioId(null)}
        className="hidden"
      />

      {/* Vault Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              통합 보관함
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {mediaItems.length}개
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (videos.length > 0 && musics.length > 0) {
                setSelectedVideoId(videos[0].id);
                setSelectedMusicId(musics[0].id);
              }
              setIsBundleCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>프로젝트 묶음</span>
          </button>
          <button
            onClick={() => setIsTutorialOpen(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-gray-800 border border-gray-700/60 transition-colors"
            title="사용법"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Search and Filters Card */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-3 space-y-2.5 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="프롬프트, 태그, 제목 검색..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          {[
            { id: 'all', label: '전체' },
            { id: 'project', label: '🎬 프로젝트 묶음' },
            { id: 'video', label: '📹 Flow 영상' },
            { id: 'image', label: '🖼️ Flow 이미지' },
            { id: 'music', label: '🎵 Flow Music' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id as any)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg transition-all font-medium ${
                selectedFilter === f.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid Cards */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs rounded-2xl bg-slate-900/40 border border-slate-800/80">
          다운로드된 에셋이 없습니다.
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${isMobileView ? 'gap-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'}`}>
          {filteredItems.map((item) => {
            const isPlayingThisAudio = playingAudioId === item.id;

            return (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 flex items-center justify-center border border-slate-800">
                    {item.type === 'image' ? (
                      <img
                        src={getSafeMediaThumbnail(item)}
                        alt={item.title}
                        onClick={() => setPreviewSingleItem(item)}
                        onError={(e) => {
                          e.currentTarget.src = NEON_SEOUL_IMAGE_THUMBNAIL_BASE64;
                        }}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      />
                    ) : item.type === 'video' ? (
                      <div
                        onClick={() => setPreviewSingleItem(item)}
                        className="relative w-full h-full cursor-pointer group/vid"
                      >
                        <img
                          src={getSafeMediaThumbnail(item)}
                          alt={item.title}
                          onError={(e) => {
                            e.currentTarget.src = SPACE_STATION_THUMBNAIL_BASE64;
                          }}
                          className="w-full h-full object-cover opacity-85"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/vid:bg-black/10 transition">
                          <div className="w-9 h-9 rounded-full bg-indigo-600/80 flex items-center justify-center text-white">
                            <Play className="w-4 h-4 ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : item.type === 'music' ? (
                      <div className="w-full h-full bg-gradient-to-tr from-purple-950/60 via-slate-950 to-indigo-950/60 flex flex-col items-center justify-center gap-1.5 text-purple-400">
                        <button
                          onClick={() => handleTogglePlayAudio(item)}
                          className="w-10 h-10 rounded-full bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 flex items-center justify-center text-purple-300 transition-transform active:scale-90"
                        >
                          {isPlayingThisAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <span className="text-[10px] text-purple-300 font-mono">
                          {isPlayingThisAudio ? '재생 중...' : item.metadata.duration || '음원'}
                        </span>
                      </div>
                    ) : (
                      <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
                        <img
                          src={getSafeMediaThumbnail(item)}
                          alt={item.title}
                          onError={(e) => {
                            e.currentTarget.src = ORBIT_SYNTHWAVE_BUNDLE_THUMBNAIL_BASE64;
                          }}
                          className="w-full h-full object-cover opacity-75"
                        />
                        <button
                          onClick={() => setPreviewProject(item)}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 hover:bg-black/20 transition-all"
                        >
                          <div className="p-2 rounded-full bg-indigo-600/80 text-white shadow-lg">
                            <Play className="w-5 h-5 ml-0.5" />
                          </div>
                          <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full border border-white/20">
                            동시 상영 보기
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Service & Type Tag Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-semibold text-white flex items-center gap-1 border border-white/10 pointer-events-none">
                      {item.type === 'video' && <span className="text-indigo-400 font-bold">🎬 Flow 영상</span>}
                      {item.type === 'image' && <span className="text-cyan-400 font-bold">🖼️ Flow 이미지</span>}
                      {item.type === 'music' && <span className="text-purple-400 font-bold">🎵 Flow Music</span>}
                      {item.type === 'project' && <span className="text-amber-400 font-bold">⭐ 프로젝트 묶음</span>}
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1">
                    <h4 className="font-semibold text-xs text-white truncate">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.prompt}</p>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenShare(item)}
                      className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition active:scale-95"
                    >
                      <Share2 className="w-3 h-3 text-sky-400" />
                      <span>공유</span>
                    </button>
                    <a
                      href={item.url}
                      download={`omnistudio_${item.id}.${item.type === 'video' ? 'mp4' : item.type === 'music' ? 'mp3' : 'png'}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="다운로드"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <button
                    onClick={() => onDeleteMedia(item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 새 프로젝트 묶음 생성 모달 */}
      {isBundleCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-white">새 프로젝트 묶음 만들기</h3>
              </div>
              <button
                onClick={() => setIsBundleCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 font-medium block mb-1">프로젝트 제목</label>
                <input
                  type="text"
                  value={bundleTitle}
                  onChange={(e) => setBundleTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="예: 사이버 시티 MV"
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">1. 결합할 Flow 영상 선택</label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>
                      🎬 {v.title}
                    </option>
                  ))}
                  {videos.length === 0 && <option value="">보관함에 영상이 없습니다</option>}
                </select>
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1">2. 결합할 Flow Music BGM 선택</label>
                <select
                  value={selectedMusicId}
                  onChange={(e) => setSelectedMusicId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {musics.map((m) => (
                    <option key={m.id} value={m.id}>
                      🎵 {m.title}
                    </option>
                  ))}
                  {musics.length === 0 && <option value="">보관함에 음악이 없습니다</option>}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBundleCreateOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-white"
              >
                취소
              </button>
              <button
                onClick={handleCreateBundle}
                disabled={videos.length === 0 || musics.length === 0}
                className="px-4 py-1.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow"
              >
                묶음 생성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 동기화 동시 상영 모달 */}
      {previewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">{previewProject.title}</h3>
                  <p className="text-[11px] text-slate-400">Flow 영상과 Flow Music BGM 동시 상영</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center max-h-[340px]">
                {previewProject.metadata.bundleVideoUrl ? (
                  <video
                    key={previewProject.metadata.bundleVideoUrl}
                    src={previewProject.metadata.bundleVideoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    preload="auto"
                    className="w-full max-h-[340px] object-contain rounded-lg"
                  >
                    <source src={previewProject.metadata.bundleVideoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <div className="p-8 text-slate-500 text-xs">비디오 소스가 없습니다.</div>
                )}
              </div>

              {previewProject.metadata.bundleMusicUrl && (
                <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" />
                      Flow Music 사운드트랙 (BGM 동시 출력)
                    </span>
                    <span className="text-[10px] text-slate-400">{previewProject.metadata.duration || '0:30'}</span>
                  </div>
                  <audio
                    src={previewProject.metadata.bundleMusicUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-8"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                onClick={() => setPreviewProject(null)}
                className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-white font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 단일 아이템 프리뷰 모달 */}
      {previewSingleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white truncate">{previewSingleItem.title}</h3>
              <button
                onClick={() => setPreviewSingleItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[360px]">
              {previewSingleItem.type === 'video' ? (
                <video
                  key={previewSingleItem.url}
                  src={previewSingleItem.url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                  className="w-full max-h-[360px] object-contain"
                >
                  <source src={previewSingleItem.url} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={getSafeMediaThumbnail(previewSingleItem)}
                  alt={previewSingleItem.title}
                  onError={(e) => {
                    e.currentTarget.src = NEON_SEOUL_IMAGE_THUMBNAIL_BASE64;
                  }}
                  className="w-full max-h-[360px] object-contain"
                />
              )}
            </div>

            <p className="text-xs text-gray-300">{previewSingleItem.prompt}</p>

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                onClick={() => setPreviewSingleItem(null)}
                className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-white font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="통합 보관함 (Vault) 안내"
        subtitle="Flow 영상 · 이미지 · Flow Music 통합 관리"
        icon={Folder}
        badge="Vault v2"
        badgeColor="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
        steps={tutorialSteps}
      />
    </div>
  );
};
