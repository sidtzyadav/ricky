import { jsPDF } from 'jspdf';
import { Landlord, Property, Tenant, PaymentRecord } from '../types';
import { formatINR, formatDate, formatMonthYear, maskAadhaar } from './formatters';

function formatPropertyAddress(property?: Property): string {
  if (!property) return 'No property linked';
  return property.address ? `${property.name}, ${property.address}` : property.name;
}

/**
 * Download a generated PDF document with proper file name
 */
export function downloadPdf(doc: jsPDF, filename: string): void {
  try {
    doc.save(filename);
  } catch (err) {
    console.error('Error saving PDF:', err);
  }
}

/**
 * Generate a formal Rent Reminder PDF
 */
export function createReminderPDF(
  landlord: Landlord,
  tenant: Tenant,
  property: Property | undefined,
  ym: string,
  dueDate: string
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const totalPayable = tenant.monthlyRent + (tenant.outstandingBalance || 0);

  // Primary Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 118, 110); // Emerald teal
  doc.text('RENT PAYMENT REMINDER', 105, 22, { align: 'center' });

  // Divider
  doc.setDrawColor(200, 205, 215);
  doc.setLineWidth(0.5);
  doc.line(15, 27, 195, 27);

  // Metadata rows
  let y = 38;
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);

  const rows: [string, string][] = [
    ['Notice Date', formatDate(new Date().toISOString().split('T')[0])],
    ['Tenant Name', tenant.name],
    ['Property', formatPropertyAddress(property)],
    ['Rent Billing Period', formatMonthYear(ym)],
    ['Monthly Rent', formatINR(tenant.monthlyRent)],
    ['Previous Outstanding', formatINR(tenant.outstandingBalance)],
    ['Total Amount Payable', formatINR(totalPayable)],
    ['Payment Due Date', formatDate(dueDate)],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, 15, y);

    doc.setFont('helvetica', label === 'Total Amount Payable' || label === 'Payment Due Date' ? 'bold' : 'normal');
    doc.setTextColor(label === 'Total Amount Payable' ? 15 : 15, label === 'Total Amount Payable' ? 118 : 23, label === 'Total Amount Payable' ? 110 : 42);
    const splitValue = doc.splitTextToSize(value || '-', 120);
    doc.text(splitValue, 65, y);
    y += 5.5 * splitValue.length + 2.5;
  });

  // Body Note
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const reminderText = `Dear ${tenant.name},\n\nThis is a polite reminder that your monthly rent of ${formatINR(tenant.monthlyRent)}${tenant.outstandingBalance ? ` along with past outstanding of ${formatINR(tenant.outstandingBalance)} (Total: ${formatINR(totalPayable)})` : ''} for ${formatMonthYear(ym)} is due on ${formatDate(dueDate)}.\n\nKindly complete the transfer on or before the due date and share the transaction reference / UTR for instant receipt generation. If already paid, please ignore this notice.\n\nThank you for being a valued resident.`;

  const splitText = doc.splitTextToSize(reminderText, 180);
  doc.text(splitText, 15, y);
  y += 5 * splitText.length + 8;

  // Bank Transfer Box
  const bankRows = [
    ['Account Holder', landlord.accountHolder || landlord.name],
    ['Bank & Branch', landlord.bankName],
    ['Account Number', landlord.accountNumber],
    ['IFSC Code', landlord.ifsc],
    ['UPI ID', landlord.upiId],
  ].filter(([, val]) => Boolean(val));

  if (bankRows.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, 180, 8 + bankRows.length * 6, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Payment Details for Rent Transfer', 20, y + 6);

    let bankY = y + 13;
    doc.setFontSize(9.5);
    bankRows.forEach(([lbl, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(`${lbl}:`, 20, bankY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(String(val), 65, bankY);
      bankY += 5.5;
    });

    y += 12 + bankRows.length * 6;
  }

  // Signature Block
  y = Math.max(y + 10, 230);
  doc.setDrawColor(180, 190, 205);
  doc.line(130, y, 195, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Landlord Authorization', 130, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(landlord.name || 'Landlord', 130, y + 11);

  // Footer / Compliance Note
  y = 275;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.line(15, y - 4, 195, y - 4);

  const ad = maskAadhaar(landlord.aadhaar);
  doc.text(`Landlord: ${landlord.name || '-'}   |   PAN: ${landlord.pan || '-'}   |   Aadhaar: ${ad}`, 15, y);
  doc.text(`Mobile: ${landlord.phone || '-'}   |   Email: ${landlord.email || '-'}`, 15, y + 4.5);

  return doc;
}

/**
 * Generate a formal Rent Receipt PDF (HRA Compliant)
 */
export function createReceiptPDF(
  landlord: Landlord,
  tenant: Tenant,
  property: Property | undefined,
  payment: PaymentRecord
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Receipt Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(15, 118, 110);
  doc.text('RENT RECEIPT', 105, 22, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Valid for Income Tax House Rent Allowance (HRA) Exemption Claim', 105, 27, { align: 'center' });

  // Divider
  doc.setDrawColor(200, 205, 215);
  doc.line(15, 31, 195, 31);

  let y = 42;
  doc.setFontSize(10);

  const rows: [string, string][] = [
    ['Receipt Number', payment.receiptNumber],
    ['Date of Payment', formatDate(payment.date)],
    ['Received From', tenant.name],
    ['Property Rented', formatPropertyAddress(property)],
    ['Rent for Period', formatMonthYear(payment.ym)],
    ['Monthly Rent', formatINR(tenant.monthlyRent)],
    ['Amount Received', formatINR(payment.amount)],
    ['Payment Mode', payment.mode],
    ['Transaction Ref / Narration', payment.narration || 'Confirmed Direct Credit'],
    ['Balance Outstanding', formatINR(payment.balanceOutstanding)],
    ['Security Deposit Held', formatINR(tenant.securityDeposit)],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, 15, y);

    const isHighLight = label === 'Amount Received';
    doc.setFont('helvetica', isHighLight ? 'bold' : 'normal');
    doc.setTextColor(isHighLight ? 15 : 15, isHighLight ? 118 : 23, isHighLight ? 110 : 42);

    const splitValue = doc.splitTextToSize(value || '-', 120);
    doc.text(splitValue, 68, y);
    y += 5.2 * splitValue.length + 2;
  });

  // Acknowledgment Statement
  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, 180, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const ack = `Received with thanks from ${tenant.name} the sum of ${formatINR(payment.amount)} towards residential/commercial rent for the month of ${formatMonthYear(payment.ym)} for the rented premises situated at ${formatPropertyAddress(property)}.`;
  const splitAck = doc.splitTextToSize(ack, 172);
  doc.text(splitAck, 19, y + 6);

  y += 34;

  // Bank Info summary
  if (landlord.bankName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Payment Credited To:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${landlord.bankName} | A/C: ${landlord.accountNumber || '-'} | IFSC: ${landlord.ifsc || '-'}`, 53, y);
    y += 8;
  }

  // Signature Block
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
  doc.text(landlord.name || 'Landlord', 130, y + 11);

  // Footer Compliance
  y = 275;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y - 4, 195, y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const ad = maskAadhaar(landlord.aadhaar);
  doc.text(`Landlord: ${landlord.name || '-'}   |   PAN: ${landlord.pan || '-'}   |   Aadhaar: ${ad}`, 15, y);
  doc.text(`Tenant PAN: ${tenant.pan || '-'}   |   Contact: ${landlord.phone || '-'} / ${landlord.email || '-'}`, 15, y + 4.5);

  return doc;
}

/**
 * Generate a Tenant Ledger Statement PDF
 */
export function createTenantStatementPDF(
  landlord: Landlord,
  tenant: Tenant,
  property: Property | undefined,
  payments: PaymentRecord[],
  fromDate: string,
  toDate: string
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('TENANT RENT STATEMENT & LEDGER', 105, 20, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Period: ${formatDate(fromDate)} to ${formatDate(toDate)}   |   Generated: ${formatDate(new Date().toISOString().split('T')[0])}`, 105, 26, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 30, 195, 30);

  // Header stats
  let y = 38;
  doc.setFontSize(9.5);
  const meta: [string, string][] = [
    ['Tenant Name', tenant.name],
    ['Property', formatPropertyAddress(property)],
    ['Monthly Rent', formatINR(tenant.monthlyRent)],
    ['Security Deposit', formatINR(tenant.securityDeposit)],
    ['Current Outstanding', formatINR(tenant.outstandingBalance)],
    ['Landlord', `${landlord.name} (${landlord.phone || '-'})`],
  ];

  meta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(k, 15, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(v, 65, y);
    y += 5.5;
  });

  y += 4;
  doc.setDrawColor(200, 205, 215);
  doc.line(15, y, 195, y);
  y += 7;

  // Table Headers
  const colX = [15, 42, 75, 110, 145, 195];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Payment Date', colX[0], y);
  doc.text('Billing Month', colX[1], y);
  doc.text('Receipt No.', colX[2], y);
  doc.text('Mode / UTR', colX[3], y);
  doc.text('Amount Paid', colX[4], y);

  y += 3;
  doc.line(15, y, 195, y);
  y += 6;

  // Rows
  let totalPaid = 0;
  doc.setFont('helvetica', 'normal');
  payments.forEach((p) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    totalPaid += p.amount;
    doc.text(formatDate(p.date), colX[0], y);
    doc.text(formatMonthYear(p.ym), colX[1], y);
    doc.text(p.receiptNumber || '-', colX[2], y);
    doc.text(`${p.mode} - ${(p.narration || '').slice(0, 16)}`, colX[3], y);
    doc.text(formatINR(p.amount), colX[4], y);
    y += 6;
  });

  if (payments.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text('No payment records found in the selected period.', 15, y);
    y += 8;
  }

  // Total Row
  y += 2;
  doc.line(15, y, 195, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Rent Paid in Period:', colX[3], y);
  doc.setTextColor(15, 118, 110);
  doc.text(formatINR(totalPaid), colX[4], y);

  return doc;
}

/**
 * Generate a Unit / Portfolio Rent Summary PDF
 */
export function createUnitReportPDF(
  landlord: Landlord,
  reportRows: Array<{
    property: string;
    tenant: string;
    rent: number;
    paidInPeriod: number;
    totalPaid: number;
    deposit: number;
    outstanding: number;
  }>,
  fromDate: string,
  toDate: string
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('PORTFOLIO RENT ROLL & UNIT REPORT', 105, 20, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Period: ${formatDate(fromDate)} to ${formatDate(toDate)}   |   Landlord: ${landlord.name || 'Owner'}`, 105, 26, { align: 'center' });

  doc.line(15, 30, 195, 30);
  let y = 38;

  // Table Columns
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Property / Tenant', 15, y);
  doc.text('Rent (Mo.)', 70, y);
  doc.text('Period Paid', 100, y);
  doc.text('Total Paid', 130, y);
  doc.text('Deposit', 160, y);
  doc.text('Outstanding', 180, y);

  y += 3;
  doc.line(15, y, 195, y);
  y += 6;

  let sumRent = 0;
  let sumPeriod = 0;
  let sumTotal = 0;
  let sumDeposit = 0;
  let sumOut = 0;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  reportRows.forEach((r) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    sumRent += r.rent;
    sumPeriod += r.paidInPeriod;
    sumTotal += r.totalPaid;
    sumDeposit += r.deposit;
    sumOut += r.outstanding;

    doc.setFont('helvetica', 'bold');
    doc.text(r.property.slice(0, 26), 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`(${r.tenant.slice(0, 22)})`, 15, y + 4);

    doc.setTextColor(15, 23, 42);
    doc.text(formatINR(r.rent), 70, y);
    doc.text(formatINR(r.paidInPeriod), 100, y);
    doc.text(formatINR(r.totalPaid), 130, y);
    doc.text(formatINR(r.deposit), 160, y);

    if (r.outstanding > 0) {
      doc.setTextColor(180, 83, 9);
    }
    doc.text(formatINR(r.outstanding), 180, y);
    doc.setTextColor(15, 23, 42);

    y += 9;
  });

  // Total Summary
  y += 2;
  doc.line(15, y, 195, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 15, y);
  doc.text(formatINR(sumRent), 70, y);
  doc.text(formatINR(sumPeriod), 100, y);
  doc.text(formatINR(sumTotal), 130, y);
  doc.text(formatINR(sumDeposit), 160, y);
  doc.setTextColor(sumOut > 0 ? 180 : 15, sumOut > 0 ? 83 : 118, sumOut > 0 ? 9 : 110);
  doc.text(formatINR(sumOut), 180, y);

  return doc;
}

/**
 * Generate a formal Security Deposit Receipt PDF
 */
export function createDepositReceiptPDF(
  landlord: Landlord,
  tenant: Tenant,
  property: Property | undefined
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const depositPaid = tenant.depositPaid ?? tenant.securityDeposit;
  const depositBalance = Math.max(0, tenant.securityDeposit - depositPaid);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 118, 110);
  doc.text('SECURITY DEPOSIT RECEIPT', 105, 22, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Acknowledgment of Refundable Rental Security Deposit', 105, 27, { align: 'center' });

  doc.setDrawColor(200, 205, 215);
  doc.line(15, 31, 195, 31);

  let y = 42;
  doc.setFontSize(10);

  const receiptNo = `DEP-${(tenant.leaseStartDate || '2026').replace(/-/g, '').slice(0, 6)}-${tenant.id.slice(-4).toUpperCase()}`;

  const rows: [string, string][] = [
    ['Receipt Number', receiptNo],
    ['Date Received', formatDate(tenant.depositPaidDate || tenant.leaseStartDate || new Date().toISOString().split('T')[0])],
    ['Received From', tenant.name],
    ['Leased Property', formatPropertyAddress(property)],
    ['Agreed Security Deposit', formatINR(tenant.securityDeposit)],
    ['Deposit Amount Received', formatINR(depositPaid)],
    ['Deposit Balance Pending', formatINR(depositBalance)],
    ['Payment Mode', tenant.depositPaymentMode || 'Bank Transfer'],
    ['Transaction Ref / Narration', tenant.depositNarration || 'Confirmed Security Deposit Remittance'],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, 15, y);

    const isHighlight = label === 'Deposit Amount Received';
    doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
    doc.setTextColor(isHighlight ? 15 : 15, isHighlight ? 118 : 23, isHighlight ? 110 : 42);

    const splitValue = doc.splitTextToSize(value || '-', 120);
    doc.text(splitValue, 68, y);
    y += 5.5 * splitValue.length + 2.5;
  });

  // Clause
  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, 180, 26, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const ack = `Received with thanks from ${tenant.name} the sum of ${formatINR(depositPaid)} as refundable interest-free security deposit for the tenancy of ${formatPropertyAddress(property)}. This deposit is refundable at the end of the tenancy after deducting any valid arrears or repair damages as agreed in the rental agreement.`;
  const splitAck = doc.splitTextToSize(ack, 172);
  doc.text(splitAck, 19, y + 6);

  y += 38;

  // Signature Block
  y = Math.max(y + 8, 228);
  doc.setDrawColor(180, 190, 205);
  doc.line(130, y, 195, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Landlord Signature & Acknowledgment', 130, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(landlord.name || 'Landlord', 130, y + 11);

  // Footer Compliance
  y = 275;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y - 4, 195, y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const ad = maskAadhaar(landlord.aadhaar);
  doc.text(`Landlord: ${landlord.name || '-'}   |   PAN: ${landlord.pan || '-'}   |   Aadhaar: ${ad}`, 15, y);
  doc.text(`Tenant PAN: ${tenant.pan || '-'}   |   Contact: ${landlord.phone || '-'} / ${landlord.email || '-'}`, 15, y + 4.5);

  return doc;
}
