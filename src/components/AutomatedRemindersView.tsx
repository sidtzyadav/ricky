import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Send,
  Eye,
  FileDown,
  MessageSquare,
  Sparkles,
  Search,
} from 'lucide-react';
import { AppState, Tenant, ReminderLog } from '../types';
import {
  formatINR,
  formatDate,
  formatMonthYear,
  getDueDateForMonth,
  getReminderTriggerDate,
  getDaysUntilDue,
} from '../utils/formatters';
import {
  generateWhatsAppReminderUrl,
  processAutomatedPaymentReminders,
} from '../utils/reminderEngine';
import { createReminderPDF, downloadPdf } from '../utils/pdfGenerator';
import { EmailPreviewModal } from './EmailPreviewModal';

interface AutomatedRemindersViewProps {
  state: AppState;
  activeYm: string;
  onChangeActiveYm: (ym: string) => void;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const AutomatedRemindersView: React.FC<AutomatedRemindersViewProps> = ({
  state,
  activeYm,
  onChangeActiveYm,
  onUpdateState,
  onShowToast,
}) => {
  const [selectedLog, setSelectedLog] = useState<ReminderLog | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const todayIso = new Date().toISOString().split('T')[0];
  const dueDay = state.landlord.dueDay || 5;
  const daysBefore = state.reminderSettings.daysBefore ?? 3;
  const dueDate = getDueDateForMonth(activeYm, dueDay);
  const triggerDate = getReminderTriggerDate(activeYm, dueDay, daysBefore);
  const daysToDue = getDaysUntilDue(todayIso, dueDate);

  // Unpaid tenants for active cycle
  const unpaidTenants = state.tenants.filter(
    (t) => !state.payments.some((p) => p.tenantId === t.id && p.ym === activeYm)
  );

  const paidTenantsCount = state.tenants.length - unpaidTenants.length;
  const remindersSentCount = state.reminderLogs.filter(
    (l) => l.ym === activeYm && l.status !== 'Failed'
  ).length;

  // Run automated scan now
  const handleTriggerAutomatedCheck = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = processAutomatedPaymentReminders(state, todayIso, activeYm, 'automated');
      onUpdateState(result.updatedState);
      setIsProcessing(false);

      if (result.newlySent.length > 0) {
        onShowToast(
          `Automated 3-day reminder email sent to ${result.newlySent.length} tenant${
            result.newlySent.length > 1 ? 's' : ''
          }!`
        );
      } else {
        onShowToast(
          `All eligible 3-day reminders for ${formatMonthYear(activeYm)} are already up-to-date.`
        );
      }
    }, 400);
  };

  // Send single manual reminder email
  const handleSendSingleEmail = (tenant: Tenant) => {
    const property = state.properties.find((p) => p.id === tenant.propertyId);
    if (!tenant.email || !tenant.email.includes('@')) {
      onShowToast(`Cannot send: ${tenant.name} does not have a valid email on file.`);
      return;
    }

    const result = processAutomatedPaymentReminders(state, todayIso, activeYm, 'manual');
    // Filter specifically for this tenant
    const newlyForThisTenant = result.newlySent.find((l) => l.tenantId === tenant.id);

    if (newlyForThisTenant) {
      onUpdateState(result.updatedState);
      onShowToast(`Reminder email dispatched to ${tenant.name} (${tenant.email})`);
    } else {
      // Direct force send
      const totalDue = tenant.monthlyRent + (tenant.outstandingBalance || 0);
      const subject = `Rent Reminder: ${formatINR(totalDue)} due on ${formatDate(dueDate)} (${
        property ? property.name : 'Rental Unit'
      })`;
      const newLog: ReminderLog = {
        id: Math.random().toString(36).slice(2, 9),
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        propertyTitle: property ? property.name : 'Rental Unit',
        ym: activeYm,
        dueDate,
        triggerDate,
        sentAt: new Date().toISOString(),
        subject,
        bodyHtml: `<p>Dear <strong>${tenant.name}</strong>, rent for ${formatMonthYear(
          activeYm
        )} of ${formatINR(totalDue)} is due on ${formatDate(dueDate)}.</p>`,
        bodyText: `Dear ${tenant.name}, rent of ${formatINR(totalDue)} for ${formatMonthYear(
          activeYm
        )} is due on ${formatDate(dueDate)}.`,
        amountDue: totalDue,
        status: 'Sent',
        triggerType: 'manual',
        deliveryChannel: 'email',
      };

      onUpdateState({
        ...state,
        reminderLogs: [newLog, ...state.reminderLogs],
      });
      onShowToast(`Reminder email sent to ${tenant.name} (${tenant.email})`);
    }
  };

  // Download PDF
  const handleDownloadPdf = (tenant: Tenant) => {
    const prop = state.properties.find((p) => p.id === tenant.propertyId);
    const doc = createReminderPDF(state.landlord, tenant, prop, activeYm, dueDate);
    downloadPdf(
      doc,
      `Rent-Reminder-${tenant.name.replace(/\s+/g, '-')}-${activeYm}.pdf`
    );
    onShowToast(`Reminder PDF downloaded for ${tenant.name}`);
  };

  // Preview before sending
  const handlePreviewUpcomingEmail = (tenant: Tenant) => {
    const property = state.properties.find((p) => p.id === tenant.propertyId);
    const totalDue = tenant.monthlyRent + (tenant.outstandingBalance || 0);
    const existingLog = state.reminderLogs.find(
      (l) => l.tenantId === tenant.id && l.ym === activeYm
    );

    if (existingLog) {
      setSelectedLog(existingLog);
      return;
    }

    // Temporary preview object
    const previewLog: ReminderLog = {
      id: 'preview',
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantEmail: tenant.email || 'tenant@example.com',
      propertyTitle: property ? property.name : 'Rental Property',
      ym: activeYm,
      dueDate,
      triggerDate,
      sentAt: new Date().toISOString(),
      subject: `Rent Reminder: ${formatINR(totalDue)} due on ${formatDate(dueDate)} (${
        property ? property.name : 'Rental Unit'
      })`,
      bodyHtml: `<p>Dear <strong>${tenant.name}</strong>, rent for ${formatMonthYear(
        activeYm
      )} of ${formatINR(totalDue)} is due on ${formatDate(dueDate)}.</p>`,
      bodyText: `Dear ${tenant.name}, rent for ${formatMonthYear(activeYm)} is due on ${formatDate(
        dueDate
      )}.`,
      amountDue: totalDue,
      status: 'Sent',
      triggerType: 'automated',
      deliveryChannel: 'email',
    };
    setSelectedLog(previewLog);
  };

  // Toggle automated scheduler
  const handleToggleAutoSchedule = () => {
    const updated = !state.reminderSettings.autoEnabled;
    onUpdateState({
      ...state,
      reminderSettings: {
        ...state.reminderSettings,
        autoEnabled: updated,
      },
    });
    onShowToast(`Automated payment reminders ${updated ? 'Enabled' : 'Disabled'}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Strategy Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
                <Bell className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Automated Payment Reminder System
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>Rule: 3-Day Notice Window</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Rent Due: Day {dueDay} of month</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Trigger Date: {formatDate(triggerDate)}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              When rent is due for a tenant, Rent Manager calculates the 3-day pre-due notice date
              and automatically dispatches a formal payment reminder email with your bank &amp; UPI
              payment details to the tenant&apos;s email address.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleToggleAutoSchedule}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                state.reminderSettings.autoEnabled
                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
              }`}
            >
              {state.reminderSettings.autoEnabled ? 'Automation: Active' : 'Automation: Paused'}
            </button>

            <button
              onClick={handleTriggerAutomatedCheck}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? 'Scanning Tenants...' : 'Run 3-Day Reminder Check'}</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Billing Cycle</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {formatMonthYear(activeYm)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Due Date (3-Day Rule)</div>
            <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {formatDate(dueDate)}{' '}
              <span className="text-xs font-normal text-slate-500">
                ({daysToDue > 0 ? `${daysToDue}d left` : daysToDue === 0 ? 'Today' : 'Overdue'})
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Reminders Sent</div>
            <div className="text-base font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400 mt-1">
              {remindersSentCount} of {unpaidTenants.length + paidTenantsCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Pending Collection</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400 mt-1">
              {unpaidTenants.length} Tenant{unpaidTenants.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </div>

      {/* Cycle Month Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Selected Month:
          </label>
          <input
            type="month"
            value={activeYm}
            onChange={(e) => e.target.value && onChangeActiveYm(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 shadow-xs"
          />
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenant or property..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Section 1: Active Cycle Tenant Reminder Queue */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tenant Reminder Status &middot; {formatMonthYear(activeYm)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatic email reminders trigger exactly 3 days before the {dueDay}th of each month
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {state.tenants.length} Units Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Tenant &amp; Property</th>
                <th className="py-3 px-4 font-semibold">Email (Automated Destination)</th>
                <th className="py-3 px-4 font-semibold text-right">Rent + Bal</th>
                <th className="py-3 px-4 font-semibold">Due &amp; 3-Day Trigger</th>
                <th className="py-3 px-4 font-semibold">Reminder Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {state.tenants
                .filter(
                  (t) =>
                    !filterQuery ||
                    t.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
                    (t.email && t.email.toLowerCase().includes(filterQuery.toLowerCase()))
                )
                .map((tenant) => {
                  const property = state.properties.find((p) => p.id === tenant.propertyId);
                  const isPaid = state.payments.some(
                    (p) => p.tenantId === tenant.id && p.ym === activeYm
                  );
                  const lastReminder = state.reminderLogs.find(
                    (l) => l.tenantId === tenant.id && l.ym === activeYm
                  );
                  const totalDue = tenant.monthlyRent + (tenant.outstandingBalance || 0);
                  const hasEmail = Boolean(tenant.email && tenant.email.includes('@'));
                  const isTriggerReached = todayIso >= triggerDate;

                  return (
                    <tr
                      key={tenant.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {tenant.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {property ? property.name : 'No property assigned'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {hasEmail ? (
                          <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                            <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="font-mono text-[11px]">{tenant.email}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>No email configured</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatINR(totalDue)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                          Due: {formatDate(dueDate)}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Trigger: {formatDate(triggerDate)}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Paid &middot; Receipt Issued
                          </span>
                        ) : lastReminder ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Auto-Sent (
                              {new Date(lastReminder.sentAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                              })}
                              )
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              via {lastReminder.triggerType}
                            </div>
                          </div>
                        ) : !hasEmail ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Missing Email (Cannot auto-send)
                          </span>
                        ) : isTriggerReached ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            Eligible &amp; Ready to Send
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
                            Scheduled on {formatDate(triggerDate)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <>
                              <button
                                onClick={() => handleSendSingleEmail(tenant)}
                                title="Send reminder email now"
                                className="p-1.5 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-md transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handlePreviewUpcomingEmail(tenant)}
                                title="Preview email"
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDownloadPdf(tenant)}
                                title="Download reminder PDF"
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </button>

                              {tenant.phone && (
                                <a
                                  href={generateWhatsAppReminderUrl(
                                    state.landlord,
                                    tenant,
                                    property,
                                    activeYm,
                                    dueDate
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Share reminder via WhatsApp"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-md transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </>
                          )}
                          {isPaid && (
                            <span className="text-[11px] text-slate-400">No actions required</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Outbox & Delivery History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Dispatched Reminders &middot; Outbox Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit trail of all automated and manual payment reminder notifications
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {state.reminderLogs.length} Records
          </span>
        </div>

        {state.reminderLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No reminders have been dispatched yet. When the 3-day notice window arrives, emails will
            be sent and logged here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Recipient</th>
                  <th className="py-2.5 px-4 font-semibold">Billing Month</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-4 font-semibold">Type</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {state.reminderLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono text-[11px]">
                      {new Date(log.sentAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {log.tenantName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{log.tenantEmail}</div>
                    </td>
                    <td className="py-2.5 px-4 font-medium">{formatMonthYear(log.ym)}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                      {formatINR(log.amountDue)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        {log.triggerType === 'automated' ? 'Automated 3-Day' : 'Manual Send'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Email</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {selectedLog && (
        <EmailPreviewModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onResend={(log) => {
            const tenant = state.tenants.find((t) => t.id === log.tenantId);
            if (tenant) handleSendSingleEmail(tenant);
          }}
        />
      )}
    </div>
  );
};
