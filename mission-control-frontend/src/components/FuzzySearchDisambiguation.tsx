import React from 'react';
import { X } from 'lucide-react';

interface FuzzySearchDisambiguationProps {
  isOpen: boolean;
  message: string;
  options: Array<{ number: number; name: string; id: string }>;
  onSelect: (name: string, id: string) => void;
  onClose: () => void;
  entityType?: 'client' | 'robot' | 'pathmap' | 'mission';
}

/**
 * Fuzzy Search Disambiguation Dialog
 * Shows when exact match is not found and presents closest matches
 */
export const FuzzySearchDisambiguation: React.FC<FuzzySearchDisambiguationProps> = ({
  isOpen,
  message,
  options,
  onSelect,
  onClose,
  entityType = 'item',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 border-2 border-purple-500/40 shadow-2xl ring-2 ring-purple-500/20 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Did you mean?
            </h3>
            <p className="text-sm text-purple-300 mt-1 capitalize">
              Select the {entityType} you're looking for
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-white/80 mb-5 text-sm leading-relaxed border-l-4 border-purple-500/50 pl-4 py-2 bg-purple-500/10 rounded-r">
          {message}
        </p>

        {/* Options */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelect(option.name, option.id)}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-purple-600/20 hover:to-purple-700/20 hover:border-purple-600 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white group-hover:bg-purple-500 transition-colors">
                  {option.number}
                </span>
                <div className="text-left">
                  <span className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {option.name}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">ID: {option.id}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="mt-5 w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-semibold transition-colors border border-slate-600"
        >
          Cancel
        </button>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(71, 85, 105, 0.2);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
};

export default FuzzySearchDisambiguation;
