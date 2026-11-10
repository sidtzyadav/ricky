import React from 'react';
import { X, Mail, Send, ExternalLink, Copy, Check } from 'lucide-react';
import { ReminderLog } from '../types';

interface EmailPreviewModalProps {
  log: ReminderLog | null;
  onClose: () => void;
  onResend?: (log: ReminderLog) => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ log, onClose, onResend }) => {
  const [copied, setCopied] = React.useState(false);

  if (!log) return null;

  const handleCopyText = () => {
    navigator.clipboard.writeText(log.bodyText || log.subject);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoUrl = `mailto:${encodeURIComponent(log.tenantEmail)}?subject=${encodeURIComponent(log.subject)}&body=${encodeURIComponent(log.bodyText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Payment Reminder Email
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated 3-Day Notice &middot; Sent to {log.tenantName} ({log.tenantEmail})
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

        {/* Email Meta Strip */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 w-16">To:</span>
            <span>{log.tenantName} &lt;{log.tenantEmail}&gt;</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 w-16">Subject:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{log.subject}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 w-16">Status:</span>
            <span className="inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              {log.status} via {log.triggerType === 'automated' ? 'Automated 3-Day Scheduler' : 'Manual Dispatch'} ({new Date(log.sentAt).toLocaleString('en-IN')})
            </span>
          </div>
        </div>

        {/* Email Body Preview Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/40">
          <div
            className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800 text-sm shadow-xs"
            dangerouslySetInnerHTML={{ __html: log.bodyHtml }}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied Text' : 'Copy Plain Text'}
          </button>

          <div className="flex items-center gap-2">
            <a
              href={mailtoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Email App
            </a>
            {onResend && (
              <button
                onClick={() => {
                  onResend(log);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Resend Reminder
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
