const FILES = {
  overview: "01_12_overview_funnel_detail_corrected.csv",
  summary: "dashboard_summary_corrected.csv",
  daily: "dashboard_summary_corrected_daily.csv",
  draws: "draw_event_detail_corrected.csv",
  status: "metric_status_corrected.csv",
  users: "user_draw_summary_corrected.csv",
  checks: "validation_checks_corrected.csv",
};

const DIMENSIONS = ["App版本", "渠道", "新老用户", "付费状态", "提现系统版本(firebase)", "後台註冊提現系統版本"];

const TREND_METRICS = [
  { key: "当日抽取次数", label: "抽取次数", color: "#0f8b8d" },
  { key: "当日参与用户数", label: "参与用户", color: "#3f7f2d" },
  { key: "活动入口曝光UV_BigQuery", label: "曝光UV", color: "#2f6fbd" },
  { key: "点击进入UV_BigQuery", label: "点击UV", color: "#c47a18" },
  { key: "当日钻石总产生量", label: "钻石产生", color: "#8c5fbf" },
  { key: "当日总消耗量", label: "总消耗", color: "#c6473a" },
];

const DOWNLOAD_LABELS = {
  "01_12_overview_funnel_detail_corrected.csv": "#1-#12 明细表",
  "dashboard_summary_corrected.csv": "汇总看板",
  "dashboard_summary_corrected_daily.csv": "每日看板",
  "draw_event_detail_corrected.csv": "Draw 明细",
  "user_draw_summary_corrected.csv": "用户汇总",
  "metric_status_corrected.csv": "指标状态",
  "validation_checks_corrected.csv": "校验结果",
};

const COLORS = {
  teal: "#0f8b8d",
  green: "#3f7f2d",
  amber: "#c47a18",
  blue: "#2f6fbd",
  red: "#c6473a",
  violet: "#8c5fbf",
  gray: "#73786f",
};

const UNLOCK_TYPES = [
  { key: "free", label: "免费unlock", color: COLORS.teal, aliases: ["free_unlock", "freeunlock", "free"] },
  { key: "paid", label: "付费unlock", color: COLORS.amber, aliases: ["paid_unlock", "unlock", "paid"] },
  { key: "diamond", label: "钻石unlock", color: COLORS.blue, aliases: ["diamond_unlock", "diamondunlock", "diamond"] },
];

const state = {
  date: "all",
  trendMetric: TREND_METRICS[0].key,
  search: "",
  breakdown: "App版本",
  filters: {
    appVersion: "all",
    channel: "all",
    userType: "all",
    paidStatus: "all",
    withdrawSystem: "all",
    backendWithdrawSystem: "all",
  },
};

const data = {
  overview: [],
  summary: [],
  daily: [],
  draws: [],
  status: [],
  users: [],
  checks: [],
};

const els = {
  toast: document.getElementById("toast"),
  dateRange: document.getElementById("dateRange"),
  statusStrip: document.getElementById("statusStrip"),
  kpiGrid: document.getElementById("kpiGrid"),
  trendMetricControls: document.getElementById("trendMetricControls"),
  trendChart: document.getElementById("trendChart"),
  funnelChart: document.getElementById("funnelChart"),
  currencyStack: document.getElementById("currencyStack"),
  currencyLegend: document.getElementById("currencyLegend"),
  breakdownSelect: document.getElementById("breakdownSelect"),
  breakdownChart: document.getElementById("breakdownChart"),
  drawBucketChart: document.getElementById("drawBucketChart"),
  metricCount: document.getElementById("metricCount"),
  metricSearch: document.getElementById("metricSearch"),
  metricTableBody: document.getElementById("metricTableBody"),
  dailyCount: document.getElementById("dailyCount"),
  dailyTableBody: document.getElementById("dailyTableBody"),
  dateFilter: document.getElementById("dateFilter"),
  appVersionFilter: document.getElementById("appVersionFilter"),
  channelFilter: document.getElementById("channelFilter"),
  userTypeFilter: document.getElementById("userTypeFilter"),
  paidStatusFilter: document.getElementById("paidStatusFilter"),
  withdrawSystemFilter: document.getElementById("withdrawSystemFilter"),
  backendWithdrawSystemFilter: document.getElementById("backendWithdrawSystemFilter"),
  resetFilters: document.getElementById("resetFilters"),
  downloadList: document.getElementById("downloadList"),
};

let toastTimer;

init();

async function init() {
  showToast("正在载入看板数据");
  try {
    await loadData();
    renderTrendControls();
    populateFilters();
    bindEvents();
    renderDownloads();
    render();
    showToast("看板已就绪");
  } catch (error) {
    console.error(error);
    showToast("数据载入失败");
    document.body.classList.add("load-error");
  }
}

async function loadData() {
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, file]) => {
      const response = await fetch(`./data/${file}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load ${file}`);
      const text = await response.text();
      return [key, parseCsv(text)];
    }),
  );
  entries.forEach(([key, rows]) => {
    data[key] = rows;
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = (rows.shift() || []).map((header) => header.replace(/^\ufeff/, ""));
  return rows
    .filter((cells) => cells.some((cell) => String(cell).trim() !== ""))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function bindEvents() {
  els.dateFilter.addEventListener("change", () => {
    state.date = els.dateFilter.value;
    render();
  });

  [
    ["appVersion", els.appVersionFilter],
    ["channel", els.channelFilter],
    ["userType", els.userTypeFilter],
    ["paidStatus", els.paidStatusFilter],
    ["withdrawSystem", els.withdrawSystemFilter],
    ["backendWithdrawSystem", els.backendWithdrawSystemFilter],
  ].forEach(([key, element]) => {
    element.addEventListener("change", () => {
      state.filters[key] = element.value;
      render();
    });
  });

  els.resetFilters.addEventListener("click", () => {
    state.date = "all";
    state.search = "";
    state.breakdown = "App版本";
    Object.keys(state.filters).forEach((key) => {
      state.filters[key] = "all";
    });
    els.metricSearch.value = "";
    els.breakdownSelect.value = state.breakdown;
    populateFilters();
    render();
  });

  els.metricSearch.addEventListener("input", () => {
    state.search = els.metricSearch.value.trim().toLowerCase();
    renderMetricTable();
  });

  els.breakdownSelect.addEventListener("change", () => {
    state.breakdown = els.breakdownSelect.value;
    renderBreakdowns();
  });
}

function renderTrendControls() {
  els.trendMetricControls.innerHTML = TREND_METRICS.map(
    (metric) => `
      <button class="segment ${metric.key === state.trendMetric ? "is-active" : ""}" type="button" data-metric="${escapeHtml(metric.key)}">
        ${escapeHtml(metric.label)}
      </button>
    `,
  ).join("");

  els.trendMetricControls.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.trendMetric = button.dataset.metric;
      renderTrendControls();
      renderTrend();
    });
  });
}

function populateFilters() {
  setSelectOptions(els.dateFilter, uniqueValues(data.daily, "日期"), state.date, "全周期");
  setSelectOptions(els.appVersionFilter, uniqueValues(data.users, "App版本"), state.filters.appVersion, "全部版本");
  setSelectOptions(els.channelFilter, uniqueValues(data.users, "渠道"), state.filters.channel, "全部渠道");
  setSelectOptions(els.userTypeFilter, uniqueValues(data.users, "新老用户"), state.filters.userType, "全部用户");
  setSelectOptions(els.paidStatusFilter, uniqueValues(data.users, "付费状态"), state.filters.paidStatus, "全部状态");
  setSelectOptions(els.withdrawSystemFilter, uniqueValues(data.users, "提现系统版本(firebase)"), state.filters.withdrawSystem, "全部提现版本");
  setSelectOptions(els.backendWithdrawSystemFilter, uniqueValues(data.users, "後台註冊提現系統版本"), state.filters.backendWithdrawSystem, "全部後台註冊版本");
}

function setSelectOptions(select, values, selected, allLabel) {
  select.innerHTML = "";
  select.append(new Option(allLabel, "all"));
  values.forEach((value) => select.append(new Option(value, value)));
  select.value = values.includes(selected) ? selected : "all";
}

function uniqueValues(rows, column) {
  return [...new Set(rows.map((row) => row[column]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "zh-Hans-CN", { numeric: true }),
  );
}

function render() {
  const summary = data.summary[0] || {};
  els.dateRange.textContent = `${summary["报告开始日期"] || "2026-05-21"} 至 ${summary["活动结束日期"] || "2026-06-11"}`;
  renderStatusStrip();
  renderKpis();
  renderTrend();
  renderFunnel();
  renderCurrency();
  renderBreakdowns();
  renderMetricTable();
  renderDailyTable();
}

function renderStatusStrip() {
  const available = data.status.filter((row) => row["状态"] === "available").length;
  const partial = data.status.filter((row) => row["状态"] === "partial").length;
  const unavailable = data.status.filter((row) => row["状态"] === "unavailable").length;
  els.statusStrip.innerHTML = `
    <span class="pill is-ok">${available} 可用</span>
    <span class="pill is-partial">${partial} 部分口径</span>
    <span class="pill is-missing">${unavailable} 不可用</span>
  `;
}

function renderKpis() {
  const users = filteredUsers();
  const draws = filteredDraws();
  const dailyRows = filteredDailyRows();

  const participantUsers = uniqueCount(users, "user_id");
  const totalDraws = sum(draws, "draw_count");
  const freeUnlock = countUnlock(draws, "free");
  const paidUnlock = countUnlock(draws, "paid");
  const diamondUnlock = countUnlock(draws, "diamond");
  const diamondGenerated = sumFirst(draws, ["diamond_generated", "diamond"]);
  const totalConsumption = sumFirst(draws, ["total_consumption"]) || (paidUnlock + diamondUnlock) * 1500;
  const completedUsers = users.filter((row) => truthy(row.scratch_completed_user)).length;
  const repeatUsers = users.filter((row) => truthy(row.repeat_draw_user)).length;
  const exact10Users = users.filter((row) => truthy(row.draw_eq_10_user)).length;
  const ge10Users = users.filter((row) => truthy(row.draw_ge_10_user)).length;
  const exposureUv = sum(dailyRows, "活动入口曝光UV_BigQuery");
  const clickUv = sum(dailyRows, "点击进入UV_BigQuery");

  const cards = [
    ["活动参与用户数", participantUsers, "至少完成 1 次抽取"],
    ["总抽取次数", totalDraws, `${formatNumber(safeDivide(totalDraws, participantUsers))} 次/人`],
    ["免费unlock", freeUnlock, `${formatPercent(safeDivide(freeUnlock, totalDraws))} 抽取占比`],
    ["付费unlock", paidUnlock, `${formatPercent(safeDivide(paidUnlock, totalDraws))} 抽取占比`],
    ["钻石unlock", diamondUnlock, `${formatPercent(safeDivide(diamondUnlock, totalDraws))} 抽取占比`],
    ["钻石总产生量", diamondGenerated, `${formatNumber(diamondUnlock)} 次钻石unlock`],
    ["总消耗量", totalConsumption, "付费/钻石unlock 每次 1500"],
    ["刮奖完成率", safeDivide(completedUsers, participantUsers), `${formatNumber(completedUsers)} / ${formatNumber(participantUsers)} 用户`],
    ["二次抽率", safeDivide(repeatUsers, participantUsers), `${formatNumber(repeatUsers)} 位二抽用户`],
    ["满抽达成率", safeDivide(exact10Users, participantUsers), `${formatNumber(exact10Users)} 位等于 10 次`],
    ["抽取≥10次用户", ge10Users, `${formatPercent(safeDivide(ge10Users, participantUsers))} 参与用户`],
    ["页面 CTR", safeDivide(clickUv, exposureUv), "BigQuery / iOS+Android"],
    ["曝光 UV", exposureUv, `${formatNumber(clickUv)} 点击进入 UV`],
  ];

  els.kpiGrid.innerHTML = cards
    .map(([label, value, foot]) => {
      const isRate = String(label).includes("率") || label === "页面 CTR";
      return `
        <article class="kpi-card">
          <div class="kpi-label">${escapeHtml(label)}</div>
          <div class="kpi-value">${isRate ? formatPercent(value) : formatNumber(value)}</div>
          <div class="kpi-foot">${escapeHtml(foot)}</div>
        </article>
      `;
    })
    .join("");
}

function renderTrend() {
  const metric = TREND_METRICS.find((item) => item.key === state.trendMetric) || TREND_METRICS[0];
  const rows = filteredDailyRows();
  const points = rows.map((row) => ({
    label: row["日期"],
    value: number(row[metric.key]),
  }));

  const width = 980;
  const height = 260;
  const pad = { top: 24, right: 24, bottom: 44, left: 58 };
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const minValue = 0;
  const xStep = points.length > 1 ? (width - pad.left - pad.right) / (points.length - 1) : 0;
  const yScale = (value) =>
    height - pad.bottom - ((value - minValue) / (maxValue - minValue || 1)) * (height - pad.top - pad.bottom);

  const coords = points.map((point, index) => ({
    ...point,
    x: pad.left + index * xStep,
    y: yScale(point.value),
  }));
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${coords.at(-1)?.x || pad.left} ${height - pad.bottom} L ${pad.left} ${height - pad.bottom} Z`;
  const xTicks = coords.filter((_, index) => index === 0 || index === coords.length - 1 || index % 4 === 0);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));

  els.trendChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.trendChart.innerHTML = `
    <defs>
      <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${metric.color}" stop-opacity="0.24"></stop>
        <stop offset="100%" stop-color="${metric.color}" stop-opacity="0.03"></stop>
      </linearGradient>
    </defs>
    <rect class="plot-bg" x="${pad.left}" y="${pad.top}" width="${width - pad.left - pad.right}" height="${height - pad.top - pad.bottom}"></rect>
    ${yTicks
      .map((tick) => {
        const y = yScale(tick);
        return `
          <line class="grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
          <text class="axis-label" x="${pad.left - 10}" y="${y + 4}" text-anchor="end">${formatCompact(tick)}</text>
        `;
      })
      .join("")}
    ${xTicks
      .map(
        (tick) => `
          <text class="axis-label" x="${tick.x}" y="${height - 18}" text-anchor="middle">${formatShortDate(tick.label)}</text>
        `,
      )
      .join("")}
    <path d="${area}" fill="url(#trendFill)"></path>
    <path d="${path}" fill="none" stroke="${metric.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
    ${coords
      .map(
        (point) => `
          <circle class="trend-dot" cx="${point.x}" cy="${point.y}" r="4" fill="${metric.color}">
            <title>${point.label} · ${metric.label}: ${formatNumber(point.value)}</title>
          </circle>
        `,
      )
      .join("")}
  `;
}

function renderFunnel() {
  const users = filteredUsers();
  const dailyRows = filteredDailyRows();
  const participantUsers = uniqueCount(users, "user_id");
  const completedUsers = users.filter((row) => truthy(row.scratch_completed_user)).length;
  const repeatUsers = users.filter((row) => truthy(row.repeat_draw_user)).length;
  const exact10Users = users.filter((row) => truthy(row.draw_eq_10_user)).length;
  const ge10Users = users.filter((row) => truthy(row.draw_ge_10_user)).length;
  const exposureUv = sum(dailyRows, "活动入口曝光UV_BigQuery");
  const clickUv = sum(dailyRows, "点击进入UV_BigQuery");

  renderBars(els.funnelChart, [
    ["曝光UV", exposureUv, "BigQuery"],
    ["点击进入UV", clickUv, formatPercent(safeDivide(clickUv, exposureUv))],
    ["首次抽取用户", participantUsers, "free_paid_unlock"],
    ["刮奖完成用户", completedUsers, formatPercent(safeDivide(completedUsers, participantUsers))],
    ["二次抽用户", repeatUsers, formatPercent(safeDivide(repeatUsers, participantUsers))],
    ["满抽=10次用户", exact10Users, formatPercent(safeDivide(exact10Users, participantUsers))],
    ["抽取≥10次用户", ge10Users, formatPercent(safeDivide(ge10Users, participantUsers))],
  ], COLORS.teal);
}

function renderCurrency() {
  const draws = filteredDraws();
  const total = Math.max(1, draws.length);
  const rows = UNLOCK_TYPES.map((type) => [type.label, countUnlock(draws, type.key), type.color]);

  els.currencyStack.innerHTML = rows
    .map(([label, value, color]) => {
      const width = (number(value) / total) * 100;
      return `<div class="stacked-segment" title="${escapeHtml(label)} ${formatNumber(value)}" style="width:${width}%;background:${color}"></div>`;
    })
    .join("");

  els.currencyLegend.innerHTML = rows
    .map(
      ([label, value, color]) => `
        <div class="legend-item">
          <span class="legend-label"><span class="dot" style="background:${color}"></span>${escapeHtml(label)}</span>
          <span>${formatNumber(value)} · ${formatPercent(safeDivide(value, total))}</span>
        </div>
      `,
    )
    .join("");
}

function renderBreakdowns() {
  const users = filteredUsers();
  const breakdownRows = groupCount(users, state.breakdown).slice(0, 12);
  renderBars(els.breakdownChart, breakdownRows.map(([label, value]) => [label, value, ""]), COLORS.blue);

  const bucketOrder = ["1", "2-3", "4-5", "6-9", "10+"];
  const bucketRows = groupCount(users, "draw_count_bucket").sort(
    (a, b) => bucketOrder.indexOf(a[0]) - bucketOrder.indexOf(b[0]),
  );
  renderBars(els.drawBucketChart, bucketRows.map(([label, value]) => [label, value, ""]), COLORS.green);
}

function renderBars(container, rows, color) {
  const max = Math.max(1, ...rows.map(([, value]) => number(value)));
  container.innerHTML =
    rows
      .filter(([, value]) => number(value) > 0)
      .map(([label, value, note], index) => {
        const width = Math.max(1, (number(value) / max) * 100);
        const fill = Array.isArray(color) ? color[index % color.length] : color;
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(label || "Unknown")}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${fill}"></div></div>
            <div class="bar-value">
              <strong>${formatNumber(value)}</strong>
              ${note ? `<span>${escapeHtml(note)}</span>` : ""}
            </div>
          </div>
        `;
      })
      .join("") || `<div class="empty-state">当前筛选下没有数据</div>`;
}

function renderMetricTable() {
  const query = state.search;
  const rows = data.status
    .filter((row) => {
      if (!query) return true;
      return `${row["指标编号"]} ${row["指标名"]} ${row["状态"]} ${row.source} ${row.coverage_caveat}`.toLowerCase().includes(query);
    })
    .sort((a, b) => number(a["指标编号"]) - number(b["指标编号"]));

  els.metricCount.textContent = `${rows.length} 个指标`;
  els.metricTableBody.innerHTML = rows
    .map((row) => {
      const id = number(row["指标编号"]);
      return `
        <tr>
          <td>${id}</td>
          <td><div class="metric-name">${escapeHtml(row["指标名"])}</div></td>
          <td><span class="status-badge status-${escapeHtml(row["状态"])}">${statusLabel(row["状态"])}</span></td>
          <td>${metricDisplayValue(id, row["指标名"])}</td>
          <td class="note-cell">${escapeHtml(row.source || "")}<br><span>${escapeHtml(row.coverage_caveat || "")}</span></td>
        </tr>
      `;
    })
    .join("");
}

function metricDisplayValue(id, name) {
  const users = filteredUsers();
  const draws = filteredDraws();
  const dailyRows = filteredDailyRows();
  const participantUsers = uniqueCount(users, "user_id");
  const completedUsers = users.filter((row) => truthy(row.scratch_completed_user)).length;
  const repeatUsers = users.filter((row) => truthy(row.repeat_draw_user)).length;
  const exact10Users = users.filter((row) => truthy(row.draw_eq_10_user)).length;
  const diamondUnlock = countUnlock(draws, "diamond");
  const totalConsumption = sumFirst(draws, ["total_consumption"]) || (countUnlock(draws, "paid") + diamondUnlock) * 1500;
  const exposureUv = sum(dailyRows, "活动入口曝光UV_BigQuery");
  const clickUv = sum(dailyRows, "点击进入UV_BigQuery");

  const values = {
    1: formatNumber(participantUsers),
    2: formatNumber(draws.length),
    3: `${formatNumber(totalConsumption)} 总消耗 / ${formatNumber(diamondUnlock)} 钻石unlock`,
    4: "不可用",
    5: `${formatNumber(sum(dailyRows, "点击进入PV_BigQuery"))} PV / ${formatNumber(clickUv)} UV`,
    6: formatNumber(exposureUv),
    7: formatPercent(safeDivide(clickUv, exposureUv)),
    8: "不可用",
    9: formatPercent(safeDivide(participantUsers, clickUv)),
    10: formatPercent(safeDivide(completedUsers, participantUsers)),
    11: formatPercent(safeDivide(repeatUsers, participantUsers)),
    12: formatPercent(safeDivide(exact10Users, participantUsers)),
  };

  return `<span class="metric-value">${escapeHtml(values[id] ?? name ?? "")}</span>`;
}

function renderDailyTable() {
  const rows = filteredDailyRows();
  els.dailyCount.textContent = `${rows.length} 天`;
  els.dailyTableBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row["日期"])}</td>
          <td>${formatNumber(row["当日参与用户数"])}</td>
          <td>${formatNumber(row["当日抽取次数"])}</td>
          <td>${formatNumber(row["当日免费unlock抽取次数"])}</td>
          <td>${formatNumber(row["当日付费unlock抽取次数"])}</td>
          <td>${formatNumber(row["当日钻石unlock抽取次数"])}</td>
          <td>${formatNumber(row["当日钻石总产生量"])}</td>
          <td>${formatNumber(row["当日总消耗量"])}</td>
          <td>${formatNumber(row["活动入口曝光UV_BigQuery"])}</td>
          <td>${formatNumber(row["点击进入UV_BigQuery"])}</td>
          <td>${formatPercent(row["点击率CTR_BigQuery"])}</td>
        </tr>
      `,
    )
    .join("");
}

function renderDownloads() {
  els.downloadList.innerHTML = Object.values(FILES)
    .map(
      (file) => `
        <a href="./data/${file}" download>
          <span>${escapeHtml(DOWNLOAD_LABELS[file] || file)}</span>
          <span>CSV</span>
        </a>
      `,
    )
    .join("");
}

function filteredUsers() {
  return data.users.filter((row) => passesDimensionFilters(row) && passesDateFilter(row, "first_draw_time"));
}

function filteredDraws() {
  return data.draws.filter((row) => passesDimensionFilters(row) && passesDateFilter(row, "event_date"));
}

function filteredDailyRows() {
  return data.daily.filter((row) => state.date === "all" || row["日期"] === state.date);
}

function passesDimensionFilters(row) {
  const pairs = [
    ["appVersion", "App版本"],
    ["channel", "渠道"],
    ["userType", "新老用户"],
    ["paidStatus", "付费状态"],
    ["withdrawSystem", "提现系统版本(firebase)"],
    ["backendWithdrawSystem", "後台註冊提現系統版本"],
  ];
  return pairs.every(([stateKey, column]) => state.filters[stateKey] === "all" || row[column] === state.filters[stateKey]);
}

function passesDateFilter(row, column) {
  if (state.date === "all") return true;
  return String(row[column] || "").slice(0, 10) === state.date;
}

function groupCount(rows, column) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row[column] || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => number(b[1]) - number(a[1]));
}

function normalizedUnlockKey(row) {
  const raw = String(row.unlock_type || row.unlock_type_original || "").trim().toLowerCase();
  const type = UNLOCK_TYPES.find((item) => item.aliases.includes(raw));
  return type?.key || "paid";
}

function countUnlock(rows, key) {
  return rows.filter((row) => normalizedUnlockKey(row) === key).length;
}

function sum(rows, column) {
  return rows.reduce((total, row) => total + number(row[column]), 0);
}

function sumFirst(rows, columns) {
  return rows.reduce((total, row) => {
    const column = columns.find((candidate) => row[candidate] !== undefined && row[candidate] !== "");
    return total + (column ? number(row[column]) : 0);
  }, 0);
}

function uniqueCount(rows, column) {
  return new Set(rows.map((row) => row[column]).filter(Boolean)).size;
}

function number(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDivide(numerator, denominator) {
  return denominator ? number(numerator) / number(denominator) : 0;
}

function truthy(value) {
  return value === true || String(value).toLowerCase() === "true" || String(value) === "1";
}

function statusLabel(status) {
  return {
    available: "可用",
    partial: "部分",
    unavailable: "不可用",
  }[status] || status;
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(number(value));
}

function formatCompact(value) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(number(value));
}

function formatPercent(value) {
  if (value === "" || value === undefined || value === null) return "";
  return new Intl.NumberFormat("zh-CN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(number(value));
}

function formatShortDate(value) {
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${Number(month)}/${Number(day)}` : value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}
