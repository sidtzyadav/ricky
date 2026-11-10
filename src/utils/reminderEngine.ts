import { AppState, Landlord, Property, Tenant, ReminderLog } from '../types';
import {
  formatINR,
  formatDate,
  formatMonthYear,
  getDueDateForMonth,
  getReminderTriggerDate,
  getDaysUntilDue,
  generateUid,
} from './formatters';

/**
 * Generate formatted HTML email content for rent reminder
 */
export function generateReminderEmailHtml(
  landlord: Landlord,
  tenant: Tenant,
  property: Property | undefined,
  ym: string,
  dueDate: string
): string {
  const totalDue = tenant.monthlyRent + (tenant.outstandingBalance || 0);
  const propTitle = property ? `${property.name}${property.address ? `, ${property.address}` : ''}` : 'Rental Unit';
  const upiLink = landlord.upiId
    ? `upi://pay?pa=${encodeURIComponent(landlord.upiId)}&pn=${encodeURIComponent(landlord.accountHolder || landlord.name)}&am=${totalDue}&cu=INR`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 20px; background-color: #f8fafc; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 20px; }
    .title { color: #0f766e; font-size: 20px; font-weight: 700; margin: 0; }
    .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
    .badge-due { display: inline-block; background-color: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; }
    .table { width: 100%; border-collapse: collapse; margin: 18px 0; }
    .table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .table td.label { color: #64748b; width: 45%; }
    .table td.val { font-weight: 600; text-align: right; color: #0f172a; }
    .total-row td { font-size: 16px; font-weight: 700; color: #0f766e; border-top: 2px solid #e2e8f0; border-bottom: none; padding-top: 14px; }
    .bank-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .bank-title { font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .upi-btn { display: inline-block; background: #0f766e; color: #ffffff !important; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 12px; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">Rent Payment Reminder</h1>
      <div class="subtitle">Billing Period: ${formatMonthYear(ym)} &middot; Due on ${formatDate(dueDate)}</div>
    </div>

    <p style="font-size: 15px; margin-top: 0;">Dear <strong>${tenant.name}</strong>,</p>
    <p style="font-size: 14px; color: #475569;">
      This is a polite automated reminder that your rent payment for <strong>${propTitle}</strong> is due in 3 days on <strong>${formatDate(dueDate)}</strong>.
    </p>

    <table class="table">
      <tr>
        <td class="label">Monthly Rent (${formatMonthYear(ym)})</td>
        <td class="val">${formatINR(tenant.monthlyRent)}</td>
      </tr>
      ${tenant.outstandingBalance ? `
      <tr>
        <td class="label">Previous Outstanding Balance</td>
        <td class="val" style="color: #b45309;">${formatINR(tenant.outstandingBalance)}</td>
      </tr>` : ''}
      <tr class="total-row">
        <td>Total Amount Payable</td>
        <td class="val" style="color: #0f766e;">${formatINR(totalDue)}</td>
      </tr>
    </table>

    <div class="bank-box">
      <div class="bank-title">Bank Details for Direct Rent Transfer:</div>
      <div><strong>Account Holder:</strong> ${landlord.accountHolder || landlord.name}</div>
      ${landlord.bankName ? `<div><strong>Bank & Branch:</strong> ${landlord.bankName}</div>` : ''}
      ${landlord.accountNumber ? `<div><strong>Account Number:</strong> ${landlord.accountNumber}</div>` : ''}
      ${landlord.ifsc ? `<div><strong>IFSC Code:</strong> ${landlord.ifsc}</div>` : ''}
      ${landlord.upiId ? `<div><strong>UPI ID:</strong> <span style="color:#0f766e; font-family: monospace;">${landlord.upiId}</span></div>` : ''}

      ${upiLink ? `
      <div style="margin-top: 14px;">
        <a href="${upiLink}" class="upi-btn">Pay via UPI (${formatINR(totalDue)})</a>
      </div>` : ''}
    </div>

    <p style="font-size: 13px; color: #64748b;">
      Kindly share the payment confirmation or UTR reference after transfer so we can issue your official rent receipt for your records and tax exemption claims.
    </p>

    <div class="footer">
      Sent by ${landlord.name || 'Landlord'} &middot; Phone: ${landlord.phone || '-'} &middot; Email: ${landlord.email || '-'}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email version
 */
export function generateReminderEmailText(
  landlord: Landlord,
  tenant: Tenant,
  property: Property | undefined,
  ym: string,
  dueDate: string
): string {
  const totalDue = tenant.monthlyRent + (tenant.outstandingBalance || 0);
  const propName = property ? property.name : 'Rental Property';

  let msg = `Dear ${tenant.name},\n\n`;
  msg += `This is a reminder that rent for ${propName} for ${formatMonthYear(ym)} is due on ${formatDate(dueDate)}.\n\n`;
  msg += `PAYMENT BREAKDOWN:\n`;
  msg += `Monthly Rent: ${formatINR(tenant.monthlyRent)}\n`;
  if (tenant.outstandingBalance) {
    msg += `Previous Outstanding: ${formatINR(tenant.outstandingBalance)}\n`;
  }
  msg += `TOTAL PAYABLE: ${formatINR(totalDue)}\n\n`;

  msg += `BANK DETAILS FOR PAYMENT:\n`;
  msg += `Account Holder: ${landlord.accountHolder || landlord.name}\n`;
  if (landlord.bankName) msg += `Bank: ${landlord.bankName}\n`;
  if (landlord.accountNumber) msg += `Account No: ${landlord.accountNumber}\n`;
  if (landlord.ifsc) msg += `IFSC: ${landlord.ifsc}\n`;
  if (landlord.upiId) msg += `UPI ID: ${landlord.upiId}\n\n`;

  msg += `Please reply with the UTR / transaction ID after transferring. Thank you.\n\n`;
  msg += `Regards,\n${landlord.name}\nMobile: ${landlord.phone || '-'}`;

  return msg;
}

/**
 * Generate WhatsApp share URL
 */
export function generateWhatsAppReminderUrl(
  landlord: Landlord,
  tenant: Tenant,
  property: Property | undefined,
  ym: string,
  dueDate: string
): string {
  const text = generateReminderEmailText(landlord, tenant, property, ym, dueDate);
  const phoneClean = (tenant.phone || '').replace(/\D/g, '');
  return `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(text)}`;
}

/**
 * Result of checking automated reminders
 */
export interface AutomatedCheckResult {
  updatedState: AppState;
  newlySent: ReminderLog[];
  skipped: Array<{ tenantName: string; reason: string }>;
  eligibleCount: number;
}

/**
 * Process automated payment reminders for all tenants
 * Rule: Trigger reminder 3 days before landlord's rent due date if tenant has not paid yet
 */
export function processAutomatedPaymentReminders(
  state: AppState,
  todayIso: string,
  activeYm: string,
  triggerType: 'automated' | 'manual' = 'automated'
): AutomatedCheckResult {
  const daysBefore = state.reminderSettings.daysBefore ?? 3;
  const dueDay = state.landlord.dueDay || 5;
  const dueDate = getDueDateForMonth(activeYm, dueDay);
  const triggerDate = getReminderTriggerDate(activeYm, dueDay, daysBefore);

  const newlySent: ReminderLog[] = [];
  const skipped: Array<{ tenantName: string; reason: string }> = [];

  let isDateEligible = todayIso >= triggerDate;
  if (triggerType === 'manual') {
    // Manual trigger allows testing / running anytime for the active month
    isDateEligible = true;
  }

  // Find all unpaid tenants
  const unpaidTenants = state.tenants.filter((tenant) => {
    const isPaid = state.payments.some((p) => p.tenantId === tenant.id && p.ym === activeYm);
    return !isPaid;
  });

  unpaidTenants.forEach((tenant) => {
    const property = state.properties.find((p) => p.id === tenant.propertyId);

    // Check if tenant has an email
    if (!tenant.email || !tenant.email.includes('@')) {
      skipped.push({
        tenantName: tenant.name,
        reason: 'No valid email address on file',
      });
      return;
    }

    // Check if an automated reminder has already been sent for this tenant & month
    const alreadySent = state.reminderLogs.some(
      (log) => log.tenantId === tenant.id && log.ym === activeYm && log.status !== 'Failed'
    );

    if (alreadySent && triggerType === 'automated') {
      skipped.push({
        tenantName: tenant.name,
        reason: `Automated reminder already sent for ${formatMonthYear(activeYm)}`,
      });
      return;
    }

    if (!isDateEligible) {
      skipped.push({
        tenantName: tenant.name,
        reason: `Reminder scheduled for ${formatDate(triggerDate)} (3 days before due date)`,
      });
      return;
    }

    // Generate reminder email content
    const totalDue = tenant.monthlyRent + (tenant.outstandingBalance || 0);
    const subject = `Rent Reminder: ${formatINR(totalDue)} due on ${formatDate(dueDate)} (${property ? property.name : 'Rental Unit'})`;
    const bodyHtml = generateReminderEmailHtml(state.landlord, tenant, property, activeYm, dueDate);
    const bodyText = generateReminderEmailText(state.landlord, tenant, property, activeYm, dueDate);

    const log: ReminderLog = {
      id: generateUid(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      propertyTitle: property ? property.name : 'Rental Unit',
      ym: activeYm,
      dueDate,
      triggerDate,
      sentAt: new Date().toISOString(),
      subject,
      bodyHtml,
      bodyText,
      amountDue: totalDue,
      status: 'Sent',
      triggerType,
      deliveryChannel: 'email',
    };

    newlySent.push(log);
  });

  const updatedLogs = newlySent.length > 0 ? [...newlySent, ...state.reminderLogs] : state.reminderLogs;

  const updatedState: AppState = {
    ...state,
    reminderLogs: updatedLogs,
  };

  return {
    updatedState,
    newlySent,
    skipped,
    eligibleCount: unpaidTenants.length,
  };
}

/**
 * Check tenant automated reminder status for a given month
 */
export function getTenantReminderStatus(
  tenant: Tenant,
  payments: AppState['payments'],
  reminderLogs: AppState['reminderLogs'],
  landlord: Landlord,
  activeYm: string,
  todayIso: string,
  daysBefore: number = 3
): {
  isPaid: boolean;
  dueDate: string;
  triggerDate: string;
  daysRemaining: number;
  isTriggerDue: boolean;
  hasEmail: boolean;
  lastReminderSent?: ReminderLog;
} {
  const isPaid = payments.some((p) => p.tenantId === tenant.id && p.ym === activeYm);
  const dueDay = landlord.dueDay || 5;
  const dueDate = getDueDateForMonth(activeYm, dueDay);
  const triggerDate = getReminderTriggerDate(activeYm, dueDay, daysBefore);
  const daysRemaining = getDaysUntilDue(todayIso, dueDate);
  const isTriggerDue = todayIso >= triggerDate;
  const hasEmail = Boolean(tenant.email && tenant.email.includes('@'));

  const lastReminderSent = reminderLogs.find((l) => l.tenantId === tenant.id && l.ym === activeYm);

  return {
    isPaid,
    dueDate,
    triggerDate,
    daysRemaining,
    isTriggerDue,
    hasEmail,
    lastReminderSent,
  };
}
