import React from 'react';
import { PWLogo } from './PWLogo';
import { FileText, Link as LinkIcon, Database, Mail } from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  activeTab?: 'counsellor' | 'share' | 'records';
  onTabChange?: (tab: 'counsellor' | 'share' | 'records') => void;
  recordsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab = 'counsellor',
  onTabChange,
  recordsCount = 0
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-3">
            <PWLogo size="md" />
          </Link>

          {/* Navigation Tabs (if on main page) */}
          {onTabChange && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onTabChange('counsellor')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'counsellor'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Sales Entry Form</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('share')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'share'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <LinkIcon className="w-4 h-4 text-emerald-600" />
                <span>Generate Parent Link</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('records')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'records'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Database className="w-4 h-4 text-amber-600" />
                <span>Sales Records & Dues</span>
                {recordsCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {recordsCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Support Indicator */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Support Desk</span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-indigo-600" /> pwglobal_support@pw.live
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="System Operational" />
          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        {onTabChange && (
          <div className="flex md:hidden border-t border-slate-100 py-2 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => onTabChange('counsellor')}
              className={`flex-1 min-w-[110px] text-center py-1.5 px-2 rounded-lg text-xs font-semibold ${
                activeTab === 'counsellor' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
              }`}
            >
              Sales Entry
            </button>
            <button
              type="button"
              onClick={() => onTabChange('share')}
              className={`flex-1 min-w-[110px] text-center py-1.5 px-2 rounded-lg text-xs font-semibold ${
                activeTab === 'share' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
              }`}
            >
              Parent Link
            </button>
            <button
              type="button"
              onClick={() => onTabChange('records')}
              className={`flex-1 min-w-[110px] text-center py-1.5 px-2 rounded-lg text-xs font-semibold ${
                activeTab === 'records' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
              }`}
            >
              Records ({recordsCount})
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
