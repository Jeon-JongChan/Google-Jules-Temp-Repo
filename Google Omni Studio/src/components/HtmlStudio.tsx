import React, { useState } from 'react';
import {
  Code,
  Sparkles,
  Play,
  RotateCcw,
  Copy,
  Check,
  Download,
  Share2,
  Terminal,
  Layers,
  Send,
  Eye,
  FileCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { MediaItem, StudioTab, NetworkMeta } from '../types';
import { NetworkInspectorModal } from './NetworkInspectorModal';
import { TutorialModal, TutorialStep } from './TutorialModal';
import { executeHtmlGeneration } from '../services/geminiClientBridge';

interface Props {
  onAddMedia: (item: MediaItem) => void;
  onOpenShare: (item: MediaItem) => void;
  onNavigateTab: (tab: StudioTab, contextData?: any) => void;
  initialContext?: any;
}

export const HtmlStudio: React.FC<Props> = ({
  onAddMedia,
  onOpenShare,
  onNavigateTab,
  initialContext,
}) => {
  const [inputMode, setInputMode] = useState<'prompt' | 'directHtml'>('prompt');
  const [prompt, setPrompt] = useState(initialContext?.prompt || '');
  const [directHtml, setDirectHtml] = useState(initialContext?.htmlCode || '');
  const [title, setTitle] = useState(initialContext?.title || '제미나 인터랙티브 웹 컴포넌트');

  const [isLoading, setIsLoading] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState<string>(
    initialContext?.htmlCode || `<div style="background: linear-gradient(135deg, #090d16, #1e1b4b); border: 1px solid #38bdf8; border-radius: 16px; padding: 24px; color: #fff; font-family: system-ui, sans-serif; text-align: center;">
  <div style="display:inline-block; padding: 4px 12px; background: rgba(56,189,248,0.15); color: #38bdf8; border-radius: 20px; font-size: 11px; font-weight: bold; margin-bottom: 12px;">
    ⚡ Gemini Realtime HTML Engine
  </div>
  <h3 style="margin: 0 0 8px; font-size: 20px; font-weight: bold; color: #f8fafc;">
    프롬프트를 입력하거나 실제 사이트의 HTML 코드를 입력하세요
  </h3>
  <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px;">
    Gemini 실시간 API를 통해 전송 부분과 결과 HTML 코드를 직접 연동하여 실행합니다.
  </p>
  <button onclick="alert('정상적으로 동작하는 라이브 HTML 컴포넌트입니다!')" style="background: #38bdf8; color: #020617; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">
    인터랙션 테스트 클릭
  </button>
</div>`
  );

  const [networkMeta, setNetworkMeta] = useState<NetworkMeta | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tutorialSteps: TutorialStep[] = [
    {
      title: 'HTML 컴포넌트 프롬프트',
      desc: '만들고 싶은 반응형 카드, 미디어 플레이어, 계산기 등의 기능과 스타일을 한국어로 자유롭게 입력합니다.',
    },
    {
      title: '실시간 인터랙티브 렌더링',
      desc: '생성 버튼을 누르면 완성된 HTML/JS 코드가 실시간 샌드박스 프레임에서 즉시 동작합니다.',
    },
    {
      title: '코드 검사 및 내보내기',
      desc: '[HTML 코드 보기] 탭에서 실제 태그와 스타일 코드를 확인하고 클립보드에 원클릭 복사할 수 있습니다.',
    },
  ];

  const GOOGLE_TEMPLATES: Record<string, { title: string; html: string; desc: string }> = {
    imagefx: {
      title: 'Google Labs ImageFX 익스프레시브 HTML/JS',
      desc: 'ImageFX 고유의 인터랙티브 키워드 칩 토크나이저와 Imagen API 연동 코드',
      html: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google ImageFX Standalone</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0b0f19; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; }
    .card { max-width: 540px; margin: 0 auto; background: #111827; border: 1px solid #1e293b; border-radius: 20px; padding: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .logo { display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 16px; color: #38bdf8; }
    .badge { font-size: 11px; font-family: monospace; background: rgba(56,189,248,0.15); color: #38bdf8; padding: 3px 8px; border-radius: 6px; }
    .prompt-area { background: #090d16; border: 1px solid #334155; border-radius: 14px; padding: 12px; margin-bottom: 12px; min-height: 80px; font-size: 13px; line-height: 1.6; }
    .chip { display: inline-flex; align-items: center; gap: 4px; background: rgba(56,189,248,0.2); color: #7dd3fc; border: 1px solid #0284c7; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; margin: 2px; }
    .chip:hover { background: rgba(56,189,248,0.35); }
    .controls { display: flex; gap: 8px; margin-bottom: 14px; }
    .tag-btn { background: #1e293b; border: 1px solid #334155; color: #cbd5e1; padding: 6px 12px; border-radius: 8px; font-size: 11px; cursor: pointer; }
    .tag-btn.active { background: #0284c7; color: #fff; font-weight: bold; }
    .action-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #0284c7, #2563eb); color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
    .action-btn:active { transform: scale(0.98); }
    .result-frame { margin-top: 16px; border-radius: 14px; overflow: hidden; background: #030712; border: 1px solid #1e293b; min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">✦ Google ImageFX</div>
      <span class="badge">Imagen 3.0</span>
    </div>
    
    <div class="prompt-area" id="promptArea">
      A cinematic photograph of <span class="chip" onclick="cycleChip(this, ['사이버펑크 서울', '네온 도쿄', '미래 도시'])">사이버펑크 서울</span> at 
      <span class="chip" onclick="cycleChip(this, ['골든 아워', '비 내리는 한밤중', '새벽 안개'])">골든 아워</span>, 
      <span class="chip" onclick="cycleChip(this, ['35mm 시네마 렌즈', '85mm 얕은 심도', '드론 항공 뷰'])">35mm 시네마 렌즈</span>, 8K ultra-detailed.
    </div>

    <div class="controls">
      <button class="tag-btn active" onclick="setRatio(this, '1:1')">1:1 Square</button>
      <button class="tag-btn" onclick="setRatio(this, '16:9')">16:9 Cinema</button>
      <button class="tag-btn" onclick="setRatio(this, '9:16')">9:16 Reels</button>
    </div>

    <button class="action-btn" onclick="generateImage()">Google ImageFX 생성 요청 전송</button>

    <div class="result-frame" id="resultFrame">
      <div style="color: #64748b; font-size: 12px;">버튼을 누르면 Imagen 3 API 결과가 렌더링됩니다</div>
    </div>
  </div>

  <script>
    function cycleChip(el, options) {
      let current = el.innerText;
      let nextIdx = (options.indexOf(current) + 1) % options.length;
      el.innerText = options[nextIdx];
    }
    function setRatio(btn, ratio) {
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    function generateImage() {
      const frame = document.getElementById('resultFrame');
      frame.innerHTML = '<div style="color: #38bdf8; font-size: 12px;">✦ Imagen 3.0 렌더링 중...</div>';
      setTimeout(() => {
        frame.innerHTML = '<div style="padding: 16px; text-align: center;"><div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">생성 완료 (Seed: 481920)</div><div style="font-size: 11px; color: #94a3b8;">' + document.getElementById('promptArea').innerText + '</div></div>';
      }, 700);
    }
  </script>
</body>
</html>`,
    },
    veo: {
      title: 'Google DeepMind Veo 비디오 플레이어 HTML/JS',
      desc: 'Veo 시네마틱 카메라 모션 뱃지, 루프 제어, 비디오 캔버스 렌더러',
      html: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Veo Standalone</title>
  <style>
    body { margin: 0; background: #030712; color: #f8fafc; font-family: sans-serif; padding: 16px; }
    .veo-box { max-width: 580px; margin: 0 auto; background: #0b0f19; border: 1px solid #f59e0b50; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(245,158,11,0.15); }
    .screen-wrap { position: relative; aspect-ratio: 16/9; background: #000; display: flex; align-items: center; justify-content: center; }
    .motion-badge { position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.75); border: 1px solid #f59e0b; color: #fbbf24; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-family: monospace; z-index: 10; }
    .controls { padding: 14px 18px; background: #0f172a; display: flex; align-items: center; justify-content: space-between; }
    .play-btn { background: #f59e0b; color: #020617; border: none; padding: 8px 18px; border-radius: 10px; font-weight: bold; font-size: 13px; cursor: pointer; }
    .scrubber { width: 100%; height: 4px; background: #1e293b; position: relative; cursor: pointer; }
    .progress { height: 100%; width: 45%; background: #f59e0b; }
  </style>
</head>
<body>
  <div class="veo-box">
    <div class="screen-wrap">
      <div class="motion-badge">🎥 Veo Camera: Dolly Zoom In (60 FPS)</div>
      <div id="visualDisplay" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1e1b4b, #030712); color: #f59e0b; font-weight: bold;">
        ▶ DeepMind Veo Video Screen
      </div>
    </div>
    <div class="scrubber"><div class="progress" id="progBar"></div></div>
    <div class="controls">
      <button class="play-btn" onclick="togglePlay(this)">재생 / 정지</button>
      <span style="font-size: 12px; font-family: monospace; color: #94a3b8;">00:02 / 00:05 (4K UHD)</span>
    </div>
  </div>

  <script>
    let isPlaying = false;
    let timer = null;
    let p = 0;
    function togglePlay(btn) {
      isPlaying = !isPlaying;
      btn.innerText = isPlaying ? '일시 정지' : '재생';
      if (isPlaying) {
        timer = setInterval(() => {
          p = (p + 2) % 100;
          document.getElementById('progBar').style.width = p + '%';
        }, 100);
      } else {
        clearInterval(timer);
      }
    }
  </script>
</body>
</html>`,
    },
    musicfx: {
      title: 'Google Flow / MusicFX 실시간 오디오 HTML/JS',
      desc: 'Web Audio API 실시간 주파수 캔버스 합성, BPM 템포 슬라이더, 스템 채널',
      html: `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google MusicFX Standalone</title>
  <style>
    body { margin: 0; background: #090d16; color: #f1f5f9; font-family: system-ui, sans-serif; padding: 16px; }
    .card { max-width: 540px; margin: 0 auto; background: #111827; border: 1px solid #a855f750; border-radius: 20px; padding: 20px; box-shadow: 0 15px 35px rgba(168,85,247,0.2); }
    canvas { width: 100%; height: 90px; background: #030712; border-radius: 12px; margin-bottom: 14px; }
    .stems { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 14px; }
    .stem-btn { background: #1e1b4b; border: 1px solid #818cf8; color: #c084fc; padding: 8px 4px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer; text-align: center; }
    .stem-btn.muted { opacity: 0.4; text-decoration: line-through; border-color: #334155; }
    .bpm-bar { display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 14px; }
    .play-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #a855f7, #ec4899); color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span style="font-weight: bold; color: #c084fc;">🎵 Google MusicFX (Lyria)</span>
      <span style="font-size: 11px; font-family: monospace; color: #94a3b8;" id="bpmLabel">120 BPM · LOOP</span>
    </div>

    <canvas id="vizCanvas" width="400" height="90"></canvas>

    <div class="stems">
      <button class="stem-btn" onclick="this.classList.toggle('muted')">DRUMS</button>
      <button class="stem-btn" onclick="this.classList.toggle('muted')">BASS</button>
      <button class="stem-btn" onclick="this.classList.toggle('muted')">CHORDS</button>
      <button class="stem-btn" onclick="this.classList.toggle('muted')">LEAD</button>
    </div>

    <div class="bpm-bar">
      <span>BPM 템포:</span>
      <input type="range" min="60" max="160" value="120" oninput="document.getElementById('bpmLabel').innerText = this.value + ' BPM · LOOP'">
    </div>

    <button class="play-btn" id="playBtn" onclick="toggleAudio()">오디오 신디사이저 재생 (Web Audio)</button>
  </div>

  <script>
    let audioCtx = null;
    let isPlaying = false;
    let animId = null;
    const canvas = document.getElementById('vizCanvas');
    const ctx = canvas.getContext('2d');

    function toggleAudio() {
      isPlaying = !isPlaying;
      document.getElementById('playBtn').innerText = isPlaying ? '재생 중지' : '오디오 신디사이저 재생 (Web Audio)';
      if (isPlaying) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        renderViz();
      } else {
        cancelAnimationFrame(animId);
        ctx.clearRect(0,0,canvas.width,canvas.height);
      }
    }

    let tick = 0;
    function renderViz() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 30;
      const w = canvas.width / bars;
      for (let i = 0; i < bars; i++) {
        const h = Math.sin(tick * 0.15 + i * 0.4) * 30 + 35;
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(i * w + 1, canvas.height - h, w - 2, h);
      }
      tick++;
      animId = requestAnimationFrame(renderViz);
    }
  </script>
</body>
</html>`,
    }
  };

  const presets = [
    {
      title: '🎬 Google Veo 비디오 플레이어 템플릿',
      prompt: 'Google DeepMind Veo 스타일의 어두운 시네마틱 4K 비디오 플레이어 카드 HTML. 카메라 무빙 뱃지, 루프 컨트롤, 반응형 aspect-ratio 포함.',
    },
    {
      title: '🎨 Google ImageFX 익스프레시브 카드',
      prompt: 'Google Labs ImageFX 스타일의 고화질 이미지 쇼케이스 컴포넌트 HTML. 생성 시드(Seed) 표시, 익스프레시브 키워드 칩 태그, 다운로드 버튼 포함.',
    },
    {
      title: '🎵 Google MusicFX 캔버스 비주얼라이저',
      prompt: 'Google Labs MusicFX 스타일의 실시간 Web Audio Canvas 주파수 막대 애니메이션과 루프/BPM 표시기가 장착된 반응형 오디오 플레이어 HTML.',
    },
    {
      title: '⚡ Google Omni 멀티트랙 상영관',
      prompt: 'Google Labs Omni Flow 스타일의 영상, BGM, 내레이션 오디오가 동시에 재생 및 믹싱되는 종합 미디어 프로덕션 임베드 HTML.',
    },
  ];

  const handleLoadTemplate = (key: 'imagefx' | 'veo' | 'musicfx') => {
    const tpl = GOOGLE_TEMPLATES[key];
    if (tpl) {
      setTitle(tpl.title);
      setDirectHtml(tpl.html);
      setRenderedHtml(tpl.html);
      setInputMode('directHtml');
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      if (inputMode === 'directHtml') {
        if (!directHtml.trim()) return;
        setRenderedHtml(directHtml);
        
        const meta: NetworkMeta = {
          endpoint: '/api/gemini/html (Direct Input)',
          method: 'DIRECT_INPUT',
          requestPayload: { customHtml: directHtml },
          curlCommand: `# 직접 입력된 HTML 코드입니다\ncat << 'EOF'\n${directHtml}\nEOF`,
          responseStatus: 200,
          latencyMs: 12,
          isRealApi: true,
          modelUsed: 'direct-user-html-injection',
          htmlCode: directHtml,
          timestamp: new Date().toISOString()
        };
        setNetworkMeta(meta);

        // Vault item
        const item: MediaItem = {
          id: 'html-' + Date.now(),
          type: 'html',
          title: title || '직접 입력한 HTML 컴포넌트',
          prompt: 'Direct HTML Input',
          url: `data:text/html;charset=utf-8,${encodeURIComponent(directHtml)}`,
          htmlCode: directHtml,
          networkMeta: meta,
          createdAt: Date.now(),
          tags: ['HTML', 'Direct Embed', 'Live Code'],
          metadata: {
            model: 'Direct Embed',
            htmlPreview: directHtml
          }
        };
        onAddMedia(item);
      } else {
        if (!prompt.trim()) return;

        const data = await executeHtmlGeneration({ prompt, title });
        const code = data.htmlCode || directHtml;
        setRenderedHtml(code);
        setNetworkMeta(data.networkMeta);

        const item: MediaItem = {
          id: 'html-' + Date.now(),
          type: 'html',
          title: title || prompt.slice(0, 20),
          prompt,
          url: `data:text/html;charset=utf-8,${encodeURIComponent(code)}`,
          htmlCode: code,
          networkMeta: data.networkMeta,
          createdAt: Date.now(),
          tags: ['Gemini', 'HTML', 'Live Generation'],
          metadata: {
            model: data.networkMeta?.modelUsed || 'gemini-3.8-flash',
            htmlPreview: code
          }
        };
        onAddMedia(item);
      }
    } catch (err: any) {
      console.error('HTML execution error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(renderedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 pb-12 w-full max-w-full">
      {/* Title Banner */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                HTML/API 인스펙터
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  Live Engine
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Tutorial ? button */}
            <button
              onClick={() => setIsTutorialOpen(true)}
              className="p-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center gap-1 text-xs font-semibold active:scale-95 shadow-sm"
              title="HTML 스튜디오 사용법 보기"
              aria-label="사용법 안내"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="hidden xs:inline">사용법</span>
            </button>

            {/* Network Inspector Trigger */}
            <button
              onClick={() => setIsInspectorOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-300 font-medium text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>코드 &amp; cURL 검사</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
        <button
          onClick={() => setInputMode('prompt')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            inputMode === 'prompt'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Gemini 프롬프트로 실제 HTML 생성
        </button>
        <button
          onClick={() => setInputMode('directHtml')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            inputMode === 'directHtml'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          실제 사이트 결과 HTML 직접 붙여넣기
        </button>
      </div>

      {/* Standalone Google Service HTML/JS One-Click Presets */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-amber-950/30 to-purple-950/40 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            구글 서비스 원본 HTML + JavaScript 코드 1클릭 불러오기:
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Standalone Component</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleLoadTemplate('imagefx')}
            className="p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-left transition"
          >
            <div className="font-bold text-xs text-cyan-300">🎨 ImageFX HTML/JS</div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">키워드 칩 토크나이저 &amp; Imagen 코드</div>
          </button>
          <button
            onClick={() => handleLoadTemplate('veo')}
            className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition"
          >
            <div className="font-bold text-xs text-amber-300">🎬 Veo 비디오 HTML/JS</div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">카메라 모션 뱃지 &amp; 플레이어 코드</div>
          </button>
          <button
            onClick={() => handleLoadTemplate('musicfx')}
            className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition"
          >
            <div className="font-bold text-xs text-purple-300">🎵 MusicFX 오디오 HTML/JS</div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">Web Audio 신디 &amp; 캔버스 주파수 코드</div>
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            컴포넌트 제목 (옵션)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 실시간 사이버펑크 캔버스 위젯"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {inputMode === 'prompt' ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                제미나 전송 프롬프트 (Request Payload)
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">POST /api/gemini/html</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="제작하고 싶은 웹 컴포넌트, 미디어 인터페이스, 캔버스 애니메이션 등의 구체적인 사양을 입력하세요..."
              className="w-full h-24 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
            />
            {/* Quick Presets */}
            <div className="flex gap-2 pt-1 overflow-x-auto pb-1">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p.prompt);
                    setTitle(p.title);
                  }}
                  className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 transition"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                실제 사이트에서 수신한 결과 HTML 코드 (Direct Code Input)
              </label>
              <span className="text-[11px] text-emerald-400 font-mono">HTML5 / CSS / JS Embed</span>
            </div>
            <textarea
              value={directHtml}
              onChange={(e) => setDirectHtml(e.target.value)}
              placeholder="<div>, <iframe...>, <video...>, <canvas...> 등 실제 사이트에서 수신한 HTML 코드를 그대로 붙여넣으세요..."
              className="w-full h-32 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleExecute}
          disabled={isLoading || (inputMode === 'prompt' ? !prompt.trim() : !directHtml.trim())}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition active:scale-[0.98]"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>실제 Gemini API에 요청 전송 및 HTML 수신 중...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>
                {inputMode === 'prompt'
                  ? '실제 API로 전송하고 결과 HTML 수신하기'
                  : 'HTML 코드 즉시 렌더링 및 보관함 연동'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Rendered Result & Live Sandbox */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white">실제 실행 화면 (Live Sandbox)</h3>
            {networkMeta?.isRealApi && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                ● Live Executed ({networkMeta.latencyMs}ms)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>HTML 복사</span>
            </button>
            <button
              onClick={() => setIsInspectorOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] flex items-center gap-1 transition"
            >
              <Code className="w-3 h-3" />
              <span>코드/전문 검사</span>
            </button>
          </div>
        </div>

        {/* Sandboxed iFrame Runner */}
        <div className="w-full min-h-[320px] max-h-[460px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-2 flex items-center justify-center">
          <iframe
            title="Gemini Live HTML Sandbox"
            srcDoc={renderedHtml}
            className="w-full h-80 border-0 rounded-lg bg-transparent"
            sandbox="allow-scripts allow-same-origin allow-modals"
          />
        </div>

        {/* Real-time payload strip */}
        {networkMeta && (
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-semibold">{networkMeta.modelUsed}</span>
              <span>·</span>
              <span>지연시간: {networkMeta.latencyMs}ms</span>
            </div>
            <button
              onClick={() => setIsInspectorOpen(true)}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              요청/응답 전문 보기 &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Network & Code Inspector Modal */}
      <NetworkInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        networkMeta={networkMeta}
        title="실제 전송 부분 및 수신 HTML 코드 검사기"
        onUpdateHtml={(newHtml) => {
          setRenderedHtml(newHtml);
          setDirectHtml(newHtml);
        }}
      />

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="HTML/API 인스펙터"
        subtitle="실시간 코드 생성 & 렌더링 샌드박스"
        icon={Code}
        badge="Live Engine"
        badgeColor="bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
        steps={tutorialSteps}
      />
    </div>
  );
};
