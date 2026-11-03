import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Code,
  Send,
  Eye,
  Terminal,
  Activity,
  Layers,
  Download,
  Play,
  RotateCw
} from 'lucide-react';
import { NetworkMeta } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  networkMeta?: NetworkMeta | null;
  title?: string;
  onUpdateHtml?: (newHtml: string) => void;
}

export const NetworkInspectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  networkMeta,
  title = '실제 통신 데이터 및 HTML 코드 검사기',
  onUpdateHtml
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'request' | 'response' | 'preview'>('html');
  const [editableHtml, setEditableHtml] = useState(networkMeta?.htmlCode || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync state when meta changes
  React.useEffect(() => {
    if (networkMeta?.htmlCode) {
      setEditableHtml(networkMeta.htmlCode);
    }
  }, [networkMeta]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyHtml = () => {
    if (onUpdateHtml) {
      onUpdateHtml(editableHtml);
    }
    setActiveTab('preview');
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([editableHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-omni-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {title}
                {networkMeta?.isRealApi ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                    ● Real Gemini Live
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                    ● Studio Pipeline
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                실제 API 전송 부분(Request)과 결과 HTML 코드(Response) 실시간 검사 및 직접 편집
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center px-5 pt-3 border-b border-slate-800 gap-2 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('html')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'html'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            결과 HTML 코드 (편집/입력)
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'preview'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            실시간 렌더링 미리보기
          </button>

          <button
            onClick={() => setActiveTab('request')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'request'
                ? 'border-pink-400 text-pink-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            보내는 부분 (Request)
          </button>

          <button
            onClick={() => setActiveTab('response')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'response'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            받는 부분 (Response Meta)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs">
          
          {/* TAB 1: HTML Code Editor & Direct Input */}
          {activeTab === 'html' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">
                  웹사이트에 그대로 삽입 가능한 HTML5 코드입니다. 직접 수정하거나 외부 HTML을 붙여넣을 수 있습니다.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(editableHtml, 'html')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px] transition"
                  >
                    {copiedKey === 'html' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    HTML 복사
                  </button>
                  <button
                    onClick={handleDownloadHtml}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px] transition"
                  >
                    <Download className="w-3 h-3" />
                    .html 다운로드
                  </button>
                </div>
              </div>

              <textarea
                value={editableHtml}
                onChange={(e) => setEditableHtml(e.target.value)}
                placeholder="여기에 결과 HTML 코드를 직접 입력하거나 수정하세요..."
                className="w-full h-72 p-3.5 bg-slate-950 border border-slate-700/80 rounded-xl text-emerald-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500 resize-none shadow-inner"
                spellCheck={false}
              />

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500">
                  코드 수정 후 [화면에 즉시 반영]을 누르면 앱과 보관함에 실시간 적용됩니다.
                </p>
                <button
                  onClick={handleApplyHtml}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold flex items-center gap-1.5 text-xs shadow-lg shadow-cyan-500/20 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  화면에 즉시 반영 및 렌더링
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Live Sandbox Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">
                  샌드박스 렌더링 결과 (실제 웹 브라우저 동작 화면)
                </span>
                <button
                  onClick={() => setActiveTab('html')}
                  className="text-cyan-400 hover:underline text-[11px] flex items-center gap-1"
                >
                  <Code className="w-3 h-3" /> 코드 다시 편집
                </button>
              </div>

              <div className="w-full min-h-[300px] max-h-[420px] bg-slate-950 border border-slate-700/80 rounded-xl overflow-hidden p-2 flex items-center justify-center">
                <iframe
                  title="HTML Live Sandbox"
                  srcDoc={editableHtml || '<div style="color:#94a3b8;font-family:sans-serif;padding:20px;text-align:center;">렌더링할 HTML 코드가 없습니다.</div>'}
                  className="w-full h-80 border-0 rounded-lg bg-transparent"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Request Inspector (The sending part) */}
          {activeTab === 'request' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-400 font-semibold text-[11px]">엔드포인트 및 HTTP 전송 메서드</span>
                  <button
                    onClick={() => handleCopy(networkMeta?.curlCommand || '', 'curl')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px] transition"
                  >
                    {copiedKey === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    cURL 명령 복사
                  </button>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-pink-400 font-bold flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px]">
                    {networkMeta?.method || 'POST'}
                  </span>
                  <span>{networkMeta?.endpoint || '/api/gemini/...'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold text-[11px] block mb-1.5">
                  보내는 JSON 페이로드 (Request Body)
                </span>
                <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 overflow-x-auto text-[11px] max-h-56">
                  {JSON.stringify(networkMeta?.requestPayload || {}, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-slate-400 font-semibold text-[11px] block mb-1.5">
                  실행 cURL 명령어 (터미널에서 직접 실행 가능)
                </span>
                <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-yellow-300/90 overflow-x-auto text-[11px] max-h-40 whitespace-pre-wrap">
                  {networkMeta?.curlCommand || 'cURL 데이터 생성 중...'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Response Inspector (The receiving part) */}
          {activeTab === 'response' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 block mb-1">HTTP 상태 코드</span>
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                    ● {networkMeta?.responseStatus || 200} OK
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 block mb-1">실행 지연 시간 (Latency)</span>
                  <span className="text-sm font-bold text-cyan-400">
                    {networkMeta?.latencyMs || 0} ms
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block mb-1">사용된 Gemini 모델 / 파이프라인</span>
                <span className="text-xs font-bold text-indigo-300 font-mono">
                  {networkMeta?.modelUsed || 'gemini-3.1-flash-lite'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold text-[11px] block mb-1.5">
                  서버에서 수신한 원본 데이터 (Raw Response)
                </span>
                <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 overflow-x-auto text-[11px] max-h-56">
                  {JSON.stringify(networkMeta?.rawResponse || { status: 'success', isRealApi: networkMeta?.isRealApi }, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>서버 실시간 연동 상태: 양호</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
