import React, { useState } from 'react';
import {
  Code,
  Terminal,
  Copy,
  Check,
  Download,
  Eye,
  Send,
  Layers,
  ChevronDown,
  ChevronUp,
  Maximize2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { NetworkMeta } from '../types';

interface Props {
  serviceName: string; // e.g. "Google Labs ImageFX", "Google DeepMind Veo", "Google Labs MusicFX", "Google Omni Flow"
  serviceBadge: string; // e.g. "Imagen 3", "Veo 2.0", "Lyria 2.0", "Gemini 3.8 Flash"
  serviceColor: string; // e.g. "cyan", "amber", "purple", "indigo"
  networkMeta?: NetworkMeta | null;
  defaultHtmlCode?: string;
  onOpenFullInspector?: () => void;
  onApplyCustomHtml?: (html: string) => void;
}

export const GoogleServiceApiBar: React.FC<Props> = ({
  serviceName,
  serviceBadge,
  serviceColor,
  networkMeta,
  defaultHtmlCode,
  onOpenFullInspector,
  onApplyCustomHtml,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'html' | 'request' | 'response' | 'preview'>('html');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const htmlContent = networkMeta?.htmlCode || defaultHtmlCode || '';
  const [editableHtml, setEditableHtml] = useState(htmlContent);

  React.useEffect(() => {
    if (htmlContent) {
      setEditableHtml(htmlContent);
    }
  }, [htmlContent]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([editableHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
    if (onApplyCustomHtml) {
      onApplyCustomHtml(editableHtml);
    }
    setActiveTab('preview');
  };

  // Color theme helpers
  const getColorClasses = () => {
    switch (serviceColor) {
      case 'cyan':
        return {
          border: 'border-cyan-500/30',
          bg: 'bg-cyan-500/10',
          text: 'text-cyan-400',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          activeTab: 'bg-cyan-500/20 text-cyan-300 border-b-2 border-cyan-400',
        };
      case 'amber':
        return {
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          activeTab: 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400',
        };
      case 'purple':
        return {
          border: 'border-purple-500/30',
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          activeTab: 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400',
        };
      case 'indigo':
      default:
        return {
          border: 'border-indigo-500/30',
          bg: 'bg-indigo-500/10',
          text: 'text-indigo-400',
          badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          activeTab: 'bg-indigo-500/20 text-indigo-300 border-b-2 border-indigo-400',
        };
    }
  };

  const c = getColorClasses();

  return (
    <div className={`w-full rounded-2xl border ${c.border} bg-slate-900/90 shadow-xl overflow-hidden transition-all duration-200`}>
      {/* Bar Header & Toggle */}
      <div
        className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none bg-slate-950/70 hover:bg-slate-950/90 transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${c.bg} ${c.text} flex-shrink-0`}>
            <Terminal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white truncate">{serviceName}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${c.badge}`}>
                {serviceBadge}
              </span>
              {networkMeta && (
                <span className="hidden sm:inline-flex text-[10px] font-mono text-emerald-400 items-center gap-1">
                  ● 200 OK ({networkMeta.latencyMs}ms)
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              실제 구글 요청(Request) · 응답(Response) · 결과 HTML 코드 검사 및 직접 커스텀
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {onOpenFullInspector && (
            <button
              onClick={onOpenFullInspector}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition"
              title="전체화면 정밀 검사기 열기"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">확대</span>
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={isOpen ? '접기' : '펼치기'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {isOpen && (
        <div className="border-t border-slate-800/80 p-3 sm:p-4 space-y-3">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-xs">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('html')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'html' ? c.activeTab : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>결과 HTML 코드 (직접 편집)</span>
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'preview' ? c.activeTab : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>실시간 HTML 렌더링</span>
              </button>

              <button
                onClick={() => setActiveTab('request')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'request' ? c.activeTab : 'text-slate-400 hover:text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>보내는 부분 (Request &amp; cURL)</span>
              </button>

              <button
                onClick={() => setActiveTab('response')}
                className={`px-3 py-1.5 rounded-t-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'response' ? c.activeTab : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>받는 부분 (Response JSON)</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleDownload}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition"
                title=".html 단일 파일로 다운로드"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">.html 다운로드</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Editable HTML Code */}
          {activeTab === 'html' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>구글 웹 서비스 결과값을 렌더링하는 완성형 독립 HTML5 코드입니다. 수정 후 [즉시 반영]을 누를 수 있습니다.</span>
                <button
                  onClick={() => handleCopy(editableHtml, 'html')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                >
                  {copiedKey === 'html' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>HTML 복사</span>
                </button>
              </div>

              <textarea
                value={editableHtml}
                onChange={(e) => setEditableHtml(e.target.value)}
                rows={8}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-y leading-relaxed"
                spellCheck={false}
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-mono">
                  {editableHtml.length} bytes · HTML5 / CSS3 / Web Audio / Canvas Embed
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApply}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>실시간 미리보기에 즉시 반영</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Sandbox Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-mono">
                  ● 샌드박스 독립 브라우저 렌더러 (Isolated iframe)
                </span>
                <button
                  onClick={() => setActiveTab('html')}
                  className="text-cyan-400 hover:underline text-[11px]"
                >
                  코드 다시 수정하기
                </button>
              </div>

              <div className="w-full min-h-[220px] max-h-[380px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-2 flex items-center justify-center">
                <iframe
                  title="Google Live HTML Sandbox"
                  srcDoc={editableHtml}
                  className="w-full h-64 border-0 rounded-lg bg-transparent"
                  sandbox="allow-scripts allow-same-origin allow-modals"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Request Payload & cURL */}
          {activeTab === 'request' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-mono text-cyan-400 font-semibold">
                    HTTP POST {networkMeta?.endpoint || '/api/gemini/...'}
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        networkMeta?.curlCommand || `curl -X POST "https://google-genai.api${networkMeta?.endpoint}" -d '{}'`,
                        'curl'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                  >
                    {copiedKey === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>cURL 복사</span>
                  </button>
                </div>

                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-40">
                  {networkMeta?.curlCommand || '요청이 생성되면 여기에 실제 구글 cURL 명령어가 표시됩니다.'}
                </pre>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 mb-1 font-semibold">
                  Google Service JSON Request Payload:
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-48">
                  {JSON.stringify(networkMeta?.requestPayload || { prompt: '...' }, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Response Payload */}
          {activeTab === 'response' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-emerald-400 font-bold">
                    Status: {networkMeta?.responseStatus || 200} OK
                  </span>
                  <span>·</span>
                  <span>Latency: {networkMeta?.latencyMs || 0}ms</span>
                  <span>·</span>
                  <span className="text-cyan-400">Model: {networkMeta?.modelUsed || 'google-ai-engine'}</span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(networkMeta?.rawResponse || networkMeta || {}, null, 2),
                      'resp'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                >
                  {copiedKey === 'resp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>JSON 복사</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-64">
                {JSON.stringify(
                  networkMeta?.rawResponse || {
                    status: 'success',
                    model: networkMeta?.modelUsed || 'google-ai-engine',
                    timestamp: networkMeta?.timestamp || new Date().toISOString(),
                    htmlIncluded: !!networkMeta?.htmlCode,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
