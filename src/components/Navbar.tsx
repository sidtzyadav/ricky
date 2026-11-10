import React from 'react';
import { Building2, Sun, Moon, BellRing, Download } from 'lucide-react';
import { AIStudioLiveStatus } from './AIStudioLiveStatus';

export type NavTab =
  | 'rent'
  | 'reminders'
  | 'receipt-gen'
  | 'reminder-gen'
  | 'tenants'
  | 'properties'
  | 'reports'
  | 'landlord';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingRemindersCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onRunAutoCheck: () => void;
  onOpenDownloadModal: () => void;
  onShowToast: (msg: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  pendingRemindersCount,
  isDarkMode,
  onToggleDarkMode,
  onRunAutoCheck,
  onOpenDownloadModal,
  onShowToast,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single element) */}
        <div
          onClick={() => onSelectTab('rent')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Rent Manager
          </span>
        </div>

        {/* Zone 2: Navigation Links (single-line, concise) */}
        <nav className="hidden xl:flex items-center gap-5 text-sm font-medium">
          <button
            onClick={() => onSelectTab('rent')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'rent'
                ? 'text-teal-700 dark:text-teal-400 font-semibold border-b-2 border-teal-700 dark:border-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Rent Tracker
          </button>

          <button
            onClick={() => onSelectTab('reminders')}
            className={`relative whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              currentTab === 'reminders'
                ? 'text-teal-700 dark:text-teal-400 font-semibold border-b-2 border-teal-700 dark:border-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Automated 3-Day Reminders</span>
            {pendingRemindersCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold text-white bg-amber-600 rounded-full">
                {pendingRemindersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('receipt-gen')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'receipt-gen'
                ? 'text-teal-700 dark:text-teal-400 font-semibold border-b-2 border-teal-700 dark:border-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Receipt Generator
          </button>

          <button
            onClick={() => onSelectTab('reminder-gen')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'reminder-gen'
                ? 'text-teal-700 dark:text-teal-400 font-semibold border-b-2 border-teal-700 dark:border-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Reminder Generator
          </button>

          <button
            onClick={() => onSelectTab('tenants')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'tenants'
                ? 'text-teal-700 dark:text-teal-400 font-semibold border-b-2 border-teal-700 dark:border-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Tenants
          </button>

          <button
            onClick={() => onSelectTab('properties')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'properties'
                ? 'text-teal-700 dark:text-teal-400 font-semibold border-b-2 border-teal-700 dark:border-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Properties
          </button>

          <button
            onClick={() => onSelectTab('reports')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'reports'
                ? 'text-teal-700 dark:text-teal-400 font-semibold border-b-2 border-teal-700 dark:border-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Reports
          </button>

          <button
            onClick={() => onSelectTab('landlord')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'landlord'
                ? 'text-teal-700 dark:text-teal-400 font-semibold border-b-2 border-teal-700 dark:border-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Landlord Profile
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action Group & Connection Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <AIStudioLiveStatus onShowToast={onShowToast} />

          <button
            onClick={onOpenDownloadModal}
            title="Download offline application or install app"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download App</span>
          </button>

          <button
            onClick={onRunAutoCheck}
            title="Scan & trigger 3-day automated payment reminders"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/80 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors whitespace-nowrap shrink-0"
          >
            <BellRing className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Check 3-Day Reminders</span>
          </button>

          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle theme"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 border-t border-slate-200 dark:border-slate-800 gap-2 text-xs font-medium scrollbar-none">
        {(
          [
            ['rent', 'Rent Tracker'],
            ['reminders', `Auto-Reminders ${pendingRemindersCount > 0 ? `(${pendingRemindersCount})` : ''}`],
            ['receipt-gen', 'Receipt Generator'],
            ['reminder-gen', 'Reminder Generator'],
            ['tenants', 'Tenants'],
            ['properties', 'Properties'],
            ['reports', 'Reports'],
            ['landlord', 'Landlord Profile'],
          ] as [NavTab, string][]
        ).map(([tabKey, label]) => (
          <button
            key={tabKey}
            onClick={() => onSelectTab(tabKey)}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
              currentTab === tabKey
                ? 'bg-teal-700 text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
};
