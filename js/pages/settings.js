// js/pages/settings.js - Settings Page
(function() {
  'use strict';

  async function renderSettings() {
    const page = document.getElementById('page-content');
    Components.showLoading(page);
    Components.renderBottomNav('settings');

    const [categories, recurringItems] = await Promise.all([
      DB.getCategories(),
      DB.getRecurringItems()
    ]);

    const catMap = Utils.buildCategoryMap(categories);
    const expenseCats = categories.filter(c => c.type === 'expense' || c.type === 'both');
    const incomeCats = categories.filter(c => c.type === 'income' || c.type === 'both');

    page.innerHTML = `
      <div class="p-4 pb-24 space-y-5">
        <h1 class="text-xl font-bold text-gray-800 dark:text-white">設定</h1>

        <!-- Quick links -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <button onclick="App.navigate('budget')" class="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <span class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl">💰</span>
            <span class="flex-1 text-left font-medium text-gray-800 dark:text-white">預算管理</span>
            <span class="text-gray-400">→</span>
          </button>
          <button onclick="App.navigate('report')" class="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <span class="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl">📄</span>
            <span class="flex-1 text-left font-medium text-gray-800 dark:text-white">匯出 PDF 報表</span>
            <span class="text-gray-400">→</span>
          </button>
        </div>

        <!-- Categories Section -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-800 dark:text-white">支出分類</h2>
            <button onclick="showAddCategoryForm('expense')" class="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-lg">+ 新增</button>
          </div>
          <div id="expense-cats-list" class="space-y-2">
            ${expenseCats.map(c => renderCategoryItem(c)).join('')}
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-800 dark:text-white">收入分類</h2>
            <button onclick="showAddCategoryForm('income')" class="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-lg">+ 新增</button>
          </div>
          <div id="income-cats-list" class="space-y-2">
            ${incomeCats.map(c => renderCategoryItem(c)).join('')}
          </div>
        </div>

        <!-- Recurring Items Section -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-800 dark:text-white">定期費用</h2>
            <button onclick="showAddRecurringForm()" class="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded-lg">+ 新增</button>
          </div>
          <div id="recurring-list" class="space-y-2">
            ${recurringItems.length === 0 ?
              '<p class="text-center text-gray-400 text-sm py-4">尚未設定定期費用</p>' :
              recurringItems.map(r => {
                const cat = catMap[r.categoryId];
                const freqMap = { daily:'每日', weekly:'每週', monthly:'每月', yearly:'每年' };
                return `
                <div class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 ${!r.isActive ? 'opacity-50' : ''}">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style="background:${cat ? cat.color + '20' : '#6b728020'}">
                    ${cat ? cat.emoji : '?'}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800 dark:text-white truncate">${r.description || cat && cat.name || '未知'}</p>
                    <p class="text-xs text-gray-400">${freqMap[r.frequency] || r.frequency} · ${Utils.formatCurrency(r.amount)} · 下次：${r.nextDate}</p>
                  </div>
                  <div class="flex gap-1">
                    <button onclick="toggleRecurring(${r.id}, ${!r.isActive})" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-green-500 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition text-sm">
                      ${r.isActive ? '⏸' : '▶'}
                    </button>
                    <button onclick="deleteRecurring(${r.id})" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm">
                      🗑
                    </button>
                  </div>
                </div>`;
              }).join('')}
          </div>
        </div>

        <!-- Data Management -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 class="font-semibold text-gray-800 dark:text-white mb-3">資料管理</h2>
          <div class="space-y-2">
            <button onclick="exportData()" class="w-full py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium">📤 匯出備份 (JSON)</button>
            <label class="block">
              <input type="file" accept=".json" id="import-file" class="hidden">
              <div onclick="document.getElementById('import-file').click()" class="w-full py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-sm font-medium text-center cursor-pointer">📥 匯入備份 (JSON)</div>
            </label>
            <button onclick="clearAllData()" class="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm font-medium">⚠️ 清除所有資料</button>
          </div>
        </div>

        <!-- App Info -->
        <div class="text-center text-xs text-gray-400 py-2">
          <p>個人記帳本 v1.0.0</p>
          <p class="mt-1">資料儲存於本機 IndexedDB</p>
        </div>
      </div>`;

    document.getElementById('import-file').addEventListener('change', handleImport);
  }

  function renderCategoryItem(c) {
    return `
    <div class="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0" style="background:${c.color}20">
        ${c.emoji}
      </div>
      <span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">${c.name}</span>
      ${c.isDefault ? '<span class="text-xs text-gray-400 px-2">預設</span>' : `
      <button onclick="deleteCat('${c.id}')" class="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition text-xs">🗑</button>
      `}
    </div>`;
  }

  function showAddCategoryForm(type) {
    const colors = ['#f97316','#3b82f6','#a855f7','#ec4899','#ef4444','#10b981','#6b7280','#14b8a6','#f59e0b','#06b6d4'];
    Components.showModal({
      title: `新增${type === 'expense' ? '支出' : '收入'}分類`,
      content: `
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分類名稱</label>
            <input id="cat-name" type="text" maxlength="10" placeholder="例：租金" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emoji 圖示</label>
            <input id="cat-emoji" type="text" maxlength="2" placeholder="🏠" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none text-2xl text-center">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">顏色</label>
            <div class="flex flex-wrap gap-2" id="color-picker">
              ${colors.map(c => `<button type="button" onclick="selectColor('${c}')" data-color="${c}" class="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition" style="background:${c}"></button>`).join('')}
            </div>
            <input type="hidden" id="cat-color" value="${colors[0]}">
          </div>
        </div>`,
      confirmText: '新增',
      onConfirm: async () => {
        const name = document.getElementById('cat-name').value.trim();
        const emoji = document.getElementById('cat-emoji').value.trim() || '📌';
        const color = document.getElementById('cat-color').value;
        if (!name) { showToast('請輸入分類名稱', 'error'); return; }
        await DB.addCategory({ name, emoji, color, type });
        Components.closeModal();
        showToast('分類已新增', 'success');
        renderSettings();
      }
    });
    setTimeout(() => {
      const picker = document.getElementById('color-picker');
      if (picker) {
        const firstBtn = picker.querySelector('button');
        if (firstBtn) firstBtn.classList.add('border-gray-800', 'dark:border-white');
      }
    }, 50);
  }

  window.selectColor = function(color) {
    document.getElementById('cat-color').value = color;
    const btns = document.querySelectorAll('#color-picker button');
    btns.forEach(b => {
      b.classList.remove('border-gray-800', 'dark:border-white', 'ring-2', 'ring-offset-1');
      if (b.dataset.color === color) b.classList.add('ring-2', 'ring-offset-1', 'ring-gray-600');
    });
  };

  async function deleteCat(id) {
    Components.showConfirm('確定刪除此分類？相關交易記錄不會被刪除。', async () => {
      try {
        await DB.deleteCategory(id);
        showToast('分類已刪除', 'success');
        renderSettings();
      } catch(e) {
        showToast(e.message || '刪除失敗', 'error');
      }
    }, '刪除分類');
  }

  async function showAddRecurringForm() {
    const categories = await DB.getCategories();
    Components.showModal({
      title: '新增定期費用',
      content: `
        <form class="space-y-4">
          <div class="flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1">
            <button type="button" id="rec-expense" class="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white">支出</button>
            <button type="button" id="rec-income" class="flex-1 py-2 rounded-lg text-sm font-semibold text-gray-500 dark:text-gray-400">收入</button>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">金額</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">NT$</span>
              <input id="rec-amount" type="text" inputmode="numeric" placeholder="0" class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-lg font-bold focus:ring-2 focus:ring-indigo-400 outline-none">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分類</label>
            <select id="rec-category" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none">
              ${categories.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">頻率</label>
            <select id="rec-freq" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none">
              <option value="daily">每日</option>
              <option value="weekly">每週</option>
              <option value="monthly" selected>每月</option>
              <option value="yearly">每年</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">開始日期</label>
            <input id="rec-start" type="date" value="${Utils.today()}" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">說明</label>
            <input id="rec-desc" type="text" placeholder="例：房租、電話費..." class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none">
          </div>
        </form>`,
      confirmText: '新增',
      onConfirm: async () => {
        const rawAmt = document.getElementById('rec-amount').value.replace(/[^0-9]/g, '');
        const amount = parseInt(rawAmt, 10);
        const categoryId = document.getElementById('rec-category').value;
        const frequency = document.getElementById('rec-freq').value;
        const startDate = document.getElementById('rec-start').value;
        const description = document.getElementById('rec-desc').value.trim();
        const recType = document.getElementById('rec-expense').classList.contains('bg-red-500') ? 'expense' : 'income';
        if (!amount || amount <= 0) { showToast('請輸入有效金額', 'error'); return; }
        await DB.addRecurringItem({ type: recType, amount, categoryId, frequency, startDate, description });
        Components.closeModal();
        showToast('定期費用已新增', 'success');
        renderSettings();
      }
    });
    setTimeout(() => {
      let recType = 'expense';
      const expBtn = document.getElementById('rec-expense');
      const incBtn = document.getElementById('rec-income');
      if (expBtn) expBtn.addEventListener('click', () => {
        recType = 'expense';
        expBtn.className = 'flex-1 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white';
        incBtn.className = 'flex-1 py-2 rounded-lg text-sm font-semibold text-gray-500 dark:text-gray-400';
      });
      if (incBtn) incBtn.addEventListener('click', () => {
        recType = 'income';
        incBtn.className = 'flex-1 py-2 rounded-lg text-sm font-semibold bg-green-500 text-white';
        expBtn.className = 'flex-1 py-2 rounded-lg text-sm font-semibold text-gray-500 dark:text-gray-400';
      });
      const inp = document.getElementById('rec-amount');
      if (inp) Utils.setupAmountInput(inp);
    }, 50);
  }

  async function toggleRecurring(id, newState) {
    await DB.updateRecurringItem(id, { isActive: newState });
    showToast(newState ? '已啟用' : '已暫停', 'success');
    renderSettings();
  }

  async function deleteRecurring(id) {
    Components.showConfirm('確定刪除此定期費用？', async () => {
      await DB.deleteRecurringItem(id);
      showToast('已刪除', 'success');
      renderSettings();
    }, '刪除定期費用');
  }

  async function exportData() {
    const data = await DB.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `記帳備份_${Utils.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('備份已匯出', 'success');
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        Components.showConfirm('匯入備份將合併現有資料，確定繼續？', async () => {
          await DB.importData(data);
          showToast('備份已匯入', 'success');
          renderSettings();
        }, '匯入確認');
      } catch(e) {
        showToast('匯入失敗：檔案格式錯誤', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function clearAllData() {
    Components.showConfirm('確定要清除所有資料？此操作無法還原！', async () => {
      await DB.db.transactions.clear();
      await DB.db.budgets.clear();
      await DB.db.recurringItems.clear();
      showToast('資料已清除', 'success');
      App.navigate('dashboard');
    }, '⚠️ 清除資料');
  }

  window.renderSettings = renderSettings;
  window.showAddCategoryForm = showAddCategoryForm;
  window.deleteCat = deleteCat;
  window.showAddRecurringForm = showAddRecurringForm;
  window.toggleRecurring = toggleRecurring;
  window.deleteRecurring = deleteRecurring;
  window.exportData = exportData;
  window.clearAllData = clearAllData;
})();
