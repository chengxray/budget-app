// js/app.js - Main Application
(function() {
  'use strict';

  let currentPage = 'dashboard';

  const pageRenderers = {
    dashboard: () => typeof renderDashboard === 'function' && renderDashboard(),
    transactions: () => typeof renderTransactions === 'function' && renderTransactions(),
    analytics: () => typeof renderAnalytics === 'function' && renderAnalytics(),
    budget: () => typeof renderBudget === 'function' && renderBudget(),
    settings: () => typeof renderSettings === 'function' && renderSettings(),
    report: () => typeof renderReport === 'function' && renderReport()
  };

  function navigate(page) {
    currentPage = page;
    const renderer = pageRenderers[page];
    if (renderer) {
      renderer();
    } else {
      pageRenderers.dashboard();
    }
    // Update FAB visibility
    updateFAB(page);
  }

  function refreshCurrentPage() {
    navigate(currentPage);
  }

  function updateFAB(page) {
    const fab = document.getElementById('fab-btn');
    if (!fab) return;
    // Hide FAB on report and budget pages
    const hiddenPages = ['report'];
    fab.style.display = hiddenPages.includes(page) ? 'none' : 'flex';
  }

  async function init() {
    try {
      // Initialize DB
      await DB.initDefaults();

      // Process recurring items
      const added = await DB.processRecurringItems();
      if (added > 0) {
        setTimeout(() => showToast(`已自動新增 ${added} 筆定期費用`, 'info'), 1000);
      }

      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
          console.log('SW registered:', reg.scope);
        }).catch(err => {
          console.warn('SW registration failed:', err);
        });
      }

      // Setup FAB
      const fab = document.getElementById('fab-btn');
      if (fab) {
        fab.addEventListener('click', () => {
          Components.showTransactionForm();
        });
      }

      // Navigate to initial page
      navigate('dashboard');

    } catch(e) {
      console.error('App init failed:', e);
      const page = document.getElementById('page-content');
      if (page) {
        page.innerHTML = `
          <div class="flex flex-col items-center justify-center min-h-screen p-8 text-center">
            <div class="text-5xl mb-4">😵</div>
            <h2 class="text-xl font-bold text-gray-800 dark:text-white mb-2">啟動失敗</h2>
            <p class="text-gray-500 text-sm mb-4">${e.message}</p>
            <button onclick="location.reload()" class="px-6 py-3 bg-indigo-500 text-white rounded-xl">重新載入</button>
          </div>`;
      }
    }
  }

  // Expose global App object
  window.App = {
    navigate,
    refreshCurrentPage,
    get currentPage() { return currentPage; }
  };

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
