import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Home, Search, X, History, Receipt } from 'lucide-react';
import { AppState, Tenant } from '../types';
import { formatINR, maskAadhaar, generateUid } from '../utils/formatters';
import { TenantDetailModal } from './TenantDetailModal';

interface TenantsViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
  onOpenRecordPayment?: (tenant: Tenant) => void;
}

export const TenantsView: React.FC<TenantsViewProps> = ({
  state,
  onUpdateState,
  onShowToast,
  onOpenRecordPayment,
}) => {
  const [search, setSearch] = useState('');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [selectedDetailTenant, setSelectedDetailTenant] = useState<Tenant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [securityDeposit, setSecurityDeposit] = useState<number>(0);
  const [depositPaid, setDepositPaid] = useState<number>(0);
  const [depositPaidDate, setDepositPaidDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [depositPaymentMode, setDepositPaymentMode] = useState<any>('Bank Transfer');
  const [depositNarration, setDepositNarration] = useState<string>('');
  const [outstandingBalance, setOutstandingBalance] = useState<number>(0);
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingTenant(null);
    setName('');
    setPropertyId(state.properties[0]?.id || '');
    setEmail('');
    setPhone('');
    setMonthlyRent(20000);
    setSecurityDeposit(60000);
    setDepositPaid(60000);
    setDepositPaidDate(new Date().toISOString().split('T')[0]);
    setDepositPaymentMode('Bank Transfer');
    setDepositNarration('');
    setOutstandingBalance(0);
    setAadhaar('');
    setPan('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setName(t.name);
    setPropertyId(t.propertyId);
    setEmail(t.email || '');
    setPhone(t.phone || '');
    setMonthlyRent(t.monthlyRent);
    setSecurityDeposit(t.securityDeposit);
    setDepositPaid(t.depositPaid !== undefined ? t.depositPaid : t.securityDeposit);
    setDepositPaidDate(t.depositPaidDate || t.leaseStartDate || new Date().toISOString().split('T')[0]);
    setDepositPaymentMode(t.depositPaymentMode || 'Bank Transfer');
    setDepositNarration(t.depositNarration || '');
    setOutstandingBalance(t.outstandingBalance);
    setAadhaar(t.aadhaar || '');
    setPan(t.pan || '');
    setNotes(t.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('Please enter the tenant name.');
      return;
    }
    if (!monthlyRent || monthlyRent <= 0) {
      onShowToast('Please enter a valid monthly rent amount.');
      return;
    }

    if (editingTenant) {
      const updatedTenants = state.tenants.map((t) =>
        t.id === editingTenant.id
          ? {
              ...t,
              name: name.trim(),
              propertyId,
              email: email.trim(),
              phone: phone.trim(),
              monthlyRent: Number(monthlyRent),
              securityDeposit: Number(securityDeposit),
              depositPaid: Number(depositPaid),
              depositPaidDate,
              depositPaymentMode,
              depositNarration: depositNarration.trim(),
              outstandingBalance: Number(outstandingBalance),
              aadhaar: aadhaar.trim(),
              pan: pan.trim().toUpperCase(),
              notes: notes.trim(),
            }
          : t
      );
      onUpdateState({ ...state, tenants: updatedTenants });
      onShowToast(`Updated details & deposit for ${name.trim()}`);
    } else {
      const newTenant: Tenant = {
        id: generateUid(),
        name: name.trim(),
        propertyId,
        email: email.trim(),
        phone: phone.trim(),
        monthlyRent: Number(monthlyRent),
        securityDeposit: Number(securityDeposit),
        depositPaid: Number(depositPaid),
        depositPaidDate,
        depositPaymentMode,
        depositNarration: depositNarration.trim(),
        outstandingBalance: Number(outstandingBalance),
        aadhaar: aadhaar.trim(),
        pan: pan.trim().toUpperCase(),
        notes: notes.trim(),
      };
      onUpdateState({ ...state, tenants: [...state.tenants, newTenant] });
      onShowToast(`Added tenant ${name.trim()} (Deposit paid: ${formatINR(Number(depositPaid))})`);
    }

    setIsModalOpen(false);
  };

  const handleDeleteTenant = (id: string, tenantName: string) => {
    if (window.confirm(`Are you sure you want to remove tenant "${tenantName}"?`)) {
      onUpdateState({
        ...state,
        tenants: state.tenants.filter((t) => t.id !== id),
        payments: state.payments.filter((p) => p.tenantId !== id),
      });
      onShowToast(`Tenant ${tenantName} removed`);
    }
  };

  const filtered = state.tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.email && t.email.toLowerCase().includes(search.toLowerCase())) ||
      (t.phone && t.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Top Bar with Search & Add Tenant */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tenant Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage tenant contact info, lease rates, and email addresses for automated reminders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tenant</span>
          </button>
        </div>
      </div>

      {/* Tenant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tenant) => {
          const property = state.properties.find((p) => p.id === tenant.propertyId);

          return (
            <div
              key={tenant.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3
                      onClick={() => setSelectedDetailTenant(tenant)}
                      title="View tenant details & payment history"
                      className="text-base font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-teal-700 dark:hover:text-teal-400 transition-colors flex items-center gap-1.5"
                    >
                      <span>{tenant.name}</span>
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Home className="w-3 h-3 text-slate-400" />
                      <span>{property ? property.name : 'Unassigned Property'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedDetailTenant(tenant)}
                      title="View complete payment history"
                      className="p-1.5 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(tenant)}
                      aria-label="Edit tenant"
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                      aria-label="Delete tenant"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Financial figures */}
                <div className="grid grid-cols-3 gap-2 mt-4 py-3 border-y border-slate-100 dark:border-slate-800 text-center font-mono tabular-nums">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Monthly Rent</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatINR(tenant.monthlyRent)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Deposit Paid</div>
                    <div className="text-xs font-bold text-teal-700 dark:text-teal-400 mt-0.5">
                      {formatINR(tenant.depositPaid ?? tenant.securityDeposit)}
                    </div>
                    {tenant.securityDeposit > (tenant.depositPaid ?? tenant.securityDeposit) ? (
                      <div className="text-[9px] text-amber-600 dark:text-amber-400 font-sans font-medium mt-0.5">
                        Due: {formatINR(tenant.securityDeposit - (tenant.depositPaid ?? 0))}
                      </div>
                    ) : (
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-sans font-medium mt-0.5">
                        Agreed: {formatINR(tenant.securityDeposit)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Rent Due</div>
                    <div
                      className={`text-xs font-bold mt-0.5 ${
                        tenant.outstandingBalance > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatINR(tenant.outstandingBalance)}
                    </div>
                  </div>
                </div>

                {/* Contact & Auto-Reminder Channel */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    {tenant.email ? (
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                        {tenant.email}
                      </span>
                    ) : (
                      <span className="text-amber-600 italic">No email (Needed for auto-reminders)</span>
                    )}
                  </div>

                  {tenant.phone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{tenant.phone}</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 pt-1">
                    <span>PAN: {tenant.pan || '-'}</span> &middot;{' '}
                    <span>Aadhaar: {maskAadhaar(tenant.aadhaar)}</span>
                  </div>
                </div>
              </div>

              {tenant.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 italic">
                  &ldquo;{tenant.notes}&rdquo;
                </div>
              )}

              {/* Detail View & Payment History Action Trigger */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedDetailTenant(tenant)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/80 rounded-lg transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>
                    Payment History ({state.payments.filter((p) => p.tenantId === tenant.id).length})
                  </span>
                </button>

                <button
                  onClick={() => setSelectedDetailTenant(tenant)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Tenant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingTenant ? 'Edit Tenant Details' : 'Add New Tenant'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arjun Mehta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Property
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select a property</option>
                  {state.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Email is highlighted because it's used for the 3-day reminder */}
              <div className="p-3 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60">
                <label className="block font-bold text-teal-950 dark:text-teal-200 mb-1">
                  Email Address (Automated 3-Day Reminders) *
                </label>
                <input
                  type="email"
                  placeholder="tenant.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                />
                <p className="text-[11px] text-teal-800 dark:text-teal-300 mt-1">
                  Automated payment reminder emails are delivered to this address 3 days before rent
                  is due.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98450 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Outstanding Rent Balance (₹)
                </label>
                <input
                  type="number"
                  value={outstandingBalance}
                  onChange={(e) => setOutstandingBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              {/* Security Deposit Terms & Deposit Paid by Tenant */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Security Deposit &amp; Payment Paid by Tenant
                  </span>
                  {depositPaid >= securityDeposit && securityDeposit > 0 ? (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      Full Deposit Paid
                    </span>
                  ) : depositPaid > 0 && securityDeposit > depositPaid ? (
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      Deposit Due: {formatINR(securityDeposit - depositPaid)}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Agreed Security Deposit (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={securityDeposit}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSecurityDeposit(val);
                        if (depositPaid === securityDeposit || depositPaid === 0) {
                          setDepositPaid(val);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-teal-800 dark:text-teal-300 font-bold mb-1">
                      Deposit Paid by Him (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={depositPaid}
                      onChange={(e) => setDepositPaid(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold text-teal-700 dark:text-teal-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">
                      Deposit Payment Date
                    </label>
                    <input
                      type="date"
                      value={depositPaidDate}
                      onChange={(e) => setDepositPaidDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">
                      Deposit Payment Mode
                    </label>
                    <select
                      value={depositPaymentMode}
                      onChange={(e) => setDepositPaymentMode(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs"
                    >
                      <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                      <option value="UPI">UPI (GPay/PhonePe/Paytm)</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Demand Draft">Demand Draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">
                      Deposit Narration / UTR
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR / Cheque Ref"
                      value={depositNarration}
                      onChange={(e) => setDepositNarration(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    placeholder="XXXX XXXX 1234"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PAN (Permanent Account No.)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tenant Notes / Lease Memo
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes about occupation, lease start, payment preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                >
                  {editingTenant ? 'Update Tenant' : 'Save Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Detail & Payment History Modal */}
      {selectedDetailTenant && (
        <TenantDetailModal
          tenant={selectedDetailTenant}
          property={state.properties.find((p) => p.id === selectedDetailTenant.propertyId)}
          payments={state.payments.filter((p) => p.tenantId === selectedDetailTenant.id)}
          landlord={state.landlord}
          onClose={() => setSelectedDetailTenant(null)}
          onEditTenant={(t) => {
            setSelectedDetailTenant(null);
            openEditModal(t);
          }}
          onOpenRecordPayment={onOpenRecordPayment}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
