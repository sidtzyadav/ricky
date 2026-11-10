import { AppState } from '../types';

/**
 * Download arbitrary content as a file to user's computer
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export current app state as JSON backup
 */
export function exportStateAsJson(state: AppState) {
  const dateStr = new Date().toISOString().split('T')[0];
  const jsonContent = JSON.stringify(state, null, 2);
  triggerFileDownload(jsonContent, `rent-manager-backup-${dateStr}.json`, 'application/json');
}

/**
 * Generate a standalone single-file offline HTML app bundle containing the current active data
 */
export function generateStandaloneOfflineAppHtml(state: AppState): string {
  const serializedState = JSON.stringify(state).replace(/<\/script>/gi, '<\\/script>');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Rent Manager - Offline Edition</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --tx: #0f172a;
      --mu: #64748b;
      --ac: #0f766e;
      --ac-hover: #115e59;
      --bd: #e2e8f0;
      --ok: #15803d;
      --warn: #b45309;
      box-sizing: border-box;
      padding-top: env(safe-area-inset-top, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b0f17;
        --card: #141c28;
        --tx: #f1f5f9;
        --mu: #94a3b8;
        --ac: #2dd4bf;
        --ac-hover: #14b8a6;
        --bd: #222f42;
        --ok: #4ade80;
        --warn: #fbbf24;
      }
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      background: var(--bg);
      color: var(--tx);
      font: 15px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    header {
      background: var(--card);
      border-bottom: 1px solid var(--bd);
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand { font-size: 17px; font-weight: 700; color: var(--tx); display: flex; align-items: center; gap: 8px; }
    main { max-width: 680px; margin: 0 auto; padding: 20px 16px 100px; }
    h1 { font-size: 22px; margin: 0 0 4px; font-weight: 700; }
    h2 { font-size: 17px; margin: 24px 0 10px; font-weight: 600; }
    .badge-auto { background: #ccfbf1; color: #0f766e; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    label { display: block; font-size: 13px; color: var(--mu); margin: 12px 0 0; }
    input, select, textarea {
      width: 100%;
      margin-top: 5px;
      padding: 10px 12px;
      font: inherit;
      color: var(--tx);
      background: var(--card);
      border: 1px solid var(--bd);
      border-radius: 8px;
    }
    button {
      font: inherit;
      padding: 9px 14px;
      margin: 8px 8px 0 0;
      border-radius: 8px;
      border: 1px solid var(--bd);
      background: var(--card);
      color: var(--tx);
      cursor: pointer;
      font-weight: 500;
      font-size: 13px;
      transition: all 0.15s ease;
    }
    button:hover { background: var(--bd); }
    button.pri { background: var(--ac); border-color: var(--ac); color: #fff; font-weight: 600; }
    @media (prefers-color-scheme: dark) { button.pri { color: #04201c; } }
    .card { background: var(--card); border: 1px solid var(--bd); border-radius: 12px; padding: 16px; margin: 12px 0; }
    .mu { color: var(--mu); font-size: 13px; }
    .row { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
    .ok { color: var(--ok); font-weight: 600; }
    .due { color: var(--warn); font-weight: 600; }
    .banner { background: var(--card); border: 1px solid var(--bd); border-left: 4px solid var(--warn); border-radius: 8px; padding: 12px 14px; margin: 12px 0; font-size: 13px; }
    .banner-auto { border-left-color: var(--ac); }
    nav {
      position: fixed;
      left: 0; right: 0; bottom: 0;
      display: flex;
      background: var(--card);
      border-top: 1px solid var(--bd);
      z-index: 50;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    nav button { flex: 1; margin: 0; border: 0; border-radius: 0; background: none; padding: 14px 4px; font-size: 12px; color: var(--mu); }
    nav button.on { color: var(--ac); font-weight: 700; border-top: 2px solid var(--ac); }
    #toast {
      position: fixed;
      left: 50%; bottom: 84px;
      transform: translateX(-50%);
      background: var(--tx);
      color: var(--bg);
      padding: 10px 18px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      display: none;
      max-width: 90%;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--ac);"></span>
      Rent Manager &middot; Offline App
    </div>
    <span class="badge-auto">3-Day Auto Reminders</span>
  </header>

  <main>
    <div id="v"></div>
  </main>

  <nav>
    <button data-t="rent" onclick="go('rent')">Rent</button>
    <button data-t="rem" onclick="go('rem')">Reminders</button>
    <button data-t="ten" onclick="go('ten')">Tenants</button>
    <button data-t="prop" onclick="go('prop')">Properties</button>
    <button data-t="me" onclick="go('me')">Landlord</button>
    <button data-t="rep" onclick="go('rep')">Reports</button>
  </nav>

  <div id="toast"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script>
    const $ = s => document.querySelector(s);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    
    // Initial Seeded Data from your active Rent Manager state
    const SEED_DATA = ${serializedState};
    let S = SEED_DATA;
    try {
      const r = localStorage.getItem('rentapp_v2');
      if (r) S = Object.assign({}, SEED_DATA, JSON.parse(r));
    } catch(e) {}

    const persist = () => {
      try { localStorage.setItem('rentapp_v2', JSON.stringify(S)); } catch(e) {}
    };

    const uid = () => Math.random().toString(36).slice(2, 9);
    const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
    const p2 = n => String(n).padStart(2, '0');
    const now = new Date();
    const today = now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate());
    let ym = today.slice(0, 7), tab = 'rent', ep = null, et = null, recv = null;

    const fd = iso => {
      if (!iso) return '-';
      try {
        const parts = iso.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch(e) { return iso; }
    };

    const mon = y_m => {
      if (!y_m) return '';
      const a = y_m.split('-');
      return new Date(a[0], a[1] - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    };

    function toast(m) {
      const t = $('#toast');
      t.textContent = m;
      t.style.display = 'block';
      clearTimeout(toast.h);
      toast.h = setTimeout(() => t.style.display = 'none', 3000);
    }

    function go(t) { tab = t; ep = et = recv = null; render(); }

    const val = id => ($('#' + id) ? $('#' + id).value.trim() : '');
    const F = (id, l, v, t, x) => '<label>' + l + '<input id="' + id + '" type="' + (t || 'text') + '" value="' + esc(v) + '" ' + (x || '') + '></label>';

    function getDueDate(ymStr) {
      const dueDay = (S.landlord && S.landlord.dueDay) || 5;
      return ymStr + '-' + p2(dueDay);
    }

    function getTriggerDate(ymStr) {
      const dueDay = (S.landlord && S.landlord.dueDay) || 5;
      const daysBefore = (S.reminderSettings && S.reminderSettings.daysBefore) || 3;
      const parts = ymStr.split('-');
      const d = new Date(parts[0], parts[1] - 1, dueDay);
      d.setDate(d.getDate() - daysBefore);
      return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
    }

    const payOf = tid => (S.payments || []).find(p => p.tenantId === tid && p.ym === ym);

    function render() {
      document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
      $('#v').innerHTML = ({ rent: vRent, rem: vRem, ten: vTen, prop: vProp, me: vMe, rep: vRep })[tab]();
    }

    /* Rent View */
    function vRent() {
      const unpaid = S.tenants.filter(t => !payOf(t.id));
      const dueDate = getDueDate(ym);
      const trigDate = getTriggerDate(ym);

      let h = '<label>Billing Month<input type="month" value="' + ym + '" onchange="ym=this.value||ym;recv=null;render()"></label>';
      if (unpaid.length) {
        h += '<div class="banner"><b>' + unpaid.length + ' tenant' + (unpaid.length > 1 ? 's' : '') + ' pending payment</b> for ' + mon(ym) + '. Rent due on ' + fd(dueDate) + '. Automated 3-day reminder triggers on ' + fd(trigDate) + '.</div>';
      } else {
        h += '<div class="banner banner-auto">All tenants have paid for ' + mon(ym) + '!</div>';
      }

      h += S.tenants.map(t => {
        const pr = S.properties.find(p => p.id === t.propertyId);
        const py = payOf(t.id);
        const total = t.monthlyRent + (t.outstandingBalance || 0);

        let c = '<div class="card">';
        c += '<div class="row"><b>' + esc(t.name) + '</b>' + (py ? '<span class="ok">Paid</span>' : '<span class="due">Due</span>') + '</div>';
        c += '<div class="mu">' + esc(pr ? pr.name : 'No property') + ' &middot; Rent ' + inr(t.monthlyRent) + (t.outstandingBalance ? ' &middot; Outstanding ' + inr(t.outstandingBalance) : '') + ' &middot; Total ' + inr(total) + '</div>';

        c += '<button onclick="genRem(\'' + t.id + '\')">Reminder PDF</button>';
        if (py) {
          c += '<button class="pri" onclick="genRec(\'' + t.id + '\')">Receipt PDF</button>';
        } else {
          c += '<button class="pri" onclick="recv=\'' + t.id + '\';render()">Record Rent Received</button>';
        }

        if (recv === t.id) {
          c += '<div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--bd);">';
          c += F('r_a', 'Amount received (Rs.)', total, 'number');
          c += F('r_d', 'Date received', today, 'date');
          c += '<label>Payment Mode<select id="r_m"><option>UPI</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option></select></label>';
          c += F('r_n', 'Narration / UTR Reference', 'UPI/Rent-' + ym);
          c += '<button class="pri" onclick="savePay(\'' + t.id + '\')">Save &amp; Generate Receipt</button>';
          c += '<button onclick="recv=null;render()">Cancel</button>';
          c += '</div>';
        }

        c += '</div>';
        return c;
      }).join('') || '<p class="mu">No tenants found.</p>';

      return h;
    }

    function savePay(tid) {
      const amt = +val('r_a');
      if (!amt) return toast('Enter valid amount');
      const t = S.tenants.find(x => x.id === tid);
      const total = t.monthlyRent + (t.outstandingBalance || 0);
      const bal = Math.max(0, total - amt);

      const count = (S.payments || []).filter(p => p.ym === ym).length;
      const py = {
        id: uid(),
        tenantId: tid,
        ym: ym,
        amount: amt,
        date: val('r_d') || today,
        mode: val('r_m') || 'UPI',
        narration: val('r_n'),
        balanceOutstanding: bal,
        receiptNumber: 'R-' + ym.replace('-', '') + '-' + p2(count + 1)
      };

      if (!S.payments) S.payments = [];
      S.payments.push(py);
      t.outstandingBalance = bal;
      persist();
      recv = null;
      render();
      toast('Payment saved!');
      genRec(tid);
    }

    /* Reminders View */
    function vRem() {
      const dueDate = getDueDate(ym);
      const trigDate = getTriggerDate(ym);
      const isDue = today >= trigDate;

      let h = '<h2>Automated 3-Day Payment Reminders</h2>';
      h += '<div class="banner banner-auto">Rule: Reminders trigger <b>3 days before rent due date</b> (' + fd(dueDate) + '). Current trigger date is <b>' + fd(trigDate) + '</b>.</div>';

      h += '<h2>Tenants Queue (' + mon(ym) + ')</h2>';
      h += S.tenants.map(t => {
        const pr = S.properties.find(p => p.id === t.propertyId);
        const py = payOf(t.id);
        const hasEmail = Boolean(t.email);

        return '<div class="card">' +
          '<div class="row"><b>' + esc(t.name) + '</b><span>' + (py ? '<span class="ok">Paid</span>' : (isDue ? '<span class="due">3-Day Notice Active</span>' : 'Scheduled ' + fd(trigDate))) + '</span></div>' +
          '<div class="mu">Email: ' + esc(t.email || 'No email specified') + ' &middot; Rent ' + inr(t.monthlyRent) + '</div>' +
          (!py ? '<button class="pri" onclick="sendEmailRem(\'' + t.id + '\')">Send Reminder Email</button><button onclick="genRem(\'' + t.id + '\')">Reminder PDF</button>' : '<span class="mu">Paid</span>') +
          '</div>';
      }).join('');

      return h;
    }

    function sendEmailRem(tid) {
      const t = S.tenants.find(x => x.id === tid);
      if (!t.email) return toast('No email address for ' + t.name);
      const dueDate = getDueDate(ym);
      const total = t.monthlyRent + (t.outstandingBalance || 0);

      const subj = 'Rent Reminder: ' + inr(total) + ' due on ' + fd(dueDate);
      const body = 'Dear ' + t.name + ',\\n\\nRent of ' + inr(total) + ' for ' + mon(ym) + ' is due in 3 days on ' + fd(dueDate) + '.\\n\\nLandlord: ' + (S.landlord.name||'') + '\\nUPI ID: ' + (S.landlord.upiId||'') + '\\nAccount: ' + (S.landlord.accountNumber||'');

      window.open('mailto:' + encodeURIComponent(t.email) + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body));
      toast('Opened reminder in email client');
    }

    /* PDF Generators */
    function genPdf(title, rows, note) {
      const D = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      const L = S.landlord || {};
      D.setFont('helvetica', 'bold');
      D.setFontSize(18);
      D.setTextColor(15, 118, 110);
      D.text(title, 105, 22, { align: 'center' });
      D.setDrawColor(200);
      D.line(15, 27, 195, 27);

      let y = 38;
      D.setFontSize(10.5);
      D.setTextColor(30);

      rows.forEach(r => {
        D.setFont('helvetica', 'bold');
        D.text(r[0], 15, y);
        D.setFont('helvetica', 'normal');
        const sp = D.splitTextToSize(String(r[1] || '-'), 120);
        D.text(sp, 65, y);
        y += 5.5 * sp.length + 2;
      });

      y += 4;
      const b = D.splitTextToSize(note, 180);
      D.text(b, 15, y);
      y += 5.5 * b.length + 8;

      // Bank info
      if (L.bankName || L.upiId) {
        D.setFont('helvetica', 'bold');
        D.text('Bank & UPI Transfer Details:', 15, y);
        y += 6;
        D.setFont('helvetica', 'normal');
        D.text('Account Holder: ' + (L.accountHolder || L.name || '-') + ' | Bank: ' + (L.bankName || '-'), 15, y);
        y += 5.5;
        D.text('Account No: ' + (L.accountNumber || '-') + ' | IFSC: ' + (L.ifsc || '-') + ' | UPI: ' + (L.upiId || '-'), 15, y);
        y += 12;
      }

      D.line(130, y + 15, 195, y + 15);
      D.setFont('helvetica', 'bold');
      D.text(L.name || 'Landlord Signature', 130, y + 21);

      D.setFont('helvetica', 'normal');
      D.setFontSize(8.5);
      D.text('Landlord PAN: ' + (L.pan || '-') + ' | Phone: ' + (L.phone || '-'), 15, 280);
      return D;
    }

    function genRem(tid) {
      const t = S.tenants.find(x => x.id === tid);
      const pr = S.properties.find(p => p.id === t.propertyId);
      const dueDate = getDueDate(ym);
      const total = t.monthlyRent + (t.outstandingBalance || 0);

      const D = genPdf('RENT PAYMENT REMINDER', [
        ['Tenant', t.name],
        ['Property', (pr ? pr.name + ', ' + pr.address : '-')],
        ['Billing Period', mon(ym)],
        ['Monthly Rent', inr(t.monthlyRent)],
        ['Outstanding', inr(t.outstandingBalance)],
        ['Total Payable', inr(total)],
        ['Due Date', fd(dueDate)]
      ], 'Dear ' + t.name + ', kindly transfer rent of ' + inr(total) + ' for ' + mon(ym) + ' on or before ' + fd(dueDate) + '. Share the transaction reference after transfer.');

      D.save('Rent-Reminder-' + t.name.replace(/\\s+/g, '-') + '-' + ym + '.pdf');
      toast('Reminder PDF downloaded');
    }

    function genRec(tid) {
      const t = S.tenants.find(x => x.id === tid);
      const pr = S.properties.find(p => p.id === t.propertyId);
      const py = payOf(tid);
      if (!py) return toast('No payment recorded for this month');

      const D = genPdf('RENT RECEIPT (HRA COMPLIANT)', [
        ['Receipt No', py.receiptNumber],
        ['Date Received', fd(py.date)],
        ['Tenant Name', t.name],
        ['Property', (pr ? pr.name + ', ' + pr.address : '-')],
        ['Rent Period', mon(py.ym)],
        ['Amount Received', inr(py.amount)],
        ['Payment Mode', py.mode],
        ['Narration / UTR', py.narration || '-'],
        ['Balance Outstanding', inr(py.balanceOutstanding)]
      ], 'Received with thanks from ' + t.name + ' the sum of ' + inr(py.amount) + ' towards rent for ' + mon(py.ym) + '.');

      D.save('Rent-Receipt-' + t.name.replace(/\\s+/g, '-') + '-' + py.ym + '.pdf');
      toast('Receipt PDF downloaded');
    }

    /* Tenants View */
    function vTen() {
      let h = '<h2>Tenants Directory</h2>';
      h += S.tenants.map(t => {
        const pr = S.properties.find(p => p.id === t.propertyId);
        return '<div class="card">' +
          '<div class="row"><b>' + esc(t.name) + '</b><span>' + inr(t.monthlyRent) + '</span></div>' +
          '<div class="mu">' + esc(pr ? pr.name : 'No property') + ' &middot; Email: ' + esc(t.email || '-') + ' &middot; Phone: ' + esc(t.phone || '-') + '</div>' +
          '</div>';
      }).join('');
      return h;
    }

    /* Properties View */
    function vProp() {
      let h = '<h2>Rental Properties</h2>';
      h += S.properties.map(p => {
        return '<div class="card">' +
          '<div class="row"><b>' + esc(p.name) + '</b><span class="mu">' + esc(p.type) + '</span></div>' +
          '<div class="mu">' + esc(p.address) + '</div>' +
          '</div>';
      }).join('');
      return h;
    }

    /* Landlord View */
    function vMe() {
      const L = S.landlord || {};
      let h = '<h2>Landlord Profile</h2>';
      h += F('l_n', 'Full Legal Name', L.name);
      h += F('l_p', 'PAN', L.pan);
      h += F('l_e', 'Email', L.email);
      h += F('l_m', 'Mobile Number', L.phone);
      h += F('l_d', 'Rent Due Day of Month (1-28)', L.dueDay || 5, 'number');
      h += '<h2>Bank Details (Printed on Receipts)</h2>';
      h += F('l_bn', 'Bank & Branch', L.bankName);
      h += F('l_ah', 'Account Holder', L.accountHolder);
      h += F('l_ac', 'Account Number', L.accountNumber);
      h += F('l_if', 'IFSC Code', L.ifsc);
      h += F('l_up', 'UPI ID', L.upiId);
      h += '<button class="pri" onclick="saveMe()">Save Profile</button>';
      return h;
    }

    function saveMe() {
      S.landlord = {
        name: val('l_n'),
        pan: val('l_p').toUpperCase(),
        email: val('l_e'),
        phone: val('l_m'),
        dueDay: Math.min(28, Math.max(1, +val('l_d') || 5)),
        bankName: val('l_bn'),
        accountHolder: val('l_ah'),
        accountNumber: val('l_ac'),
        ifsc: val('l_if').toUpperCase(),
        upiId: val('l_up')
      };
      persist();
      toast('Landlord profile saved!');
    }

    /* Reports View */
    function vRep() {
      let h = '<h2>Reports & Ledger</h2>';
      h += '<div class="card">';
      h += '<div class="row"><b>Total Properties</b><b>' + S.properties.length + '</b></div>';
      h += '<div class="row"><b>Total Tenants</b><b>' + S.tenants.length + '</b></div>';
      const totRent = S.tenants.reduce((s, t) => s + t.monthlyRent, 0);
      h += '<div class="row"><b>Total Monthly Rent Roll</b><b class="ok">' + inr(totRent) + '</b></div>';
      h += '</div>';
      return h;
    }

    render();
  </script>
</body>
</html>`;
}
