import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Laptop,
  FileCode,
  Database,
  Upload,
  Check,
  ExternalLink,
  ShieldCheck,
  Copy,
  Layers,
  ArrowRight,
  Package,
} from 'lucide-react';
import { AppState } from '../types';
import {
  exportStateAsJson,
  generateStandaloneOfflineAppHtml,
  triggerFileDownload,
} from '../utils/exportApp';
import { generateAndroidStudioProjectZip } from '../utils/androidProjectGenerator';
import { usePWAInstall } from '../utils/usePWAInstall';

interface DownloadAppModalProps {
  state: AppState;
  onClose: () => void;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  state,
  onClose,
  onUpdateState,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedCli, setCopiedCli] = useState(false);

  // Live app URL for APK minting
  const liveAppUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-pipzgvz7isgctddt6ry7kk-940886309324.asia-southeast1.run.app';

  const pwaBuilderApkUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(liveAppUrl)}`;

  // 1. Download Standalone Offline HTML
  const handleDownloadOfflineHtml = () => {
    const htmlContent = generateStandaloneOfflineAppHtml(state);
    const dateStr = new Date().toISOString().split('T')[0];
    triggerFileDownload(htmlContent, `Rent-Manager-Offline-${dateStr}.html`, 'text/html');
    onShowToast('Downloaded Standalone Offline App (HTML file)! You can double-click it to run anywhere.');
  };

  // 2. Export JSON backup
  const handleExportJson = () => {
    exportStateAsJson(state);
    onShowToast('Exported complete Rent Manager data backup (.json)');
  };

  // 3. Import JSON backup
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.landlord && Array.isArray(parsed.properties) && Array.isArray(parsed.tenants)) {
          onUpdateState(parsed);
          onShowToast('Successfully imported and restored Rent Manager data backup!');
          onClose();
        } else {
          onShowToast('Invalid backup file format.');
        }
      } catch {
        onShowToast('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // 4. Install PWA
  const handleInstallApp = async () => {
    const success = await install();
    if (success) {
      onShowToast('Rent Manager installed successfully to your device!');
      onClose();
    }
  };

  const bubblewrapCommand = `npx @bubblewrap/cli init --manifest=${liveAppUrl}/manifest.json\nnpx @bubblewrap/cli build`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(bubblewrapCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
    onShowToast('Copied Bubblewrap CLI command to clipboard');
  };

  // 5. Download Android Studio Project ZIP
  const [isBuildingZip, setIsBuildingZip] = useState(false);
  const handleDownloadAndroidProject = async () => {
    setIsBuildingZip(true);
    try {
      const blob = await generateAndroidStudioProjectZip(liveAppUrl, 'Rent Manager');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RentManager-Android-Studio-Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast('Downloaded Android Studio Project (.zip)! Open in Android Studio & select Build APK.');
    } catch (e) {
      console.error(e);
      onShowToast('Failed to build Android project zip.');
    } finally {
      setIsBuildingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Install Rent Manager &middot; Android APK &amp; Downloads
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate Android APK package, install native WebAPK, or download offline application
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Card 1: Android APK File Generation (PWABuilder / TWA) */}
          <div className="p-5 rounded-xl border-2 border-teal-600/40 bg-teal-50/60 dark:bg-teal-950/40 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-teal-700 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Download Android APK File (.apk package)
                    </h4>
                    <span className="text-[10px] font-bold text-teal-800 dark:text-teal-200 bg-teal-200 dark:bg-teal-900 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Direct APK
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Generate and download a ready-to-install Android <strong>.apk</strong> file for your
                    phone or tablet using official Android Trusted Web Activity packaging.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-teal-200 dark:border-teal-800/80 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center justify-between">
                <span>1-Click APK Generator (PWABuilder &middot; Microsoft/Google Partner)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Click below to open the Android APK builder pre-loaded with Rent Manager&apos;s manifest and icons. Select <strong>&lsquo;Package for Android&rsquo;</strong> &rarr; <strong>&lsquo;Generate APK&rsquo;</strong> to download the file directly.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <a
                  href={pwaBuilderApkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Generate &amp; Download Android .apk</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <button
                  onClick={handleDownloadAndroidProject}
                  disabled={isBuildingZip}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>{isBuildingZip ? 'Generating Project ZIP...' : 'Download Android Studio Project (.zip)'}</span>
                </button>
              </div>
            </div>

            {/* How to install .apk on Android */}
            <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                How to install the downloaded APK on your phone:
              </span>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-500 dark:text-slate-400 pl-1">
                <li>Transfer or open the downloaded <strong>.apk</strong> file on your Android device.</li>
                <li>Tap the file and select <strong>&lsquo;Install&rsquo;</strong>.</li>
                <li>If prompted, allow <em>&lsquo;Install unknown apps&rsquo;</em> in your device settings.</li>
              </ol>
            </div>
          </div>

          {/* Card 2: Native Android WebAPK (Zero-download instant APK) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
                <Package className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Native Android WebAPK (Direct Chrome / Edge Minting)
                  </h4>
                  <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Instant &middot; No Unknown Sources Required
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Android Chrome and Edge natively compile and install an official <strong>WebAPK</strong> directly to your Android app drawer without requiring developer settings or APK sideloading permissions.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {isInstalled ? (
                    <div className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Check className="w-4 h-4" />
                      <span>Installed in Android App Drawer</span>
                    </div>
                  ) : isInstallable ? (
                    <button
                      onClick={handleInstallApp}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install WebAPK on Android Now</span>
                    </button>
                  ) : (
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                      On your Android phone, open this URL in Chrome, tap <strong>(⋮) Menu</strong> &rarr; <strong>&lsquo;Install app&rsquo;</strong> or &lsquo;Add to Home screen&rsquo;. Android will automatically package and install the WebAPK.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Build APK via CLI (Google Bubblewrap / Capacitor) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Build APK with Google Bubblewrap CLI (Command Line)
                </h4>
              </div>
              <button
                onClick={handleCopyCli}
                className="inline-flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-400 hover:underline"
              >
                {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCli ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Run this in your terminal to create a signed Android APK using Google&apos;s official Bubblewrap tool:
            </p>
            <pre className="p-2.5 bg-slate-900 text-teal-300 rounded-lg font-mono text-[11px] overflow-x-auto">
              {bubblewrapCommand}
            </pre>
          </div>

          {/* Card 4: Standalone Offline Single-File HTML */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-700 text-white rounded-lg shrink-0 mt-0.5">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Standalone Offline App (.html file)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Downloads an offline self-contained HTML file pre-seeded with all current properties, tenants, and 3-day reminder rules. Double-click to run on any computer or phone browser without internet.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleDownloadOfflineHtml}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Offline File (.html)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero telemetry &middot; 100% private to your browser</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
