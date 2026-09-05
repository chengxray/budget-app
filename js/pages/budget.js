// js/pages/budget.js - Budget Management Page
(function() {
  'use strict';

  let currentMonth = Utils.currentMonth();

  async function renderBudget() {
    const page = document.getElementById('page-content');
    Components.showLoading(page);
    Components.renderBottomNav('settings');

    const monthOptions = Utils.getMonthOptions(6);
    const [budgetUsage, categories] = await Promise.all([
      DB.getBudgetUsage(currentMonth),
      DB.getCategories('expense')
    ]);
    const catMap = Utils.buildCategoryMap(categories);

    // Budgeted category ids
    const budgetedIds = new Set(budgetUsage.map(b => b.categoryId));
    const unbudgetedCats = categories.filter(c => !budgetedIds.has(c.id));

    page.innerHTML = `
      <div class="p-4 pb-24 space-y-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-gray-800 dark:text-white">預算管理</h1>
          <select id="budget-month-select" class="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white outline-none">
            ${monthOptions.map(o => `<option value="${o.value}" ${o.value === currentMonth ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>

        <!-- Summary -->
        ${budgetUsage.length > 0 ? (() => {
          const totalBudget = budgetUsage.reduce((s,b) => s+b.amount, 0);
          const totalUsed = budgetUsage.reduce((s,b) => s+b.used, 0);
          const totalPct = totalBudget > 0 ? Math.min(100, Math.round((totalUsed/totalBudget)*100)) : 0;
          const barColor = totalPct >= 90 ? 'bg-red-500' : totalPct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500';
          return `
          <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white">
            <p class="text-indigo-200 text-sm mb-1">總預算使用率</p>
            <p class="text-3xl font-bold mb-3">${totalPct}%</p>
            <div class="w-full h-2 bg-white/20 rounded-full mb-2">
              <div class="h-full rounded-full bg-white transition-all" style="width:${totalPct}%"></div>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-indigo-200">已用 ${Utils.formatCurrency(totalUsed)}</span>
              <span class="text-indigo-200">預算 ${Utils.formatCurrency(totalBudget)}</span>
            </div>
          </div>`;
        })() : ''}

        <!-- Add Budget Button -->
        ${unbudgetedCats.length > 0 ? `
        <button onclick="showAddBudgetForm()" class="w-full py-3 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-500 dark:text-indigo-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
          <span class="text-lg">+</span> 新增分類預算
        </button>` : ''}

        <!-- Budget Cards -->
        <div id="budget-list" class="space-y-3">
          ${budgetUsage.length === 0 ? `
          <div class="flex flex-col items-center py-12 text-gray-400">
            <div class="text-5xl mb-3">💰</div>
            <p class="text-sm">尚未設定任何預算</p>
            <p class="text-xs mt-1">點上方按鈕開始設定</p>
          </div>` :
          budgetUsage.map(b => {
            const cat = catMap[b.categoryId];
            if (!cat) return '';
            const pct = Math.min(100, b.percentage);
            const barColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : cat.color;
            const statusText = pct >= 100 ? '⚠️ 超支' : pct >= 80 ? '⚡ 接近上限' : '✅ 正常';
            return `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style="background:${cat.color}20">
                    ${cat.emoji}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800 dark:text-white">${cat.name}</p>
                    <p class="text-xs text-gray-400">${statusText}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button onclick="showEditBudget('${b.categoryId}', ${b.amount}, ${b.id})" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-500 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">✏️</button>
                  <button onclick="removeBudget(${b.id})" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition">🗑</button>
                </div>
              </div>
              <div class="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span>已用 ${Utils.formatCurrency(b.used)}</span>
                <span>預算 ${Utils.formatCurrency(b.amount)}</span>
              </div>
              <div class="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all" style="width:${pct}%;background:${barColor}"></div>
              </div>
              <div class="flex justify-between mt-1">
                <span class="text-xs" style="color:${barColor}">${pct}% 已使用</span>
                <span class="text-xs text-gray-400">剩餘 ${Utils.formatCurrency(Math.max(0, b.remaining))}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;

    document.getElementById('budget-month-select').addEventListener('change', e => {
      currentMonth = e.target.value;
      renderBudget();
    });
  }

  async function showAddBudgetForm() {
    const categories = await DB.getCategories('expense');
    const budgets = await DB.getBudgets(currentMonth);
    const budgetedIds = new Set(budgets.map(b => b.categoryId));
    const available = categories.filter(c => !budgetedIds.has(c.id));

    if (available.length === 0) {
      showToast('所有支出分類已設定預算', 'info');
      return;
    }

    Components.showModal({
      title: '新增分類預算',
      content: `
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分類</label>
            <select id="budget-cat" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400">
              ${available.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">月預算金額</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">NT$</span>
              <input id="budget-amount" type="text" inputmode="numeric" placeholder="0"
                class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-lg font-bold focus:ring-2 focus:ring-indigo-400 outline-none">
            </div>
          </div>
        </div>`,
      confirmText: '新增',
      onConfirm: async () => {
        const catId = document.getElementById('budget-cat').value;
        const raw = document.getElementById('budget-amount').value.replace(/[^0-9]/g, '');
        const amount = parseInt(raw, 10);
        if (!amount || amount <= 0) { showToast('請輸入有效金額', 'error'); return; }
        await DB.setBudget(catId, currentMonth, amount);
        Components.closeModal();
        showToast('預算已設定', 'success');
        renderBudget();
      }
    });
    setTimeout(() => {
      const inp = document.getElementById('budget-amount');
      if (inp) Utils.setupAmountInput(inp);
    }, 50);
  }

  async function showEditBudget(categoryId, currentAmount, budgetId) {
    const cat = await DB.getCategoryById(categoryId);
    Components.showModal({
      title: `編輯預算 - ${cat ? cat.name : ''}`,
      content: `
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">月預算金額</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">NT$</span>
            <input id="edit-budget-amount" type="text" inputmode="numeric" value="${Utils.formatNumber(currentAmount)}"
              class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-lg font-bold focus:ring-2 focus:ring-indigo-400 outline-none">
          </div>
        </div>`,
      confirmText: '儲存',
      onConfirm: async () => {
        const raw = document.getElementById('edit-budget-amount').value.replace(/[^0-9]/g, '');
        const amount = parseInt(raw, 10);
        if (!amount || amount <= 0) { showToast('請輸入有效金額', 'error'); return; }
        await DB.setBudget(categoryId, currentMonth, amount);
        Components.closeModal();
        showToast('預算已更新', 'success');
        renderBudget();
      }
    });
    setTimeout(() => {
      const inp = document.getElementById('edit-budget-amount');
      if (inp) Utils.setupAmountInput(inp);
    }, 50);
  }

  async function removeBudget(id) {
    Components.showConfirm('確定要刪除此預算設定嗎？', async () => {
      await DB.deleteBudget(id);
      showToast('預算已刪除', 'success');
      renderBudget();
    }, '刪除預算');
  }

  window.renderBudget = renderBudget;
  window.showAddBudgetForm = showAddBudgetForm;
  window.showEditBudget = showEditBudget;
  window.removeBudget = removeBudget;
})();
