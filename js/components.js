// js/components.js - Shared UI Components
(function() {
  'use strict';

  // ===== TOAST =====
  let toastContainer = null;

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-80 max-w-[90vw]';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showToast(message, type = 'success', duration = 3000) {
    const container = getToastContainer();
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    const toast = document.createElement('div');
    toast.className = `flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg transition-all duration-300 ${colors[type] || colors.info}`;
    toast.innerHTML = `<span class="text-base">${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ===== MODAL =====
  let activeModal = null;

  function showModal({ title, content, onConfirm, onCancel, confirmText = '確定', cancelText = '取消', showCancel = true, confirmClass = 'btn-primary' }) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4';
    overlay.innerHTML = `
      <div class="modal-box bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white">${title}</h3>
          <button id="modal-close" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">✕</button>
        </div>
        <div class="p-5">${content}</div>
        ${showCancel || onConfirm ? `
        <div class="flex gap-3 px-5 pb-5">
          ${showCancel ? `<button id="modal-cancel" class="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">${cancelText}</button>` : ''}
          ${onConfirm ? `<button id="modal-confirm" class="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition ${confirmClass}">${confirmText}</button>` : ''}
        </div>` : ''}
      </div>`;

    document.body.appendChild(overlay);
    activeModal = overlay;

    const closeBtn = overlay.querySelector('#modal-close');
    const cancelBtn = overlay.querySelector('#modal-cancel');
    const confirmBtn = overlay.querySelector('#modal-confirm');

    if (closeBtn) closeBtn.addEventListener('click', () => { closeModal(); onCancel && onCancel(); });
    if (cancelBtn) cancelBtn.addEventListener('click', () => { closeModal(); onCancel && onCancel(); });
    if (confirmBtn) confirmBtn.addEventListener('click', () => { onConfirm && onConfirm(); });
    overlay.addEventListener('click', e => { if (e.target === overlay) { closeModal(); onCancel && onCancel(); }});

    // Animate in
    requestAnimationFrame(() => {
      const box = overlay.querySelector('.modal-box');
      if (box) box.style.transform = 'translateY(0)';
    });
  }

  function closeModal() {
    if (activeModal) {
      activeModal.remove();
      activeModal = null;
    }
  }

  // ===== CONFIRM DIALOG =====
  function showConfirm(message, onConfirm, title = '確認') {
    showModal({
      title,
      content: `<p class="text-gray-600 dark:text-gray-300">${message}</p>`,
      onConfirm,
      confirmText: '確定',
      cancelText: '取消',
      confirmClass: 'bg-red-500 hover:bg-red-600'
    });
  }

  // ===== TRANSACTION FORM MODAL =====
  async function showTransactionForm(existingData = null) {
    const isEdit = !!existingData;
    const categories = await DB.getCategories();
    const expenseCats = categories.filter(c => c.type === 'expense' || c.type === 'both');
    const incomeCats = categories.filter(c => c.type === 'income' || c.type === 'both');

    const currentType = existingData ? existingData.type : 'expense';
    const buildCatOptions = (cats, selectedId) =>
      cats.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('');

    const content = `
      <form id="txn-form" class="space-y-4">
        <div class="flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1">
          <button type="button" id="type-expense" class="flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${currentType === 'expense' ? 'bg-red-500 text-white' : 'text-gray-500 dark:text-gray-400'}">支出</button>
          <button type="button" id="type-income" class="flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${currentType === 'income' ? 'bg-green-500 text-white' : 'text-gray-500 dark:text-gray-400'}">收入</button>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">金額 <span class="text-red-400">*</span></label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">NT$</span>
            <input id="txn-amount" type="text" inputmode="numeric" placeholder="0"
              value="${existingData ? Utils.formatNumber(existingData.amount) : ''}"
              class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-lg font-bold focus:ring-2 focus:ring-indigo-400 outline-none">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分類 <span class="text-red-400">*</span></label>
          <select id="txn-category" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none">
            <optgroup label="支出分類" id="expense-cats">${buildCatOptions(expenseCats, existingData && existingData.type === 'expense' ? existingData.categoryId : '')}</optgroup>
            <optgroup label="收入分類" id="income-cats">${buildCatOptions(incomeCats, existingData && existingData.type === 'income' ? existingData.categoryId : '')}</optgroup>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">日期</label>
          <input id="txn-date" type="date" value="${existingData ? existingData.date : Utils.today()}"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">說明（選填）</label>
          <input id="txn-desc" type="text" placeholder="備註..." value="${existingData ? (existingData.description || '') : ''}"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none">
        </div>
      </form>`;

    let txnType = currentType;

    showModal({
      title: isEdit ? '編輯記錄' : '新增記錄',
      content,
      confirmText: isEdit ? '儲存' : '新增',
      onConfirm: async () => {
        const amountRaw = document.getElementById('txn-amount').value.replace(/[^0-9]/g, '');
        const amount = parseInt(amountRaw, 10);
        const categoryId = document.getElementById('txn-category').value;
        const date = document.getElementById('txn-date').value;
        const description = document.getElementById('txn-desc').value.trim();

        if (!amount || amount <= 0) { showToast('請輸入有效金額', 'error'); return; }
        if (!categoryId) { showToast('請選擇分類', 'error'); return; }
        if (!date) { showToast('請選擇日期', 'error'); return; }

        const data = { type: txnType, amount, categoryId, description, date };
        try {
          if (isEdit) {
            await DB.updateTransaction(existingData.id, data);
            showToast('記錄已更新', 'success');
          } else {
            await DB.addTransaction(data);
            showToast('記錄已新增', 'success');
          }
          closeModal();
          if (window.App && App.refreshCurrentPage) App.refreshCurrentPage();
        } catch(e) {
          showToast('操作失敗：' + e.message, 'error');
        }
      }
    });

    // Setup after modal is in DOM
    setTimeout(() => {
      const amountInput = document.getElementById('txn-amount');
      if (amountInput) Utils.setupAmountInput(amountInput);

      const expBtn = document.getElementById('type-expense');
      const incBtn = document.getElementById('type-income');
      const catSelect = document.getElementById('txn-category');

      function setType(type) {
        txnType = type;
        if (type === 'expense') {
          expBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition bg-red-500 text-white';
          incBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition text-gray-500 dark:text-gray-400';
          // Select first expense category
          const firstExpense = catSelect.querySelector('#expense-cats option');
          if (firstExpense) catSelect.value = firstExpense.value;
        } else {
          incBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition bg-green-500 text-white';
          expBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold transition text-gray-500 dark:text-gray-400';
          const firstIncome = catSelect.querySelector('#income-cats option');
          if (firstIncome) catSelect.value = firstIncome.value;
        }
      }

      if (expBtn) expBtn.addEventListener('click', () => setType('expense'));
      if (incBtn) incBtn.addEventListener('click', () => setType('income'));
    }, 50);
  }

  // ===== LOADING SPINNER =====
  function showLoading(container) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-gray-400">
        <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
        <span class="text-sm">載入中...</span>
      </div>`;
  }

  // ===== EMPTY STATE =====
  function showEmpty(container, message = '尚無資料', icon = '📭') {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-gray-400">
        <div class="text-5xl mb-3">${icon}</div>
        <p class="text-sm">${message}</p>
      </div>`;
  }

  // ===== BOTTOM NAV =====
  function renderBottomNav(activePage) {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;
    const tabs = [
      { id: 'dashboard', icon: '🏠', label: '首頁' },
      { id: 'transactions', icon: '📋', label: '記錄' },
      { id: 'analytics', icon: '📊', label: '圖表' },
      { id: 'settings', icon: '⚙️', label: '設定' }
    ];
    nav.innerHTML = tabs.map(t => `
      <button onclick="App.navigate('${t.id}')" class="flex flex-col items-center justify-center flex-1 py-2 transition ${activePage === t.id ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'}">
        <span class="text-xl leading-none">${t.icon}</span>
        <span class="text-[10px] mt-0.5 font-medium">${t.label}</span>
        ${activePage === t.id ? '<div class="w-1 h-1 rounded-full bg-indigo-500 mt-0.5"></div>' : '<div class="w-1 h-1 mt-0.5"></div>'}
      </button>`).join('');
  }

  // Expose
  window.Components = {
    showToast, showModal, closeModal, showConfirm,
    showTransactionForm, showLoading, showEmpty, renderBottomNav
  };

  // Shortcut
  window.showToast = showToast;

})();
