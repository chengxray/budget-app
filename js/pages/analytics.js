// js/pages/analytics.js - Analytics/Charts Page
(function() {
  'use strict';

  let lineChart = null;
  let barChart = null;
  let pieChart = null;
  let currentMonth = Utils.currentMonth();

  function destroyCharts() {
    if (lineChart) { lineChart.destroy(); lineChart = null; }
    if (barChart) { barChart.destroy(); barChart = null; }
    if (pieChart) { pieChart.destroy(); pieChart = null; }
  }

  async function renderAnalytics() {
    destroyCharts();
    const page = document.getElementById('page-content');
    Components.showLoading(page);
    Components.renderBottomNav('analytics');

    const monthOptions = Utils.getMonthOptions(12);
    const [trend, catExpenses, categories] = await Promise.all([
      DB.getMonthlyTrend(6),
      DB.getCategoryExpenses(currentMonth),
      DB.getCategories()
    ]);
    const catMap = Utils.buildCategoryMap(categories);

    page.innerHTML = `
      <div class="p-4 pb-24 space-y-5">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-gray-800 dark:text-white">圖表分析</h1>
          <select id="analytics-month" class="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white outline-none">
            ${monthOptions.map(o => `<option value="${o.value}" ${o.value === currentMonth ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>

        <!-- Line Chart: 6-month Trend -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 class="font-semibold text-gray-800 dark:text-white mb-1">收支趨勢（近 6 個月）</h2>
          <p class="text-xs text-gray-400 mb-3">月度收入 vs 支出</p>
          <div class="relative h-52">
            <canvas id="line-chart"></canvas>
          </div>
        </div>

        <!-- Bar Chart: Monthly Comparison -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 class="font-semibold text-gray-800 dark:text-white mb-1">月份對比</h2>
          <p class="text-xs text-gray-400 mb-3">近 6 個月結餘比較</p>
          <div class="relative h-48">
            <canvas id="bar-chart"></canvas>
          </div>
        </div>

        <!-- Pie Chart: Category Breakdown -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 class="font-semibold text-gray-800 dark:text-white mb-1">支出分類佔比</h2>
          <p class="text-xs text-gray-400 mb-3">${Utils.getMonthLabel(currentMonth)}</p>
          ${Object.keys(catExpenses).length === 0 ?
            '<div class="flex flex-col items-center py-8 text-gray-400"><div class="text-4xl mb-2">📊</div><p class="text-sm">本月尚無支出記錄</p></div>' :
            `<div class="flex flex-col sm:flex-row items-center gap-4">
              <div class="relative h-48 w-48 flex-shrink-0">
                <canvas id="pie-chart"></canvas>
              </div>
              <div class="flex-1 space-y-2 w-full" id="pie-legend"></div>
            </div>`
          }
        </div>

        <!-- Category Detail Table -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 class="font-semibold text-gray-800 dark:text-white mb-3">分類明細</h2>
          ${Object.keys(catExpenses).length === 0 ?
            '<p class="text-center text-gray-400 text-sm py-4">本月尚無支出</p>' :
            `<div class="space-y-2">
              ${Object.entries(catExpenses).sort((a,b) => b[1]-a[1]).map(([catId, amt]) => {
                const cat = catMap[catId];
                if (!cat) return '';
                const total = Object.values(catExpenses).reduce((s,v)=>s+v,0);
                const pct = total > 0 ? Math.round((amt/total)*100) : 0;
                return `
                <div class="flex items-center gap-3">
                  <span class="text-lg w-7">${cat.emoji}</span>
                  <div class="flex-1">
                    <div class="flex justify-between text-sm mb-1">
                      <span class="text-gray-700 dark:text-gray-300">${cat.name}</span>
                      <span class="font-medium text-gray-800 dark:text-white">${Utils.formatCurrency(amt)} <span class="text-xs text-gray-400">(${pct}%)</span></span>
                    </div>
                    <div class="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full rounded-full" style="width:${pct}%;background:${cat.color}"></div>
                    </div>
                  </div>
                </div>`;
              }).join('')}
            </div>`
          }
        </div>
      </div>`;

    document.getElementById('analytics-month').addEventListener('change', e => {
      currentMonth = e.target.value;
      renderAnalytics();
    });

    // Draw charts
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#9ca3af' : '#6b7280';
    const fontFamily = "'PingFang TC', 'Microsoft JhengHei', sans-serif";

    Chart.defaults.font.family = fontFamily;
    Chart.defaults.color = textColor;

    // Line Chart
    const lineCtx = document.getElementById('line-chart');
    if (lineCtx) {
      lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: trend.map(t => Utils.getMonthLabel(t.month).replace('年', '\n').replace('月', '')),
          datasets: [
            {
              label: '收入',
              data: trend.map(t => t.income),
              borderColor: '#10b981',
              backgroundColor: Utils.hexToRgba('#10b981', 0.1),
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: '#10b981'
            },
            {
              label: '支出',
              data: trend.map(t => t.expense),
              borderColor: '#ef4444',
              backgroundColor: Utils.hexToRgba('#ef4444', 0.1),
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: '#ef4444'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.dataset.label}: ${Utils.formatCurrency(ctx.raw)}`
              }
            }
          },
          scales: {
            y: {
              grid: { color: gridColor },
              ticks: {
                callback: v => v >= 10000 ? `${(v/10000).toFixed(1)}萬` : `${v/1000}K`
              }
            },
            x: { grid: { color: gridColor } }
          }
        }
      });
    }

    // Bar Chart
    const barCtx = document.getElementById('bar-chart');
    if (barCtx) {
      barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: trend.map(t => Utils.getMonthLabel(t.month).replace('年', '\n').replace('月', '')),
          datasets: [{
            label: '結餘',
            data: trend.map(t => t.balance),
            backgroundColor: trend.map(t => t.balance >= 0 ? Utils.hexToRgba('#10b981', 0.8) : Utils.hexToRgba('#ef4444', 0.8)),
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `結餘: ${Utils.formatCurrency(ctx.raw)}`
              }
            }
          },
          scales: {
            y: {
              grid: { color: gridColor },
              ticks: {
                callback: v => v >= 10000 ? `${(v/10000).toFixed(1)}萬` : `${v/1000}K`
              }
            },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // Pie Chart
    const pieCtx = document.getElementById('pie-chart');
    if (pieCtx && Object.keys(catExpenses).length > 0) {
      const sorted = Object.entries(catExpenses).sort((a,b) => b[1]-a[1]);
      const labels = sorted.map(([id]) => { const c = catMap[id]; return c ? `${c.emoji} ${c.name}` : id; });
      const data = sorted.map(([,v]) => v);
      const colors = sorted.map(([id]) => { const c = catMap[id]; return c ? c.color : '#6b7280'; });
      const total = data.reduce((s,v) => s+v, 0);

      pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: isDark ? '#1f2937' : '#fff', hoverOffset: 6 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.label}: ${Utils.formatCurrency(ctx.raw)} (${Math.round(ctx.raw/total*100)}%)`
              }
            }
          },
          cutout: '60%'
        }
      });

      const legend = document.getElementById('pie-legend');
      if (legend) {
        legend.innerHTML = sorted.slice(0, 6).map(([id, amt]) => {
          const cat = catMap[id];
          const pct = Math.round((amt/total)*100);
          return `
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${cat ? cat.color : '#6b7280'}"></div>
              <span class="text-sm text-gray-700 dark:text-gray-300 truncate">${cat ? cat.emoji + ' ' + cat.name : id}</span>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="text-sm font-medium text-gray-800 dark:text-white">${pct}%</span>
              <span class="text-xs text-gray-400 ml-1">${Utils.formatCurrency(amt)}</span>
            </div>
          </div>`;
        }).join('');
      }
    }
  }

  window.renderAnalytics = renderAnalytics;
})();
