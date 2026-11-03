/**
 * Gemini OmniStudio - Pure Client-Side Generative Bridge
 * 
 * Enables 100% standalone, serverless operation in Android APK, WebAPK, and offline PWA.
 * Automatically attempts server connection, and seamlessly falls back to client-native
 * synthesis (Canvas, Web Audio API, Web Speech API, Local Procedural Engine) when
 * running without a backend server.
 */

import { MediaItem, NetworkMeta } from '../types';

// Fast check helper for server availability
let isServerAvailable: boolean | null = null;
let lastServerCheck = 0;

export async function checkServerHealth(timeoutMs = 1200): Promise<boolean> {
  const now = Date.now();
  if (isServerAvailable !== null && now - lastServerCheck < 30000) {
    return isServerAvailable;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch('/api/status', { signal: controller.signal });
    clearTimeout(timer);
    isServerAvailable = res.ok;
  } catch {
    isServerAvailable = false;
  }
  lastServerCheck = now;
  return isServerAvailable;
}

// 1. Client-Side Pure WAV Synthesizer (Zero Node.js Buffer dependency)
export function synthesizeClientWavAudio(prompt: string, durationSec = 12, bpm = 120): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * Math.min(durationSec, 20));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Musical Chord Progressions based on prompt/tempo
  const chordNotes = [
    [220, 261.63, 329.63], // Am
    [174.61, 220, 261.63], // F
    [130.81, 164.81, 196], // C
    [196, 246.94, 293.66], // G
  ];

  const beatInterval = 60 / bpm;
  let offset = 44;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.floor((t / (beatInterval * 4)) % chordNotes.length);
    const chord = chordNotes[chordIndex];

    let sample = 0;

    // 1. Ambient Harmonic Chords
    chord.forEach((freq, idx) => {
      const vol = idx === 0 ? 0.32 : 0.18;
      sample += Math.sin(2 * Math.PI * freq * t) * vol;
    });

    // 2. Punchy Kick & 808 Sub-bass on beats
    const beatTime = t % beatInterval;
    if (beatTime < 0.12) {
      const kickEnv = Math.exp(-beatTime * 35);
      const kickFreq = 110 * Math.exp(-beatTime * 45) + 45;
      sample += Math.sin(2 * Math.PI * kickFreq * beatTime) * kickEnv * 0.45;
    }

    // 3. Hi-hat rhythmic accents
    const hatTime = t % (beatInterval / 2);
    if (hatTime < 0.04) {
      const noise = (Math.random() * 2 - 1) * Math.exp(-hatTime * 80) * 0.12;
      sample += noise;
    }

    // 4. Smooth Fade-in and Fade-out
    const env = Math.min(1, t / 0.3) * Math.min(1, (durationSec - t) / 0.5);
    const int16Val = Math.max(-32768, Math.min(32767, Math.floor(sample * env * 24000)));
    view.setInt16(offset, int16Val, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  return `data:audio/wav;base64,${uint8ArrayToBase64(bytes)}`;
}

// 2. Client-Side Speech Audio Synthesizer (WAV)
export function synthesizeClientSpeechAudio(text: string): string {
  const sampleRate = 22050;
  const durationSec = Math.max(3, Math.min(10, text.length * 0.12));
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const f0 = 160 + 8 * Math.sin(2 * Math.PI * 4 * t);
    const voice = Math.sin(2 * Math.PI * f0 * t) * 0.4 +
                  Math.sin(2 * Math.PI * f0 * 2 * t) * 0.25 +
                  Math.sin(2 * Math.PI * f0 * 3 * t) * 0.15;
    
    const speechMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.5 * t);
    const env = Math.min(1, t / 0.2) * Math.min(1, (durationSec - t) / 0.3);
    const int16Val = Math.max(-32768, Math.min(32767, Math.floor(voice * speechMod * env * 22000)));
    view.setInt16(offset, int16Val, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  return `data:audio/wav;base64,${uint8ArrayToBase64(bytes)}`;
}

// 3. Client-Side High-Resolution Procedural Image (ImageFX Style)
export function synthesizeClientImage(prompt: string, aspectRatio = '16:9', seed = 42): string {
  const width = aspectRatio === '9:16' ? 576 : aspectRatio === '16:9' ? 1024 : aspectRatio === '4:3' ? 800 : 768;
  const height = aspectRatio === '9:16' ? 1024 : aspectRatio === '16:9' ? 576 : aspectRatio === '4:3' ? 600 : 768;

  // Dynamic Theme Palette derivation based on prompt
  const isCyber = /cyber|neon|future|tech|synth|matrix/i.test(prompt);
  const isNature = /nature|forest|flower|mountain|tree|green|sun/i.test(prompt);
  const isCosmic = /space|galaxy|cosmic|star|planet|nebula|astro/i.test(prompt);
  const isAnime = /anime|manga|character|portrait|girl|boy|art/i.test(prompt);

  const col1 = isCyber ? '#06b6d4' : isNature ? '#10b981' : isCosmic ? '#8b5cf6' : isAnime ? '#f43f5e' : '#3b82f6';
  const col2 = isCyber ? '#8b5cf6' : isNature ? '#3b82f6' : isCosmic ? '#ec4899' : isAnime ? '#a855f7' : '#8b5cf6';
  const col3 = isCyber ? '#ec4899' : isNature ? '#f59e0b' : isCosmic ? '#06b6d4' : isAnime ? '#38bdf8' : '#ec4899';

  const cleanPrompt = prompt.replace(/[<>&"]/g, '');
  const displayTitle = cleanPrompt.length > 38 ? cleanPrompt.slice(0, 38) + '...' : cleanPrompt;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#020617" />
        <stop offset="35%" stop-color="#0b1329" />
        <stop offset="70%" stop-color="#1e1b4b" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="accentGlow" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${col1}" />
        <stop offset="50%" stop-color="${col2}" />
        <stop offset="100%" stop-color="${col3}" />
      </linearGradient>
      <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="55" />
      </filter>
      <filter id="sharpGlow">
        <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <!-- Deep Canvas Background -->
    <rect width="${width}" height="${height}" fill="url(#bg)" />

    <!-- Volumetric Ambient Light Spheres -->
    <circle cx="${width * 0.28}" cy="${height * 0.38}" r="${Math.min(width, height) * 0.4}" fill="${col1}" opacity="0.32" filter="url(#blurFilter)" />
    <circle cx="${width * 0.72}" cy="${height * 0.58}" r="${Math.min(width, height) * 0.36}" fill="${col2}" opacity="0.35" filter="url(#blurFilter)" />
    <circle cx="${width * 0.5}" cy="${height * 0.48}" r="${Math.min(width, height) * 0.28}" fill="${col3}" opacity="0.28" filter="url(#blurFilter)" />

    <!-- Cinematic Star / Lightburst Geometry -->
    <g transform="translate(${width / 2}, ${height * 0.45})">
      <circle r="${Math.min(width, height) * 0.26}" fill="none" stroke="url(#accentGlow)" stroke-width="2.5" stroke-dasharray="14 10" opacity="0.65"/>
      <circle r="${Math.min(width, height) * 0.16}" fill="none" stroke="${col1}" stroke-width="1.5" opacity="0.4"/>
      <!-- Core Star Burst -->
      <path d="M 0,-75 C 10,-28 28,-10 75,0 C 28,10 10,28 0,75 C -10,28 -28,10 -75,0 C -28,-10 -10,-28 0,-75 Z" fill="url(#accentGlow)" filter="url(#sharpGlow)"/>
    </g>

    <!-- Overlay Horizon Grid Lines -->
    <g opacity="0.2" stroke="${col2}" stroke-width="1">
      <line x1="0" y1="${height * 0.65}" x2="${width}" y2="${height * 0.65}" />
      <line x1="0" y1="${height * 0.72}" x2="${width}" y2="${height * 0.72}" />
      <line x1="0" y1="${height * 0.8}" x2="${width}" y2="${height * 0.8}" />
    </g>

    <!-- Studio Information Plate -->
    <rect x="${width * 0.06}" y="${height * 0.76}" width="${width * 0.88}" height="${height * 0.18}" rx="18" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.18)"/>
    <text x="${width / 2}" y="${height * 0.83}" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="${Math.max(15, width * 0.024)}">
      ${displayTitle || 'Google ImageFX 아트워크'}
    </text>
    <text x="${width / 2}" y="${height * 0.89}" text-anchor="middle" fill="${col1}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="${Math.max(11, width * 0.015)}">
      Google ImageFX · 8K HDR Volumetric Master · Seed: ${seed}
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// 4. Client-Side Video Motion Representation (Veo Style)
export function synthesizeClientVideo(prompt: string, sourceImage?: string, aspectRatio = '16:9', cameraMotion = 'Slow Cinematic Push'): string {
  // If we already have a source image, reuse it as video canvas poster
  if (sourceImage) return sourceImage;
  return synthesizeClientImage(`${prompt} [Veo Camera: ${cameraMotion}]`, aspectRatio);
}

// 5. Client-Side Director Master Planner
export function synthesizeClientDirectorPlan(concept: string, genre = '시네마틱', mood = '서사적') {
  const title = concept.trim().slice(0, 16) || '옴니 프로젝트';
  return {
    titleKo: `${title}: 옴니 플로우`,
    titleEn: `Omni Vision: ${title}`,
    logline: `감각적인 비주얼과 웅장한 사운드가 어우러진 ${genre} 멀티모달 오리지널 프로덕션.`,
    imagePrompt: `Cinematic master shot of ${concept}, ultra-detailed 8K photography, dramatic chiaroscuro lighting, volumetric atmosphere, octane render aesthetics, ${mood}.`,
    imageStyle: 'Cinematic Photorealism / Volumetric Neon Lighting',
    videoPrompt: `Smooth cinematic camera dolly shot moving through the scene of ${concept}, realistic physics, subtle particle dynamics, slow motion 60fps, 4k ultra hd resolution.`,
    videoCameraMotion: 'Slow Cinematic Forward Dolly & Atmospheric Drift',
    musicPrompt: `Epic cinematic score for ${concept}, pulsing electronic synthesizers, soaring orchestral strings, deep sub-bass, 95 BPM, emotional crescendos.`,
    musicGenre: `${genre} Electronic / Orchestral (95 BPM)`,
    lyrics: `[Intro]\nBeyond the horizon, light awakens.\n[Verse]\nEvery pixel breathes, every note resonates.\n[Chorus]\nUnified in one creative pulse.`,
    narrationScript: `빛과 소리가 마주하는 순간, 새로운 비전이 탄생합니다. 스마트폰에서 완성되는 순수 클라이언트 독립 프로덕션입니다.`,
    recommendedVoice: 'Kore',
    colorPalette: ['#38bdf8', '#818cf8', '#ec4899', '#f59e0b'],
    isClientSynthesized: true,
  };
}

// 6. Client-Side Interactive HTML Component Generator
export function synthesizeClientHtml(prompt: string, title?: string): string {
  const displayTitle = title || prompt.slice(0, 24) || '인터랙티브 컴포넌트';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #020617;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
  }
  .card {
    background: linear-gradient(145deg, #0f172a, #1e1b4b);
    border: 1px solid rgba(99, 102, 241, 0.4);
    border-radius: 24px;
    padding: 28px;
    max-width: 480px;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(99, 102, 241, 0.25);
    text-align: center;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.4);
    color: #a5b4fc;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 9999px;
    margin-bottom: 16px;
  }
  h2 {
    font-size: 22px;
    font-weight: 800;
    background: linear-gradient(to right, #38bdf8, #818cf8, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 12px;
  }
  p {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .btn {
    background: linear-gradient(to right, #4f46e5, #7c3aed);
    color: white;
    border: none;
    border-radius: 14px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
    transition: transform 0.15s ease;
  }
  .btn:active { transform: scale(0.96); }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">⚡ 순수 클라이언트 독립 실행</div>
    <h2>${displayTitle}</h2>
    <p>${prompt}</p>
    <button class="btn" onclick="this.innerText='✓ 인터랙션 실행 완료!';">터치하여 반응 테스트</button>
  </div>
</body>
</html>`;
}

// 7. Robust Fallback Bridges for each Studio Endpoint
export async function executeImageGeneration(payload: {
  prompt: string;
  aspectRatio: string;
  seed: number;
  sampleCount: number;
  base64Image?: string;
  editPrompt?: string;
}): Promise<{ imageUrl: string; isSimulated: boolean; networkMeta: NetworkMeta }> {
  const startTime = Date.now();
  const endpoint = '/api/gemini/image';

  // Try server first if reachable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.imageUrl) {
        return {
          imageUrl: data.imageUrl,
          isSimulated: !!data.isSimulated,
          networkMeta: data._networkMeta || makeClientMeta(endpoint, payload, Date.now() - startTime),
        };
      }
    }
  } catch (e) {
    // Server offline or pure client APK mode
  }

  // Pure Client-Native Fallback
  const imageUrl = payload.base64Image || synthesizeClientImage(payload.editPrompt || payload.prompt, payload.aspectRatio, payload.seed);
  const latencyMs = Date.now() - startTime;
  const networkMeta = makeClientMeta(endpoint, payload, latencyMs, 'client-native-procedural-canvas');

  return {
    imageUrl,
    isSimulated: true,
    networkMeta,
  };
}

export async function executeVideoGeneration(payload: {
  prompt: string;
  base64Image?: string;
  aspectRatio: string;
  duration: string;
  resolution: string;
  cameraMotion: string;
  motionIntensity: number;
  fps: number;
}): Promise<{ videoUrl: string; isSimulated: boolean; networkMeta: NetworkMeta }> {
  const startTime = Date.now();
  const endpoint = '/api/gemini/video';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.videoUrl) {
        return {
          videoUrl: data.videoUrl,
          isSimulated: !!data.isSimulated,
          networkMeta: data._networkMeta || makeClientMeta(endpoint, payload, Date.now() - startTime),
        };
      }
    }
  } catch (e) {
    // Pure client mode
  }

  const videoUrl = synthesizeClientVideo(payload.prompt, payload.base64Image, payload.aspectRatio, payload.cameraMotion);
  const latencyMs = Date.now() - startTime;
  const networkMeta = makeClientMeta(endpoint, payload, latencyMs, 'client-native-veo-canvas');

  return {
    videoUrl,
    isSimulated: true,
    networkMeta,
  };
}

export async function executeMusicGeneration(payload: {
  prompt: string;
  base64Image?: string;
  duration: number;
  bpm: number;
  isLoop: boolean;
  stems: Record<string, boolean>;
}): Promise<{ audioUrl: string; lyrics?: string; isSimulated: boolean; networkMeta: NetworkMeta }> {
  const startTime = Date.now();
  const endpoint = '/api/gemini/music';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.audioUrl) {
        return {
          audioUrl: data.audioUrl,
          lyrics: data.lyrics,
          isSimulated: !!data.isSimulated,
          networkMeta: data._networkMeta || makeClientMeta(endpoint, payload, Date.now() - startTime),
        };
      }
    }
  } catch (e) {
    // Pure client mode
  }

  const audioUrl = synthesizeClientWavAudio(payload.prompt, payload.duration, payload.bpm);
  const lyrics = `[Verse 1]\n순수 클라이언트 단독 신디사이저 구동\n[Chorus]\n서버 유지비 0원, 폰 내부 100% 독립 실행`;
  const latencyMs = Date.now() - startTime;
  const networkMeta = makeClientMeta(endpoint, payload, latencyMs, 'client-native-webaudio-wav');

  return {
    audioUrl,
    lyrics,
    isSimulated: true,
    networkMeta,
  };
}

export async function executeSpeechGeneration(payload: {
  text: string;
  voice: string;
}): Promise<{ audioUrl: string; isSimulated: boolean }> {
  // If browser Web Speech API is present, trigger natural voice in background
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(payload.text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore audio device lock
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/api/gemini/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.audioUrl) return { audioUrl: data.audioUrl, isSimulated: !!data.isSimulated };
    }
  } catch {
    // Fall back to client synthesized speech WAV
  }

  const audioUrl = synthesizeClientSpeechAudio(payload.text);
  return { audioUrl, isSimulated: true };
}

export async function executeDirectorPlan(payload: {
  concept: string;
  genre: string;
  mood: string;
}): Promise<{ plan: any; networkMeta: NetworkMeta }> {
  const startTime = Date.now();
  const endpoint = '/api/gemini/director';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const plan = await res.json();
      return {
        plan,
        networkMeta: plan._networkMeta || makeClientMeta(endpoint, payload, Date.now() - startTime),
      };
    }
  } catch (e) {
    // Pure client mode
  }

  const plan = synthesizeClientDirectorPlan(payload.concept, payload.genre, payload.mood);
  const latencyMs = Date.now() - startTime;
  const networkMeta = makeClientMeta(endpoint, payload, latencyMs, 'client-native-omni-planner');

  return { plan, networkMeta };
}

export async function executeHtmlGeneration(payload: {
  prompt: string;
  customHtml?: string;
  title?: string;
}): Promise<{ htmlCode: string; networkMeta: NetworkMeta }> {
  const startTime = Date.now();
  const endpoint = '/api/gemini/html';

  if (payload.customHtml) {
    return {
      htmlCode: payload.customHtml,
      networkMeta: makeClientMeta(endpoint, payload, 10, 'direct-user-input'),
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.htmlCode) {
        return {
          htmlCode: data.htmlCode,
          networkMeta: data._networkMeta || makeClientMeta(endpoint, payload, Date.now() - startTime),
        };
      }
    }
  } catch (e) {
    // Pure client mode
  }

  const htmlCode = synthesizeClientHtml(payload.prompt, payload.title);
  const latencyMs = Date.now() - startTime;
  const networkMeta = makeClientMeta(endpoint, payload, latencyMs, 'client-native-html-synthesizer');

  return { htmlCode, networkMeta };
}

// Internal Utilities
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

function makeClientMeta(
  endpoint: string,
  payload: any,
  latencyMs: number,
  model = 'client-native-offline-engine'
): NetworkMeta {
  const payloadStr = JSON.stringify(payload);
  return {
    endpoint,
    method: 'POST',
    requestPayload: payload,
    curlCommand: `curl -X POST "${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -d '${payloadStr}'`,
    responseStatus: 200,
    latencyMs,
    isRealApi: false,
    modelUsed: model,
    htmlCode: `<div class="pure-client-render" style="padding: 12px; background: #0f172a; border-radius: 12px; color: #38bdf8; font-family: sans-serif;">⚡ 순수 클라이언트 단독 실행 모드 (${model})</div>`,
    timestamp: new Date().toISOString(),
  };
}
