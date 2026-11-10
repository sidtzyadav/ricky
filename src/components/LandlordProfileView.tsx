import React, { useState } from 'react';
import { Save, UserCheck, Landmark, BellRing, ShieldCheck, Check } from 'lucide-react';
import { AppState, Landlord } from '../types';
import { maskAadhaar } from '../utils/formatters';

interface LandlordProfileViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const LandlordProfileView: React.FC<LandlordProfileViewProps> = ({
  state,
  onUpdateState,
  onShowToast,
}) => {
  const [landlord, setLandlord] = useState<Landlord>(state.landlord);
  const [daysBefore, setDaysBefore] = useState<number>(state.reminderSettings.daysBefore ?? 3);
  const [autoEnabled, setAutoEnabled] = useState<boolean>(state.reminderSettings.autoEnabled);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDueDay = Math.min(28, Math.max(1, Number(landlord.dueDay) || 5));
    const updatedLandlord = {
      ...landlord,
      dueDay: cleanDueDay,
      pan: (landlord.pan || '').toUpperCase(),
      ifsc: (landlord.ifsc || '').toUpperCase(),
    };

    const updatedState: AppState = {
      ...state,
      landlord: updatedLandlord,
      reminderSettings: {
        ...state.reminderSettings,
        daysBefore: Math.max(1, Math.min(10, Number(daysBefore) || 3)),
        autoEnabled,
      },
    };

    onUpdateState(updatedState);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onShowToast('Landlord profile and automated reminder settings saved!');
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Landlord &amp; Remittance Profile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configures tax documentation (PAN/Aadhaar) and automated 3-day reminder parameters
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Saved Changes' : 'Save Profile'}</span>
        </button>
      </div>

      {/* Card 1: Personal & Legal Details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <UserCheck className="w-5 h-5 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Owner &amp; Taxpayer Details
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={landlord.name}
              onChange={(e) => setLandlord({ ...landlord, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              Aadhaar Number
            </label>
            <input
              type="text"
              placeholder="XXXX XXXX 1234"
              value={landlord.aadhaar}
              onChange={(e) => setLandlord({ ...landlord, aadhaar: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Printed masked on receipts ({maskAadhaar(landlord.aadhaar)}) for privacy.
            </span>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              PAN (Permanent Account Number)
            </label>
            <input
              type="text"
              maxLength={10}
              placeholder="ABCDE1234F"
              value={landlord.pan}
              onChange={(e) => setLandlord({ ...landlord, pan: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono uppercase"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Mandatory on Indian rent receipts if annual rent exceeds ₹1,00,000 for HRA.
            </span>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              Landlord Email Address
            </label>
            <input
              type="email"
              value={landlord.email}
              onChange={(e) => setLandlord({ ...landlord, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              Mobile Contact Number
            </label>
            <input
              type="tel"
              value={landlord.phone}
              onChange={(e) => setLandlord({ ...landlord, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Card 2: Automated Payment Reminders Timing Configuration */}
      <div className="bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/60 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-teal-100 dark:border-teal-900/60">
          <BellRing className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Automated Payment Reminder Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Configures the monthly rent due date and pre-due reminder notice window
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 space-y-2">
            <label className="block text-teal-950 dark:text-teal-200 font-bold">
              Rent Due Day of the Month (1 to 28) *
            </label>
            <input
              type="number"
              min={1}
              max={28}
              required
              value={landlord.dueDay || 5}
              onChange={(e) => setLandlord({ ...landlord, dueDay: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold text-sm"
            />
            <p className="text-[11px] text-teal-800 dark:text-teal-300 leading-normal">
              For example, entering <strong>5</strong> sets rent due date on the 5th of every month.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block text-slate-700 dark:text-slate-300 font-bold">
              Reminder Lead Notice Window (Days Before Due Date) *
            </label>
            <input
              type="number"
              min={1}
              max={10}
              required
              value={daysBefore}
              onChange={(e) => setDaysBefore(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold text-sm"
            />
            <p className="text-[11px] text-slate-500 leading-normal">
              <strong>Requirement: 3 days before due date.</strong> If due on 5th, reminders
              automatically trigger on the 2nd of the month.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            id="auto-enabled-chk"
            type="checkbox"
            checked={autoEnabled}
            onChange={(e) => setAutoEnabled(e.target.checked)}
            className="w-4 h-4 text-teal-600 rounded-sm focus:ring-teal-500 border-slate-300"
          />
          <label htmlFor="auto-enabled-chk" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
            Keep automated 3-day reminder scanner active on background timer &amp; app launch
          </label>
        </div>
      </div>

      {/* Card 3: Bank & Direct UPI Remittance Details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Landmark className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Bank Details &amp; UPI Remittance
            </h3>
            <p className="text-xs text-slate-500">
              Printed in full on reminder emails and PDF receipts so tenants can pay directly
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              Account Holder Name
            </label>
            <input
              type="text"
              placeholder="e.g. Rajesh Sharma"
              value={landlord.accountHolder}
              onChange={(e) => setLandlord({ ...landlord, accountHolder: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              Bank Name &amp; Branch
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank, Indiranagar Branch"
              value={landlord.bankName}
              onChange={(e) => setLandlord({ ...landlord, bankName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              Bank Account Number
            </label>
            <input
              type="text"
              placeholder="e.g. 50100452391024"
              value={landlord.accountNumber}
              onChange={(e) => setLandlord({ ...landlord, accountNumber: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              IFSC Code
            </label>
            <input
              type="text"
              maxLength={11}
              placeholder="e.g. HDFC0000128"
              value={landlord.ifsc}
              onChange={(e) => setLandlord({ ...landlord, ifsc: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono uppercase"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
              UPI ID (VPA) for Instant Mobile Transfer
            </label>
            <input
              type="text"
              placeholder="e.g. landlord@okhdfcbank or 9845012345@upi"
              value={landlord.upiId}
              onChange={(e) => setLandlord({ ...landlord, upiId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-teal-700 dark:text-teal-400 font-semibold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Generates 1-click &lsquo;Pay via UPI&rsquo; deep links in reminder emails and WhatsApp
              messages.
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>All landlord and tenant records stay strictly stored on this device.</span>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  );
};
