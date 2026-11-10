import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileCheck,
  CreditCard,
  Mail,
  Send,
  MessageSquare,
  Sparkles,
  Search,
  Bell,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppState, Tenant, PaymentMode } from '../types';
import {
  formatINR,
  formatDate,
  formatMonthYear,
  getDueDateForMonth,
  getReminderTriggerDate,
  getDaysUntilDue,
  generateUid,
  pad2,
} from '../utils/formatters';
import {
  createReminderPDF,
  createReceiptPDF,
  downloadPdf,
} from '../utils/pdfGenerator';
import {
  generateReminderEmailHtml,
  generateReminderEmailText,
  generateWhatsAppReminderUrl,
} from '../utils/reminderEngine';

interface RentTrackerViewProps {
  state: AppState;
  activeYm: string;
  onChangeActiveYm: (ym: string) => void;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
  onNavigateToReminders: () => void;
  onNavigateToReceiptGenerator?: () => void;
  onNavigateToReminderGenerator?: () => void;
}

export const RentTrackerView: React.FC<RentTrackerViewProps> = ({
  state,
  activeYm,
  onChangeActiveYm,
  onUpdateState,
  onShowToast,
  onNavigateToReminders,
  onNavigateToReceiptGenerator,
  onNavigateToReminderGenerator,
}) => {
  const [recordTenantId, setRecordTenantId] = useState<string | null>(null);
  const [recAmount, setRecAmount] = useState<number>(0);
  const [recDate, setRecDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recMode, setRecMode] = useState<PaymentMode>('UPI');
  const [recNarration, setRecNarration] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const todayIso = new Date().toISOString().split('T')[0];
  const dueDay = state.landlord.dueDay || 5;
  const daysBefore = state.reminderSettings.daysBefore ?? 3;
  const dueDate = getDueDateForMonth(activeYm, dueDay);
  const triggerDate = getReminderTriggerDate(activeYm, dueDay, daysBefore);
  const daysUntil = getDaysUntilDue(todayIso, dueDate);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = activeYm.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    onChangeActiveYm(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  };

  const handleNextMonth = () => {
    const [y, m] = activeYm.split('-').map(Number);
    const d = new Date(y, m, 1);
    onChangeActiveYm(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onChangeActiveYm(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);
  };

  // Find payment for a tenant in active month
  const getPaymentFor = (tenantId: string) =>
    state.payments.find((p) => p.tenantId === tenantId && p.ym === activeYm);

  // Unpaid count
  const unpaidTenants = state.tenants.filter((t) => !getPaymentFor(t.id));
  const unpaidCount = unpaidTenants.length;

  // Open payment dialog
  const handleStartRecordPayment = (tenant: Tenant) => {
    setRecordTenantId(tenant.id);
    setRecAmount(tenant.monthlyRent);
    setRecDate(todayIso);
    setRecMode('UPI');
    setRecNarration(`UPI/Rent-${formatMonthYear(activeYm).slice(0, 3)}`);
  };

  // Save payment
  const handleSavePayment = (tenant: Tenant, andDownloadReceipt: boolean = true) => {
    if (!recAmount || recAmount <= 0) {
      onShowToast('Please enter a valid payment amount.');
      return;
    }

    const previousOut = tenant.outstandingBalance || 0;
    const totalDue = tenant.monthlyRent + previousOut;
    const newBalance = Math.max(0, totalDue - recAmount);

    const monthPaysCount = state.payments.filter((p) => p.ym === activeYm).length;
    const receiptNo = `R-${activeYm.replace('-', '')}-${pad2(monthPaysCount + 1)}`;

    const newPayment = {
      id: generateUid(),
      tenantId: tenant.id,
      ym: activeYm,
      amount: recAmount,
      date: recDate || todayIso,
      mode: recMode,
      narration: recNarration || 'Rent Payment',
      balanceOutstanding: newBalance,
      receiptNumber: receiptNo,
    };

    // Update tenant's outstanding balance
    const updatedTenants = state.tenants.map((t) =>
      t.id === tenant.id ? { ...t, outstandingBalance: newBalance } : t
    );

    const updatedState: AppState = {
      ...state,
      tenants: updatedTenants,
      payments: [newPayment, ...state.payments],
    };

    onUpdateState(updatedState);
    setRecordTenantId(null);

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0f766e', '#2dd4bf', '#10b981', '#f59e0b'],
      });
    } catch {
      // Ignore in test envs
    }

    onShowToast(`Payment of ${formatINR(recAmount)} recorded for ${tenant.name}!`);

    if (andDownloadReceipt) {
      const prop = state.properties.find((p) => p.id === tenant.propertyId);
      const doc = createReceiptPDF(state.landlord, tenant, prop, newPayment);
      downloadPdf(
        doc,
        `Rent-Receipt-${tenant.name.replace(/\s+/g, '-')}-${activeYm}.pdf`
      );
    }
  };

  // Generate Reminder PDF
  const handleDownloadReminderPdf = (tenant: Tenant) => {
    const prop = state.properties.find((p) => p.id === tenant.propertyId);
    const doc = createReminderPDF(state.landlord, tenant, prop, activeYm, dueDate);
    downloadPdf(
      doc,
      `Rent-Reminder-${tenant.name.replace(/\s+/g, '-')}-${activeYm}.pdf`
    );
    onShowToast(`Reminder PDF saved for ${tenant.name}`);
  };

  // Generate Receipt PDF for already paid tenant
  const handleDownloadReceiptPdf = (tenant: Tenant) => {
    const payment = getPaymentFor(tenant.id);
    if (!payment) return;
    const prop = state.properties.find((p) => p.id === tenant.propertyId);
    const doc = createReceiptPDF(state.landlord, tenant, prop, payment);
    downloadPdf(
      doc,
      `Rent-Receipt-${tenant.name.replace(/\s+/g, '-')}-${payment.ym}.pdf`
    );
    onShowToast(`Receipt PDF saved for ${tenant.name}`);
  };

  // Send single reminder email
  const handleSendReminderEmail = (tenant: Tenant) => {
    if (!tenant.email || !tenant.email.includes('@')) {
      onShowToast(`Cannot send email: ${tenant.name} has no email address configured.`);
      return;
    }
    const prop = state.properties.find((p) => p.id === tenant.propertyId);
    const totalDue = tenant.monthlyRent + (tenant.outstandingBalance || 0);

    const subject = `Rent Reminder: ${formatINR(totalDue)} due on ${formatDate(dueDate)} (${
      prop ? prop.name : 'Rental Unit'
    })`;
    const bodyHtml = generateReminderEmailHtml(state.landlord, tenant, prop, activeYm, dueDate);
    const bodyText = generateReminderEmailText(state.landlord, tenant, prop, activeYm, dueDate);

    const log = {
      id: generateUid(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      propertyTitle: prop ? prop.name : 'Rental Unit',
      ym: activeYm,
      dueDate,
      triggerDate,
      sentAt: new Date().toISOString(),
      subject,
      bodyHtml,
      bodyText,
      amountDue: totalDue,
      status: 'Sent' as const,
      triggerType: 'manual' as const,
      deliveryChannel: 'email' as const,
    };

    onUpdateState({
      ...state,
      reminderLogs: [log, ...state.reminderLogs],
    });
    onShowToast(`Reminder email dispatched to ${tenant.name} (${tenant.email})`);
  };

  return (
    <div className="space-y-6">
      {/* Month Selector Bar & Quick Stats */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <input
                type="month"
                value={activeYm}
                onChange={(e) => e.target.value && onChangeActiveYm(e.target.value)}
                className="bg-transparent font-bold text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>

            <button
              onClick={handleCurrentMonth}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              This Month
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tenant or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {onNavigateToReceiptGenerator && (
              <button
                onClick={onNavigateToReceiptGenerator}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 rounded-lg hover:bg-teal-100 transition-colors shrink-0"
              >
                <FileCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Receipt Gen</span>
              </button>
            )}

            {onNavigateToReminderGenerator && (
              <button
                onClick={onNavigateToReminderGenerator}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                <span>Reminder Gen</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Status Banner */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {unpaidCount > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs">
              <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{unpaidCount} tenant{unpaidCount > 1 ? 's' : ''}</strong> pending payment for{' '}
                  <strong>{formatMonthYear(activeYm)}</strong>. Rent due on{' '}
                  <strong>{formatDate(dueDate)}</strong>.
                </span>
              </div>
              <button
                onClick={onNavigateToReminders}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 rounded-md transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <Sparkles className="w-3 h-3 text-amber-700 dark:text-amber-300" />
                <span>Automated 3-Day Reminders &rarr;</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 text-xs text-teal-900 dark:text-teal-200 font-medium">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                All tenants have completed rent payment for {formatMonthYear(activeYm)}! All official
                receipts are issued.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tenant Rent Roll Cards */}
      <div className="space-y-4">
        {state.tenants
          .filter(
            (t) =>
              !searchQuery ||
              t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .map((tenant) => {
            const property = state.properties.find((p) => p.id === tenant.propertyId);
            const payment = getPaymentFor(tenant.id);
            const isPaid = Boolean(payment);
            const totalPayable = tenant.monthlyRent + (tenant.outstandingBalance || 0);

            const lastLog = state.reminderLogs.find(
              (l) => l.tenantId === tenant.id && l.ym === activeYm
            );

            const isRecording = recordTenantId === tenant.id;

            return (
              <div
                key={tenant.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {tenant.name}
                      </h3>
                      {isPaid ? (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                          Paid
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                          Payment Due
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>{property ? property.name : 'No property linked'}</span>
                      <span>&middot;</span>
                      <span>
                        Rent:{' '}
                        <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                          {formatINR(tenant.monthlyRent)}
                        </span>
                      </span>
                      {tenant.outstandingBalance ? (
                        <>
                          <span>&middot;</span>
                          <span className="text-amber-600 dark:text-amber-400 font-mono">
                            Dues: {formatINR(tenant.outstandingBalance)}
                          </span>
                        </>
                      ) : null}
                      <span>&middot;</span>
                      <span className="text-teal-700 dark:text-teal-400 font-mono">
                        Deposit Paid: {formatINR(tenant.depositPaid ?? tenant.securityDeposit)}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono tabular-nums">
                    <div className="text-xs text-slate-400">Total Payable</div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(totalPayable)}
                    </div>
                  </div>
                </div>

                {/* Sub-strip with reminder status */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Receipt: {payment?.receiptNumber} &middot; Received on{' '}
                        {formatDate(payment?.date)} via {payment?.mode}
                      </span>
                    ) : lastLog ? (
                      <span className="text-teal-700 dark:text-teal-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        3-Day Automated Reminder sent to {lastLog.tenantEmail} on{' '}
                        {formatDate(lastLog.sentAt.split('T')[0])}
                      </span>
                    ) : tenant.email ? (
                      <span className="text-slate-500">
                        Automated reminder email scheduled 3 days before due date (
                        {formatDate(triggerDate)})
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        No tenant email specified &mdash; update in Tenants tab for auto-reminders
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-mono">Due: {formatDate(dueDate)}</div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleDownloadReminderPdf(tenant)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reminder PDF</span>
                  </button>

                  {!isPaid && (
                    <>
                      <button
                        onClick={() => handleSendReminderEmail(tenant)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-teal-600" />
                        <span>Send Reminder Email</span>
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleStartRecordPayment(tenant)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Record Rent Received</span>
                      </button>
                    </>
                  )}

                  {isPaid && (
                    <button
                      onClick={() => handleDownloadReceiptPdf(tenant)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Download Receipt PDF</span>
                    </button>
                  )}
                </div>

                {/* Inline Record Rent Received Form */}
                {isRecording && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Record Payment &middot; {tenant.name}
                      </h4>
                      <span className="text-xs text-slate-500">Month: {formatMonthYear(activeYm)}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 mb-1">
                          Amount Received (₹)
                        </label>
                        <input
                          type="number"
                          value={recAmount}
                          onChange={(e) => setRecAmount(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 mb-1">
                          Date Received
                        </label>
                        <input
                          type="date"
                          value={recDate}
                          onChange={(e) => setRecDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 mb-1">
                          Payment Mode
                        </label>
                        <select
                          value={recMode}
                          onChange={(e) => setRecMode(e.target.value as PaymentMode)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                        >
                          <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                          <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Demand Draft">Demand Draft</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 mb-1">
                          Narration / UTR Reference
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. UTR #7192830112"
                          value={recNarration}
                          onChange={(e) => setRecNarration(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setRecordTenantId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={() => handleSavePayment(tenant, false)}
                        className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Save Only
                      </button>

                      <button
                        onClick={() => handleSavePayment(tenant, true)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Save &amp; Generate Receipt PDF</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
