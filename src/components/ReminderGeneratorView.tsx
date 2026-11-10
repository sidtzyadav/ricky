import React, { useState, useMemo } from 'react';
import {
  Bell,
  Send,
  MessageSquare,
  Download,
  Copy,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  User,
  Sparkles,
  QrCode,
  AlertTriangle,
  Receipt,
  FileDown,
} from 'lucide-react';
import { AppState, Tenant, Property } from '../types';
import {
  formatINR,
  formatDate,
  formatMonthYear,
  getDueDateForMonth,
  getReminderTriggerDate,
  getDaysUntilDue,
  getCurrentYm,
  getTodayIso,
  generateUid,
} from '../utils/formatters';
import { generateWhatsAppReminderUrl } from '../utils/reminderEngine';
import { createReminderPDF, downloadPdf } from '../utils/pdfGenerator';
import { jsPDF } from 'jspdf';

interface ReminderGeneratorViewProps {
  state: AppState;
  activeYm: string;
  onChangeActiveYm: (ym: string) => void;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

type ReminderTone = 'friendly' | 'dueToday' | 'overdue' | 'custom';

export const ReminderGeneratorView: React.FC<ReminderGeneratorViewProps> = ({
  state,
  activeYm,
  onChangeActiveYm,
  onUpdateState,
  onShowToast,
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    state.tenants[0]?.id || 'custom'
  );

  // Template / Tone
  const [reminderTone, setReminderTone] = useState<ReminderTone>('friendly');

  // Recipient details
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [propertyName, setPropertyName] = useState<string>('');
  const [propertyAddress, setPropertyAddress] = useState<string>('');

  // Cycle & Due Date
  const [billingMonth, setBillingMonth] = useState<string>(activeYm || getCurrentYm());
  const dueDay = state.landlord.dueDay || 5;
  const [dueDate, setDueDate] = useState<string>(() => getDueDateForMonth(activeYm, dueDay));

  // Itemized Charges
  const [baseRent, setBaseRent] = useState<number>(22000);
  const [electricityBill, setElectricityBill] = useState<number>(0);
  const [waterCharges, setWaterCharges] = useState<number>(0);
  const [maintenanceFee, setMaintenanceFee] = useState<number>(0);
  const [pastOutstanding, setPastOutstanding] = useState<number>(0);

  // Custom Message
  const [customNote, setCustomNote] = useState<string>('');

  // Copied indicator
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Auto populate from selected tenant
  const applyTenantData = (tId: string) => {
    if (tId === 'custom') {
      setRecipientName('Tenant Name');
      setRecipientEmail('');
      setRecipientPhone('');
      setPropertyName('Apartment / Flat');
      setPropertyAddress('');
      setBaseRent(20000);
      setPastOutstanding(0);
      setElectricityBill(0);
      setWaterCharges(0);
      setMaintenanceFee(0);
      return;
    }

    const t = state.tenants.find((item) => item.id === tId);
    if (!t) return;

    const p = state.properties.find((item) => item.id === t.propertyId);
    setRecipientName(t.name);
    setRecipientEmail(t.email || '');
    setRecipientPhone(t.phone || '');
    setPropertyName(p ? p.name : 'Rental Property');
    setPropertyAddress(p?.address || '');
    setBaseRent(t.monthlyRent);
    setPastOutstanding(t.outstandingBalance || 0);
  };

  const handleTenantSelect = (tId: string) => {
    setSelectedTenantId(tId);
    applyTenantData(tId);
  };

  // Sync when activeYm or dueDay changes
  React.useEffect(() => {
    setDueDate(getDueDateForMonth(billingMonth, dueDay));
  }, [billingMonth, dueDay]);

  // Initial load sync
  React.useEffect(() => {
    if (selectedTenantId && selectedTenantId !== 'custom') {
      applyTenantData(selectedTenantId);
    }
  }, [selectedTenantId]);

  // Total amount payable
  const totalPayable = useMemo(() => {
    return (
      (Number(baseRent) || 0) +
      (Number(electricityBill) || 0) +
      (Number(waterCharges) || 0) +
      (Number(maintenanceFee) || 0) +
      (Number(pastOutstanding) || 0)
    );
  }, [baseRent, electricityBill, waterCharges, maintenanceFee, pastOutstanding]);

  // Days remaining
  const daysRemaining = useMemo(() => {
    return getDaysUntilDue(getTodayIso(), dueDate);
  }, [dueDate]);

  // Tone Subject Line & Greeting
  const subjectLine = useMemo(() => {
    if (reminderTone === 'dueToday') {
      return `URGENT: Rent Payment Due Today - ${formatINR(totalPayable)} for ${formatMonthYear(billingMonth)}`;
    }
    if (reminderTone === 'overdue') {
      return `OVERDUE NOTICE: Immediate Rent Settlement Required - ${formatINR(totalPayable)} (${propertyName})`;
    }
    return `Upcoming Rent Reminder: ${formatINR(totalPayable)} due on ${formatDate(dueDate)} (${formatMonthYear(billingMonth)})`;
  }, [reminderTone, totalPayable, billingMonth, dueDate, propertyName]);

  // Formatted Message Text
  const messageBodyText = useMemo(() => {
    const l = state.landlord;
    const greeting = `Dear ${recipientName || 'Tenant'},\n\n`;

    let toneParagraph = '';
    if (reminderTone === 'dueToday') {
      toneParagraph = `This is an urgent reminder that your monthly rent for ${formatMonthYear(
        billingMonth
      )} is DUE TODAY (${formatDate(dueDate)}).\n\n`;
    } else if (reminderTone === 'overdue') {
      toneParagraph = `Please note that your monthly rent for ${formatMonthYear(
        billingMonth
      )} is now OVERDUE. Kindly settle the total balance immediately to avoid late payment adjustments.\n\n`;
    } else {
      toneParagraph = `This is a courteous reminder that your monthly rent for ${formatMonthYear(
        billingMonth
      )} is due on ${formatDate(dueDate)} (${daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Due soon'}).\n\n`;
    }

    let breakdown = `*Payment Breakdown:*\n• Base Rent: ${formatINR(baseRent)}\n`;
    if (electricityBill > 0) breakdown += `• Electricity Bill: ${formatINR(electricityBill)}\n`;
    if (waterCharges > 0) breakdown += `• Water Charges: ${formatINR(waterCharges)}\n`;
    if (maintenanceFee > 0) breakdown += `• Society Maintenance: ${formatINR(maintenanceFee)}\n`;
    if (pastOutstanding > 0) breakdown += `• Past Outstanding Dues: ${formatINR(pastOutstanding)}\n`;
    breakdown += `*Total Amount Payable: ${formatINR(totalPayable)}*\n\n`;

    let bankInfo = `*Payment Details:*\n`;
    if (l.upiId) bankInfo += `• UPI ID: ${l.upiId}\n`;
    if (l.bankName) {
      bankInfo += `• Bank: ${l.bankName}\n• Account: ${l.accountNumber || '-'}\n• IFSC: ${l.ifsc || '-'}\n• Beneficiary: ${l.name}\n`;
    }

    const note = customNote ? `\n*Note:* ${customNote}\n` : '';
    const footer = `\nPlease share the transaction reference / screenshot once paid so your receipt can be generated.\n\nWarm regards,\n${l.name || 'Landlord'}\nContact: ${l.phone || '-'}`;

    return greeting + toneParagraph + breakdown + bankInfo + note + footer;
  }, [
    recipientName,
    reminderTone,
    billingMonth,
    dueDate,
    daysRemaining,
    baseRent,
    electricityBill,
    waterCharges,
    maintenanceFee,
    pastOutstanding,
    totalPayable,
    state.landlord,
    customNote,
  ]);

  // WhatsApp Share Link
  const whatsappUrl = useMemo(() => {
    const phone = (recipientPhone || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(messageBodyText);
    return phone ? `https://wa.me/${phone.startsWith('91') ? phone : `91${phone}`}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  }, [recipientPhone, messageBodyText]);

  // Direct UPI Link
  const upiPayUrl = useMemo(() => {
    if (!state.landlord.upiId) return '';
    const pa = encodeURIComponent(state.landlord.upiId);
    const pn = encodeURIComponent(state.landlord.name || 'Landlord');
    const am = totalPayable.toFixed(2);
    const tn = encodeURIComponent(`Rent for ${formatMonthYear(billingMonth)}`);
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
  }, [state.landlord, totalPayable, billingMonth]);

  // Download Formal Reminder PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Primary Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 118, 110);
    doc.text('RENT PAYMENT REMINDER NOTICE', 105, 22, { align: 'center' });

    // Subtitle
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Official Notice Date: ${formatDate(getTodayIso())}`, 105, 27, { align: 'center' });

    // Divider
    doc.setDrawColor(200, 205, 215);
    doc.setLineWidth(0.5);
    doc.line(15, 31, 195, 31);

    let y = 42;
    doc.setFontSize(10);

    const rows: [string, string][] = [
      ['Tenant Name', recipientName || 'Tenant'],
      ['Rented Property', `${propertyName}${propertyAddress ? `, ${propertyAddress}` : ''}`],
      ['Rent Billing Month', formatMonthYear(billingMonth)],
      ['Base Monthly Rent', formatINR(baseRent)],
    ];

    if (electricityBill > 0) rows.push(['Electricity Charges', formatINR(electricityBill)]);
    if (waterCharges > 0) rows.push(['Water Charges', formatINR(waterCharges)]);
    if (maintenanceFee > 0) rows.push(['Maintenance / Society Fee', formatINR(maintenanceFee)]);
    if (pastOutstanding > 0) rows.push(['Past Outstanding Balance', formatINR(pastOutstanding)]);

    rows.push(['TOTAL AMOUNT PAYABLE', formatINR(totalPayable)]);
    rows.push(['PAYMENT DUE DATE', formatDate(dueDate)]);

    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(label, 15, y);

      const isHighlight = label === 'TOTAL AMOUNT PAYABLE' || label === 'PAYMENT DUE DATE';
      doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
      doc.setTextColor(isHighlight ? 15 : 15, isHighlight ? 118 : 23, isHighlight ? 110 : 42);

      const splitValue = doc.splitTextToSize(value || '-', 120);
      doc.text(splitValue, 70, y);
      y += 5.5 * splitValue.length + 2;
    });

    // Body Notice Box
    y += 4;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, 180, 28, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    const noticeDesc = `Dear ${recipientName},\n\nKindly note that your monthly rental payment of ${formatINR(
      totalPayable
    )} for ${formatMonthYear(
      billingMonth
    )} is due on ${formatDate(
      dueDate
    )}. Please ensure the transfer is completed via UPI or Net Banking on or before the due date.\n\nThank you for your prompt cooperation.`;

    const splitDesc = doc.splitTextToSize(noticeDesc, 172);
    doc.text(splitDesc, 19, y + 6);

    y += 38;

    // Landlord Payment Coordinates
    const l = state.landlord;
    if (l.bankName || l.upiId) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 118, 110);
      doc.text('PAYMENT INSTRUCTIONS & BANK COORDINATES:', 15, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      if (l.upiId) {
        doc.text(`• UPI ID: ${l.upiId}`, 15, y);
        y += 5;
      }
      if (l.bankName) {
        doc.text(
          `• Bank: ${l.bankName}  |  A/C No: ${l.accountNumber || '-'}  |  IFSC Code: ${l.ifsc || '-'}`,
          15,
          y
        );
        y += 5;
        doc.text(`• Beneficiary Account Holder: ${l.name}`, 15, y);
        y += 7;
      }
    }

    // Signature
    y = Math.max(y + 8, 230);
    doc.setDrawColor(180, 190, 205);
    doc.line(130, y, 195, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Landlord / Property Manager', 130, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(l.name || 'Landlord', 130, y + 11);

    const filename = `Rent-Reminder-${(recipientName || 'Tenant').replace(/\s+/g, '-')}-${billingMonth}.pdf`;
    downloadPdf(doc, filename);
    onShowToast(`Downloaded formal reminder notice: ${filename}`);
  };

  // Copy message text
  const handleCopyText = () => {
    navigator.clipboard.writeText(messageBodyText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
    onShowToast('Reminder message text copied to clipboard!');
  };

  // Send Email Reminder
  const handleSendEmail = () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      onShowToast(`Please provide a valid recipient email address.`);
      return;
    }

    const t = state.tenants.find((item) => item.id === selectedTenantId);

    const log = {
      id: generateUid(),
      tenantId: t ? t.id : generateUid(),
      tenantName: recipientName,
      tenantEmail: recipientEmail,
      propertyTitle: propertyName,
      ym: billingMonth,
      dueDate,
      triggerDate: getTodayIso(),
      sentAt: new Date().toISOString(),
      subject: subjectLine,
      bodyHtml: `<div style="font-family: sans-serif; line-height: 1.5;">${messageBodyText.replace(
        /\n/g,
        '<br/>'
      )}</div>`,
      bodyText: messageBodyText,
      amountDue: totalPayable,
      status: 'Sent' as const,
      triggerType: 'manual' as const,
      deliveryChannel: 'email' as const,
    };

    onUpdateState({
      ...state,
      reminderLogs: [log, ...state.reminderLogs],
    });

    onShowToast(`Reminder email dispatched to ${recipientName} (${recipientEmail})!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-400">
              <Bell className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Rent Reminder Generator
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Draft, customize, and dispatch professional rent reminder notices with itemized utility charges, UPI payment coordinates, and 1-click WhatsApp/PDF delivery.
          </p>
        </div>

        {/* Tone Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setReminderTone('friendly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              reminderTone === 'friendly'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            3 Days Before
          </button>
          <button
            onClick={() => setReminderTone('dueToday')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              reminderTone === 'dueToday'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Due Today
          </button>
          <button
            onClick={() => setReminderTone('overdue')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              reminderTone === 'overdue'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Overdue Notice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tenant & Property Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>Recipient Tenant</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Choose Tenant
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantSelect(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="custom">+ Custom / External Recipient</option>
                {state.tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} &bull; Rent: {formatINR(t.monthlyRent)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tenant Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="tenant@example.com"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mobile / WhatsApp
                </label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Property Name
                </label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Billing Cycle & Itemized Charges */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <span>Rent &amp; Utility Itemizer</span>
              </span>
              <span className="text-xs font-bold font-mono text-teal-700 dark:text-teal-400">
                Total: {formatINR(totalPayable)}
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Billing Month
                </label>
                <input
                  type="month"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Base Monthly Rent (₹)
                </label>
                <input
                  type="number"
                  value={baseRent}
                  onChange={(e) => setBaseRent(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Past Dues (₹)
                </label>
                <input
                  type="number"
                  value={pastOutstanding}
                  onChange={(e) => setPastOutstanding(Number(e.target.value))}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Optional Utility Add-ons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Utility &amp; Maintenance Add-ons (Optional)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Electricity (₹)</label>
                  <input
                    type="number"
                    value={electricityBill}
                    onChange={(e) => setElectricityBill(Number(e.target.value))}
                    className="w-full text-xs font-mono px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Water (₹)</label>
                  <input
                    type="number"
                    value={waterCharges}
                    onChange={(e) => setWaterCharges(Number(e.target.value))}
                    className="w-full text-xs font-mono px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Society (₹)</label>
                  <input
                    type="number"
                    value={maintenanceFee}
                    onChange={(e) => setMaintenanceFee(Number(e.target.value))}
                    className="w-full text-xs font-mono px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Custom Landlord Note / Instructions
              </label>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Please deduct ₹500 for plumbing repair invoice shared on 2nd Nov."
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Area: Interactive Preview & Dispatch (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Notice Status:{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {daysRemaining > 0
                  ? `${daysRemaining} days remaining`
                  : daysRemaining === 0
                  ? 'Payment Due Today'
                  : `Overdue by ${Math.abs(daysRemaining)} days`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>

              <button
                onClick={handleSendEmail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 rounded-lg hover:bg-teal-100 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-teal-600" />
                <span>Dispatch Email</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Notice</span>
              </button>
            </div>
          </div>

          {/* Interactive Letterhead Preview */}
          <div className="bg-white text-slate-900 border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-md font-sans space-y-6">
            {/* Header */}
            <div className="border-b-2 border-teal-700 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider">
                  Official Communication
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  RENT PAYMENT REMINDER
                </h1>
                <div className="text-xs text-slate-500 mt-0.5">
                  Period: <span className="font-semibold text-slate-800">{formatMonthYear(billingMonth)}</span> &bull; Due: <span className="font-semibold text-teal-800">{formatDate(dueDate)}</span>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs">
                <div className="font-bold text-slate-900">{state.landlord.name || 'Landlord Office'}</div>
                <div className="text-slate-500 text-[11px]">{state.landlord.phone || '-'}</div>
              </div>
            </div>

            {/* Recipient Details & Subject */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                <span className="text-slate-400">To: </span>
                <span className="font-bold text-slate-900">{recipientName}</span>
                {recipientPhone && <span className="text-slate-500 font-mono ml-2">({recipientPhone})</span>}
              </div>
              <div>
                <span className="text-slate-400">Premises: </span>
                <span className="font-medium text-slate-800">{propertyName}</span>
              </div>
              <div className="pt-1 text-slate-700 font-semibold border-t border-slate-200 mt-1">
                Subject: {subjectLine}
              </div>
            </div>

            {/* Charges Table */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Itemized Dues &amp; Charges
              </div>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 font-semibold text-left">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="py-2 px-3 font-sans">Monthly House Rent ({formatMonthYear(billingMonth)})</td>
                    <td className="py-2 px-3 text-right font-bold">{formatINR(baseRent)}</td>
                  </tr>
                  {electricityBill > 0 && (
                    <tr>
                      <td className="py-2 px-3 font-sans">Electricity Sub-meter Charges</td>
                      <td className="py-2 px-3 text-right">{formatINR(electricityBill)}</td>
                    </tr>
                  )}
                  {waterCharges > 0 && (
                    <tr>
                      <td className="py-2 px-3 font-sans">Water Consumption Charges</td>
                      <td className="py-2 px-3 text-right">{formatINR(waterCharges)}</td>
                    </tr>
                  )}
                  {maintenanceFee > 0 && (
                    <tr>
                      <td className="py-2 px-3 font-sans">Society Maintenance Fee</td>
                      <td className="py-2 px-3 text-right">{formatINR(maintenanceFee)}</td>
                    </tr>
                  )}
                  {pastOutstanding > 0 && (
                    <tr className="text-amber-800 bg-amber-50/50">
                      <td className="py-2 px-3 font-sans font-medium">Previous Balance Outstanding</td>
                      <td className="py-2 px-3 text-right font-bold">{formatINR(pastOutstanding)}</td>
                    </tr>
                  )}
                  <tr className="bg-teal-50/70 text-teal-900 font-bold text-sm">
                    <td className="py-2.5 px-3 font-sans">TOTAL AMOUNT DUE</td>
                    <td className="py-2.5 px-3 text-right">{formatINR(totalPayable)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bank & UPI Payment Box */}
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 text-xs space-y-2">
              <div className="font-bold uppercase tracking-wider text-teal-900 text-[11px] flex items-center justify-between">
                <span>Direct Payment Coordinates</span>
                <span className="text-[10px] text-teal-700 font-normal">Instant Credit</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500">Bank &amp; Account Number</div>
                  <div className="font-mono font-semibold">
                    {state.landlord.bankName || 'HDFC Bank'} &bull; {state.landlord.accountNumber || '-'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    IFSC: {state.landlord.ifsc || '-'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500">UPI Payment Handle</div>
                  <div className="font-mono font-bold text-teal-800 text-sm">
                    {state.landlord.upiId || 'landlord@upi'}
                  </div>
                  {upiPayUrl && (
                    <a
                      href={upiPayUrl}
                      className="text-[10px] font-semibold text-teal-700 underline block mt-0.5"
                    >
                      Click to Pay via UPI App &rarr;
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Note */}
            {customNote && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 italic">
                Note: {customNote}
              </div>
            )}

            {/* Sign off */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>Issued by {state.landlord.name || 'Landlord'}</div>
              <div className="font-mono font-semibold text-teal-800">
                Payment Due: {formatDate(dueDate)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
