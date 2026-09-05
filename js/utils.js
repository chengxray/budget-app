// js/utils.js - Utility Functions
(function() {
  'use strict';

  // Format currency in TWD
  function formatCurrency(amount, showSign = false) {
    const n = Number(amount) || 0;
    const formatted = Math.abs(n).toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (showSign) {
      return (n >= 0 ? '+' : '-') + 'NT$' + formatted;
    }
    return 'NT$' + formatted;
  }

  // Format number with thousands separator
  function formatNumber(n) {
    return (Number(n) || 0).toLocaleString('zh-TW');
  }

  // Parse formatted number back to integer
  function parseFormattedNumber(str) {
    return parseInt((str || '').replace(/[^0-9]/g, ''), 10) || 0;
  }

  // Format date
  function formatDate(dateStr, format = 'short') {
    if (!dateStr) return '';
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    if (format === 'full') {
      return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    }
    if (format === 'month') {
      return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });
    }
    if (format === 'short') {
      return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    }
    if (format === 'YYYY-MM') {
      return dateStr.slice(0, 7);
    }
    return dateStr;
  }

  // Get today's date as YYYY-MM-DD
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  // Get current month as YYYY-MM
  function currentMonth() {
    return new Date().toISOString().slice(0, 7);
  }

  // Get month label
  function getMonthLabel(yyyymm) {
    if (!yyyymm) return '';
    const [y, m] = yyyymm.split('-');
    return `${y}年${parseInt(m)}月`;
  }

  // Get relative time
  function relativeTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays/7)}週前`;
    return formatDate(dateStr, 'short');
  }

  // Generate months array for selector
  function getMonthOptions(count = 12) {
    const options = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = d.toISOString().slice(0, 7);
      options.push({ value, label: getMonthLabel(value) });
    }
    return options;
  }

  // Debounce
  function debounce(fn, ms = 300) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // Generate unique id
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // Color utilities
  function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Format amount input - add thousands separator
  function setupAmountInput(input) {
    input.addEventListener('input', function() {
      const raw = this.value.replace(/[^0-9]/g, '');
      const num = parseInt(raw, 10);
      if (!isNaN(num)) {
        const cursor = this.selectionStart;
        const before = this.value.slice(0, cursor).replace(/[^0-9]/g, '').length;
        this.value = num.toLocaleString('zh-TW');
        // Restore cursor approximately
        let count = 0, newCursor = 0;
        for (let i = 0; i < this.value.length; i++) {
          if (/[0-9]/.test(this.value[i])) count++;
          if (count >= before) { newCursor = i + 1; break; }
        }
        this.setSelectionRange(newCursor, newCursor);
      } else {
        this.value = '';
      }
    });
  }

  // Build category map from array
  function buildCategoryMap(categories) {
    const map = {};
    categories.forEach(c => { map[c.id] = c; });
    return map;
  }

  // Get category badge HTML
  function categoryBadge(cat) {
    if (!cat) return '<span class="text-gray-400">未知</span>';
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white" style="background-color:${cat.color}">${cat.emoji} ${cat.name}</span>`;
  }

  // Expose
  window.Utils = {
    formatCurrency, formatNumber, parseFormattedNumber,
    formatDate, today, currentMonth, getMonthLabel,
    relativeTime, getMonthOptions, debounce, uid,
    hexToRgba, setupAmountInput, buildCategoryMap, categoryBadge
  };

})();
