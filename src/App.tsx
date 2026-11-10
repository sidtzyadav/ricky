/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { RentTrackerView } from './components/RentTrackerView';
import { AutomatedRemindersView } from './components/AutomatedRemindersView';
import { ReceiptGeneratorView } from './components/ReceiptGeneratorView';
import { ReminderGeneratorView } from './components/ReminderGeneratorView';
import { TenantsView } from './components/TenantsView';
import { PropertiesView } from './components/PropertiesView';
import { ReportsView } from './components/ReportsView';
import { LandlordProfileView } from './components/LandlordProfileView';
import { DownloadAppModal } from './components/DownloadAppModal';
import { AppState } from './types';
import { INITIAL_SAMPLE_STATE } from './utils/sampleData';
import { getCurrentYm, getTodayIso, getDueDateForMonth, getReminderTriggerDate } from './utils/formatters';
import { processAutomatedPaymentReminders } from './utils/reminderEngine';
import { RotateCcw, Download } from 'lucide-react';

const STORAGE_KEY = 'rentapp_v2';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rentapp_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('rentapp_theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('rentapp_theme', 'light');
      } catch {}
    }
  }, [isDarkMode]);

  // Main App State with localStorage persistence
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure reminderSettings structure is preserved
        if (!parsed.reminderSettings) {
          parsed.reminderSettings = INITIAL_SAMPLE_STATE.reminderSettings;
        }
        if (!parsed.reminderLogs) {
          parsed.reminderLogs = INITIAL_SAMPLE_STATE.reminderLogs;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved state from localStorage:', e);
    }
    return INITIAL_SAMPLE_STATE;
  });

  // Active view tab & billing month
  const [currentTab, setCurrentTab] = useState<NavTab>('rent');
  const [activeYm, setActiveYm] = useState<string>(() => getCurrentYm());
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(true);

  // Toast notification system
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Save state helper
  const handleUpdateState = useCallback((newState: AppState) => {
    setState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }, []);

  // Automated 3-day reminder scanner
  const runAutomatedReminderCheck = useCallback(
    (isAutomaticBackground: boolean = false) => {
      const todayIso = getTodayIso();
      const result = processAutomatedPaymentReminders(
        state,
        todayIso,
        activeYm,
        isAutomaticBackground ? 'automated' : 'manual'
      );

      if (result.newlySent.length > 0) {
        handleUpdateState(result.updatedState);
        showToast(
          `Automated 3-day reminder email sent to ${result.newlySent.length} tenant${
            result.newlySent.length > 1 ? 's' : ''
          }!`
        );
      } else if (!isAutomaticBackground) {
        showToast('All 3-day reminders for this cycle are already up to date.');
      }
    },
    [state, activeYm, handleUpdateState, showToast]
  );

  // Run automated check on initial launch if enabled
  useEffect(() => {
    if (state.reminderSettings?.autoEnabled) {
      runAutomatedReminderCheck(true);
    }
  }, []); // Run once on mount

  // Compute pending reminders count for badge
  const pendingRemindersCount = useMemo(() => {
    const todayIso = getTodayIso();
    const dueDay = state.landlord.dueDay || 5;
    const daysBefore = state.reminderSettings?.daysBefore ?? 3;
    const triggerDate = getReminderTriggerDate(activeYm, dueDay, daysBefore);

    return state.tenants.filter((tenant) => {
      // Must be unpaid
      const isPaid = state.payments.some((p) => p.tenantId === tenant.id && p.ym === activeYm);
      if (isPaid) return false;

      // Has email
      if (!tenant.email || !tenant.email.includes('@')) return false;

      // Not already sent for this month
      const alreadySent = state.reminderLogs.some(
        (log) => log.tenantId === tenant.id && log.ym === activeYm && log.status !== 'Failed'
      );
      if (alreadySent) return false;

      // Is within or past the 3-day trigger date
      return todayIso >= triggerDate;
    }).length;
  }, [state, activeYm]);

  // Reset to sample data
  const handleResetData = () => {
    if (window.confirm('Reset all property, tenant, and reminder records to initial sample data?')) {
      handleUpdateState(INITIAL_SAMPLE_STATE);
      setActiveYm(getCurrentYm());
      showToast('Reset to demo rental portfolio and automated reminder data.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingRemindersCount={pendingRemindersCount}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onRunAutoCheck={() => runAutomatedReminderCheck(false)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        onShowToast={showToast}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'rent' && (
          <RentTrackerView
            state={state}
            activeYm={activeYm}
            onChangeActiveYm={setActiveYm}
            onUpdateState={handleUpdateState}
            onShowToast={showToast}
            onNavigateToReminders={() => setCurrentTab('reminders')}
            onNavigateToReceiptGenerator={() => setCurrentTab('receipt-gen')}
            onNavigateToReminderGenerator={() => setCurrentTab('reminder-gen')}
          />
        )}

        {currentTab === 'reminders' && (
          <AutomatedRemindersView
            state={state}
            activeYm={activeYm}
            onChangeActiveYm={setActiveYm}
            onUpdateState={handleUpdateState}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'receipt-gen' && (
          <ReceiptGeneratorView
            state={state}
            onUpdateState={handleUpdateState}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'reminder-gen' && (
          <ReminderGeneratorView
            state={state}
            activeYm={activeYm}
            onChangeActiveYm={setActiveYm}
            onUpdateState={handleUpdateState}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'tenants' && (
          <TenantsView
            state={state}
            onUpdateState={handleUpdateState}
            onShowToast={showToast}
            onOpenRecordPayment={(t) => {
              setCurrentTab('rent');
              showToast(`Recording payment for ${t.name}`);
            }}
          />
        )}

        {currentTab === 'properties' && (
          <PropertiesView
            state={state}
            onUpdateState={handleUpdateState}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView state={state} onShowToast={showToast} />
        )}

        {currentTab === 'landlord' && (
          <LandlordProfileView
            state={state}
            onUpdateState={handleUpdateState}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Subtle Footer with demo reset & download */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Connected to AI Studio Live
            </span>
            <span>&middot; Instant Cloud Updates</span>
            <span className="hidden sm:inline">&middot; Due Day: {state.landlord.dueDay || 5}th</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download / Backup</span>
            </button>
            <button
              onClick={handleResetData}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Demo Portfolio</span>
            </button>
            <span>Data stored locally</span>
          </div>
        </div>
      </footer>

      {/* Download Application & Offline Bundle Modal */}
      {isDownloadModalOpen && (
        <DownloadAppModal
          state={state}
          onClose={() => setIsDownloadModalOpen(false)}
          onUpdateState={handleUpdateState}
          onShowToast={showToast}
        />
      )}

      {/* Toast Notification Popover */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-lg text-xs font-medium flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
          <span className="flex-1 leading-snug">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white dark:hover:text-slate-900 font-bold ml-1"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
