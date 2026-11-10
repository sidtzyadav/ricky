export interface Landlord {
  name: string;
  aadhaar: string;
  pan: string;
  email: string;
  phone: string;
  dueDay: number; // 1 to 28, default 5
  // Bank details for payments
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
}

export interface Property {
  id: string;
  name: string;
  type: string; // 'Residential Flat', 'Commercial Shop', 'Independent House', 'Office Space', 'Villa'
  address: string;
}

export interface Tenant {
  id: string;
  name: string;
  propertyId: string;
  aadhaar: string;
  pan: string;
  email: string;
  phone: string;
  monthlyRent: number;
  securityDeposit: number;
  depositPaid: number; // Actual deposit amount paid by tenant
  depositPaidDate?: string; // Date deposit was paid
  depositPaymentMode?: PaymentMode; // Mode of deposit transfer
  depositNarration?: string; // UTR or cheque reference for deposit
  outstandingBalance: number;
  leaseStartDate?: string;
  notes?: string;
}

export type PaymentMode =
  | 'UPI'
  | 'Bank Transfer'
  | 'Cash'
  | 'Cheque'
  | 'Demand Draft'
  | 'NetBanking'
  | 'Other';

export interface PaymentRecord {
  id: string;
  tenantId: string;
  ym: string; // 'YYYY-MM'
  amount: number;
  date: string; // 'YYYY-MM-DD'
  mode: PaymentMode;
  narration: string;
  balanceOutstanding: number;
  receiptNumber: string;
}

export interface ReminderSettings {
  autoEnabled: boolean;
  daysBefore: number; // default: 3 (sends 3 days before landlord's rent due date)
  sendOverdue: boolean; // also trigger reminder if rent is past due
  autoSendOnLoad: boolean;
  notifyOnAutoSend: boolean;
}

export interface ReminderLog {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  propertyTitle: string;
  ym: string;
  dueDate: string;
  triggerDate: string;
  sentAt: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  amountDue: number;
  status: 'Sent' | 'Delivered' | 'Failed';
  triggerType: 'automated' | 'manual';
  deliveryChannel: 'email' | 'whatsapp' | 'manual';
}

export interface AppState {
  landlord: Landlord;
  properties: Property[];
  tenants: Tenant[];
  payments: PaymentRecord[];
  reminderSettings: ReminderSettings;
  reminderLogs: ReminderLog[];
}
