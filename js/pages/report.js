// js/pages/report.js - PDF Report Page
(function() {
  'use strict';

  let reportPeriod = 'month';
  let reportMonth = Utils.currentMonth();

  async function renderReport() {
    const page = document.getElementById('page-content');
    Components.showLoading(page);
    Components.renderBottomNav('settings');

    const monthOptions = Utils.getMonthOptions(12);

    page.innerHTML = `
      <div class="p-4 pb-24 space-y-4">
        <div class="flex items-center gap-2">
          <button onclick="App.navigate('dashboard')" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">←</button>
          <h1 class="text-xl font-bold text-gray-800 dark:text-white">PDF 報表</h1>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">報表類型</label>
            <div class="flex gap-2">
              ${[['month','月報'],['quarter','季報'],['year','年報']].map(([v,l]) =>
                `<button onclick="setReportPeriod('${v}')" id="rp-${v}" class="flex-1 py-2.5 rounded-xl text-sm font-medium transition ${reportPeriod === v ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}">${l}</button>`
              ).join('')}
            </div>
          </div>
          <div id="month-picker-wrap">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">選擇月份</label>
            <select id="report-month-select" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400">
              ${monthOptions.map(o => `<option value="${o.value}" ${o.value === reportMonth ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Preview Area -->
        <div id="report-preview-card" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 class="font-semibold text-gray-800 dark:text-white">報表預覽</h2>
          </div>
          <div id="report-content" class="p-4">
            <div class="flex flex-col items-center py-8 text-gray-400">
              <div class="text-4xl mb-2">📄</div>
              <p class="text-sm">點擊「預覽」生成報表</p>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button onclick="previewReport()" class="flex-1 py-3.5 rounded-2xl bg-indigo-500 text-white font-semibold shadow-md hover:bg-indigo-600 transition">👁 預覽報表</button>
          <button onclick="downloadPDF()" class="flex-1 py-3.5 rounded-2xl bg-green-500 text-white font-semibold shadow-md hover:bg-green-600 transition">⬇ 下載 PDF</button>
        </div>
      </div>`;

    document.getElementById('report-month-select').addEventListener('change', e => {
      reportMonth = e.target.value;
    });
  }

  function setReportPeriod(period) {
    reportPeriod = period;
    ['month','quarter','year'].forEach(p => {
      const btn = document.getElementById(`rp-${p}`);
      if (!btn) return;
      if (p === period) {
        btn.className = 'flex-1 py-2.5 rounded-xl text-sm font-medium transition bg-indigo-500 text-white';
      } else {
        btn.className = 'flex-1 py-2.5 rounded-xl text-sm font-medium transition bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
      }
    });
  }

  async function getReportData() {
    const categories = await DB.getCategories();
    const catMap = Utils.buildCategoryMap(categories);

    let months = [];
    if (reportPeriod === 'month') {
      months = [reportMonth];
    } else if (reportPeriod === 'quarter') {
      const [y, m] = reportMonth.split('-').map(Number);
      const q = Math.floor((m - 1) / 3);
      for (let i = 0; i < 3; i++) {
        const mm = q * 3 + i + 1;
        months.push(`${y}-${String(mm).padStart(2,'0')}`);
      }
    } else if (reportPeriod === 'year') {
      const y = reportMonth.split('-')[0];
      for (let m = 1; m <= 12; m++) {
        months.push(`${y}-${String(m).padStart(2,'0')}`);
      }
    }

    const summaries = await Promise.all(months.map(m => DB.getMonthSummary(m)));
    const totalIncome = summaries.reduce((s, x) => s + x.income, 0);
    const totalExpense = summaries.reduce((s, x) => s + x.expense, 0);
    const allTxns = summaries.flatMap(s => s.transactions);

    const catExpense = {};
    allTxns.filter(t => t.type === 'expense').forEach(t => {
      catExpense[t.categoryId] = (catExpense[t.categoryId] || 0) + t.amount;
    });

    const periodLabel = reportPeriod === 'month' ? Utils.getMonthLabel(reportMonth) :
      reportPeriod === 'quarter' ? `${reportMonth.split('-')[0]}年Q${Math.ceil(parseInt(reportMonth.split('-')[1])/3)}` :
      `${reportMonth.split('-')[0]}年`;

    return { months, summaries, totalIncome, totalExpense, allTxns, catExpense, catMap, periodLabel };
  }

  function buildReportHTML(data, forPDF = false) {
    const { summaries, months, totalIncome, totalExpense, allTxns, catExpense, catMap, periodLabel } = data;
    const balance = totalIncome - totalExpense;

    const catRows = Object.entries(catExpense).sort((a,b) => b[1]-a[1]).map(([id, amt]) => {
      const cat = catMap[id];
      const pct = totalExpense > 0 ? Math.round((amt/totalExpense)*100) : 0;
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${cat ? cat.emoji + ' ' + cat.name : id}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${Utils.formatCurrency(amt)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${pct}%</td>
      </tr>`;
    }).join('');

    const monthRows = summaries.map((s, i) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${Utils.getMonthLabel(months[i])}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#10b981;">${Utils.formatCurrency(s.income)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#ef4444;">${Utils.formatCurrency(s.expense)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:${s.balance >= 0 ? '#10b981' : '#ef4444'};">${Utils.formatCurrency(s.balance)}</td>
    </tr>`).join('');

    return `
    <div id="report-html" style="font-family:'Microsoft JhengHei','PingFang TC',sans-serif;max-width:700px;margin:0 auto;padding:20px;background:#fff;color:#1f2937;">
      <!-- Header -->
      <div style="text-align:center;padding:20px 0 15px;border-bottom:2px solid #6366f1;margin-bottom:20px;">
        <div style="font-size:32px;margin-bottom:8px;">💰</div>
        <h1 style="font-size:22px;font-weight:bold;color:#4f46e5;margin:0 0 4px;">個人記帳報表</h1>
        <p style="color:#6b7280;font-size:14px;margin:0;">${periodLabel} · 生成時間：${new Date().toLocaleString('zh-TW')}</p>
      </div>

      <!-- Summary -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
        <div style="background:#f0fdf4;border-radius:12px;padding:14px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;">總收入</p>
          <p style="font-size:18px;font-weight:bold;color:#10b981;margin:0;">${Utils.formatCurrency(totalIncome)}</p>
        </div>
        <div style="background:#fef2f2;border-radius:12px;padding:14px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;">總支出</p>
          <p style="font-size:18px;font-weight:bold;color:#ef4444;margin:0;">${Utils.formatCurrency(totalExpense)}</p>
        </div>
        <div style="background:${balance >= 0 ? '#eff6ff' : '#fef2f2'};border-radius:12px;padding:14px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;">結餘</p>
          <p style="font-size:18px;font-weight:bold;color:${balance >= 0 ? '#3b82f6' : '#ef4444'};margin:0;">${Utils.formatCurrency(balance)}</p>
        </div>
      </div>

      <!-- Monthly Breakdown -->
      ${months.length > 1 ? `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:15px;font-weight:bold;color:#374151;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">月份明細</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">月份</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600;">收入</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600;">支出</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600;">結餘</th>
            </tr>
          </thead>
          <tbody>${monthRows}</tbody>
        </table>
      </div>` : ''}

      <!-- Category Breakdown -->
      ${Object.keys(catExpense).length > 0 ? `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:15px;font-weight:bold;color:#374151;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">支出分類明細</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">分類</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600;">金額</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600;">佔比</th>
            </tr>
          </thead>
          <tbody>${catRows}</tbody>
        </table>
      </div>` : ''}

      <!-- Transaction Details -->
      <div>
        <h2 style="font-size:15px;font-weight:bold;color:#374151;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">交易明細（共 ${allTxns.length} 筆）</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600;">日期</th>
              <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600;">分類</th>
              <th style="padding:6px 8px;text-align:left;color:#6b7280;font-weight:600;">說明</th>
              <th style="padding:6px 8px;text-align:right;color:#6b7280;font-weight:600;">金額</th>
            </tr>
          </thead>
          <tbody>
            ${[...allTxns].sort((a,b) => b.date.localeCompare(a.date)).map(t => {
              const cat = catMap[t.categoryId];
              return `<tr>
                <td style="padding:6px 8px;border-bottom:1px solid #f9fafb;white-space:nowrap;">${t.date}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #f9fafb;">${cat ? cat.emoji + ' ' + cat.name : '-'}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #f9fafb;color:#6b7280;">${t.description || '-'}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #f9fafb;text-align:right;color:${t.type === 'income' ? '#10b981' : '#ef4444'};font-weight:600;">
                  ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;padding-top:12px;border-top:1px solid #f3f4f6;">個人記帳本 · 資料由 IndexedDB 本機儲存</p>
    </div>`;
  }

  async function previewReport() {
    const previewArea = document.getElementById('report-content');
    if (previewArea) {
      previewArea.innerHTML = '<div class="flex items-center justify-center py-8"><div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div></div>';
    }
    const data = await getReportData();
    if (previewArea) {
      previewArea.innerHTML = buildReportHTML(data);
    }
    showToast('報表已生成', 'success');
  }

  async function downloadPDF() {
    showToast('PDF 生成中，請稍候...', 'info', 5000);
    const data = await getReportData();

    // Create a temp element
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;';
    wrapper.innerHTML = buildReportHTML(data, true);
    document.body.appendChild(wrapper);

    try {
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let posY = 0;
      const marginY = 10;

      if (imgH <= pageH) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
      } else {
        // Multi-page
        let remainH = imgH;
        let srcY = 0;
        while (remainH > 0) {
          const sliceH = Math.min(pageH - marginY, remainH);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = (sliceH * canvas.width) / imgW;
          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, srcY * canvas.width / imgW, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
          pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, marginY/2, imgW, sliceH);
          remainH -= sliceH;
          srcY += sliceH;
          if (remainH > 0) pdf.addPage();
        }
      }

      pdf.save(`記帳報表_${data.periodLabel}_${Utils.today()}.pdf`);
      showToast('PDF 已下載', 'success');
    } catch(e) {
      console.error(e);
      showToast('PDF 生成失敗：' + e.message, 'error');
    } finally {
      document.body.removeChild(wrapper);
    }
  }

  window.renderReport = renderReport;
  window.setReportPeriod = setReportPeriod;
  window.previewReport = previewReport;
  window.downloadPDF = downloadPDF;
})();
