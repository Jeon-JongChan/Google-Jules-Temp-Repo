import React, { useState } from 'react';
import { Share2, Download, Copy, Check, Sparkles, Film, Music, Image as ImageIcon, ArrowRight, X } from 'lucide-react';
import { MediaItem, StudioTab } from '../types';

interface Props {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: StudioTab, contextData?: any) => void;
}

export const ShareModal: React.FC<Props> = ({ item, isOpen, onClose, onNavigateTab }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(item.url.slice(0, 500) + '...');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleAndroidShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Gemini OmniStudio에서 제작한 [${item.title}] 프롬프트: "${item.prompt}"`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = item.url;
    const ext = item.type === 'video' ? 'mp4' : item.type === 'music' || item.type === 'speech' ? 'wav' : 'png';
    a.download = `${item.title.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Android drag handle indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-700 mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">안드로이드 퀵 셰어 & 스튜디오 연계</h3>
              <p className="text-[11px] text-slate-400">파일 상호 공유 및 다른 생성 도구로 연결</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Preview Thumbnail */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-800">
            {item.type === 'image' ? (
              <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
            ) : item.type === 'video' ? (
              <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                <img src={item.url} alt={item.title} className="w-full h-full object-cover opacity-60" />
                <Film className="w-6 h-6 text-amber-400 absolute" />
              </div>
            ) : (
              <div className="w-full h-full bg-purple-950/40 flex items-center justify-center">
                <Music className="w-7 h-7 text-purple-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 uppercase">
                {item.type}
              </span>
              <span className="text-[11px] text-slate-400">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h4 className="font-semibold text-sm truncate text-white mt-0.5">{item.title}</h4>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.prompt}</p>
          </div>
        </div>

        {/* Cross-Studio Interconnection Hub (핵심 연계성 도구) */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>다른 스튜디오로 파일 즉시 연계 (One-Tap Bridge)</span>
          </div>

          <div className="space-y-2">
            {/* If Image: Offer Flow Veo video or Flow Music scoring */}
            {item.type === 'image' && (
              <>
                <button
                  onClick={() => {
                    onNavigateTab('flow', {
                      sourceImage: item.url,
                      sourceImageId: item.id,
                      suggestedPrompt: `${item.prompt}를 기반으로 역동적인 시네마틱 카메라 모션 추가`,
                    });
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-600/30 text-indigo-200 text-xs font-medium flex items-center justify-between group transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Film className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">🎬 Flow Veo로 영상 생동감 불어넣기</div>
                      <div className="text-[10px] text-indigo-300/70">이 이미지를 기반으로 움직이는 비디오 생성</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={() => {
                    onNavigateTab('music', {
                      sourceImage: item.url,
                      sourceImageId: item.id,
                      suggestedPrompt: `이 이미지의 분위기(${item.title})에 어울리는 감성적인 사운드트랙`,
                    });
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-purple-950/30 hover:bg-purple-950/50 border border-purple-600/30 text-purple-200 text-xs font-medium flex items-center justify-between group transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <Music className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">🎵 Flow Music으로 어울리는 BGM 작곡</div>
                      <div className="text-[10px] text-purple-300/70">이미지 무드에 맞춘 사운드트랙 생성</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition" />
                </button>
              </>
            )}

            {/* If Video: Offer Flow Music Soundtrack scoring or Vault Project Bundle */}
            {item.type === 'video' && (
              <>
                <button
                  onClick={() => {
                    onNavigateTab('music', {
                      sourceVideoId: item.id,
                      suggestedPrompt: `${item.title} 비디오를 위한 웅장한 시네마틱 오리지널 스코어`,
                    });
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-purple-950/30 hover:bg-purple-950/50 border border-purple-600/30 text-purple-200 text-xs font-medium flex items-center justify-between group transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <Music className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">🎵 Flow Music으로 맞춤 OST 작곡하기</div>
                      <div className="text-[10px] text-purple-300/70">비디오 타이밍과 템포에 맞는 Lyria 배경음악</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={() => {
                    onNavigateTab('vault', {
                      targetVideoId: item.id,
                    });
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-600/30 text-emerald-200 text-xs font-medium flex items-center justify-between group transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">⭐ 보관함에서 프로젝트 묶음으로 결합</div>
                      <div className="text-[10px] text-emerald-300/70">BGM 음원과 함께 뮤직비디오 프로젝트 제작</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition" />
                </button>
              </>
            )}

            {/* If Music: Offer Flow Video or Vault Project Bundle */}
            {item.type === 'music' && (
              <>
                <button
                  onClick={() => {
                    onNavigateTab('flow', {
                      sourceMusicId: item.id,
                      suggestedPrompt: `${item.title} 음악의 비트와 감성에 맞춘 화려한 시네마틱 뮤직비디오`,
                    });
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-600/30 text-indigo-200 text-xs font-medium flex items-center justify-between group transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Film className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">🎬 Flow Veo 영상 제작하기</div>
                      <div className="text-[10px] text-indigo-300/70">이 곡에 맞는 고화질 시네마틱 영상 생성</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={() => {
                    onNavigateTab('vault', {
                      targetMusicId: item.id,
                    });
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-600/30 text-emerald-200 text-xs font-medium flex items-center justify-between group transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">⭐ 보관함에서 프로젝트 묶음 생성</div>
                      <div className="text-[10px] text-emerald-300/70">Flow 영상과 결합하여 동시 상영 작품 완성</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Standard Export / Quick Share */}
        <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
          <button
            onClick={handleAndroidShare}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5 text-sky-400" />
            안드로이드 공유
          </button>

          <button
            onClick={handleDownload}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            파일 기기 저장
          </button>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full mt-2 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? '프롬프트 및 메타데이터 복사됨' : '프롬프트 클립보드 복사'}
        </button>
      </div>
    </div>
  );
};
