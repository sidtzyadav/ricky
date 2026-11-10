import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  CheckCircle2,
  Building,
  User,
  CreditCard,
  Calendar,
  ShieldCheck,
  RotateCcw,
  PlusCircle,
  ExternalLink,
  Save,
} from 'lucide-react';
import { AppState, Tenant, Property, PaymentMode, PaymentRecord } from '../types';
import {
  formatINR,
  formatDate,
  formatMonthYear,
  maskAadhaar,
  getCurrentYm,
  getTodayIso,
  numberToWordsINR,
  generateUid,
} from '../utils/formatters';
import { createReceiptPDF, createDepositReceiptPDF, downloadPdf } from '../utils/pdfGenerator';
import { jsPDF } from 'jspdf';

interface ReceiptGeneratorViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

type ReceiptType = 'rent' | 'deposit';

export const ReceiptGeneratorView: React.FC<ReceiptGeneratorViewProps> = ({
  state,
  onUpdateState,
  onShowToast,
}) => {
  // Mode: Rent Receipt or Security Deposit Receipt
  const [receiptType, setReceiptType] = useState<ReceiptType>('rent');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    state.tenants[0]?.id || 'custom'
  );

  // Form Fields
  const [receiptNumber, setReceiptNumber] = useState<string>(() => `REC-${Date.now().toString().slice(-6)}`);
  const [receiptDate, setReceiptDate] = useState<string>(getTodayIso());
  const [billingYm, setBillingYm] = useState<string>(getCurrentYm());
  const [billingPeriodFrom, setBillingPeriodFrom] = useState<string>(() => {
    const today = getTodayIso();
    return today.slice(0, 8) + '01';
  });
  const [billingPeriodTo, setBillingPeriodTo] = useState<string>(getTodayIso());

  // Tenant / Property Data
  const [tenantName, setTenantName] = useState<string>('');
  const [tenantPan, setTenantPan] = useState<string>('');
  const [propertyName, setPropertyName] = useState<string>('');
  const [propertyAddress, setPropertyAddress] = useState<string>('');

  // Financial Figures
  const [amountPaid, setAmountPaid] = useState<number>(22000);
  const [agreedDeposit, setAgreedDeposit] = useState<number>(60000);
  const [depositBalance, setDepositBalance] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>('UPI/3321948194');
  const [narration, setNarration] = useState<string>('House rent for residential premises');

  // Landlord overrides
  const [landlordName, setLandlordName] = useState<string>(state.landlord.name || '');
  const [landlordPan, setLandlordPan] = useState<string>(state.landlord.pan || '');
  const [landlordAadhaar, setLandlordAadhaar] = useState<string>(state.landlord.aadhaar || '');
  const [bankName, setBankName] = useState<string>(state.landlord.bankName || '');
  const [accountNumber, setAccountNumber] = useState<string>(state.landlord.accountNumber || '');
  const [ifsc, setIfsc] = useState<string>(state.landlord.ifsc || '');
  const [upiId, setUpiId] = useState<string>(state.landlord.upiId || '');

  // Copied state indicator
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Sync when selected tenant changes
  const applyTenantData = (tId: string, type: ReceiptType = receiptType) => {
    if (tId === 'custom') {
      setTenantName('');
      setTenantPan('');
      setPropertyName('Apartment / Rental Property');
      setPropertyAddress('');
      if (type === 'rent') {
        setAmountPaid(20000);
        setNarration('Monthly House Rent Payment');
        setReceiptNumber(`REC-${Date.now().toString().slice(-6)}`);
      } else {
        setAgreedDeposit(50000);
        setAmountPaid(50000);
        setDepositBalance(0);
        setNarration('Security Deposit Paid by Tenant');
        setReceiptNumber(`DEP-${Date.now().toString().slice(-6)}`);
      }
      return;
    }

    const t = state.tenants.find((item) => item.id === tId);
    if (!t) return;

    const p = state.properties.find((item) => item.id === t.propertyId);

    setTenantName(t.name);
    setTenantPan(t.pan || '');
    setPropertyName(p ? p.name : 'Rental Property');
    setPropertyAddress(p?.address || '');

    if (type === 'rent') {
      setAmountPaid(t.monthlyRent);
      setNarration(`Rent for ${formatMonthYear(billingYm)} - ${p ? p.name : ''}`);
      setReceiptNumber(`REC-${billingYm.replace('-', '')}-${t.id.slice(-4).toUpperCase()}`);
    } else {
      const depPaid = t.depositPaid ?? t.securityDeposit;
      setAgreedDeposit(t.securityDeposit);
      setAmountPaid(depPaid);
      setDepositBalance(Math.max(0, t.securityDeposit - depPaid));
      setPaymentMode(t.depositPaymentMode || 'Bank Transfer');
      setTransactionRef(t.depositNarration || `DEP-UTR-${Date.now().toString().slice(-6)}`);
      setNarration(`Security deposit paid for ${p ? p.name : 'residential premises'}`);
      setReceiptNumber(`DEP-${(t.leaseStartDate || '2026').replace(/-/g, '').slice(0, 6)}-${t.id.slice(-4).toUpperCase()}`);
    }
  };

  // Handle tenant select change
  const handleTenantSelect = (tId: string) => {
    setSelectedTenantId(tId);
    applyTenantData(tId, receiptType);
  };

  // Handle receipt type change
  const handleReceiptTypeChange = (newType: ReceiptType) => {
    setReceiptType(newType);
    applyTenantData(selectedTenantId, newType);
  };

  // Auto-init tenant data on mount or change
  React.useEffect(() => {
    if (selectedTenantId && selectedTenantId !== 'custom') {
      applyTenantData(selectedTenantId, receiptType);
    }
  }, [billingYm]);

  // Amount in words
  const amountInWords = useMemo(() => numberToWordsINR(amountPaid), [amountPaid]);

  // Generate PDF download
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const isRent = receiptType === 'rent';

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 118, 110);
    doc.text(isRent ? 'RENT RECEIPT' : 'SECURITY DEPOSIT RECEIPT', 105, 22, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      isRent
        ? 'Issued for House Rent Allowance (HRA) Exemption under Section 10(13A) of Income Tax Act'
        : 'Acknowledgment of Refundable Rental Security Deposit Paid by Tenant',
      105,
      27,
      { align: 'center' }
    );

    doc.setDrawColor(200, 205, 215);
    doc.setLineWidth(0.5);
    doc.line(15, 31, 195, 31);

    let y = 42;
    doc.setFontSize(10);

    const rows: [string, string][] = isRent
      ? [
          ['Receipt Number', receiptNumber],
          ['Receipt Date', formatDate(receiptDate)],
          ['Tenant Name', tenantName || 'Tenant'],
          ['Property Address', `${propertyName}${propertyAddress ? `, ${propertyAddress}` : ''}`],
          ['Rental Period', formatMonthYear(billingYm)],
          ['Amount Received', formatINR(amountPaid)],
          ['Amount in Words', amountInWords],
          ['Payment Mode', paymentMode],
          ['Transaction / UTR Ref', transactionRef || '-'],
          ['Narration / Purpose', narration || 'Monthly House Rent'],
        ]
      : [
          ['Receipt Number', receiptNumber],
          ['Date Received', formatDate(receiptDate)],
          ['Tenant Name', tenantName || 'Tenant'],
          ['Property Rented', `${propertyName}${propertyAddress ? `, ${propertyAddress}` : ''}`],
          ['Agreed Security Deposit', formatINR(agreedDeposit)],
          ['Actual Deposit Paid by Him', formatINR(amountPaid)],
          ['Deposit Balance Due', formatINR(depositBalance)],
          ['Amount in Words', amountInWords],
          ['Payment Mode', paymentMode],
          ['Transaction / UTR Ref', transactionRef || '-'],
        ];

    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(label, 15, y);

      const isHighlight = label === 'Amount Received' || label === 'Actual Deposit Paid by Him';
      doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
      doc.setTextColor(isHighlight ? 15 : 15, isHighlight ? 118 : 23, isHighlight ? 110 : 42);

      const splitValue = doc.splitTextToSize(value || '-', 120);
      doc.text(splitValue, 68, y);
      y += 5.2 * splitValue.length + 2;
    });

    // Formal acknowledgment box
    y += 5;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, y, 180, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    const ack = isRent
      ? `Received with thanks from ${tenantName || 'the tenant'} the sum of ${formatINR(
          amountPaid
        )} (${amountInWords}) towards residential house rent for ${formatMonthYear(
          billingYm
        )} situated at ${propertyName}${propertyAddress ? `, ${propertyAddress}` : ''}.`
      : `Received with thanks from ${tenantName || 'the tenant'} the sum of ${formatINR(
          amountPaid
        )} (${amountInWords}) towards security deposit for rented premises situated at ${propertyName}. Subject to terms of Lease Agreement.`;

    const splitAck = doc.splitTextToSize(ack, 172);
    doc.text(splitAck, 19, y + 6);

    y += 32;

    // Bank Credited To
    if (bankName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Payment Credited To:', 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${bankName} | A/C: ${accountNumber || '-'} | IFSC: ${ifsc || '-'} | UPI: ${upiId || '-'}`, 53, y);
      y += 8;
    }

    // Landlord Signature Block
    y = Math.max(y + 8, 228);
    doc.setDrawColor(180, 190, 205);
    doc.line(130, y, 195, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Landlord Signature & Stamp', 130, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(landlordName || 'Landlord', 130, y + 11);

    // Tax Compliance Footer
    y = 275;
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y - 4, 195, y - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Landlord: ${landlordName || '-'}   |   Landlord PAN: ${landlordPan || '-'}   |   Aadhaar: ${maskAadhaar(
        landlordAadhaar
      )}`,
      15,
      y
    );
    doc.text(`Tenant: ${tenantName || '-'}   |   Tenant PAN: ${tenantPan || '-'}`, 15, y + 4.5);

    const filename = `${receiptType === 'rent' ? 'Rent-Receipt' : 'Deposit-Receipt'}-${(
      tenantName || 'Tenant'
    ).replace(/\s+/g, '-')}-${receiptNumber}.pdf`;

    downloadPdf(doc, filename);
    onShowToast(`Downloaded official receipt PDF: ${filename}`);
  };

  // Copy text receipt to clipboard
  const handleCopyText = () => {
    const isRent = receiptType === 'rent';
    const text = isRent
      ? `*RENT RECEIPT (HRA COMPLIANT)*\nReceipt No: ${receiptNumber}\nDate: ${formatDate(
          receiptDate
        )}\n\nTenant: ${tenantName}\nProperty: ${propertyName}, ${propertyAddress}\nRental Period: ${formatMonthYear(
          billingYm
        )}\nAmount Paid: ${formatINR(
          amountPaid
        )} (${amountInWords})\nPayment Mode: ${paymentMode}\nUTR / Ref: ${transactionRef}\n\n*Landlord Details:*\nName: ${landlordName}\nPAN: ${landlordPan}\nAadhaar: ${maskAadhaar(
          landlordAadhaar
        )}\nBank: ${bankName} | A/C: ${accountNumber} | IFSC: ${ifsc}`
      : `*SECURITY DEPOSIT RECEIPT*\nReceipt No: ${receiptNumber}\nDate: ${formatDate(
          receiptDate
        )}\n\nTenant: ${tenantName}\nProperty: ${propertyName}\nAgreed Deposit: ${formatINR(
          agreedDeposit
        )}\nDeposit Paid: ${formatINR(
          amountPaid
        )}\nBalance Due: ${formatINR(
          depositBalance
        )}\nIn Words: ${amountInWords}\nPayment Mode: ${paymentMode}\nUTR / Ref: ${transactionRef}\n\n*Landlord:* ${landlordName} (PAN: ${landlordPan})`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
    onShowToast('Formatted receipt text copied to clipboard!');
  };

  // Print receipt
  const handlePrint = () => {
    window.print();
  };

  // Save as recorded payment into tenant's ledger
  const handleSaveToLedger = () => {
    if (selectedTenantId === 'custom') {
      onShowToast('Please select an existing tenant from your portfolio to record in ledger.');
      return;
    }

    const t = state.tenants.find((item) => item.id === selectedTenantId);
    if (!t) return;

    if (receiptType === 'rent') {
      const newPayment: PaymentRecord = {
        id: generateUid(),
        tenantId: t.id,
        ym: billingYm,
        date: receiptDate,
        amount: Number(amountPaid) || 0,
        mode: paymentMode,
        narration: transactionRef ? `${narration} (Ref: ${transactionRef})` : narration,
        receiptNumber,
        balanceOutstanding: Math.max(0, (t.outstandingBalance || 0) + t.monthlyRent - amountPaid),
      };

      const updatedTenants = state.tenants.map((item) => {
        if (item.id === t.id) {
          const newOutstanding = Math.max(0, (item.outstandingBalance || 0) - (Number(amountPaid) - item.monthlyRent));
          return { ...item, outstandingBalance: newOutstanding };
        }
        return item;
      });

      onUpdateState({
        ...state,
        tenants: updatedTenants,
        payments: [newPayment, ...state.payments],
      });
      onShowToast(`Recorded rent payment of ${formatINR(amountPaid)} into ${t.name}'s ledger!`);
    } else {
      // Update deposit paid for tenant
      const updatedTenants = state.tenants.map((item) => {
        if (item.id === t.id) {
          return {
            ...item,
            depositPaid: Number(amountPaid) || 0,
            depositPaidDate: receiptDate,
            depositPaymentMode: paymentMode,
            depositNarration: transactionRef || narration,
          };
        }
        return item;
      });

      onUpdateState({
        ...state,
        tenants: updatedTenants,
      });
      onShowToast(`Updated security deposit paid to ${formatINR(amountPaid)} for ${t.name}!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-400">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Official Indian Receipt Generator
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Instantly create, customize, preview, print, and download HRA-compliant rent receipts and security deposit receipts with Landlord PAN &amp; revenue stamp.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => handleReceiptTypeChange('rent')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              receiptType === 'rent'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Monthly Rent Receipt (HRA)
          </button>
          <button
            onClick={() => handleReceiptTypeChange('deposit')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              receiptType === 'deposit'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Security Deposit Receipt
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Customization inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>Select Tenant &amp; Property</span>
            </h3>

            {/* Tenant Picker */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Choose from Portfolio
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantSelect(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-teal-600"
              >
                <option value="custom">+ Create Custom / Unlinked Receipt</option>
                {state.tenants.map((t) => {
                  const p = state.properties.find((prop) => prop.id === t.propertyId);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} &bull; {p ? p.name : 'No Property'} ({formatINR(t.monthlyRent)}/mo)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Tenant Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tenant Full Name
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tenant PAN (Optional)
                </label>
                <input
                  type="text"
                  value={tenantPan}
                  onChange={(e) => setTenantPan(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase font-mono"
                />
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Property Name / Unit
                </label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="e.g. Flat 302, Palm Heights"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Address &amp; City
                </label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="e.g. Indiranagar, Bengaluru"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Payment & Receipt Configuration */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <span>Receipt &amp; Payment Details</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {receiptType === 'rent' ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Billing Month / Rent Cycle
                </label>
                <input
                  type="month"
                  value={billingYm}
                  onChange={(e) => setBillingYm(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Agreed Deposit (₹)
                  </label>
                  <input
                    type="number"
                    value={agreedDeposit}
                    onChange={(e) => {
                      const agreed = Number(e.target.value);
                      setAgreedDeposit(agreed);
                      setDepositBalance(Math.max(0, agreed - amountPaid));
                    }}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Pending Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={depositBalance}
                    onChange={(e) => setDepositBalance(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {receiptType === 'rent' ? 'Amount Received (₹)' : 'Deposit Paid by Him (₹)'}
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => {
                    const paid = Number(e.target.value);
                    setAmountPaid(paid);
                    if (receiptType === 'deposit') {
                      setDepositBalance(Math.max(0, agreedDeposit - paid));
                    }
                  }}
                  className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="NetBanking">Net Banking (IMPS / NEFT / RTGS)</option>
                  <option value="Bank Transfer">Direct Bank Transfer</option>
                  <option value="Cheque">Bank Cheque</option>
                  <option value="Cash">Cash (With Revenue Stamp)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Transaction / UTR / Cheque Ref
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UPI/4059281729 or CHQ# 004128"
                className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Narration / Purpose
              </label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Landlord Tax Compliance Fields */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Landlord Tax &amp; Bank Details</span>
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">
                Printed on official receipt
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Landlord Name
                </label>
                <input
                  type="text"
                  value={landlordName}
                  onChange={(e) => setLandlordName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Landlord PAN (HRA Mandatory)
                </label>
                <input
                  type="text"
                  value={landlordPan}
                  onChange={(e) => setLandlordPan(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Account No</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full text-xs font-mono px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Area: Interactive Real-Time Receipt Preview & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {receiptType === 'rent' ? 'House Rent Receipt' : 'Deposit Receipt'}
              </span>{' '}
              &bull; Indian Income Tax Compliant
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </button>

              {selectedTenantId !== 'custom' && (
                <button
                  onClick={handleSaveToLedger}
                  title="Save payment directly into tenant's ledger and updates balance"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Record in Ledger</span>
                </button>
              )}
            </div>
          </div>

          {/* Visual Receipt Canvas (Indian Standard HRA Layout) */}
          <div className="bg-white text-slate-900 border-2 border-slate-300 rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden font-sans">
            {/* Top Bar Ribbon */}
            <div className="border-b-2 border-teal-700 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-teal-800 uppercase">
                  {receiptType === 'rent' ? 'RENT RECEIPT' : 'SECURITY DEPOSIT RECEIPT'}
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {receiptType === 'rent'
                    ? 'Valid for House Rent Allowance (HRA) Claim Under Section 10(13A)'
                    : 'Official Security Deposit Acknowledgment & Refund Receipt'}
                </p>
              </div>

              <div className="text-left sm:text-right font-mono text-xs">
                <div className="font-bold text-slate-900">No: {receiptNumber}</div>
                <div className="text-slate-500 text-[11px]">Date: {formatDate(receiptDate)}</div>
              </div>
            </div>

            {/* Simulated Indian Revenue Stamp Box */}
            <div className="absolute top-6 right-6 hidden md:block">
              <div className="w-20 h-24 border-2 border-dashed border-teal-700/60 rounded-md bg-teal-50/40 p-1 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold text-teal-800 uppercase leading-tight">
                  REVENUE STAMP
                </span>
                <span className="text-[8px] text-teal-600 mt-1">
                  {paymentMode === 'Cash' ? 'Affix ₹1 Stamp' : 'Digitally Certified'}
                </span>
                <span className="text-[7px] text-slate-400 font-mono mt-0.5">
                  {paymentMode}
                </span>
              </div>
            </div>

            {/* Formal Acknowledgment Text */}
            <div className="mt-6 text-sm leading-relaxed text-slate-800 space-y-3">
              <p>
                Received with thanks from{' '}
                <span className="font-bold border-b border-slate-400 px-1 text-slate-950">
                  {tenantName || '________________________'}
                </span>
                {tenantPan && (
                  <span className="text-xs text-slate-600 font-mono ml-1">
                    (Tenant PAN: {tenantPan})
                  </span>
                )}
                , the sum of{' '}
                <span className="font-bold text-teal-800 border-b border-slate-400 px-1 font-mono">
                  {formatINR(amountPaid)}
                </span>
                .
              </p>

              <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium">
                Amount in Words:{' '}
                <span className="font-semibold text-slate-800">{amountInWords}</span>
              </p>

              <p>
                {receiptType === 'rent' ? (
                  <>
                    Towards residential rent for the month of{' '}
                    <span className="font-bold text-slate-900 border-b border-slate-400 px-1">
                      {formatMonthYear(billingYm)}
                    </span>{' '}
                    for the property situated at:{' '}
                    <span className="font-semibold text-slate-900 border-b border-slate-400 px-1">
                      {propertyName}
                      {propertyAddress ? `, ${propertyAddress}` : ''}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Towards initial security deposit for leased premises situated at{' '}
                    <span className="font-semibold text-slate-900 border-b border-slate-400 px-1">
                      {propertyName}
                    </span>
                    . Agreed Total Deposit: <span className="font-bold font-mono">{formatINR(agreedDeposit)}</span>.
                    {depositBalance > 0 && (
                      <span className="text-amber-700 ml-1 font-semibold">
                        (Remaining balance of {formatINR(depositBalance)} due as per agreement).
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* Payment Transaction Details Strip */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">Payment Mode</div>
                <div className="font-bold text-slate-800 mt-0.5">{paymentMode}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">Transaction / UTR</div>
                <div className="font-bold text-slate-800 mt-0.5 truncate">{transactionRef || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">Bank Credited</div>
                <div className="font-bold text-slate-800 mt-0.5 truncate">{bankName || 'HDFC Bank'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-sans">Receipt Ref</div>
                <div className="font-bold text-teal-700 mt-0.5">{receiptNumber}</div>
              </div>
            </div>

            {/* Landlord Info & Signatures */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-teal-800">
                  Landlord Credentials &amp; Tax Info
                </div>
                <div>
                  <span className="text-slate-400">Name: </span>
                  <span className="font-semibold text-slate-800">{landlordName || 'Landlord'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Landlord PAN: </span>
                  <span className="font-mono font-bold text-slate-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                    {landlordPan || 'NOT PROVIDED'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (Mandatory if annual rent exceeds ₹1,00,000)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Aadhaar (Masked): </span>
                  <span className="font-mono">{maskAadhaar(landlordAadhaar)}</span>
                </div>
                {upiId && (
                  <div>
                    <span className="text-slate-400">UPI ID: </span>
                    <span className="font-mono font-semibold">{upiId}</span>
                  </div>
                )}
              </div>

              <div className="text-left sm:text-right space-y-1">
                <div className="h-14 flex items-end justify-start sm:justify-end">
                  <div className="font-serif italic text-lg text-teal-900 opacity-80 border-b border-slate-400 w-44 pb-1">
                    {landlordName || 'Signature'}
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-900">Signature of Landlord / Owner</div>
                <div className="text-[10px] text-slate-400">
                  Digitally issued &bull; Valid across India for Tax Savings
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
