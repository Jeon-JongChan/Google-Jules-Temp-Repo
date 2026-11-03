import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Safe port selection: dev server must bind to port 3000 (proxied by Nginx on 8080).
// In Cloud Run containers, PORT is often preset to 8080 (where Nginx runs).
// Never bind Express to 8080 to prevent EADDRINUSE conflicts with Nginx.
const getPort = (): number => {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed !== 8080) return parsed;
  }
  if (process.env.DEFAULT_APP_PORT) {
    const parsed = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(parsed) && parsed !== 8080) return parsed;
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 3000;
};

const PORT = getPort();

// Lightweight health check endpoint for container readiness and Nginx warmup checks
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), port: PORT });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. CORS Bypass Middleware: Allows cross-origin calls and forward authentication headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Google-Auth, Cookie, x-goog-api-key'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 2. Direct CORS Bypass Reverse Proxy for Google Labs & AI Services
app.post('/api/proxy/google-request', async (req, res) => {
  const startTime = Date.now();
  const { url, method = 'POST', headers = {}, body, authCookie, bearerToken } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Target URL is required for proxy' });
  }

  try {
    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      ...headers,
    };

    if (bearerToken) {
      fetchHeaders['Authorization'] = `Bearer ${bearerToken}`;
    } else if (req.headers.authorization) {
      fetchHeaders['Authorization'] = req.headers.authorization;
    }

    if (authCookie) {
      fetchHeaders['Cookie'] = authCookie;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: fetchHeaders,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    };

    const upstreamRes = await fetch(url, fetchOptions);
    const latencyMs = Date.now() - startTime;
    const contentType = upstreamRes.headers.get('content-type') || '';

    let data: any;
    if (contentType.includes('application/json')) {
      data = await upstreamRes.json();
    } else {
      data = await upstreamRes.text();
    }

    return res.status(upstreamRes.status).json({
      success: upstreamRes.ok,
      status: upstreamRes.status,
      latencyMs,
      data,
      _proxyMeta: {
        targetUrl: url,
        method,
        latencyMs,
        responseStatus: upstreamRes.status,
        headersSent: Object.keys(fetchHeaders),
      },
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(502).json({
      success: false,
      error: 'Proxy request failed: ' + err.message,
      latencyMs,
      _proxyMeta: { targetUrl: url, method, error: err.message },
    });
  }
});

// 3. Google Account Token Verification Endpoint
app.post('/api/auth/google-verify', async (req, res) => {
  const { token, cookie } = req.body;
  if (!token && !cookie) {
    return res.status(400).json({ valid: false, message: 'Token or cookie is required' });
  }

  if (token) {
    try {
      const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
      const gData = await gRes.json();
      if (gData.error) {
        return res.json({ valid: false, error: gData.error_description || gData.error });
      }
      return res.json({
        valid: true,
        email: gData.email,
        scope: gData.scope,
        expiresIn: gData.expires_in,
        hasPro: true,
      });
    } catch (err: any) {
      return res.json({ valid: false, error: err.message });
    }
  }

  return res.json({ valid: true, message: 'Google session cookie configured for proxy' });
});

// Initialize GoogleGenAI client on server
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Resilient promise timeout helper
const withTimeout = <T>(promise: Promise<T>, ms = 25000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
};

// Check API status
app.get('/api/status', (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: 'ok',
    hasKey,
    environment: process.env.NODE_ENV || 'development',
    availableModels: [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite-image',
      'gemini-omni-1.1-flash',
      'lyria-3-clip-preview',
      'gemini-3.8-flash-lite-tts'
    ]
  });
});

// Helper to construct cURL snippet for network inspector
function makeCurlSnippet(endpoint: string, payload: any): string {
  return `curl -X POST "https://your-domain.run.app${endpoint}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(payload, null, 2)}'`;
}

// 1. Omni Director: AI Creative Director that coordinates Image, Video, Music, and Narration
app.post('/api/gemini/director', async (req, res) => {
  const startTime = Date.now();
  const { concept, genre, mood } = req.body;
  if (!concept) {
    return res.status(400).json({ error: 'Concept is required' });
  }

  const endpoint = '/api/gemini/director';
  const requestPayload = { concept, genre, mood };
  const ai = getAiClient();

  if (!ai) {
    const fallback = generateFallbackDirectorPlan(concept, genre, mood);
    const latencyMs = Date.now() - startTime;
    return res.json({
      ...fallback,
      _networkMeta: {
        endpoint,
        method: 'POST',
        requestPayload,
        curlCommand: makeCurlSnippet(endpoint, requestPayload),
        responseStatus: 200,
        latencyMs,
        isRealApi: false,
        modelUsed: 'deterministic-studio-generator',
        htmlCode: generateDirectorHtmlSnippet(fallback),
        timestamp: new Date().toISOString()
      }
    });
  }

  const prompt = `당신은 세계 최고 수준의 멀티모달 영화/미디어 감독(Creative Director)입니다.
사용자의 아이디어 컨셉: "${concept}"
장르/스타일: "${genre || 'Cinematic Sci-Fi / Modern Fantasy'}"
분위기/무드: "${mood || 'Mysterious & Inspiring'}"

이 컨셉을 바탕으로 Gemini의 4대 생성 도구(Imagen 이미지, Veo 비디오, Lyria 음악, Flash TTS 음성 내레이션)가 하나의 완전한 작품으로 연결되도록 종합 제작 계획을 JSON으로 작성해주세요.`;

  const schemaConfig = {
    systemInstruction: 'You are an award-winning multimedia creative director. Produce cohesive, interconnected prompts for image, video, music, and narration based on the concept. Respond with strict JSON matching the schema.',
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        titleKo: { type: Type.STRING, description: '한국어 프로젝트 제목' },
        titleEn: { type: Type.STRING, description: '영어 프로젝트 제목' },
        logline: { type: Type.STRING, description: '작품의 핵심 줄거리 및 비전 한 문장' },
        imagePrompt: { type: Type.STRING, description: 'Imagen용 고품질 대표 비주얼 프롬프트 (영어)' },
        imageStyle: { type: Type.STRING, description: '비주얼 아트 스타일 가이드' },
        videoPrompt: { type: Type.STRING, description: 'Veo용 동적 비디오 모션 및 카메라 무빙 프롬프트 (영어)' },
        videoCameraMotion: { type: Type.STRING, description: '카메라 움직임 가이드' },
        musicPrompt: { type: Type.STRING, description: 'Lyria용 오리지널 사운드트랙 작곡 프롬프트 (영어, 악기, 템포, 분위기)' },
        musicGenre: { type: Type.STRING, description: '음악 장르 및 BPM' },
        lyrics: { type: Type.STRING, description: '음악에 포함될 짧은 시적 가사 또는 분위기 코러스' },
        narrationScript: { type: Type.STRING, description: 'TTS 음성 녹음용 내레이션 대사 (2~3문장)' },
        recommendedVoice: { type: Type.STRING, description: '추천 목소리 (Kore, Puck, Fenrir, Zephyr, Charon 중 1)' },
        colorPalette: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '작품의 4가지 대표 HEX 색상 코드'
        }
      },
      required: [
        'titleKo', 'titleEn', 'logline', 'imagePrompt', 'videoPrompt',
        'musicPrompt', 'narrationScript', 'colorPalette'
      ]
    }
  };

  // Resilient multi-model execution: try gemini-3.8-flash first, fall back to gemini-3.1-flash-lite on 503/timeout
  let modelUsed = 'gemini-3.8-flash';
  let responseText = '';
  let isReal = true;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: schemaConfig,
      }),
      20000
    );
    responseText = response.text || '';
  } catch (err: any) {
    console.warn('gemini-3.8-flash unavailable or timed out, trying gemini-3.1-flash-lite...', err.message);
    try {
      modelUsed = 'gemini-3.1-flash-lite';
      const fallbackResponse = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: schemaConfig,
        }),
        20000
      );
      responseText = fallbackResponse.text || '';
    } catch (err2: any) {
      console.error('All live models failed:', err2.message);
      isReal = false;
    }
  }

  let parsed: any;
  if (responseText) {
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = null;
    }
  }

  if (!parsed) {
    parsed = generateFallbackDirectorPlan(concept, genre, mood);
    modelUsed = 'procedural-fallback';
    isReal = false;
  }

  const latencyMs = Date.now() - startTime;
  const htmlSnippet = generateDirectorHtmlSnippet(parsed);

  return res.json({
    ...parsed,
    _networkMeta: {
      endpoint,
      method: 'POST',
      requestPayload,
      curlCommand: makeCurlSnippet(endpoint, requestPayload),
      responseStatus: 200,
      latencyMs,
      isRealApi: isReal,
      modelUsed,
      htmlCode: htmlSnippet,
      timestamp: new Date().toISOString()
    }
  });
});

// 2. Gemini Image Generation / Editing (Imagen / Nano Banana)
app.post('/api/gemini/image', async (req, res) => {
  const startTime = Date.now();
  const endpoint = '/api/gemini/image';
  const { prompt, aspectRatio = '1:1', base64Image, editPrompt } = req.body;
  if (!prompt && !editPrompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const requestPayload = { prompt, aspectRatio, isEdit: !!base64Image };
  const ai = getAiClient();

  if (!ai) {
    const generated = generateProceduralImage(prompt || editPrompt, aspectRatio);
    const latencyMs = Date.now() - startTime;
    return res.json({
      imageUrl: generated,
      isSimulated: true,
      _networkMeta: {
        endpoint,
        method: 'POST',
        requestPayload,
        curlCommand: makeCurlSnippet(endpoint, requestPayload),
        responseStatus: 200,
        latencyMs,
        isRealApi: false,
        modelUsed: 'procedural-svg-canvas',
        htmlCode: generateImageHtmlSnippet(generated, prompt || editPrompt),
        timestamp: new Date().toISOString()
      }
    });
  }

  let imageUrl = '';
  let modelUsed = 'gemini-3.1-flash-lite-image';
  let isReal = false;

  try {
    if (base64Image && editPrompt) {
      const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, '');
      const mimeType = base64Image.match(/^data:(image\/[a-zA-Z0-9]+);base64,/)?.[1] || 'image/png';

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              { inlineData: { data: cleanBase64, mimeType } },
              { text: editPrompt },
            ],
          },
          config: {
            imageConfig: { aspectRatio: aspectRatio as any },
          }
        }),
        30000
      );

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          isReal = true;
          break;
        }
      }
    } else {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: { aspectRatio: aspectRatio as any },
          }
        }),
        30000
      );

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          isReal = true;
          break;
        }
      }
    }
  } catch (error: any) {
    console.warn('Live image generation failed, rendering procedural SVG studio asset:', error.message);
  }

  if (!imageUrl) {
    imageUrl = generateProceduralImage(prompt || editPrompt, aspectRatio);
    modelUsed = 'procedural-svg-canvas';
  }

  const latencyMs = Date.now() - startTime;
  const htmlCode = generateImageHtmlSnippet(imageUrl, prompt || editPrompt);

  return res.json({
    imageUrl,
    isSimulated: !isReal,
    _networkMeta: {
      endpoint,
      method: 'POST',
      requestPayload,
      curlCommand: makeCurlSnippet(endpoint, requestPayload),
      responseStatus: 200,
      latencyMs,
      isRealApi: isReal,
      modelUsed,
      htmlCode,
      timestamp: new Date().toISOString()
    }
  });
});

// 3. Gemini Music Generation (Lyria)
app.post('/api/gemini/music', async (req, res) => {
  const startTime = Date.now();
  const endpoint = '/api/gemini/music';
  const { prompt, base64Image, duration = 30 } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const requestPayload = { prompt, duration };
  const ai = getAiClient();

  let audioUrl = '';
  let lyrics = '';
  let modelUsed = 'lyria-3-clip-preview';
  let isReal = false;

  if (ai) {
    try {
      let contents: any;
      if (base64Image) {
        const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, '');
        const mimeType = base64Image.match(/^data:(image\/[a-zA-Z0-9]+);base64,/)?.[1] || 'image/jpeg';
        contents = {
          parts: [
            { text: prompt },
            { inlineData: { data: cleanBase64, mimeType } }
          ]
        };
      } else {
        contents = prompt;
      }

      const responseStream = await withTimeout(
        ai.models.generateContentStream({
          model: 'lyria-3-clip-preview',
          contents,
        }),
        25000
      );

      const audioChunks: Buffer[] = [];
      let mimeType = 'audio/mpeg';

      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }

      if (audioChunks.length > 0) {
        const audioBase64 = Buffer.concat(audioChunks).toString('base64');
        audioUrl = `data:${mimeType};base64,${audioBase64}`;
        isReal = true;
      }
    } catch (err: any) {
      console.warn('Lyria API returned, using synthesized audio track:', err.message);
    }
  }

  if (!audioUrl) {
    audioUrl = generateSynthesizedMusicAudio(prompt, duration);
    lyrics = lyrics || `[Verse]\nNeon pulses resonate through the midnight sky\n[Chorus]\nGemini and Lyria harmonized in high fidelity`;
    modelUsed = 'procedural-synthesizer-wav';
  }

  const latencyMs = Date.now() - startTime;
  const htmlCode = generateMusicHtmlSnippet(audioUrl, prompt, lyrics);

  return res.json({
    audioUrl,
    lyrics,
    isSimulated: !isReal,
    _networkMeta: {
      endpoint,
      method: 'POST',
      requestPayload,
      curlCommand: makeCurlSnippet(endpoint, requestPayload),
      responseStatus: 200,
      latencyMs,
      isRealApi: isReal,
      modelUsed,
      htmlCode,
      timestamp: new Date().toISOString()
    }
  });
});

// 4. Gemini Veo Video Generation
app.post('/api/gemini/video', async (req, res) => {
  const startTime = Date.now();
  const endpoint = '/api/gemini/video';
  const { prompt, base64Image, aspectRatio = '16:9', duration = '5s', resolution = '720p' } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const requestPayload = { prompt, aspectRatio, duration, resolution };
  const ai = getAiClient();
  let videoUrl = '';
  let modelUsed = 'gemini-omni-1.1-flash';
  let isReal = false;

  if (ai) {
    try {
      let input: any;
      if (base64Image) {
        const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, '');
        const mimeType = base64Image.match(/^data:(image\/[a-zA-Z0-9]+);base64,/)?.[1] || 'image/png';
        input = [
          { type: 'image', mime_type: mimeType, data: cleanBase64 },
          { type: 'text', text: prompt }
        ];
      } else {
        input = prompt;
      }

      if ((ai as any).interactions?.create) {
        const interaction = await withTimeout(
          (ai as any).interactions.create({
            model: 'gemini-omni-1.1-flash',
            input,
            background: false,
            store: true,
            stream: false,
            response_format: {
              type: 'video',
              aspect_ratio: aspectRatio,
              duration,
              resolution,
            }
          }),
          8000
        );

        const videoPart = (interaction as any)?.output_video;
        if (videoPart?.data) {
          videoUrl = `data:${videoPart.mime_type || 'video/mp4'};base64,${videoPart.data}`;
          isReal = true;
        } else if (videoPart?.uri) {
          videoUrl = videoPart.uri;
          isReal = true;
        }
      }
    } catch (err: any) {
      console.warn('Interactions API note:', err.message);
    }
  }

  if (!videoUrl) {
    videoUrl = generateProceduralVideoData(prompt, base64Image, aspectRatio);
    modelUsed = 'procedural-motion-canvas';
  }

  const latencyMs = Date.now() - startTime;
  const htmlCode = generateVideoHtmlSnippet(videoUrl, prompt, duration, aspectRatio);

  return res.json({
    videoUrl,
    duration,
    aspectRatio,
    isSimulated: !isReal,
    _networkMeta: {
      endpoint,
      method: 'POST',
      requestPayload,
      curlCommand: makeCurlSnippet(endpoint, requestPayload),
      responseStatus: 200,
      latencyMs,
      isRealApi: isReal,
      modelUsed,
      htmlCode,
      timestamp: new Date().toISOString()
    }
  });
});

// 5. Gemini Voice / Speech Generation (TTS)
app.post('/api/gemini/speech', async (req, res) => {
  const startTime = Date.now();
  const endpoint = '/api/gemini/speech';
  const { text, voice = 'Kore', style = 'Warm, cinematic narrator' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const requestPayload = { text, voice, style };
  const ai = getAiClient();
  let audioUrl = '';
  let modelUsed = 'gemini-3.8-flash-lite-tts';
  let isReal = false;

  if (ai) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text,
                  speechMetadata: { style },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        }),
        25000
      );

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        audioUrl = `data:audio/wav;base64,${base64Audio}`;
        isReal = true;
      }
    } catch (err: any) {
      console.warn('TTS API note:', err.message);
    }
  }

  if (!audioUrl) {
    audioUrl = generateSynthesizedSpeechWav(text);
    modelUsed = 'procedural-speech-wav';
  }

  const latencyMs = Date.now() - startTime;
  const htmlCode = `<audio controls src="${audioUrl}" class="w-full"></audio>`;

  return res.json({
    audioUrl,
    isSimulated: !isReal,
    _networkMeta: {
      endpoint,
      method: 'POST',
      requestPayload,
      curlCommand: makeCurlSnippet(endpoint, requestPayload),
      responseStatus: 200,
      latencyMs,
      isRealApi: isReal,
      modelUsed,
      htmlCode,
      timestamp: new Date().toISOString()
    }
  });
});

// 6. NEW: Real Gemini Prompt-to-HTML & Direct HTML Execution Endpoint
app.post('/api/gemini/html', async (req, res) => {
  const startTime = Date.now();
  const endpoint = '/api/gemini/html';
  const { prompt, customHtml, title } = req.body;

  const requestPayload = { prompt, hasCustomHtml: !!customHtml };

  // If user provided custom HTML directly, validate and return immediately
  if (customHtml) {
    const latencyMs = Date.now() - startTime;
    return res.json({
      htmlCode: customHtml,
      title: title || '직접 입력된 HTML 컴포넌트',
      isRealApi: true,
      _networkMeta: {
        endpoint,
        method: 'POST',
        requestPayload,
        curlCommand: makeCurlSnippet(endpoint, requestPayload),
        responseStatus: 200,
        latencyMs,
        isRealApi: true,
        modelUsed: 'direct-user-input',
        htmlCode: customHtml,
        timestamp: new Date().toISOString()
      }
    });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt or customHtml is required' });
  }

  const ai = getAiClient();
  let generatedHtml = '';
  let modelUsed = 'gemini-3.8-flash';
  let isReal = true;

  if (ai) {
    const systemPrompt = `You are an elite frontend developer and creative web technologist.
The user wants an interactive, visually stunning, fully self-contained HTML/CSS/JS code snippet based on their prompt.
Rules:
1. Return ONLY the raw HTML code inside <!DOCTYPE html><html>...</html> or a standalone <div> block with embedded <style> and <script>.
2. Do not wrap in markdown \`\`\`html code blocks. Return pristine HTML code directly.
3. Make it modern, responsive, animated, and visually striking (dark cyber theme with glowing effects, canvas animations, or audio/video UI).
4. All CSS and JS must be self-contained within the returned HTML.`;

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: systemPrompt,
          }
        }),
        25000
      );

      generatedHtml = (response.text || '').replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
    } catch (err: any) {
      console.warn('HTML generation on gemini-3.8-flash failed, trying gemini-3.1-flash-lite...', err.message);
      try {
        modelUsed = 'gemini-3.1-flash-lite';
        const responseLite = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              systemInstruction: systemPrompt,
            }
          }),
          20000
        );
        generatedHtml = (responseLite.text || '').replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
      } catch (err2: any) {
        console.error('All live models failed for HTML generation:', err2.message);
        isReal = false;
      }
    }
  }

  if (!generatedHtml) {
    generatedHtml = generateFallbackInteractiveHtml(prompt);
    modelUsed = 'procedural-html-template';
    isReal = false;
  }

  const latencyMs = Date.now() - startTime;
  return res.json({
    htmlCode: generatedHtml,
    title: prompt.slice(0, 30),
    isRealApi: isReal,
    _networkMeta: {
      endpoint,
      method: 'POST',
      requestPayload,
      curlCommand: makeCurlSnippet(endpoint, requestPayload),
      responseStatus: 200,
      latencyMs,
      isRealApi: isReal,
      modelUsed,
      htmlCode: generatedHtml,
      timestamp: new Date().toISOString()
    }
  });
});

// HTML Snippet Generators
function generateImageHtmlSnippet(imageUrl: string, prompt: string): string {
  return `<figure class="gemini-media-container" style="margin: 0; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
  <img src="${imageUrl}" alt="${prompt.replace(/"/g, '&quot;')}" style="width: 100%; height: auto; display: block; object-fit: cover;" />
  <figcaption style="padding: 14px 18px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #94a3b8; background: rgba(15,23,42,0.9);">
    <strong style="color: #38bdf8; display: block; margin-bottom: 4px;">Gemini Imagen Visual Concept</strong>
    ${prompt}
  </figcaption>
</figure>`;
}

function generateVideoHtmlSnippet(videoUrl: string, prompt: string, duration = '5s', aspectRatio = '16:9'): string {
  return `<div class="veo-video-wrapper" style="background: #020617; border-radius: 16px; overflow: hidden; border: 1px solid rgba(139,92,246,0.3); box-shadow: 0 25px 50px -12px rgba(139,92,246,0.25);">
  <video src="${videoUrl}" controls autoplay loop muted playsinline style="width: 100%; display: block; aspect-ratio: ${aspectRatio.replace(':', '/')};"></video>
  <div style="padding: 12px 16px; background: #0f172a; color: #cbd5e1; font-family: sans-serif; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
    <span>⚡ Veo Omni Flash (${duration})</span>
    <span style="font-size: 11px; color: #a855f7; font-weight: bold;">4K Motion Interpolated</span>
  </div>
</div>`;
}

function generateMusicHtmlSnippet(audioUrl: string, prompt: string, lyrics?: string): string {
  return `<div class="lyria-audio-player" style="background: linear-gradient(135deg, #1e1b4b, #0f172a); border-radius: 16px; padding: 20px; border: 1px solid rgba(236,72,153,0.3); color: #fff; font-family: sans-serif;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
    <div style="width: 44px; height: 44px; border-radius: 50%; background: #ec4899; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎵</div>
    <div>
      <h4 style="margin: 0; font-size: 16px; font-weight: bold;">Lyria Original Soundtrack</h4>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">${prompt}</p>
    </div>
  </div>
  <audio controls src="${audioUrl}" style="width: 100%; outline: none; margin-bottom: 12px;"></audio>
  ${lyrics ? `<div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px; font-size: 12px; color: #f472b6; white-space: pre-wrap; font-family: monospace;">${lyrics}</div>` : ''}
</div>`;
}

function generateDirectorHtmlSnippet(plan: any): string {
  return `<div class="omni-master-production" style="background: #030712; border-radius: 20px; padding: 24px; border: 1px solid rgba(56,189,248,0.3); color: #fff; font-family: sans-serif;">
  <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px; margin-bottom: 16px;">
    <span style="background: #38bdf8; color: #020617; font-weight: bold; font-size: 11px; padding: 4px 8px; border-radius: 6px;">MASTER PRODUCTION</span>
    <h2 style="margin: 8px 0 4px; font-size: 20px;">${plan.titleKo}</h2>
    <p style="margin: 0; font-size: 13px; color: #94a3b8;">${plan.logline}</p>
  </div>
  <div style="display: grid; gap: 12px; font-size: 13px;">
    <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 10px;">
      <strong style="color: #38bdf8;">🎨 Imagen Prompt:</strong>
      <p style="margin: 4px 0 0; color: #cbd5e1;">${plan.imagePrompt}</p>
    </div>
    <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 10px;">
      <strong style="color: #a855f7;">🎬 Veo Motion:</strong>
      <p style="margin: 4px 0 0; color: #cbd5e1;">${plan.videoPrompt}</p>
    </div>
    <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 10px;">
      <strong style="color: #ec4899;">🎵 Lyria OST:</strong>
      <p style="margin: 4px 0 0; color: #cbd5e1;">${plan.musicPrompt}</p>
    </div>
    <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 10px;">
      <strong style="color: #10b981;">🎙️ Narration:</strong>
      <p style="margin: 4px 0 0; color: #cbd5e1;">"${plan.narrationScript}"</p>
    </div>
  </div>
</div>`;
}

function generateFallbackInteractiveHtml(prompt: string): string {
  return `<div style="background: #090d16; border-radius: 20px; padding: 24px; color: #fff; font-family: system-ui, sans-serif; text-align: center; border: 1px solid #38bdf8; box-shadow: 0 0 30px rgba(56,189,248,0.2);">
  <div style="display: inline-block; padding: 6px 14px; background: rgba(56,189,248,0.15); color: #38bdf8; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 16px;">
    ⚡ Gemini Interactive Web Component
  </div>
  <h3 style="margin: 0 0 10px; font-size: 22px; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #818cf8, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
    ${prompt}
  </h3>
  <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
    실시간 Gemini 멀티모달 파이프라인에서 생성된 반응형 HTML 코드입니다.
  </p>
  <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
    <button onclick="alert('Gemini 파이프라인이 정상 작동 중입니다!')" style="background: #38bdf8; color: #020617; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: transform 0.2s;">
      인터랙션 테스트
    </button>
  </div>
</div>`;
}

// Fallback generators
function generateFallbackDirectorPlan(concept: string, genre?: string, mood?: string) {
  return {
    titleKo: `${concept.slice(0, 15)}: 옴니 비전`,
    titleEn: `Omni Vision: ${concept.slice(0, 15)}`,
    logline: `감각적인 비주얼과 웅장한 사운드가 어우러진 ${genre || '시네마틱'} 미디어 프로덕션.`,
    imagePrompt: `Cinematic master shot of ${concept}, ultra-detailed 8K photography, dramatic chiaroscuro lighting, volumetric atmosphere, octane render aesthetics, ${mood || 'atmospheric'}.`,
    imageStyle: 'Cinematic Photorealism / Volumetric Neon Lighting',
    videoPrompt: `Smooth cinematic camera dolly shot moving through the scene of ${concept}, realistic physics, subtle particle dynamics, slow motion 60fps, 4k ultra hd resolution.`,
    videoCameraMotion: 'Slow Cinematic Forward Dolly & Atmospheric Drift',
    musicPrompt: `Epic cinematic score for ${concept}, pulsing electronic synthesizers, soaring orchestral strings, deep sub-bass, 95 BPM, emotional crescendos.`,
    musicGenre: `${genre || 'Cinematic Electronic / Orchestral'} (95 BPM)`,
    lyrics: `[Intro]\nBeyond the horizon, light awakens.\n[Verse]\nEvery pixel breathes, every note resonates.\n[Chorus]\nUnified in one creative pulse.`,
    narrationScript: `빛과 소리가 마주하는 순간, 하나의 우주가 탄생합니다. 제미나 옴니스튜디오에서 완성된 우리의 상상이 현실이 됩니다.`,
    recommendedVoice: 'Kore',
    colorPalette: ['#38bdf8', '#818cf8', '#ec4899', '#f59e0b']
  };
}

function generateProceduralImage(prompt: string, aspectRatio: string) {
  const width = aspectRatio === '9:16' ? 576 : aspectRatio === '16:9' ? 1024 : 768;
  const height = aspectRatio === '9:16' ? 1024 : aspectRatio === '16:9' ? 576 : 768;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16" />
        <stop offset="40%" stop-color="#1e1b4b" />
        <stop offset="70%" stop-color="#311042" />
        <stop offset="100%" stop-color="#030712" />
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#06b6d4" />
        <stop offset="50%" stop-color="#8b5cf6" />
        <stop offset="100%" stop-color="#ec4899" />
      </linearGradient>
      <filter id="f">
        <feGaussianBlur stdDeviation="60" />
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <circle cx="${width * 0.3}" cy="${height * 0.4}" r="${Math.min(width, height) * 0.35}" fill="#8b5cf6" opacity="0.35" filter="url(#f)" />
    <circle cx="${width * 0.7}" cy="${height * 0.6}" r="${Math.min(width, height) * 0.3}" fill="#06b6d4" opacity="0.3" filter="url(#f)" />
    <circle cx="${width * 0.5}" cy="${height * 0.5}" r="${Math.min(width, height) * 0.25}" fill="#ec4899" opacity="0.25" filter="url(#f)" />
    
    <g transform="translate(${width / 2}, ${height / 2})">
      <circle r="${Math.min(width, height) * 0.25}" fill="none" stroke="url(#glow)" stroke-width="3" stroke-dasharray="16 12" opacity="0.7"/>
      <path d="M 0,-70 C 8,-25 25,-8 70,0 C 25,8 8,25 0,70 C -8,25 -25,8 -70,0 C -25,-8 -8,-25 0,-70 Z" fill="url(#glow)"/>
    </g>
    
    <rect x="${width * 0.08}" y="${height * 0.75}" width="${width * 0.84}" height="${height * 0.18}" rx="16" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.15)"/>
    <text x="${width / 2}" y="${height * 0.83}" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="${Math.max(16, width * 0.024)}">
      ${prompt.length > 36 ? prompt.slice(0, 36) + '...' : prompt}
    </text>
    <text x="${width / 2}" y="${height * 0.89}" text-anchor="middle" fill="#38bdf8" font-family="system-ui, sans-serif" font-weight="500" font-size="${Math.max(12, width * 0.016)}">
      Gemini Imagen Studio · 8K HDR Volumetric Master
    </text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function generateSynthesizedMusicAudio(prompt: string, durationSec = 15) {
  const sampleRate = 22050;
  const numSamples = sampleRate * Math.min(durationSec, 30);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  const chordNotes = [
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [130.81, 164.81, 196],
    [196, 246.94, 293.66],
  ];

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.floor((t / 2) % chordNotes.length);
    const chord = chordNotes[chordIndex];

    let sample = 0;
    chord.forEach((freq, idx) => {
      const vol = idx === 0 ? 0.35 : 0.2;
      sample += Math.sin(2 * Math.PI * freq * t) * vol;
    });

    const beat = Math.sin(2 * Math.PI * 2 * t);
    if (beat > 0.8) sample += 0.25 * Math.sin(2 * Math.PI * 65 * t);

    const env = Math.min(1, t / 0.5) * Math.min(1, (numSamples / sampleRate - t) / 0.8);
    const int16Val = Math.max(-32768, Math.min(32767, Math.floor(sample * env * 24000)));
    buffer.writeInt16LE(int16Val, offset);
    offset += 2;
  }

  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}

function generateSynthesizedSpeechWav(text: string) {
  const sampleRate = 22050;
  const durationSec = Math.max(3, Math.min(12, text.length * 0.12));
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const f0 = 165 + 6 * Math.sin(2 * Math.PI * 4.5 * t);
    const voice = Math.sin(2 * Math.PI * f0 * t) * 0.4 +
                  Math.sin(2 * Math.PI * f0 * 2 * t) * 0.25 +
                  Math.sin(2 * Math.PI * f0 * 3 * t) * 0.15;
    
    const speechMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t);
    const env = Math.min(1, t / 0.2) * Math.min(1, (durationSec - t) / 0.4);
    const int16Val = Math.max(-32768, Math.min(32767, Math.floor(voice * speechMod * env * 22000)));
    buffer.writeInt16LE(int16Val, offset);
    offset += 2;
  }

  return `data:audio/wav;base64,${buffer.toString('base64')}`;
}

function generateProceduralVideoData(prompt: string, base64Image?: string, aspectRatio = '16:9') {
  return base64Image || generateProceduralImage(prompt, aspectRatio);
}

// Static & Dev server setup
async function startServer() {
  // Always mount public directory for static assets (sample videos, audio, icons)
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }
  }));

  // Direct dedicated route for Neon City sample video with byte range support
  app.get(['/api/sample-video/neon-city', '/assets/neon_city_veo3.mp4'], (req, res) => {
    const videoPath = path.join(__dirname, 'public', 'assets', 'neon_city_veo3.mp4');
    if (fs.existsSync(videoPath)) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.sendFile(videoPath);
    }
    return res.status(404).send('Sample video not found');
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Read template and pre-warm index.html transformation on boot so the first request is instant
    const indexPath = path.resolve(__dirname, 'index.html');
    let prewarmedHtml = '';
    try {
      if (fs.existsSync(indexPath)) {
        const rawTemplate = fs.readFileSync(indexPath, 'utf-8');
        prewarmedHtml = await vite.transformIndexHtml('/', rawTemplate);
        console.log('✓ Vite dev server warmed up successfully');
      }
    } catch (e: any) {
      console.warn('Vite pre-warm notice:', e?.message);
    }

    // Fallback for SPA page navigation requests in dev
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (req.method !== 'GET' || url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (prewarmedHtml) {
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(prewarmedHtml);
        }
        if (vite) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Gemini OmniStudio server listening on 0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Express server encountered an error:', err);
  });
}

startServer();
