// js/db.js - Dexie Database Layer
(function() {
  'use strict';

  const DEFAULT_CATEGORIES = [
    { id:'cat-food', name:'飲食', emoji:'🍜', color:'#f97316', type:'expense', isDefault:true },
    { id:'cat-transport', name:'交通', emoji:'🚌', color:'#3b82f6', type:'expense', isDefault:true },
    { id:'cat-entertainment', name:'娛樂', emoji:'🎮', color:'#a855f7', type:'expense', isDefault:true },
    { id:'cat-shopping', name:'購物', emoji:'🛍️', color:'#ec4899', type:'expense', isDefault:true },
    { id:'cat-medical', name:'醫療', emoji:'💊', color:'#ef4444', type:'expense', isDefault:true },
    { id:'cat-salary', name:'薪水', emoji:'💰', color:'#10b981', type:'income', isDefault:true },
    { id:'cat-other-exp', name:'其他支出', emoji:'📦', color:'#6b7280', type:'expense', isDefault:true },
    { id:'cat-other-inc', name:'其他收入', emoji:'🎁', color:'#14b8a6', type:'income', isDefault:true },
  ];

  const db = new Dexie('BudgetApp');
  db.version(1).stores({
    transactions: '++id, type, categoryId, date, recurringId, createdAt',
    categories: 'id, type, isDefault',
    budgets: '++id, categoryId, month',
    recurringItems: '++id, nextDate, isActive',
    settings: 'id'
  });

  // Initialize default data
  async function initDefaults() {
    const catCount = await db.categories.count();
    if (catCount === 0) {
      await db.categories.bulkPut(DEFAULT_CATEGORIES);
    }
    const settings = await db.settings.get(1);
    if (!settings) {
      await db.settings.put({ id: 1, defaultCurrency: 'TWD' });
    }
  }

  // ===== TRANSACTIONS =====
  async function addTransaction(data) {
    const id = await db.transactions.add({
      ...data,
      createdAt: new Date().toISOString()
    });
    return id;
  }

  async function updateTransaction(id, data) {
    await db.transactions.update(id, data);
  }

  async function deleteTransaction(id) {
    await db.transactions.delete(id);
  }

  async function getTransactions({ month, type, categoryId } = {}) {
    let col = db.transactions.orderBy('date').reverse();
    let results = await col.toArray();
    if (month) results = results.filter(t => t.date && t.date.startsWith(month));
    if (type) results = results.filter(t => t.type === type);
    if (categoryId) results = results.filter(t => t.categoryId === categoryId);
    return results;
  }

  async function getTransactionById(id) {
    return db.transactions.get(id);
  }

  async function getMonthSummary(month) {
    const txns = await getTransactions({ month });
    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    return { income, expense, balance: income - expense, transactions: txns };
  }

  async function getMonthlyTrend(months = 6) {
    const result = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.toISOString().slice(0, 7);
      const summary = await getMonthSummary(month);
      result.push({ month, ...summary });
    }
    return result;
  }

  async function getCategoryExpenses(month) {
    const txns = await getTransactions({ month, type: 'expense' });
    const map = {};
    for (const t of txns) {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    }
    return map;
  }

  async function getRecentTransactions(limit = 10) {
    const all = await db.transactions.orderBy('createdAt').reverse().limit(limit).toArray();
    return all;
  }

  // ===== CATEGORIES =====
  async function getCategories(type) {
    if (type) {
      return db.categories.filter(c => c.type === type || c.type === 'both').toArray();
    }
    return db.categories.toArray();
  }

  async function getCategoryById(id) {
    return db.categories.get(id);
  }

  async function addCategory(data) {
    const id = 'cat-' + Date.now();
    await db.categories.put({ ...data, id, isDefault: false });
    return id;
  }

  async function deleteCategory(id) {
    // Don't delete if it's a default category
    const cat = await db.categories.get(id);
    if (cat && cat.isDefault) throw new Error('無法刪除預設分類');
    await db.categories.delete(id);
  }

  async function updateCategory(id, data) {
    await db.categories.update(id, data);
  }

  // ===== BUDGETS =====
  async function getBudgets(month) {
    if (month) {
      return db.budgets.where('month').equals(month).toArray();
    }
    return db.budgets.toArray();
  }

  async function setBudget(categoryId, month, amount) {
    const existing = await db.budgets.where({ categoryId, month }).first();
    if (existing) {
      await db.budgets.update(existing.id, { amount });
    } else {
      await db.budgets.add({ categoryId, month, amount });
    }
  }

  async function deleteBudget(id) {
    await db.budgets.delete(id);
  }

  async function getBudgetUsage(month) {
    const budgets = await getBudgets(month);
    const expenses = await getCategoryExpenses(month);
    return budgets.map(b => ({
      ...b,
      used: expenses[b.categoryId] || 0,
      remaining: b.amount - (expenses[b.categoryId] || 0),
      percentage: b.amount > 0 ? Math.round(((expenses[b.categoryId] || 0) / b.amount) * 100) : 0
    }));
  }

  // ===== RECURRING ITEMS =====
  async function getRecurringItems() {
    return db.recurringItems.toArray();
  }

  async function addRecurringItem(data) {
    const id = await db.recurringItems.add({
      ...data,
      isActive: true,
      nextDate: data.startDate
    });
    return id;
  }

  async function updateRecurringItem(id, data) {
    await db.recurringItems.update(id, data);
  }

  async function deleteRecurringItem(id) {
    await db.recurringItems.delete(id);
  }

  function calcNextDate(currentDate, frequency) {
    const d = new Date(currentDate);
    switch(frequency) {
      case 'daily': d.setDate(d.getDate() + 1); break;
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().slice(0, 10);
  }

  async function processRecurringItems() {
    const today = new Date().toISOString().slice(0, 10);
    const items = await db.recurringItems.filter(r => r.isActive && r.nextDate <= today).toArray();
    let added = 0;
    for (const item of items) {
      await addTransaction({
        type: item.type,
        amount: item.amount,
        categoryId: item.categoryId,
        description: item.description + ' (定期)',
        date: item.nextDate,
        recurringId: item.id
      });
      const newNext = calcNextDate(item.nextDate, item.frequency);
      await db.recurringItems.update(item.id, { nextDate: newNext });
      added++;
    }
    return added;
  }

  // ===== SETTINGS =====
  async function getSettings() {
    return db.settings.get(1);
  }

  async function updateSettings(data) {
    await db.settings.update(1, data);
  }

  // ===== EXPORT =====
  async function exportAllData() {
    const [transactions, categories, budgets, recurringItems, settings] = await Promise.all([
      db.transactions.toArray(),
      db.categories.toArray(),
      db.budgets.toArray(),
      db.recurringItems.toArray(),
      db.settings.toArray()
    ]);
    return { transactions, categories, budgets, recurringItems, settings, exportedAt: new Date().toISOString() };
  }

  async function importData(data) {
    await db.transaction('rw', db.transactions, db.categories, db.budgets, db.recurringItems, db.settings, async () => {
      if (data.categories) await db.categories.bulkPut(data.categories);
      if (data.transactions) await db.transactions.bulkPut(data.transactions);
      if (data.budgets) await db.budgets.bulkPut(data.budgets);
      if (data.recurringItems) await db.recurringItems.bulkPut(data.recurringItems);
      if (data.settings) await db.settings.bulkPut(data.settings);
    });
  }

  // Expose global DB object
  window.DB = {
    db,
    initDefaults,
    // Transactions
    addTransaction, updateTransaction, deleteTransaction,
    getTransactions, getTransactionById,
    getMonthSummary, getMonthlyTrend, getCategoryExpenses,
    getRecentTransactions,
    // Categories
    getCategories, getCategoryById, addCategory, deleteCategory, updateCategory,
    // Budgets
    getBudgets, setBudget, deleteBudget, getBudgetUsage,
    // Recurring
    getRecurringItems, addRecurringItem, updateRecurringItem, deleteRecurringItem,
    processRecurringItems,
    // Settings
    getSettings, updateSettings,
    // Data management
    exportAllData, importData
  };

})();
