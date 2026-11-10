import React, { useState } from 'react';
import { Download, Users, Building, Filter } from 'lucide-react';
import { AppState } from '../types';
import { formatINR, formatDate, formatMonthYear, pad2 } from '../utils/formatters';
import {
  createTenantStatementPDF,
  createUnitReportPDF,
  downloadPdf,
} from '../utils/pdfGenerator';

interface ReportsViewProps {
  state: AppState;
  onShowToast: (msg: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ state, onShowToast }) => {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  // Default to Financial Year (Indian FY starts April 1)
  const currentMonth = today.getMonth(); // 0-based
  const fyStartYear = currentMonth < 3 ? today.getFullYear() - 1 : today.getFullYear();
  const defaultFrom = `${fyStartYear}-04-01`;

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(todayIso);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    state.tenants[0]?.id || ''
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  // Quick Range Presets
  const handleQuickRange = (type: 'this_month' | 'last_month' | 'this_fy' | 'all_time') => {
    const y = today.getFullYear();
    const m = today.getMonth();

    if (type === 'this_month') {
      const start = new Date(y, m, 1);
      setFromDate(`${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`);
      setToDate(todayIso);
    } else if (type === 'last_month') {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      setFromDate(`${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`);
      setToDate(`${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`);
    } else if (type === 'this_fy') {
      setFromDate(`${fyStartYear}-04-01`);
      setToDate(todayIso);
    } else if (type === 'all_time') {
      setFromDate('2020-01-01');
      setToDate(todayIso);
    }
  };

  // Tenant Report computation
  const selectedTenant = state.tenants.find((t) => t.id === selectedTenantId);
  const tenantProp = state.properties.find((p) => p.id === selectedTenant?.propertyId);

  const tenantAllPayments = selectedTenant
    ? state.payments
        .filter((p) => p.tenantId === selectedTenant.id)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
    : [];

  const tenantPeriodPayments = tenantAllPayments.filter(
    (p) => p.date >= fromDate && p.date <= toDate
  );

  const tenantPeriodPaidTotal = tenantPeriodPayments.reduce((s, p) => s + p.amount, 0);
  const tenantAllTimePaidTotal = tenantAllPayments.reduce((s, p) => s + p.amount, 0);

  // Unit Report computation
  const targetTenants = state.tenants.filter(
    (t) => selectedPropertyId === 'all' || t.propertyId === selectedPropertyId
  );

  const unitReportRows = targetTenants.map((t) => {
    const prop = state.properties.find((p) => p.id === t.propertyId);
    const allT = state.payments.filter((p) => p.tenantId === t.id);
    const inPeriodT = allT.filter((p) => p.date >= fromDate && p.date <= toDate);

    const paidInPeriod = inPeriodT.reduce((s, p) => s + p.amount, 0);
    const totalPaid = allT.reduce((s, p) => s + p.amount, 0);

    return {
      property: prop ? prop.name : 'Unassigned',
      tenant: t.name,
      rent: t.monthlyRent,
      paidInPeriod,
      totalPaid,
      deposit: t.securityDeposit,
      outstanding: t.outstandingBalance,
    };
  });

  const sumPeriod = unitReportRows.reduce((s, r) => s + r.paidInPeriod, 0);
  const sumTotal = unitReportRows.reduce((s, r) => s + r.totalPaid, 0);
  const sumDeposit = unitReportRows.reduce((s, r) => s + r.deposit, 0);
  const sumOutstanding = unitReportRows.reduce((s, r) => s + r.outstanding, 0);

  // PDF Generators
  const handleDownloadTenantPdf = () => {
    if (!selectedTenant) return;
    const doc = createTenantStatementPDF(
      state.landlord,
      selectedTenant,
      tenantProp,
      tenantPeriodPayments,
      fromDate,
      toDate
    );
    downloadPdf(
      doc,
      `Tenant-Statement-${selectedTenant.name.replace(/\s+/g, '-')}-${fromDate}-to-${toDate}.pdf`
    );
    onShowToast(`Downloaded Statement for ${selectedTenant.name}`);
  };

  const handleDownloadUnitPdf = () => {
    const doc = createUnitReportPDF(state.landlord, unitReportRows, fromDate, toDate);
    downloadPdf(doc, `Unit-Rent-Report-${fromDate}-to-${toDate}.pdf`);
    onShowToast('Downloaded Unit Portfolio Rent Roll Report');
  };

  return (
    <div className="space-y-6">
      {/* Date Filter & Presets Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Financial Reports &amp; Ledgers
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate tenant statements, financial year collections, and portfolio summaries as PDF
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Presets:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleQuickRange('this_month')}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                This Month
              </button>
              <button
                onClick={() => handleQuickRange('last_month')}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                Last Month
              </button>
              <button
                onClick={() => handleQuickRange('this_fy')}
                className="px-2.5 py-1 text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800/60 rounded-md transition-colors"
              >
                This FY (Apr-Mar)
              </button>
              <button
                onClick={() => handleQuickRange('all_time')}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
              From Date:
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
              To Date:
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Tenant Specific Ledger */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Individual Tenant Statement
              </h3>
            </div>
            {selectedTenant && (
              <button
                onClick={handleDownloadTenantPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Statement PDF</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Select Tenant:
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {state.tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Rent: {formatINR(t.monthlyRent)})
                </option>
              ))}
            </select>
          </div>

          {selectedTenant && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Paid in Selected Period</div>
                  <div className="text-sm font-bold text-teal-700 dark:text-teal-400 mt-0.5">
                    {formatINR(tenantPeriodPaidTotal)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Paid All-Time</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatINR(tenantAllTimePaidTotal)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Security Deposit Held</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatINR(selectedTenant.securityDeposit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Outstanding Balance</div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      selectedTenant.outstandingBalance > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatINR(selectedTenant.outstandingBalance)}
                  </div>
                </div>
              </div>

              {/* Transactions in Period */}
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Itemized Payments in Period ({tenantPeriodPayments.length})
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {tenantPeriodPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatMonthYear(p.ym)} Rent
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatDate(p.date)} &middot; {p.mode} &middot; {p.receiptNumber}
                        </div>
                      </div>
                      <div className="font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400">
                        {formatINR(p.amount)}
                      </div>
                    </div>
                  ))}
                  {tenantPeriodPayments.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-4">
                      No payments found in this date window.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Portfolio Roll / Unit Report */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Portfolio Rent Roll Summary
              </h3>
            </div>
            <button
              onClick={handleDownloadUnitPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Unit Report PDF</span>
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Filter by Unit:
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Properties &amp; Rental Units</option>
              {state.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Roll Stats Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2 px-3 font-semibold">Tenant</th>
                  <th className="py-2 px-3 font-semibold text-right">Rent</th>
                  <th className="py-2 px-3 font-semibold text-right">Period Recd</th>
                  <th className="py-2 px-3 font-semibold text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                {unitReportRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{r.tenant}</div>
                      <div className="text-[10px] text-slate-400">{r.property}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatINR(r.rent)}</td>
                    <td className="py-2.5 px-3 text-right text-teal-700 dark:text-teal-400 font-semibold">
                      {formatINR(r.paidInPeriod)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      <span className={r.outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                        {formatINR(r.outstanding)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 font-mono tabular-nums font-bold text-xs bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <td className="py-2.5 px-3 font-sans">Total:</td>
                  <td className="py-2.5 px-3 text-right">
                    {formatINR(unitReportRows.reduce((s, r) => s + r.rent, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right text-teal-700 dark:text-teal-400">
                    {formatINR(sumPeriod)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-600">
                    {formatINR(sumOutstanding)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
