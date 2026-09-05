// js/pages/transactions.js - Transactions List Page
(function() {
  'use strict';

  let currentMonth = Utils.currentMonth();
  let filterType = 'all';

  async function renderTransactions() {
    const page = document.getElementById('page-content');
    Components.showLoading(page);
    Components.renderBottomNav('transactions');

    const monthOptions = Utils.getMonthOptions(12);
    const [txns, categories] = await Promise.all([
      DB.getTransactions({ month: currentMonth }),
      DB.getCategories()
    ]);
    const catMap = Utils.buildCategoryMap(categories);

    let filtered = txns;
    if (filterType === 'expense') filtered = txns.filter(t => t.type === 'expense');
    else if (filterType === 'income') filtered = txns.filter(t => t.type === 'income');

    // Group by date
    const grouped = {};
    filtered.forEach(t => {
      const d = t.date || 'unknown';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(t);
    });
    const sortedDates = Object.keys(grouped).sort().reverse();

    const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    page.innerHTML = `
      <div class="pb-24">
        <!-- Header -->
        <div class="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <div class="p-4 pb-0">
            <h1 class="text-xl font-bold text-gray-800 dark:text-white mb-3">交易記錄</h1>
            <!-- Month Selector -->
            <div class="flex gap-2 items-center mb-3">
              <select id="month-select" class="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                ${monthOptions.map(o => `<option value="${o.value}" ${o.value === currentMonth ? 'selected' : ''}>${o.label}</option>`).join('')}
              </select>
              <button onclick="showExportOptions()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-lg">⬇</button>
            </div>
            <!-- Type Filter -->
            <div class="flex gap-2 pb-3">
              ${[['all','全部','bg-indigo-500'],['expense','支出','bg-red-500'],['income','收入','bg-green-500']].map(([v,l,c]) =>
                `<button onclick="setTxnFilter('${v}')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterType === v ? c + ' text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}">${l}</button>`
              ).join('')}
            </div>
          </div>
          <!-- Summary Bar -->
          <div class="flex bg-gray-50 dark:bg-gray-800 px-4 py-2 gap-4 text-sm">
            <span class="text-green-500 font-medium">收 ${Utils.formatCurrency(totalIncome)}</span>
            <span class="text-red-500 font-medium">支 ${Utils.formatCurrency(totalExpense)}</span>
            <span class="text-gray-500 dark:text-gray-400 ml-auto">${filtered.length} 筆</span>
          </div>
        </div>

        <!-- Transaction List -->
        <div id="txn-list" class="p-4 space-y-4">
          ${sortedDates.length === 0 ? `
            <div class="flex flex-col items-center justify-center py-20 text-gray-400">
              <div class="text-5xl mb-3">📭</div>
              <p class="text-sm">本月尚無記錄</p>
            </div>` :
            sortedDates.map(date => {
              const dayTxns = grouped[date];
              const dayIncome = dayTxns.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
              const dayExpense = dayTxns.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);
              return `
              <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                  <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${Utils.formatDate(date, 'full')}</span>
                  <div class="flex gap-3 text-xs">
                    ${dayIncome > 0 ? `<span class="text-green-500">+${Utils.formatCurrency(dayIncome)}</span>` : ''}
                    ${dayExpense > 0 ? `<span class="text-red-500">-${Utils.formatCurrency(dayExpense)}</span>` : ''}
                  </div>
                </div>
                ${dayTxns.map(t => {
                  const cat = catMap[t.categoryId];
                  return `
                  <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0 active:bg-gray-50 dark:active:bg-gray-700 cursor-pointer"
                       onclick="editTxn(${t.id})">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style="background:${cat ? cat.color + '20' : '#6b728020'}">
                      ${cat ? cat.emoji : '?'}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-800 dark:text-white">${cat ? cat.name : '未知分類'}</p>
                      ${t.description ? `<p class="text-xs text-gray-400 truncate">${t.description}</p>` : ''}
                    </div>
                    <div class="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p class="font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}">
                          ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}
                        </p>
                      </div>
                      <button onclick="deleteTxn(event, ${t.id})" class="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                        🗑
                      </button>
                    </div>
                  </div>`;
                }).join('')}
              </div>`;
            }).join('')}
        </div>
      </div>`;

    document.getElementById('month-select').addEventListener('change', e => {
      currentMonth = e.target.value;
      renderTransactions();
    });
  }

  function setTxnFilter(type) {
    filterType = type;
    renderTransactions();
  }

  async function editTxn(id) {
    const txn = await DB.getTransactionById(id);
    if (txn) await Components.showTransactionForm(txn);
  }

  async function deleteTxn(e, id) {
    e.stopPropagation();
    Components.showConfirm('確定要刪除這筆記錄嗎？', async () => {
      try {
        await DB.deleteTransaction(id);
        showToast('已刪除', 'success');
        renderTransactions();
      } catch(err) {
        showToast('刪除失敗', 'error');
      }
    }, '刪除記錄');
  }

  function showExportOptions() {
    Components.showModal({
      title: '匯出交易記錄',
      content: `
        <div class="space-y-3">
          <button onclick="exportCSV(); Components.closeModal();" class="w-full py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium text-sm">📊 匯出 CSV</button>
          <button onclick="App.navigate('report'); Components.closeModal();" class="w-full py-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium text-sm">📄 PDF 報表</button>
        </div>`,
      showCancel: true,
      cancelText: '取消'
    });
  }

  async function exportCSV() {
    const txns = await DB.getTransactions({ month: currentMonth });
    const cats = await DB.getCategories();
    const catMap = Utils.buildCategoryMap(cats);
    const header = ['日期', '類型', '分類', '金額', '說明'];
    const rows = txns.map(t => [
      t.date,
      t.type === 'income' ? '收入' : '支出',
      catMap[t.categoryId] ? catMap[t.categoryId].name : '',
      t.amount,
      t.description || ''
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const bom = '\uFEFF'; // BOM for Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `記帳記錄_${currentMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV 已匯出', 'success');
  }

  window.renderTransactions = renderTransactions;
  window.setTxnFilter = setTxnFilter;
  window.editTxn = editTxn;
  window.deleteTxn = deleteTxn;
  window.showExportOptions = showExportOptions;
  window.exportCSV = exportCSV;
})();
