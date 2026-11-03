import { MediaItem } from './types';
import {
  STATIC_SPACE_STATION_B64,
  STATIC_ORBIT_SYNTHWAVE_B64,
  STATIC_NEON_SEOUL_B64,
} from './encodedThumbnails';

// 1. 우주 정거장 궤도 유영 (Veo 3.1) - Guaranteed Static Base64 decodable thumbnail
export const SPACE_STATION_THUMBNAIL_BASE64 = STATIC_SPACE_STATION_B64;

// 2. 프로젝트: 궤도 스테이션 x 신스웨이브 (Flow + Music) - Guaranteed Static Base64 decodable thumbnail
export const ORBIT_SYNTHWAVE_BUNDLE_THUMBNAIL_BASE64 = STATIC_ORBIT_SYNTHWAVE_B64;

// 3. 네오 서울 사이버 펑크 로드 Static Base64 Thumbnail
export const NEON_SEOUL_IMAGE_THUMBNAIL_BASE64 = STATIC_NEON_SEOUL_B64;

// Sample pre-seeded high quality assets to demonstrate instant cross-modal interconnectivity
export const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'demo-img-1',
    type: 'image',
    title: '네오 서울 사이버 펑크 로드',
    prompt: 'A futuristic cyber road in Neo-Seoul with floating holographic billboards, rainy reflection on asphalt, 8K hyper-detailed cinematic photography.',
    url: NEON_SEOUL_IMAGE_THUMBNAIL_BASE64,
    thumbnail: NEON_SEOUL_IMAGE_THUMBNAIL_BASE64,
    createdAt: Date.now() - 3600000 * 2,
    tags: ['Cyberpunk', 'Concept Art', 'Neo-Seoul', 'Neon'],
    metadata: {
      aspectRatio: '1:1',
      model: 'gemini-3.1-flash-lite-image',
      colorPalette: ['#06b6d4', '#ec4899', '#8b5cf6', '#0f172a']
    }
  },
  {
    id: 'demo-vid-1',
    type: 'video',
    title: '우주 정거장 궤도 유영 (Veo)',
    prompt: 'Breathtaking 8K cinematic footage of an astronaut performing a spacewalk outside an orbital space station high above Earth atmosphere, sun flares, smooth camera dolly motion.',
    url: '/assets/neon_city_veo3.mp4',
    thumbnail: SPACE_STATION_THUMBNAIL_BASE64,
    createdAt: Date.now() - 3600000,
    tags: ['Veo 3.1', '우주 정거장', '궤도 유영', 'Google Flow'],
    metadata: {
      aspectRatio: '16:9',
      duration: '10s',
      resolution: '720p',
      cameraMotion: 'Slow orbital drift & floating astronaut',
      model: 'flow-veo-3.1'
    }
  },
  {
    id: 'demo-mus-1',
    type: 'music',
    title: '신스웨이브 오디세이 (Lyria OST)',
    prompt: 'Retro 80s synthwave track with soaring analog lead synthesizer, punchy 808 drums, and driving arpeggiated bassline, 110 BPM.',
    url: generateProceduralWavAudio(110),
    thumbnail: '',
    createdAt: Date.now() - 1800000,
    tags: ['Lyria', 'Synthwave', 'Retro', 'Electronic'],
    metadata: {
      duration: '30s',
      genre: 'Synthwave / Retrowave (110 BPM)',
      lyrics: '[Verse 1]\nNeon lines across the dashboard night\nWe are accelerating into tomorrow\n[Chorus]\nDigital echoes, infinite flight\nNothing left behind but neon glow',
      model: 'flow-music-lyria-3.5'
    }
  },
  {
    id: 'demo-proj-1',
    type: 'project',
    title: '프로젝트: 궤도 스테이션 x 신스웨이브 (Flow + Music)',
    prompt: 'Flow Veo 3.1 우주 정거장 궤도 유영 영상과 Flow Music 신스웨이브 BGM이 동기화 결합된 프로젝트',
    url: '/assets/neon_city_veo3.mp4',
    thumbnail: ORBIT_SYNTHWAVE_BUNDLE_THUMBNAIL_BASE64,
    createdAt: Date.now() - 600000,
    tags: ['Project', 'Flow 영상', 'Flow Music', '궤도 스테이션'],
    metadata: {
      projectId: 'proj-demo-1',
      projectTitle: '궤도 스테이션 x 신스웨이브',
      bundleVideoUrl: '/assets/neon_city_veo3.mp4',
      bundleMusicUrl: generateProceduralWavAudio(110),
      duration: '30s',
      model: 'Flow Veo 3.1 + Flow Music Lyria 3.5'
    }
  }
];

// Helper to provide a playable demo audio sound
function generateProceduralWavAudio(bpm = 100): string {
  // Return valid minimal WAV base64
  const sampleRate = 11025;
  const numSamples = sampleRate * 8; // 8 seconds demo
  const buffer = new Uint8Array(44 + numSamples);

  // RIFF header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) buffer[offset + i] = str.charCodeAt(i);
  };
  const write32 = (offset: number, val: number) => {
    buffer[offset] = val & 0xff;
    buffer[offset + 1] = (val >> 8) & 0xff;
    buffer[offset + 2] = (val >> 16) & 0xff;
    buffer[offset + 3] = (val >> 24) & 0xff;
  };
  const write16 = (offset: number, val: number) => {
    buffer[offset] = val & 0xff;
    buffer[offset + 1] = (val >> 8) & 0xff;
  };

  writeString(0, 'RIFF');
  write32(4, 36 + numSamples);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  write32(16, 16);
  write16(20, 1); // PCM
  write16(22, 1); // 1 channel
  write32(24, sampleRate);
  write32(28, sampleRate);
  write16(32, 1); // 1 byte per sample (8-bit)
  write16(34, 8); // 8 bits
  writeString(36, 'data');
  write32(40, numSamples);

  // Generate melodic synth arpeggio (C - E - G - B - C)
  const freqs = [261.63, 329.63, 392.00, 493.88, 523.25];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.floor(t * 4) % freqs.length;
    const freq = freqs[noteIdx];
    const s = Math.sin(2 * Math.PI * freq * t) * 0.4 +
              Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.3 +
              (Math.sin(2 * Math.PI * 2 * t) > 0.8 ? 0.3 * Math.sin(2 * Math.PI * 60 * t) : 0);
    const env = Math.min(1, t / 0.1) * Math.min(1, (8 - t) / 0.5);
    buffer[44 + i] = Math.floor(128 + s * env * 110);
  }

  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}
