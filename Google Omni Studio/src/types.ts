export type StudioTab = 'flow' | 'music' | 'vault' | 'director' | 'image' | 'video' | 'html';

export type MediaType = 'image' | 'video' | 'music' | 'project' | 'speech' | 'director_project' | 'html';

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  isPro?: boolean;
  accessToken?: string;
  sessionCookie?: string;
  authType: 'google_oauth' | 'session_cookie' | 'guest';
  connectedAt: number;
}

export interface NetworkMeta {
  endpoint: string;
  method: string;
  requestPayload: any;
  responseStatus: number;
  latencyMs: number;
  isRealApi: boolean;
  modelUsed: string;
  htmlCode?: string;
  curlCommand?: string;
  rawResponse?: any;
  errorMessage?: string;
  timestamp?: string;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  prompt: string;
  url: string; // Base64 data URL, external URL, or HTML data URI
  thumbnail?: string;
  createdAt: number;
  tags: string[];
  htmlCode?: string; // Direct HTML representation
  networkMeta?: NetworkMeta;
  metadata: {
    aspectRatio?: string;
    duration?: string | number;
    lyrics?: string;
    resolution?: string;
    genre?: string;
    model?: string;
    sourceImageId?: string;
    sourceMusicId?: string;
    sourceVideoId?: string;
    narrationText?: string;
    narrationAudioUrl?: string;
    colorPalette?: string[];
    isSimulated?: boolean;
    cameraMotion?: string;
    htmlPreview?: string;
    projectId?: string;
    projectTitle?: string;
    bundleVideoUrl?: string;
    bundleMusicUrl?: string;
  };
}

export interface DirectorPlan {
  titleKo: string;
  titleEn: string;
  logline: string;
  imagePrompt: string;
  imageStyle?: string;
  videoPrompt: string;
  videoCameraMotion?: string;
  musicPrompt: string;
  musicGenre?: string;
  lyrics?: string;
  narrationScript: string;
  recommendedVoice?: string;
  colorPalette: string[];
  networkMeta?: NetworkMeta;
  htmlSnippet?: string;
}
