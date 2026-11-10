import React from 'react';
import {
  X,
  History,
  Download,
  Calendar,
  CreditCard,
  Mail,
  Phone,
  Home,
  CheckCircle2,
  FileCheck,
  Edit2,
  AlertCircle,
  Receipt,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { Tenant, Property, PaymentRecord, Landlord } from '../types';
import {
  formatINR,
  formatDate,
  formatMonthYear,
  maskAadhaar,
} from '../utils/formatters';
import {
  createReceiptPDF,
  createTenantStatementPDF,
  createDepositReceiptPDF,
  downloadPdf,
} from '../utils/pdfGenerator';

interface TenantDetailModalProps {
  tenant: Tenant;
  property: Property | undefined;
  payments: PaymentRecord[];
  landlord: Landlord;
  onClose: () => void;
  onEditTenant: (t: Tenant) => void;
  onOpenRecordPayment?: (tenant: Tenant) => void;
  onShowToast: (msg: string) => void;
}

export const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
  tenant,
  property,
  payments,
  landlord,
  onClose,
  onEditTenant,
  onOpenRecordPayment,
  onShowToast,
}) => {
  // Sort payments: most recent first
  const sortedPayments = [...payments].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Download single receipt
  const handleDownloadReceipt = (payment: PaymentRecord) => {
    const doc = createReceiptPDF(landlord, tenant, property, payment);
    downloadPdf(
      doc,
      `Rent-Receipt-${tenant.name.replace(/\s+/g, '-')}-${payment.ym}.pdf`
    );
    onShowToast(`Downloaded receipt ${payment.receiptNumber}`);
  };

  // Download complete statement
  const handleDownloadStatement = () => {
    const fromDate = payments.length > 0 ? sortedPayments[sortedPayments.length - 1].date : '2024-01-01';
    const toDate = new Date().toISOString().split('T')[0];
    const doc = createTenantStatementPDF(
      landlord,
      tenant,
      property,
      payments,
      fromDate,
      toDate
    );
    downloadPdf(
      doc,
      `Tenant-Statement-${tenant.name.replace(/\s+/g, '-')}.pdf`
    );
    onShowToast(`Downloaded complete ledger statement for ${tenant.name}`);
  };

  // Download security deposit receipt
  const handleDownloadDepositReceipt = () => {
    const doc = createDepositReceiptPDF(landlord, tenant, property);
    downloadPdf(
      doc,
      `Deposit-Receipt-${tenant.name.replace(/\s+/g, '-')}.pdf`
    );
    onShowToast(`Downloaded security deposit receipt for ${tenant.name}`);
  };

  const depositPaid = tenant.depositPaid ?? tenant.securityDeposit;
  const depositBalance = Math.max(0, tenant.securityDeposit - depositPaid);
  const isDepositFullyPaid = depositPaid >= tenant.securityDeposit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {tenant.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Tenant Details &amp; History
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>{property ? property.name : 'Unassigned Property'}</span>
                {property?.address && (
                  <>
                    <span>&middot;</span>
                    <span className="truncate max-w-xs">{property.address}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditTenant(tenant)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Tenant</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Tenant Contact & Compliance Information */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400">Email (Auto-Reminders)</div>
              <div className="font-mono text-slate-900 dark:text-slate-100 font-medium truncate mt-0.5 flex items-center gap-1">
                <Mail className="w-3 h-3 text-teal-600 shrink-0" />
                <span>{tenant.email || 'None'}</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">Mobile Phone</div>
              <div className="font-mono text-slate-900 dark:text-slate-100 font-medium mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{tenant.phone || '-'}</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">PAN Number</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 uppercase mt-0.5">
                {tenant.pan || '-'}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">Aadhaar (Masked)</div>
              <div className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                {maskAadhaar(tenant.aadhaar)}
              </div>
            </div>
          </div>

          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Monthly Rent
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {formatINR(tenant.monthlyRent)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20">
              <div className="text-[11px] font-medium text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center justify-between">
                <span>Deposit Paid</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-semibold ${
                  isDepositFullyPaid
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {isDepositFullyPaid ? 'Settled' : 'Partial'}
                </span>
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400 mt-1">
                {formatINR(depositPaid)}
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                Agreed: {formatINR(tenant.securityDeposit)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Rent Outstanding
              </div>
              <div
                className={`text-base font-bold font-mono tabular-nums mt-1 ${
                  tenant.outstandingBalance > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatINR(tenant.outstandingBalance)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Total Rent Paid
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200 mt-1">
                {formatINR(totalAmountPaid)}
              </div>
            </div>
          </div>

          {/* Security Deposit Paid by Tenant - Detailed Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-50/50 to-slate-50 dark:from-teal-950/20 dark:to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                  Security Deposit Paid By Tenant
                </span>
                {isDepositFullyPaid ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Paid in Full ({formatINR(depositPaid)})
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    Paid {formatINR(depositPaid)} &bull; Balance Due: {formatINR(depositBalance)}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 font-mono">
                <div>
                  <span className="text-slate-400 font-sans">Payment Date: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {tenant.depositPaidDate ? formatDate(tenant.depositPaidDate) : (tenant.leaseStartDate ? formatDate(tenant.leaseStartDate) : '-')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Mode: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {tenant.depositPaymentMode || 'Bank Transfer'}
                  </span>
                </div>
                {tenant.depositNarration && (
                  <div className="truncate max-w-xs">
                    <span className="text-slate-400 font-sans">Ref: </span>
                    <span className="text-slate-700 dark:text-slate-300">{tenant.depositNarration}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleDownloadDepositReceipt}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-900 dark:text-teal-100 bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg shadow-xs hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Download Deposit Receipt PDF</span>
            </button>
          </div>

          {/* Payment History Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  <span>Itemized Payment History &amp; Transactions</span>
                  <span className="text-xs font-normal text-slate-500 font-mono">
                    ({payments.length} {payments.length === 1 ? 'transaction' : 'transactions'})
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed ledger including payment date, amount, mode, transaction narration, and official receipts
                </p>
              </div>

              <div className="flex items-center gap-2">
                {payments.length > 0 && (
                  <button
                    onClick={handleDownloadStatement}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download Ledger PDF</span>
                  </button>
                )}

                {onOpenRecordPayment && (
                  <button
                    onClick={() => {
                      onOpenRecordPayment(tenant);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                )}
              </div>
            </div>

            {/* Payment History Table */}
            {sortedPayments.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs text-slate-500">
                <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  No payment history recorded yet for {tenant.name}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  When rent payments are recorded from the Rent Tracker, complete transaction details, dates, payment modes, and UTR references will appear here.
                </p>
                {onOpenRecordPayment && (
                  <button
                    onClick={() => {
                      onOpenRecordPayment(tenant);
                      onClose();
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record First Payment</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Payment Date</th>
                        <th className="py-2.5 px-4 font-semibold">Billing Month</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Amount Received</th>
                        <th className="py-2.5 px-4 font-semibold">Payment Mode</th>
                        <th className="py-2.5 px-4 font-semibold">Narration / Transaction Ref</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                      {sortedPayments.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Payment Date */}
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span className="font-semibold">{formatDate(p.date)}</span>
                            </div>
                          </td>

                          {/* Billing Month */}
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                            {formatMonthYear(p.ym)}
                          </td>

                          {/* Amount Received */}
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap text-sm">
                            {formatINR(p.amount)}
                          </td>

                          {/* Payment Mode */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              <CreditCard className="w-3 h-3 text-slate-500" />
                              <span>{p.mode}</span>
                            </span>
                          </td>

                          {/* Narration / Transaction Details */}
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] text-slate-900 dark:text-slate-100 font-medium break-all">
                              {p.narration || 'Rent Payment'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Receipt Ref: {p.receiptNumber} &middot; Bal: {formatINR(p.balanceOutstanding)}
                            </div>
                          </td>

                          {/* Receipt Download Action */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDownloadReceipt(p)}
                              title="Download official HRA rent receipt PDF"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/80 rounded-md transition-colors"
                            >
                              <FileCheck className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                              <span>PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs">
          <div className="text-slate-500">
            {tenant.name} &middot; Total {payments.length} payments recorded &middot; Ledger maintained locally
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
