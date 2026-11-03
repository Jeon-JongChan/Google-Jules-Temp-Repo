import React, { useState, useRef } from 'react';
import {
  Film,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Share2,
  Music,
  Download,
  Loader2,
  Video,
  Layers,
  ArrowRight,
  Maximize2,
  Code,
  Terminal,
  Compass,
  Gauge,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { MediaItem, StudioTab, NetworkMeta } from '../types';
import { useLayout } from '../LayoutContext';
import { NetworkInspectorModal } from './NetworkInspectorModal';
import { GoogleServiceApiBar } from './GoogleServiceApiBar';
import { TutorialModal, TutorialStep } from './TutorialModal';
import { executeVideoGeneration } from '../services/geminiClientBridge';

interface Props {
  onAddMedia: (item: MediaItem) => void;
  onOpenShare: (item: MediaItem) => void;
  onNavigateTab: (tab: StudioTab, contextData?: any) => void;
  initialContext?: any;
}

export const VideoStudio: React.FC<Props> = ({
  onAddMedia,
  onOpenShare,
  onNavigateTab,
  initialContext,
}) => {
  const [prompt, setPrompt] = useState(
    initialContext?.suggestedPrompt || 'A cinematic cyberpunk vehicle cruising through neon rain'
  );
  const [mode, setMode] = useState<'text' | 'image'>(initialContext?.sourceImage ? 'image' : 'text');
  const [sourceImage, setSourceImage] = useState<string | null>(initialContext?.sourceImage || null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState<'5s' | '10s'>('5s');
  const [cameraMotion, setCameraMotion] = useState('Slow Cinematic Dolly In');
  const [motionIntensity, setMotionIntensity] = useState<number>(7);
  const [frameRate, setFrameRate] = useState<'24fps' | '60fps'>('24fps');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoItem, setGeneratedVideoItem] = useState<MediaItem | null>(null);
  const [networkMeta, setNetworkMeta] = useState<NetworkMeta | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const tutorialSteps: TutorialStep[] = [
    {
      title: '비디오 모드 선택',
      desc: '텍스트 설명만으로 비디오를 생성하는 [텍스트 생성]과 이미지를 움직이게 만드는 [이미지 애니메이션] 중 선택합니다.',
    },
    {
      title: '카메라 모션 지정',
      desc: '돌리 줌인, 360° 궤도 회전, FPV 드론 등 영화 같은 카메라 무빙 칩을 선택하여 원하는 연출을 지정합니다.',
    },
    {
      title: '재생 & MusicFX로 OST 연계',
      desc: '완성된 비디오를 재생해보고, [MusicFX로 OST 작곡] 버튼을 눌러 영상에 꼭 맞는 사운드트랙을 즉시 작곡할 수 있습니다.',
    },
  ];

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Google DeepMind Veo Signature Camera Movements
  const cameraMotions = [
    { label: '돌리 줌인 (Dolly In)', value: 'Slow cinematic dolly in towards subject with dramatic lighting' },
    { label: '360° 궤도 회전 (Orbit)', value: 'Dynamic smooth 360 degree orbit around center subject' },
    { label: '수평 팬 (Pan Left/Right)', value: 'Smooth horizontal pan across wide cinematic landscape' },
    { label: '수직 틸트 (Tilt Up)', value: 'Dramatic vertical upward tilt revealing massive architecture' },
    { label: 'FPV 드론 급강하 (Drone)', value: 'Fast energetic FPV drone flight sweeping over the terrain' },
    { label: '항공 크레인 부감 (Crane)', value: 'High altitude epic crane shot elevating smoothly' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() && !sourceImage) return;

    setIsGenerating(true);
    try {
      const fullPrompt = `${prompt}, camera motion: ${cameraMotion}, motion intensity: ${motionIntensity}/10, ${frameRate} cinematic, ultra-detailed physics`;

      const data = await executeVideoGeneration({
        prompt: fullPrompt,
        base64Image: mode === 'image' ? (sourceImage || undefined) : undefined,
        aspectRatio,
        duration,
        resolution,
        cameraMotion,
        motionIntensity,
        fps: frameRate === '60fps' ? 60 : 24,
      });

      if (data.networkMeta) {
        setNetworkMeta(data.networkMeta);
      }
      if (data.videoUrl) {
        const newItem: MediaItem = {
          id: 'vid-' + Date.now(),
          type: 'video',
          title: prompt.slice(0, 24) || 'Google Veo 시네마틱 영상',
          prompt: fullPrompt,
          url: data.videoUrl,
          htmlCode: data.networkMeta?.htmlCode,
          networkMeta: data.networkMeta,
          createdAt: Date.now(),
          tags: ['Veo 2.0', aspectRatio, duration, cameraMotion.split(' ')[0], mode === 'image' ? 'Image-to-Video' : 'Text-to-Video'],
          metadata: {
            aspectRatio,
            duration,
            resolution,
            cameraMotion,
            model: data.networkMeta?.modelUsed || 'veo-2.0-generate-001',
            sourceImageId: initialContext?.sourceImageId,
            isSimulated: data.isSimulated,
          },
        };

        setGeneratedVideoItem(newItem);
        onAddMedia(newItem);
      }
    } catch (err: any) {
      console.error('Video generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setMode('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const { isMobileView } = useLayout();

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Studio Grid / Mobile Stack */}
      <div className={isMobileView ? 'flex flex-col space-y-6 w-full' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}>
        
        {/* Left Column: Veo Controller */}
        <div className={isMobileView ? 'w-full space-y-4' : 'lg:col-span-5 space-y-4'}>
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
                  <Film className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white">Google Veo (VideoFX)</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Veo 2.0
                    </span>
                  </div>
                </div>
              </div>

              {/* Tutorial ? button */}
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="p-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1 text-xs font-semibold active:scale-95 shadow-sm"
                title="Veo 사용법 보기"
                aria-label="사용법 안내"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span className="hidden xs:inline">사용법</span>
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                onClick={() => setMode('text')}
                className={`py-2 rounded-xl text-xs font-semibold transition ${
                  mode === 'text'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                텍스트 생성 (Text-to-Video)
              </button>
              <button
                onClick={() => setMode('image')}
                className={`py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                  mode === 'image'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>이미지 애니메이션 (Veo)</span>
                {sourceImage && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            </div>

            {/* Form Inputs */}
            <div className="mt-3.5 space-y-3.5">
              {mode === 'image' && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  {sourceImage ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-700 flex-shrink-0 shadow">
                      <img src={sourceImage} alt="Reference" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setSourceImage(null)}
                        className="absolute inset-0 bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 hover:opacity-100 transition"
                      >
                        제거
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500 flex flex-col items-center justify-center text-slate-400 hover:text-white cursor-pointer transition">
                      <Upload className="w-5 h-5 mb-0.5 text-amber-400" />
                      <span className="text-[9px]">프레임 등록</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-amber-400">시작 키프레임 (기준 이미지)</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Veo 비디오 프롬프트
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono">DeepMind Veo Engine</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="비디오 장면과 역동적인 모션을 설명하세요..."
                  rows={3}
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition resize-none leading-relaxed"
                />
              </div>

              {/* Veo Signature: Camera Movement Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" />
                    Veo 시네마틱 카메라 무빙 (Cinematic Camera):
                  </span>
                  <span className="text-[10px] text-slate-500">Google Veo Controls</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                  {cameraMotions.map((m) => (
                    <button
                      key={m.label}
                      onClick={() => setCameraMotion(m.value)}
                      className={`flex-shrink-0 px-2.5 py-1 rounded-xl transition ${
                        cameraMotion === m.value
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motion Intensity Slider */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    모션 강도 (Motion Strength):
                  </span>
                  <span className="font-mono text-amber-400 font-bold">{motionIntensity} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={motionIntensity}
                  onChange={(e) => setMotionIntensity(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>정적 안정 (Subtle)</span>
                  <span>다이내믹 액션 (Dynamic)</span>
                </div>
              </div>

              {/* Aspect Ratio, Duration & FPS */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 mb-1 font-medium">화면 비율:</div>
                  <div className="flex gap-1">
                    {(['16:9', '9:16'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setAspectRatio(r)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition ${
                          aspectRatio === r
                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 mb-1 font-medium">재생 길이:</div>
                  <div className="flex gap-1">
                    {(['5s', '10s'] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition ${
                          duration === d
                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 mb-1 font-medium">프레임레이트:</div>
                  <div className="flex gap-1">
                    {(['24fps', '60fps'] as const).map((fps) => (
                      <button
                        key={fps}
                        onClick={() => setFrameRate(fps)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition ${
                          frameRate === fps
                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {fps}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && !sourceImage)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-98 transition disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Google Veo 비디오 생성 및 렌더링 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Google Veo 비디오 생성 (AI Studio 무료 티어)</span>
                  </>
                )}
              </button>

              {/* Google Pro Web Direct Bridge (Zero API Cost) */}
              <div className="pt-0.5">
                <a
                  href="https://labs.google/fx/tools/video-fx"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    navigator.clipboard.writeText(prompt);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition shadow-sm"
                  title="구글 프로 구독자 무료 생성: 클릭 시 프롬프트가 복사되고 공식 VideoFX/Veo로 이동합니다"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span>내 구글 프로(Pro) 구독으로 Veo 무료 생성 (프롬프트 자동복사) ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Video Player & Output */}
        <div className={isMobileView ? 'w-full space-y-4' : 'lg:col-span-7 space-y-4'}>
          {generatedVideoItem ? (
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  Veo 비디오 상영관
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300">
                  {generatedVideoItem.metadata.aspectRatio} · {generatedVideoItem.metadata.duration} · {generatedVideoItem.metadata.model}
                </span>
              </div>

              {/* Responsive Video Screen */}
              <div
                className={`relative rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center shadow-inner ${
                  aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[500px] mx-auto' : 'aspect-video w-full'
                }`}
              >
                {generatedVideoItem.url.startsWith('data:video') ? (
                  <video
                    ref={videoRef}
                    src={generatedVideoItem.url}
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                    <img
                      src={generatedVideoItem.url}
                      alt={generatedVideoItem.title}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                  </div>
                )}

                {/* Veo Camera Motion Overlay Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/30 text-amber-300 text-[10px] font-mono flex items-center gap-1 pointer-events-none">
                  <Compass className="w-3 h-3" />
                  <span>Veo Motion: {cameraMotion.split(' ')[0]}</span>
                </div>

                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-amber-500/90 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl transition active:scale-90 z-20"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
                </button>
              </div>

              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80 leading-relaxed font-mono">
                "{generatedVideoItem.prompt}"
              </p>

              {/* Bridge to MusicFX */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-indigo-950/30 border border-amber-800/30 space-y-2">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>이 비디오에 어울리는 오리지널 사운드트랙 연계:</span>
                </div>

                <button
                  onClick={() => {
                    onNavigateTab('music', {
                      sourceImage: generatedVideoItem.url,
                      sourceVideoId: generatedVideoItem.id,
                      suggestedPrompt: `${generatedVideoItem.prompt}에 어울리는 박진감 넘치는 시네마틱 BGM 사운드트랙`,
                    });
                  }}
                  className="w-full p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Music className="w-4 h-4 text-purple-400" />
                  <span>🎵 Flow / MusicFX로 배경음악 작곡 연계</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsInspectorOpen(true)}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                  title="전체화면 cURL 및 HTML 코드 검사"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>HTML 코드 검사</span>
                </button>

                <a
                  href={generatedVideoItem.url}
                  download={`veo-${Date.now()}.mp4`}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>비디오 다운로드</span>
                </a>

                <button
                  onClick={() => onOpenShare(generatedVideoItem)}
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
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
                <Film className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">비디오 상영관</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-0.5">
                  프롬프트 입력 후 생성 버튼을 누르면 비디오가 재생됩니다.
                </p>
              </div>
            </div>
          )}

          {/* INLINE GOOGLE SERVICE API & HTML BAR */}
          <GoogleServiceApiBar
            serviceName="Google DeepMind Veo VideoFX API"
            serviceBadge="Veo 2.0"
            serviceColor="amber"
            networkMeta={networkMeta}
            defaultHtmlCode={generatedVideoItem?.htmlCode}
            onOpenFullInspector={() => setIsInspectorOpen(true)}
            onApplyCustomHtml={(newHtml) => {
              if (generatedVideoItem) {
                setGeneratedVideoItem({ ...generatedVideoItem, htmlCode: newHtml });
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
        title="Google DeepMind Veo 통신 및 HTML 코드 검사기"
        onUpdateHtml={(newHtml) => {
          if (generatedVideoItem) {
            setGeneratedVideoItem({ ...generatedVideoItem, htmlCode: newHtml });
          }
        }}
      />

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="Google Veo (VideoFX)"
        subtitle="시네마틱 AI 비디오 모션 생성기"
        icon={Film}
        badge="Veo 2.0"
        badgeColor="bg-amber-500/20 text-amber-300 border-amber-500/30"
        steps={tutorialSteps}
      />
    </div>
  );
};
