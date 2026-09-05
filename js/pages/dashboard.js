// js/pages/dashboard.js - Dashboard Page
(function() {
  'use strict';

  async function renderDashboard() {
    const page = document.getElementById('page-content');
    Components.showLoading(page);
    Components.renderBottomNav('dashboard');

    const month = Utils.currentMonth();
    const [summary, budgetUsage, recent, categories] = await Promise.all([
      DB.getMonthSummary(month),
      DB.getBudgetUsage(month),
      DB.getRecentTransactions(5),
      DB.getCategories()
    ]);
    const catMap = Utils.buildCategoryMap(categories);

    const budgetTotal = budgetUsage.reduce((s, b) => s + b.amount, 0);
    const budgetUsed = budgetUsage.reduce((s, b) => s + b.used, 0);
    const budgetPct = budgetTotal > 0 ? Math.min(100, Math.round((budgetUsed / budgetTotal) * 100)) : 0;
    const budgetColor = budgetPct >= 90 ? 'bg-red-500' : budgetPct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500';

    page.innerHTML = `
      <div class="p-4 space-y-4 pb-24">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">${Utils.getMonthLabel(month)}</p>
            <h1 class="text-2xl font-bold text-gray-800 dark:text-white">財務總覽</h1>
          </div>
          <button onclick="renderReport()" class="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-lg">📄</button>
        </div>

        <!-- Balance Card -->
        <div class="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white shadow-lg">
          <p class="text-indigo-200 text-sm mb-1">本月結餘</p>
          <p class="text-4xl font-bold mb-4">${Utils.formatCurrency(summary.balance)}</p>
          <div class="flex justify-between">
            <div>
              <p class="text-indigo-200 text-xs mb-0.5">收入</p>
              <p class="text-lg font-semibold text-green-300">${Utils.formatCurrency(summary.income)}</p>
            </div>
            <div class="text-right">
              <p class="text-indigo-200 text-xs mb-0.5">支出</p>
              <p class="text-lg font-semibold text-red-300">${Utils.formatCurrency(summary.expense)}</p>
            </div>
          </div>
        </div>

        <!-- Budget Overview -->
        ${budgetTotal > 0 ? `
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-gray-800 dark:text-white">月度預算</h2>
            <button onclick="App.navigate('budget')" class="text-xs text-indigo-500">管理 →</button>
          </div>
          <div class="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>${Utils.formatCurrency(budgetUsed)} / ${Utils.formatCurrency(budgetTotal)}</span>
            <span>${budgetPct}%</span>
          </div>
          <div class="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all ${budgetColor}" style="width:${budgetPct}%"></div>
          </div>
          ${budgetPct >= 90 ? '<p class="text-xs text-red-500 mt-2">⚠️ 預算即將超支！</p>' : ''}
        </div>` : `
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-semibold text-gray-800 dark:text-white">月度預算</h2>
              <p class="text-xs text-gray-400 mt-0.5">尚未設定預算</p>
            </div>
            <button onclick="App.navigate('budget')" class="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-lg">設定</button>
          </div>
        </div>`}

        <!-- Budget Per Category -->
        ${budgetUsage.length > 0 ? `
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 class="font-semibold text-gray-800 dark:text-white mb-3">分類預算進度</h2>
          <div class="space-y-3">
            ${budgetUsage.slice(0,4).map(b => {
              const cat = catMap[b.categoryId];
              if (!cat) return '';
              const pct = Math.min(100, b.percentage);
              const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : cat.color;
              return `
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-gray-700 dark:text-gray-300">${cat.emoji} ${cat.name}</span>
                  <span class="text-xs text-gray-500">${Utils.formatCurrency(b.used)} / ${Utils.formatCurrency(b.amount)}</span>
                </div>
                <div class="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" style="width:${pct}%;background:${barColor}"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- Quick Stats -->
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-3 text-center shadow-sm">
            <p class="text-2xl">📝</p>
            <p class="text-lg font-bold text-gray-800 dark:text-white">${summary.transactions.length}</p>
            <p class="text-xs text-gray-400">本月筆數</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-3 text-center shadow-sm">
            <p class="text-2xl">💸</p>
            <p class="text-sm font-bold text-gray-800 dark:text-white">${summary.transactions.length > 0 ? Utils.formatCurrency(Math.round(summary.expense / (new Date().getDate()))) : 'NT$0'}</p>
            <p class="text-xs text-gray-400">日均支出</p>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-3 text-center shadow-sm">
            <p class="text-2xl">📈</p>
            <p class="text-sm font-bold ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}">${summary.balance >= 0 ? '盈餘' : '赤字'}</p>
            <p class="text-xs text-gray-400">本月狀態</p>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-gray-800 dark:text-white">最近記錄</h2>
            <button onclick="App.navigate('transactions')" class="text-xs text-indigo-500">全部 →</button>
          </div>
          ${recent.length === 0 ? '<p class="text-center text-gray-400 text-sm py-4">尚無記錄，點右下角「+」新增</p>' :
            recent.map(t => {
              const cat = catMap[t.categoryId];
              return `
              <div class="flex items-center gap-3 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0"
                   onclick="Components.showTransactionForm(${JSON.stringify(t).replace(/"/g, '&quot;')})">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style="background:${cat ? cat.color + '20' : '#6b728020'}">
                  ${cat ? cat.emoji : '?'}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 dark:text-white truncate">${cat ? cat.name : '未知'}</p>
                  <p class="text-xs text-gray-400 truncate">${t.description || Utils.formatDate(t.date, 'full')}</p>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}">
                    ${t.type === 'income' ? '+' : '-'}${Utils.formatCurrency(t.amount)}
                  </p>
                  <p class="text-xs text-gray-400">${Utils.relativeTime(t.date)}</p>
                </div>
              </div>`;
            }).join('')}
        </div>
      </div>`;
  }

  window.renderDashboard = renderDashboard;
})();
