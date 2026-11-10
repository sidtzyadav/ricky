/**
 * Format currency in Indian Rupees
 */
export function formatINR(amount: number | undefined | null): string {
  const val = Number(amount || 0);
  return '₹' + val.toLocaleString('en-IN');
}

/**
 * Mask Aadhaar number showing only last 4 digits
 */
export function maskAadhaar(aadhaar: string | undefined | null): string {
  if (!aadhaar) return '-';
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length < 4) return aadhaar;
  return `XXXX XXXX ${clean.slice(-4)}`;
}

/**
 * Format ISO date string (YYYY-MM-DD) to friendly format (e.g. 05 Nov 2026)
 */
export function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '-';
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return isoDate;
  } catch {
    return isoDate;
  }
}

/**
 * Format Year-Month (YYYY-MM) to full month name (e.g. November 2026)
 */
export function formatMonthYear(ym: string): string {
  if (!ym) return '';
  const [yearStr, monthStr] = ym.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const d = new Date(year, month, 1);
  return d.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Helper to zero-pad 2 digits
 */
export function pad2(n: number | string): string {
  return String(n).padStart(2, '0');
}

/**
 * Get today's ISO date string (YYYY-MM-DD) in local time
 */
export function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/**
 * Get current Year-Month (YYYY-MM)
 */
export function getCurrentYm(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

/**
 * Calculate the exact due date for a given YYYY-MM and landlord due day (1-28)
 */
export function getDueDateForMonth(ym: string, dueDay: number = 5): string {
  const [yStr, mStr] = ym.split('-');
  const day = Math.min(28, Math.max(1, dueDay || 5));
  return `${yStr}-${pad2(mStr)}-${pad2(day)}`;
}

/**
 * Calculate the reminder trigger date (e.g. 3 days before due date)
 */
export function getReminderTriggerDate(ym: string, dueDay: number = 5, daysBefore: number = 3): string {
  const [yStr, mStr] = ym.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const day = Math.min(28, Math.max(1, dueDay || 5));

  const dueDate = new Date(year, month, day);
  dueDate.setDate(dueDate.getDate() - daysBefore);

  return `${dueDate.getFullYear()}-${pad2(dueDate.getMonth() + 1)}-${pad2(dueDate.getDate())}`;
}

/**
 * Check if reminder is due to be sent on or after the trigger date
 */
export function isReminderEligible(
  todayIso: string,
  ym: string,
  dueDay: number = 5,
  daysBefore: number = 3
): boolean {
  const triggerDateIso = getReminderTriggerDate(ym, dueDay, daysBefore);
  return todayIso >= triggerDateIso;
}

/**
 * Calculate number of days remaining until due date (negative means overdue)
 */
export function getDaysUntilDue(todayIso: string, dueDateIso: string): number {
  try {
    const d1 = new Date(todayIso + 'T00:00:00');
    const d2 = new Date(dueDateIso + 'T00:00:00');
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Generate unique id
 */
export function generateUid(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);
}

/**
 * Convert an amount in INR to formal words (e.g., 25,000 -> Rupees Twenty-Five Thousand Only)
 */
export function numberToWordsINR(num: number): string {
  const n = Math.floor(Math.abs(num || 0));
  if (n === 0) return 'Rupees Zero Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(val: number): string {
    if (val < 20) return units[val];
    const unitPart = val % 10;
    return `${tens[Math.floor(val / 10)]}${unitPart ? ' ' + units[unitPart] : ''}`.trim();
  }

  function convertThreeDigits(val: number): string {
    const hundred = Math.floor(val / 100);
    const remainder = val % 100;
    let res = '';
    if (hundred > 0) {
      res += `${units[hundred]} Hundred`;
      if (remainder > 0) res += ' and ';
    }
    if (remainder > 0) {
      res += convertTwoDigits(remainder);
    }
    return res.trim();
  }

  // Indian numbering: Crores, Lakhs, Thousands, Hundreds
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remaining = n % 1000;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${convertTwoDigits(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertTwoDigits(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertTwoDigits(thousand)} Thousand`);
  }
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  return `Rupees ${parts.join(' ')} Only`.replace(/\s+/g, ' ');
}
