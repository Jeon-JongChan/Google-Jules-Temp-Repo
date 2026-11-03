import React from 'react';
import { X, HelpCircle, Lightbulb, LucideIcon } from 'lucide-react';

export interface TutorialStep {
  title: string;
  desc: string;
  tip?: string;
}

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
  steps: TutorialStep[];
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  steps,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white truncate">{title} 사용법</h3>
                {badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition flex-shrink-0"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-1.5"
            >
              <div className="flex items-center gap-2 font-bold text-white">
                <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center text-[10px] font-mono">
                  {idx + 1}
                </span>
                <span>{step.title}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed pl-7">{step.desc}</p>
              {step.tip && (
                <div className="mt-1.5 ml-7 p-2 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-start gap-1.5 text-[10px] text-indigo-300">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>{step.tip}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition active:scale-95"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};
