import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Check,
  X,
  Chrome,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Terminal,
  Zap,
  ServerOff
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'apk' | 'architecture'>('quick');

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg leading-tight text-white">
                100% 순수 무서버(Serverless) 안드로이드 APK
              </h3>
            </div>
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <ServerOff className="w-3.5 h-3.5" />
              서버 유지비 0원 · 365일 호스팅 불필요 · 폰 단독 실행
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'quick'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>즉시 WebAPK 설치</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'apk'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>단독 .apk 파일 빌드</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>무서버 원리</span>
          </button>
        </div>

        {/* Tab 1: WebAPK Quick Install */}
        {activeTab === 'quick' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
              <strong>구글 공식 WebAPK 방식:</strong> 복잡한 빌드 과정 없이 스마트폰의 브라우저에서 바로 실제 안드로이드 앱 패키지(`.apk`)로 컴파일되어 단독 앱으로 설치됩니다.
            </div>

            {isInstalled ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                <Check className="w-5 h-5 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">기기에 이미 설치되어 있습니다!</span>
                  <p className="text-slate-400 mt-0.5">스마트폰 홈 화면에서 앱 아이콘을 터치하여 전체화면으로 실행하세요.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {deferredPrompt ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 font-bold text-sm text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <Download className="w-4 h-4" />
                    스마트폰에 원클릭 앱 설치
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-3">
                    <div className="flex items-center gap-2 font-bold text-sky-400">
                      <Chrome className="w-4 h-4" />
                      스마트폰 브라우저에서 설치하는 순서:
                    </div>
                    <ol className="list-decimal list-inside space-y-2 text-slate-300 text-xs pl-1">
                      <li>스마트폰 크롬/삼성 브라우저 우측 상단 <strong>더보기 (⋮)</strong> 메뉴 터치</li>
                      <li><strong>[홈 화면에 추가]</strong> 또는 <strong>[앱 설치]</strong> 터치</li>
                      <li>구글 플레이 서비스가 <strong>순수 안드로이드 WebAPK</strong>로 자동 컴파일 및 설치 완료!</li>
                    </ol>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>클라우드 서버 비용 0원</span>
                  </div>
                  <p>이 앱은 사용자의 스마트폰 하드웨어(CPU/GPU/Web Audio/로컬 스토리지)에서 독립 실행되므로 별도 유지비가 발생하지 않습니다.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Standalone .apk Build (Capacitor) */}
        {activeTab === 'apk' && (
          <div className="space-y-3.5">
            <p className="text-xs text-slate-300 leading-relaxed">
              설치 파일인 <strong>순수 `.apk` 파일</strong>을 직접 생성하여 소장하거나 배포하고 싶다면, 이미 구성된 <strong className="text-indigo-400">Capacitor Android</strong> 설정을 그대로 사용하시면 됩니다.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 font-semibold">
                <Terminal className="w-3.5 h-3.5" />
                3단계로 .apk 파일 뽑아내기:
              </div>
              <div className="space-y-1.5 font-mono text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto">
                <div className="text-slate-500"># 1. 정적 에셋 빌드</div>
                <div>npm run build</div>
                <div className="text-slate-500 pt-1"># 2. 안드로이드 네이티브 프로젝트 동기화</div>
                <div>npx cap sync android</div>
                <div className="text-slate-500 pt-1"># 3. APK 빌드 완료</div>
                <div>npx cap build android</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-indigo-200">
                <Check className="w-4 h-4 text-emerald-400" />
                이미 프로젝트에 준비 완료된 설정:
              </div>
              <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5 pl-1">
                <li><code className="text-cyan-300">capacitor.config.json</code> (안드로이드 네이티브 패키지 스펙 완료)</li>
                <li><code className="text-cyan-300">manifest.json</code> &amp; 아이콘 세트 (안드로이드 OS 규격 완료)</li>
                <li>네이티브 HTTP 통신 (CORS 제한 없는 다이렉트 통신 플러그인)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Serverless Architecture Explainer */}
        {activeTab === 'architecture' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Q. &ldquo;Node.js를 365일 띄워야 하나요?&rdquo;
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                답변: 전혀 띄울 필요 없습니다! 유지비 0원, 관리 0%입니다.
              </div>
              <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                <p>
                  <strong>1. CORS는 브라우저만의 제약입니다:</strong><br />
                  웹 브라우저는 보안상 구글 API 직접 호출을 막기 때문에 개발 중에 임시 Node.js 중계가 쓰였지만, <strong>안드로이드 APK(네이티브 앱)</strong>는 브라우저가 아니므로 <strong>CORS 규격 자체가 적용되지 않습니다.</strong>
                </p>
                <p>
                  <strong>2. 앱과 구글 서버가 1:1 직통 통신:</strong><br />
                  APK가 설치된 사용자의 스마트폰에서 구글 공식 AI 서버로 직접 요청하고 직접 결과를 받습니다. 중간에 365일 켜두어야 하는 중계 서버는 필요 없습니다.
                </p>
                <p>
                  <strong>3. 폰 안에서 100% 독립 구동:</strong><br />
                  음악 작곡(Web Audio), 비디오 모션 렌더링, 옴니 체인 데이터는 스마트폰 내부 프로세서와 로컬 저장소에서 스스로 돌아갑니다.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
        >
          확인 완료
        </button>
      </div>
    </div>
  );
};
