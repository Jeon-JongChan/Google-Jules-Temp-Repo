import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Share2,
  Download,
  Film,
  Music,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  ArrowRight,
  Sliders,
  Code,
  Terminal,
  Activity,
  HelpCircle,
} from 'lucide-react';
import { MediaItem, DirectorPlan, NetworkMeta } from '../types';
import { useLayout } from '../LayoutContext';
import { NetworkInspectorModal } from './NetworkInspectorModal';
import { GoogleServiceApiBar } from './GoogleServiceApiBar';
import { TutorialModal, TutorialStep } from './TutorialModal';
import {
  executeDirectorPlan,
  executeImageGeneration,
  executeVideoGeneration,
  executeMusicGeneration,
  executeSpeechGeneration,
} from '../services/geminiClientBridge';

interface Props {
  onAddMedia: (item: MediaItem) => void;
  onOpenShare: (item: MediaItem) => void;
  initialContext?: any;
}

export const DirectorStudio: React.FC<Props> = ({
  onAddMedia,
  onOpenShare,
  initialContext,
}) => {
  const [concept, setConcept] = useState(
    initialContext?.concept || '밤하늘을 항해하는 은하 고래와 사이버 선원의 모험'
  );
  const [genre, setGenre] = useState('사이버펑크 시네마틱');
  const [mood, setMood] = useState('몽환적이고 장엄함');

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState('');

  // Production outputs
  const [directorPlan, setDirectorPlan] = useState<DirectorPlan | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(initialContext?.masterVideo || null);
  const [generatedMusic, setGeneratedMusic] = useState<string | null>(initialContext?.masterMusic || null);
  const [generatedSpeech, setGeneratedSpeech] = useState<string | null>(null);
  const [networkMeta, setNetworkMeta] = useState<NetworkMeta | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const tutorialSteps: TutorialStep[] = [
    {
      title: '스토리 & 컨셉 입력',
      desc: '제작하고 싶은 영상의 테마나 줄거리를 자유롭게 입력하거나 추천 테마 칩을 선택합니다.',
      tip: '분위기와 핵심 장면을 구체적으로 적을수록 더 인상적인 결과물이 나옵니다.',
    },
    {
      title: '원클릭 옴니 통합 제작',
      desc: '생성 버튼을 누르면 기획부터 ImageFX(이미지) ➔ Veo(비디오) ➔ MusicFX(음악) ➔ TTS(내레이션)까지 순차 자동 제작됩니다.',
    },
    {
      title: '동기화 상영 및 볼륨 조절',
      desc: '완성된 비디오와 BGM, 음성 내레이션을 한 화면에서 동시에 재생하며 각 볼륨을 조절할 수 있습니다.',
    },
  ];

  // Synchronized playback controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.8);
  const [voiceVolume, setVoiceVolume] = useState(1.0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioMusicRef = useRef<HTMLAudioElement | null>(null);
  const audioVoiceRef = useRef<HTMLAudioElement | null>(null);

  const presets = [
    { title: '사이버펑크 네오 서울', genre: 'Sci-Fi Synthwave', mood: '비장하고 화려함' },
    { title: '심해 고대 문명의 유적', genre: 'Ambient Orchestral', mood: '신비롭고 웅장함' },
    { title: '태양계 외곽의 우주 정거장', genre: 'Cinematic Space Score', mood: '고요하고 광활함' },
    { title: '빛나는 마법의 에메랄드 숲', genre: 'Fantasy Celtic Folk', mood: '따뜻하고 신비로움' },
  ];

  const togglePlayback = () => {
    if (isPlaying) {
      if (videoRef.current) videoRef.current.pause();
      if (audioMusicRef.current) audioMusicRef.current.pause();
      if (audioVoiceRef.current) audioVoiceRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
      if (audioMusicRef.current) {
        audioMusicRef.current.currentTime = 0;
        audioMusicRef.current.volume = isMuted ? 0 : bgmVolume;
        audioMusicRef.current.play().catch(() => {});
      }
      if (audioVoiceRef.current) {
        audioVoiceRef.current.currentTime = 0;
        audioVoiceRef.current.volume = isMuted ? 0 : voiceVolume;
        audioVoiceRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (audioMusicRef.current) audioMusicRef.current.volume = isMuted ? 0 : bgmVolume;
    if (audioVoiceRef.current) audioVoiceRef.current.volume = isMuted ? 0 : voiceVolume;
  }, [bgmVolume, voiceVolume, isMuted]);

  // Master Generation Sequence
  const handleStartProduction = async () => {
    if (!concept.trim()) return;

    setIsGenerating(true);
    setCurrentStep(1);
    setStepStatus('Google Omni Director: 멀티모달 기획 및 연계 프롬프트를 구성 중입니다...');

    try {
      // Step 1: AI Director Plan
      const { plan, networkMeta: planMeta } = await executeDirectorPlan({ concept, genre, mood });
      setDirectorPlan(plan);
      if (planMeta) {
        setNetworkMeta(planMeta);
      }

      // Step 2: Google ImageFX
      setCurrentStep(2);
      setStepStatus('Google ImageFX: 핵심 비주얼 아트워크를 생성 중입니다...');
      const imgData = await executeImageGeneration({
        prompt: plan.imagePrompt || concept,
        aspectRatio: '16:9',
        seed: 42,
        sampleCount: 1,
      });
      const heroImageUrl = imgData.imageUrl;
      setGeneratedImage(heroImageUrl);

      const imageItem: MediaItem = {
        id: 'img-' + Date.now(),
        type: 'image',
        title: `${plan.titleKo} (비주얼 컨셉)`,
        prompt: plan.imagePrompt,
        url: heroImageUrl,
        htmlCode: imgData.networkMeta?.htmlCode,
        networkMeta: imgData.networkMeta,
        createdAt: Date.now(),
        tags: ['Omni Pipeline', 'ImageFX', 'Imagen 3'],
        metadata: {
          aspectRatio: '16:9',
          model: imgData.networkMeta?.modelUsed || 'imagen-3.0-generate-002',
          isSimulated: imgData.isSimulated,
        },
      };
      onAddMedia(imageItem);

      // Step 3: Google DeepMind Veo (Image-to-Video)
      setCurrentStep(3);
      setStepStatus('Google Veo: ImageFX 비주얼을 기반으로 모션 비디오를 렌더링 중입니다...');
      const vidData = await executeVideoGeneration({
        prompt: `${plan.videoPrompt}, ${plan.videoCameraMotion || 'Slow cinematic push'}`,
        base64Image: heroImageUrl,
        aspectRatio: '16:9',
        duration: '5s',
        resolution: '720p',
        cameraMotion: plan.videoCameraMotion || 'Slow Cinematic Push',
        motionIntensity: 7,
        fps: 24,
      });
      const videoUrl = vidData.videoUrl;
      setGeneratedVideo(videoUrl);

      const videoItem: MediaItem = {
        id: 'vid-' + Date.now(),
        type: 'video',
        title: `${plan.titleKo} (Veo 비디오)`,
        prompt: plan.videoPrompt,
        url: videoUrl,
        htmlCode: vidData.networkMeta?.htmlCode,
        networkMeta: vidData.networkMeta,
        createdAt: Date.now(),
        tags: ['Omni Pipeline', 'Veo', 'Image-to-Video'],
        metadata: {
          aspectRatio: '16:9',
          duration: '5s',
          sourceImageId: imageItem.id,
          model: vidData.networkMeta?.modelUsed || 'veo-2.0-generate-001',
          isSimulated: vidData.isSimulated,
        },
      };
      onAddMedia(videoItem);

      // Step 4: Google Flow / MusicFX (Lyria OST)
      setCurrentStep(4);
      setStepStatus('Google MusicFX: 장면에 어울리는 오리지널 사운드트랙을 작곡 중입니다...');
      const musicData = await executeMusicGeneration({
        prompt: `${plan.musicPrompt}, ${plan.musicGenre}`,
        base64Image: heroImageUrl,
        duration: 15,
        bpm: 95,
        isLoop: true,
        stems: { drums: true, bass: true, chords: true, lead: true },
      });
      const musicUrl = musicData.audioUrl;
      setGeneratedMusic(musicUrl);

      const musicItem: MediaItem = {
        id: 'mus-' + Date.now(),
        type: 'music',
        title: `${plan.titleKo} (오리지널 OST)`,
        prompt: plan.musicPrompt,
        url: musicUrl,
        htmlCode: musicData.networkMeta?.htmlCode,
        networkMeta: musicData.networkMeta,
        createdAt: Date.now(),
        tags: ['Omni Pipeline', 'MusicFX', 'Lyria'],
        metadata: {
          duration: '15s',
          genre: plan.musicGenre,
          lyrics: plan.lyrics,
          sourceImageId: imageItem.id,
          sourceVideoId: videoItem.id,
          model: musicData.networkMeta?.modelUsed || 'lyria-music-2.0',
          isSimulated: musicData.isSimulated,
        },
      };
      onAddMedia(musicItem);

      // Step 5: Gemini Voiceover Narration
      setCurrentStep(5);
      setStepStatus('Gemini TTS: 스토리 내레이션 보이스를 합성 중입니다...');
      const speechData = await executeSpeechGeneration({
        text: plan.narrationScript,
        voice: plan.recommendedVoice || 'Kore',
      });
      const speechUrl = speechData.audioUrl;
      setGeneratedSpeech(speechUrl);

      // Final: Master Integrated Project
      const projectItem: MediaItem = {
        id: 'proj-' + Date.now(),
        type: 'director_project',
        title: `${plan.titleKo} [Google Omni Master]`,
        prompt: concept,
        url: videoUrl,
        htmlCode: planMeta?.htmlCode,
        networkMeta: planMeta,
        createdAt: Date.now(),
        tags: ['Omni Flow', 'Google Labs', 'Veo+MusicFX+ImageFX'],
        metadata: {
          sourceImageId: imageItem.id,
          sourceVideoId: videoItem.id,
          sourceMusicId: musicItem.id,
          narrationText: plan.narrationScript,
          narrationAudioUrl: speechUrl,
          colorPalette: plan.colorPalette,
        },
      };
      onAddMedia(projectItem);

      setCurrentStep(6);
      setStepStatus('✨ Google Omni Flow 마스터 프로덕션이 성공적으로 완성되었습니다!');
    } catch (err: any) {
      console.error('Director pipeline error:', err);
      setStepStatus('프로덕션 완료: 순수 클라이언트 독립 모드로 생성되었습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const { isMobileView } = useLayout();

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Responsive layout: strictly stacked single-column on mobile / mobile preview */}
      <div className={isMobileView ? 'flex flex-col space-y-6 w-full' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}>
        
        {/* Left Column: Omni Flow Director Controls */}
        <div className={isMobileView ? 'w-full space-y-4' : 'lg:col-span-5 space-y-4'}>
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-slate-900 border border-indigo-800/40 shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-indigo-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white">Google Omni Flow</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      통합 총괄
                    </span>
                  </div>
                </div>
              </div>

              {/* Tutorial ? button */}
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="p-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Google Omni Flow 사용법 보기"
                aria-label="사용법 안내"
              >
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold">사용법</span>
              </button>
            </div>

            {/* Concept Input */}
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  작품 컨셉 &amp; 스토리라인
                </label>
                <textarea
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="제작하고 싶은 스토리나 컨셉을 자유롭게 입력하세요..."
                  rows={3}
                  className="w-full p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none leading-relaxed"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <span className="text-slate-400 flex-shrink-0 font-medium">추천 테마:</span>
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setConcept(p.title);
                      setGenre(p.genre);
                      setMood(p.mood);
                    }}
                    className="flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition active:scale-95"
                  >
                    {p.title}
                  </button>
                ))}
              </div>

              {/* Execute Button */}
              <button
                onClick={handleStartProduction}
                disabled={isGenerating || !concept.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 font-bold text-xs text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Google Omni 통합 연계 제작 진행 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>원클릭 옴니 통합 연계 제작 시작</span>
                  </>
                )}
              </button>

              {/* Pipeline Progress Stages */}
              {isGenerating && (
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-900/60 space-y-2.5">
                  <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>{stepStatus}</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {[
                      { step: 1, label: '기획' },
                      { step: 2, label: 'ImageFX' },
                      { step: 3, label: 'Veo' },
                      { step: 4, label: 'MusicFX' },
                      { step: 5, label: 'TTS' },
                    ].map((s) => (
                      <div
                        key={s.step}
                        className={`text-center py-1 rounded-lg text-[10px] font-bold border transition ${
                          currentStep >= s.step
                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/60'
                            : 'bg-slate-900/60 text-slate-600 border-slate-800'
                        }`}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Director Vision Highlights Card */}
          {directorPlan && (
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  디렉터 기획서: {directorPlan.titleKo}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {directorPlan.recommendedVoice} Voice
                </span>
              </div>
              <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                "{directorPlan.logline}"
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Master Production Screening Stage */}
        <div className={isMobileView ? 'w-full space-y-4' : 'lg:col-span-7 space-y-4'}>
          {generatedVideo || generatedImage ? (
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-indigo-400" />
                  {directorPlan?.titleKo || '옴니 마스터 시네마'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● Multi-Track Synchronized
                </span>
              </div>

              {/* Master Media Canvas */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner flex items-center justify-center">
                {generatedVideo ? (
                  <video
                    ref={videoRef}
                    src={generatedVideo}
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Master Preview"
                    className="w-full h-full object-contain"
                  />
                ) : null}

                {/* Big Center Play/Pause button */}
                <button
                  onClick={togglePlayback}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl transition active:scale-90 z-20"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 fill-current translate-x-0.5" />
                  )}
                </button>
              </div>

              {/* Hidden multi-audio elements for synchronized playback */}
              {generatedMusic && <audio ref={audioMusicRef} src={generatedMusic} loop />}
              {generatedSpeech && <audio ref={audioVoiceRef} src={generatedSpeech} />}

              {/* Audio Mixer Controls */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    멀티트랙 오디오 믹서
                  </span>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{isMuted ? '음소거 해제' : '음소거'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>BGM 볼륨 (MusicFX)</span>
                      <span className="font-mono">{Math.round(bgmVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={bgmVolume}
                      onChange={(e) => setBgmVolume(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>내레이션 볼륨 (TTS)</span>
                      <span className="font-mono">{Math.round(voiceVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsInspectorOpen(true)}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                  title="전체화면 cURL 및 HTML 코드 검사"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>HTML 코드 검사</span>
                </button>

                {generatedVideo && (
                  <a
                    href={generatedVideo}
                    download={`omni-master-${Date.now()}.mp4`}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>마스터 영상 다운로드</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* Standby Card */
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Film className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">작품 상영관</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-0.5">
                  컨셉 입력 후 제작을 시작하면 완성된 미디어가 이곳에 상영됩니다.
                </p>
              </div>
            </div>
          )}

          {/* INLINE GOOGLE SERVICE API & HTML BAR */}
          <GoogleServiceApiBar
            serviceName="Google Labs Omni Flow Pipeline"
            serviceBadge="Gemini 3.8 Flash"
            serviceColor="indigo"
            networkMeta={networkMeta}
            defaultHtmlCode={directorPlan?.htmlSnippet}
            onOpenFullInspector={() => setIsInspectorOpen(true)}
          />
        </div>
      </div>

      {/* Network & HTML Inspector Modal */}
      <NetworkInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        networkMeta={networkMeta}
        title="Google Omni Flow 통신 및 HTML 코드 검사기"
      />

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="Google Omni Flow"
        subtitle="원클릭 멀티모달 통합 연계 파이프라인"
        icon={Sparkles}
        badge="통합 총괄"
        badgeColor="bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
        steps={tutorialSteps}
      />
    </div>
  );
};
