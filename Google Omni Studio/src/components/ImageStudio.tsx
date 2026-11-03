import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Wand2,
  Share2,
  Film,
  Music,
  Download,
  Loader2,
  Layers,
  ArrowRight,
  Upload,
  RefreshCw,
  Code,
  Terminal,
  Shuffle,
  Sliders,
  ChevronDown,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { MediaItem, StudioTab, NetworkMeta } from '../types';
import { useLayout } from '../LayoutContext';
import { NetworkInspectorModal } from './NetworkInspectorModal';
import { GoogleServiceApiBar } from './GoogleServiceApiBar';
import { TutorialModal, TutorialStep } from './TutorialModal';
import { executeImageGeneration } from '../services/geminiClientBridge';

interface Props {
  onAddMedia: (item: MediaItem) => void;
  onOpenShare: (item: MediaItem) => void;
  onNavigateTab: (tab: StudioTab, contextData?: any) => void;
  initialContext?: any;
}

export const ImageStudio: React.FC<Props> = ({
  onAddMedia,
  onOpenShare,
  onNavigateTab,
  initialContext,
}) => {
  const [prompt, setPrompt] = useState(
    initialContext?.suggestedPrompt || 'A cinematic neo-seoul cyber street with holographic reflections'
  );
  const [aspectRatio, setAspectRatio] = useState(initialContext?.aspectRatio || '1:1');
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 900000) + 100000);
  const [sampleCount, setSampleCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedItem, setLastGeneratedItem] = useState<MediaItem | null>(null);
  const [networkMeta, setNetworkMeta] = useState<NetworkMeta | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const tutorialSteps: TutorialStep[] = [
    {
      title: '이미지 프롬프트 작성',
      desc: '생성하고 싶은 이미지의 피사체, 배경, 조명, 구도를 한국어나 영어로 입력합니다.',
      tip: '구체적인 화풍(예: 유화, 3D 렌더, 사이버펑크 네온)을 지정하면 더 매력적인 그림이 완성됩니다.',
    },
    {
      title: '스타일 칩 빠른 조합',
      desc: '하단 스타일 칩(+ 사실주의, + 골든 아워 등)을 터치하면 프롬프트에 자동으로 추가되어 즉시 반영됩니다.',
    },
    {
      title: '이미지 리믹스 (Image-to-Image)',
      desc: '[이미지 리믹스] 버튼을 누르면 기존 이미지를 업로드하거나 이전 결과물을 기반으로 원하는 부분만 수정할 수 있습니다.',
    },
    {
      title: '다른 스튜디오로 원클릭 전달',
      desc: '생성된 이미지를 클릭 한 번으로 Veo 비디오로 보내 움직이는 영상으로 만들거나, MusicFX로 보내 어울리는 OST를 작곡할 수 있습니다.',
    },
  ];

  // Edit / Remix Mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [sourceImage, setSourceImage] = useState<string | null>(initialContext?.sourceImage || null);
  const [editInstruction, setEditInstruction] = useState('');

  // ImageFX Signature: Expressive Chips
  const expressiveCategories = [
    {
      label: '스타일 (Style)',
      options: ['극사실주의 8K', '사이버펑크 네온', '지브리풍 애니메이션', '3D 옥탄 렌더', '빈티지 35mm 필름', '수채화 일러스트'],
    },
    {
      label: '조명 (Lighting)',
      options: ['골든 아워 석양', '네온 반사광', '스튜디오 림라이트', '신비로운 볼륨 안개', '달빛 야경', '자연 산란광'],
    },
    {
      label: '렌즈/화각 (Lens)',
      options: ['35mm 아나모픽 와이드', '85mm 인물 얕은 심도', '매크로 초접사', '항공 드론 뷰', '어안 렌즈 화각'],
    },
    {
      label: '무드 (Mood)',
      options: ['웅장하고 신비로운', '몽환적인 에테리얼', '비장한 시네마틱', '따뜻하고 아늑한', '미래지향적 테크'],
    },
  ];

  const aspectRatios = [
    { label: '1:1 정방형', value: '1:1', desc: 'SNS & 앨범 커버' },
    { label: '16:9 가로 시네마', value: '16:9', desc: 'YouTube & Veo 영상용' },
    { label: '9:16 세로 숏폼', value: '9:16', desc: '릴스 & 틱톡 & 숏츠' },
    { label: '4:3 표준', value: '4:3', desc: '클래식 포맷' },
    { label: '3:4 세로 인물', value: '3:4', desc: '인물 포트레이트' },
  ];

  const handleAddChip = (option: string) => {
    if (prompt.includes(option)) return;
    setPrompt((prev: string) => (prev ? `${prev}, ${option}` : option));
  };

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 900000) + 100000);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !editInstruction.trim()) return;

    setIsGenerating(true);
    try {
      const fullPrompt = isEditMode ? editInstruction : prompt;

      const data = await executeImageGeneration({
        prompt: fullPrompt,
        aspectRatio,
        seed,
        sampleCount,
        base64Image: isEditMode ? (sourceImage || undefined) : undefined,
        editPrompt: isEditMode ? editInstruction : undefined,
      });

      if (data.networkMeta) {
        setNetworkMeta(data.networkMeta);
      }
      if (data.imageUrl) {
        const newItem: MediaItem = {
          id: 'img-' + Date.now(),
          type: 'image',
          title: prompt.slice(0, 24) || 'Google ImageFX 아트워크',
          prompt: fullPrompt,
          url: data.imageUrl,
          htmlCode: data.networkMeta?.htmlCode,
          networkMeta: data.networkMeta,
          createdAt: Date.now(),
          tags: ['ImageFX', 'Imagen 3', aspectRatio, `Seed: ${seed}`],
          metadata: {
            aspectRatio,
            model: data.networkMeta?.modelUsed || 'imagen-3.0-generate-002',
            isSimulated: data.isSimulated,
          },
        };

        setLastGeneratedItem(newItem);
        onAddMedia(newItem);
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setIsEditMode(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const { isMobileView } = useLayout();

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Studio Grid / Mobile Stack */}
      <div className={isMobileView ? 'flex flex-col space-y-6 w-full' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}>
        
        {/* Left Column: ImageFX Controller */}
        <div className={isMobileView ? 'w-full space-y-4' : 'lg:col-span-5 space-y-4'}>
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white">Google ImageFX</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Imagen 3
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Tutorial ? button */}
                <button
                  onClick={() => setIsTutorialOpen(true)}
                  className="p-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1 text-xs font-semibold active:scale-95 shadow-sm"
                  title="ImageFX 사용법 보기"
                  aria-label="사용법 안내"
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span className="hidden xs:inline">사용법</span>
                </button>

                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1 ${
                    isEditMode
                      ? 'bg-indigo-600 text-white border-indigo-500 font-semibold shadow'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isEditMode ? '새 프롬프트' : '이미지 리믹스'}</span>
                </button>
              </div>
            </div>

            {/* Input Form */}
            <div className="mt-4 space-y-3.5">
              {isEditMode ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-cyan-400 font-medium">
                    <span>기준 이미지 (Image-to-Image / Remix):</span>
                    {sourceImage && (
                      <button
                        onClick={() => setSourceImage(null)}
                        className="text-[11px] text-rose-400 hover:underline"
                      >
                        이미지 제거
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {sourceImage ? (
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-700 flex-shrink-0 shadow-md">
                        <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-500 flex flex-col items-center justify-center text-slate-400 hover:text-cyan-300 cursor-pointer transition bg-slate-950">
                        <Upload className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px] font-semibold">이미지 등록</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    )}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        placeholder="수정할 내용을 입력하세요 (예: 배경을 비 내리는 사이버펑크 네온으로 변경)"
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      ImageFX 프롬프트 입력
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono">Imagen 3.0 High-Res</span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="생성하고 싶은 이미지 장면을 입력하세요..."
                    rows={3}
                    className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* ImageFX Signature: Interactive Expressive Chips */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    스타일 칩 (키워드 추가):
                  </span>
                </div>

                <div className="space-y-1.5">
                  {expressiveCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                      <span className="text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
                        {cat.label}:
                      </span>
                      {cat.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleAddChip(opt)}
                          className="whitespace-nowrap px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 border border-slate-700/60 transition active:scale-95"
                        >
                          + {opt}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <div className="text-[11px] text-slate-400 mb-1.5 font-medium">화면 비율 (Aspect Ratio):</div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-[11px]">
                  {aspectRatios.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setAspectRatio(r.value)}
                      className={`p-2 rounded-xl transition text-center flex flex-col items-center justify-center ${
                        aspectRatio === r.value
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="font-bold">{r.value}</span>
                      <span className="text-[9px] opacity-80">{r.label.split(' ')[1] || r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seed & Parameters */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Seed:</span>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 text-center"
                  />
                  <button
                    onClick={handleRandomizeSeed}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="랜덤 시드 생성"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <span>변형:</span>
                  <button
                    onClick={() => setSampleCount(sampleCount === 1 ? 2 : 1)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold"
                  >
                    {sampleCount}개
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && !editInstruction.trim())}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-98 transition disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Google ImageFX에서 이미지 생성 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{isEditMode ? 'ImageFX 리믹스 실행' : 'Google ImageFX 생성 (AI Studio 무료 티어)'}</span>
                  </>
                )}
              </button>

              {/* Google Pro Web Direct Bridge (Zero API Cost) */}
              <div className="pt-0.5">
                <a
                  href="https://labs.google/fx/tools/image-fx"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    navigator.clipboard.writeText(prompt);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition shadow-sm"
                  title="구글 프로 구독자 무료 생성: 클릭 시 프롬프트가 복사되고 공식 ImageFX로 이동합니다"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>내 구글 프로(Pro) 구독으로 무료 생성 (프롬프트 자동복사) ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Result Canvas & One-Tap Bridges */}
        <div className={isMobileView ? 'w-full space-y-4' : 'lg:col-span-7 space-y-4'}>
          {lastGeneratedItem ? (
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  ImageFX 생성 결과
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300">
                  {lastGeneratedItem.metadata.aspectRatio} · {lastGeneratedItem.metadata.model}
                </span>
              </div>

              {/* Image Preview Canvas */}
              <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center shadow-inner">
                <img
                  src={lastGeneratedItem.url}
                  alt={lastGeneratedItem.title}
                  className="w-full h-auto max-h-[500px] object-contain"
                />
              </div>

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80 leading-relaxed font-mono">
                "{lastGeneratedItem.prompt}"
              </p>

              {/* DIRECT CROSS-MODAL BRIDGES */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-amber-950/30 border border-indigo-800/30 space-y-2">
                <div className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>이 이미지를 다른 구글 서비스로 원클릭 전달:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onNavigateTab('video', {
                        sourceImage: lastGeneratedItem.url,
                        sourceImageId: lastGeneratedItem.id,
                        suggestedPrompt: `${lastGeneratedItem.prompt}를 기반으로 역동적인 시네마틱 모션`,
                      });
                    }}
                    className="p-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Film className="w-4 h-4 text-amber-400" />
                    <span>🎬 Google Veo 비디오로 제작</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateTab('music', {
                        sourceImage: lastGeneratedItem.url,
                        sourceImageId: lastGeneratedItem.id,
                        suggestedPrompt: `이 비주얼 이미지의 감성과 톤에 어울리는 오리지널 사운드트랙`,
                      });
                    }}
                    className="p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Music className="w-4 h-4 text-purple-400" />
                    <span>🎵 Flow / MusicFX로 OST 작곡</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsInspectorOpen(true)}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                  title="전체화면 cURL 및 HTML 코드 검사"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>HTML 코드 검사</span>
                </button>

                <a
                  href={lastGeneratedItem.url}
                  download={`imagefx-${Date.now()}.png`}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>이미지 다운로드</span>
                </a>

                <button
                  onClick={() => onOpenShare(lastGeneratedItem)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="공유"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Standby Card */
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">이미지 생성 대기 중</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-0.5">
                  프롬프트 입력 후 생성 버튼을 누르면 이미지가 표시됩니다.
                </p>
              </div>
            </div>
          )}

          {/* INLINE GOOGLE SERVICE API & HTML BAR */}
          <GoogleServiceApiBar
            serviceName="Google Labs ImageFX API"
            serviceBadge="Imagen 3.0"
            serviceColor="cyan"
            networkMeta={networkMeta}
            defaultHtmlCode={lastGeneratedItem?.htmlCode}
            onOpenFullInspector={() => setIsInspectorOpen(true)}
            onApplyCustomHtml={(newHtml) => {
              if (lastGeneratedItem) {
                setLastGeneratedItem({ ...lastGeneratedItem, htmlCode: newHtml });
              }
            }}
          />
        </div>
      </div>

      {/* Network & HTML Inspector Modal */}
      <NetworkInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        networkMeta={networkMeta}
        title="Google ImageFX 통신 및 HTML 코드 검사기"
        onUpdateHtml={(newHtml) => {
          if (lastGeneratedItem) {
            setLastGeneratedItem({ ...lastGeneratedItem, htmlCode: newHtml });
          }
        }}
      />

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="Google ImageFX"
        subtitle="Imagen 3 고화질 이미지 생성 & 리믹스"
        icon={ImageIcon}
        badge="Imagen 3"
        badgeColor="bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
        steps={tutorialSteps}
      />
    </div>
  );
};
