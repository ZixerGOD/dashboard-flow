const { getPool } = require('../config/database');
const { env } = require('../config/env');
const {
  attachDashboardAuthCookie,
  clearDashboardAuthCookie,
  isAuthenticated,
  isDashboardAuthConfigured,
  verifyDashboardCredentials
} = require('../middlewares/dashboardAuth');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLayout({ title, body, script = '' }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://cdn.jsdelivr.net/npm/flowbite@4.0.1/dist/flowbite.min.css" rel="stylesheet" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #ecebea;
      --panel: rgba(255, 255, 255, 0.86);
      --panel-strong: #ffffff;
      --text: #171717;
      --muted: #6b7280;
      --line: rgba(23, 23, 23, 0.09);
      --brand: #821436;
      --brand-2: #f59e0b;
      --success: #047857;
      --shadow: 0 24px 80px rgba(17, 17, 17, 0.12);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 15% -20%, rgba(130, 20, 54, 0.08), transparent 36%),
        linear-gradient(180deg, #efeeed 0%, #e9e8e7 100%);
    }

    .shell {
      width: calc(100vw - 20px);
      margin: 10px auto;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      overflow: visible;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      padding: 12px 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: var(--text);
      box-shadow: none;
    }

    .topbar .custom-btn {
      margin-left: auto;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .brand-mark {
      width: 46px;
      height: 46px;
      border-radius: 18px;
      border: 1px solid rgba(130, 20, 54, 0.2);
      background: linear-gradient(135deg, #91153d, #61112d);
      color: #fff;
      display: grid;
      place-items: center;
      font-weight: 800;
      box-shadow: 0 10px 24px rgba(130, 20, 54, 0.22);
    }

    .brand h1, .brand h2 {
      margin: 0;
      line-height: 1.1;
    }

    .brand small {
      color: var(--muted);
      display: block;
      margin-top: 4px;
    }

    .pill-link, .pill-button {
      border: 0;
      border-radius: 999px;
      padding: 10px 16px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      color: #fff;
      background: #111111;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .pill-link:hover, .pill-button:hover {
      background: #000;
    }

    .pill-button.secondary {
      background: rgba(0, 0, 0, 0.06);
      color: #111;
      border: 1px solid rgba(0, 0, 0, 0.12);
    }

    .pill-button[disabled] {
      opacity: 0.65;
      cursor: wait;
    }

    .page {
      padding: 18px 0 24px;
    }

    .focus-lane {
      width: min(90vw, 1460px);
      margin: 0 auto;
    }

    .focus-lane .panel,
    .focus-lane .metrics,
    .focus-lane .accordion-panel {
      margin-top: 0;
    }

    .login-grid {
      min-height: calc(100vh - 32px);
      display: grid;
      place-items: center;
      padding: 28px;
    }

    .login-card {
      width: min(460px, 100%);
      padding: 30px;
      border-radius: 24px;
      border: 1px solid var(--line);
      background: var(--panel-strong);
      box-shadow: var(--shadow);
    }

    .login-card h1 {
      margin: 0 0 10px;
      font-size: 34px;
      line-height: 1;
    }

    .login-card p {
      margin: 0 0 20px;
      color: var(--muted);
    }

    .field {
      display: grid;
      gap: 8px;
      margin-bottom: 14px;
    }

    .field label {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
    }

    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .field input, .field select {
      width: 100%;
      border: 1px solid rgba(23, 23, 23, 0.12);
      border-radius: 999px;
      min-height: 50px;
      padding: 10px 42px 10px 14px;
      font-size: 14px;
      background: #fff;
      color: var(--text);
      outline: none;
    }

    .date-input-wrap {
      position: relative;
      max-width: 100%;
    }

    .date-input {
      width: 100%;
      min-height: 50px;
      padding: 10px 14px 10px 40px !important;
      border: 1px solid #d1d5db;
      border-radius: 999px;
      background: #fff;
      color: #111827;
      font-size: 14px;
      line-height: 1.25rem;
      letter-spacing: 0.01em;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      outline: none;
    }

    .date-input::placeholder {
      color: #9ca3af;
    }

    .date-input:focus {
      border-color: rgba(130, 20, 54, 0.45);
      box-shadow: 0 0 0 4px rgba(130, 20, 54, 0.12);
    }

    .date-input-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      width: 16px;
      height: 16px;
      transform: translateY(-50%);
      color: #6b7280;
      pointer-events: none;
    }

    .date-input-wrap > .datepicker {
      z-index: 60 !important;
    }

    .datepicker-picker {
      border: 1px solid #d1d5db !important;
      border-radius: 10px !important;
      background: #fff !important;
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14) !important;
      overflow: hidden;
    }

    .datepicker-picker .datepicker-header,
    .datepicker-picker .datepicker-footer {
      background: #fff !important;
    }

    .datepicker-picker .datepicker-controls .btn,
    .datepicker-picker .datepicker-view .dow {
      color: #111827 !important;
    }

    .datepicker-picker .datepicker-cell:not(.disabled):hover,
    .datepicker-picker .datepicker-cell.selected,
    .datepicker-picker .datepicker-cell.selected:hover {
      background: #821436 !important;
      color: #fff !important;
    }

    .datepicker-picker .datepicker-cell.disabled,
    .datepicker-picker .datepicker-cell.prev,
    .datepicker-picker .datepicker-cell.next {
      color: #9ca3af !important;
    }

    .select-wrap {
      position: relative;
    }

    .select-wrap select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image:
        linear-gradient(45deg, transparent 50%, #6b7280 50%),
        linear-gradient(135deg, #6b7280 50%, transparent 50%),
        linear-gradient(to right, rgba(23, 23, 23, 0.08), rgba(23, 23, 23, 0.08));
      background-position:
        calc(100% - 20px) calc(50% - 2px),
        calc(100% - 14px) calc(50% - 2px),
        calc(100% - 2.5rem) 50%;
      background-size: 6px 6px, 6px 6px, 1px 1.5rem;
      background-repeat: no-repeat;
      padding-right: 46px;
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, background-color .18s ease;
    }

    .select-wrap select:hover {
      border-color: rgba(130, 20, 54, 0.28);
      transform: translateY(-1px);
    }

    .select-wrap select option {
      color: var(--text);
      background: #fff;
    }

    .select-wrap::after {
      content: '';
      position: absolute;
      right: 14px;
      top: 50%;
      width: 8px;
      height: 8px;
      border-right: 2px solid #6b7280;
      border-bottom: 2px solid #6b7280;
      transform: translateY(-70%) rotate(45deg);
      pointer-events: none;
      opacity: 0.8;
    }

    .dropdown-wrap {
      position: relative;
    }

    .dropdown-trigger {
      width: 100%;
      min-height: 50px;
      border: 1px solid rgba(148, 163, 184, 0.55);
      border-radius: 999px;
      padding: 10px 42px 10px 14px;
      background: rgba(255, 255, 255, 0.96);
      color: #1f2937;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease, background-color .2s ease;
    }

    .dropdown-trigger:hover {
      border-color: rgba(130, 20, 54, 0.35);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
      transform: translateY(-1px);
    }

    .dropdown-trigger:focus-visible {
      outline: none;
      border-color: rgba(130, 20, 54, 0.5);
      box-shadow: 0 0 0 4px rgba(130, 20, 54, 0.12);
    }

    .dropdown-value {
      flex: 1;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dropdown-arrow {
      position: absolute;
      right: 16px;
      top: 50%;
      width: 20px;
      height: 20px;
      transform: translateY(-50%);
      pointer-events: none;
      color: #334155;
    }

    .dropdown-menu {
      position: absolute;
      z-index: 20;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      padding: 6px;
      border-radius: 20px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
      display: none;
      max-height: 240px;
      overflow: auto;
    }

    .dropdown-menu.open {
      display: block;
    }

    .dropdown-option {
      width: 100%;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--text);
      padding: 10px 12px;
      font-size: 14px;
      text-align: left;
      cursor: pointer;
      transition: background-color .15s ease, color .15s ease;
    }

    .dropdown-option:hover,
    .dropdown-option.is-selected {
      background: #e11d48;
      color: #fff;
    }

    .dropdown-empty {
      padding: 10px 12px;
      color: var(--muted);
      font-size: 14px;
    }

    .dropdown-hint {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
      white-space: nowrap;
    }

    .datepicker {
      z-index: 40;
    }

    .field input:focus, .field select:focus {
      border-color: rgba(130, 20, 54, 0.45);
      box-shadow: 0 0 0 4px rgba(130, 20, 54, 0.12);
    }

    .error {
      margin: 0 0 14px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(185, 28, 28, 0.08);
      color: #991b1b;
      font-weight: 700;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-top: 0;
    }

    .metric-card {
      padding: 20px;
      border-radius: 26px;
      background: var(--panel);
      border: 1px solid rgba(17, 17, 17, 0.08);
      box-shadow: 0 8px 20px rgba(17, 17, 17, 0.04);
    }

    .metric-card span {
      display: block;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }

    .metric-card strong {
      display: block;
      font-size: 28px;
      line-height: 1;
    }

    .panel {
      margin-top: 0;
      padding: 22px;
      border-radius: 30px;
      background: var(--panel);
      border: 1px solid rgba(17, 17, 17, 0.08);
      box-shadow: 0 10px 28px rgba(17, 17, 17, 0.05);
    }

    .accordion-panel {
      margin-top: 14px;
      border-radius: 30px;
      background: var(--panel);
      border: 1px solid rgba(17, 17, 17, 0.08);
      box-shadow: 0 10px 28px rgba(17, 17, 17, 0.05);
      overflow: hidden;
    }

    .accordion-panel > summary {
      list-style: none;
      cursor: pointer;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-weight: 700;
    }

    .accordion-panel > summary::-webkit-details-marker {
      display: none;
    }

    .accordion-panel > summary::after {
      content: '▾';
      font-size: 15px;
      color: var(--muted);
      transition: transform .2s ease;
    }

    .accordion-panel[open] > summary::after {
      transform: rotate(180deg);
    }

    .accordion-body {
      padding: 0 20px 20px;
    }

    .campaign-accordion {
      border: 1px solid rgba(23, 23, 23, 0.08);
      border-radius: 14px;
      background: #fff;
      margin-top: 10px;
      overflow: hidden;
    }

    .campaign-accordion > summary {
      list-style: none;
      cursor: pointer;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 13px;
      font-weight: 700;
      border-bottom: 1px solid rgba(23, 23, 23, 0.06);
    }

    .campaign-accordion > summary::-webkit-details-marker {
      display: none;
    }

    .campaign-accordion > summary::after {
      content: '▾';
      font-size: 13px;
      color: var(--muted);
      transition: transform .2s ease;
    }

    .campaign-accordion[open] > summary::after {
      transform: rotate(180deg);
    }

    .campaign-accordion .table-wrap {
      margin: 10px;
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .filters {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr 1fr auto;
      gap: 12px;
      align-items: end;
    }

    .panel-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .refresh-status {
      min-height: 20px;
      font-size: 13px;
      color: var(--muted);
      margin-top: 8px;
      padding-left: 2px;
    }

    .refresh-status.is-error {
      color: #b91c1c;
    }

    .refresh-status.is-success {
      color: var(--success);
    }

    .filters .field {
      margin-bottom: 0;
    }

    .table-wrap {
      overflow: auto;
      border-radius: 22px;
      border: 1px solid rgba(17, 17, 17, 0.1);
      background: #fff;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
    }

    th, td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid rgba(23, 23, 23, 0.08);
      font-size: 14px;
    }

    th {
      position: sticky;
      top: 0;
      background: #f9fafb;
      font-size: 12px;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--muted);
      z-index: 1;
    }

    .subtle {
      color: var(--muted);
      font-size: 14px;
    }

    .stack {
      display: grid;
      gap: 12px;
    }

    .dashboard-root {
      padding: 10px 0 24px;
    }

    .filter-bar {
      padding: 10px 0;
      border-radius: 0;
      background: transparent;
      border: 0;
      box-shadow: none;
    }

    .filters {
      grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr auto;
      gap: 12px;
      align-items: center;
    }

    .filter-bar .field {
      gap: 0;
    }

    .filter-bar .field label {
      display: none;
    }

    .filter-bar .dropdown-hint {
      display: none;
    }

    .filter-bar .label-row {
      display: block;
    }

    .filter-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    .custom-btn {
      border: 1px solid rgba(130, 20, 54, 0.22);
      border-radius: 999px;
      min-height: 44px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, color .18s ease;
    }

    .custom-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(17, 17, 17, 0.12);
    }

    .custom-btn--primary {
      color: #fff;
      background: linear-gradient(135deg, #91153d, #61112d);
      border-color: #7c1437;
    }

    .custom-btn--ghost {
      color: #7a1837;
      background: #efe2e7;
      border-color: rgba(130, 20, 54, 0.14);
    }

    .metric-card small {
      display: block;
      margin-top: 10px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    .sparkline {
      width: 100%;
      height: 36px;
      margin-top: 8px;
    }

    .sparkline path {
      fill: none;
      stroke: #821436;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .metric-trend.up { color: #047857; }
    .metric-trend.down { color: #b91c1c; }

    .viz-row {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 14px;
    }

    .viz-card {
      border-radius: 28px;
      border: 1px solid rgba(17, 17, 17, 0.07);
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 14px 34px rgba(17, 17, 17, 0.05);
      padding: 20px;
    }

    .viz-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .viz-head h3 {
      margin: 0;
      font-size: 15px;
    }

    .viz-body,
    .platform-bars {
      min-height: 200px;
    }

    .viz-empty {
      min-height: 200px;
      display: grid;
      place-items: center;
      color: var(--muted);
      font-size: 14px;
      border: 1px dashed rgba(107, 114, 128, 0.35);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.8);
    }

    .line-chart-svg {
      width: 100%;
      height: 220px;
      border-radius: 14px;
      background: linear-gradient(180deg, rgba(130, 20, 54, 0.04), rgba(245, 158, 11, 0.03));
    }

    .line-chart-svg .spend-line {
      fill: none;
      stroke: #821436;
      stroke-width: 2.2;
    }

    .line-chart-svg .leads-line {
      fill: none;
      stroke: #f59e0b;
      stroke-width: 2.2;
    }

    .line-chart-svg .grid-line {
      stroke: rgba(17, 17, 17, 0.11);
      stroke-width: 1;
    }

    .platform-row {
      display: grid;
      grid-template-columns: 80px 1fr auto;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .platform-label {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .03em;
      color: var(--muted);
    }

    .platform-track {
      height: 10px;
      border-radius: 999px;
      background: rgba(17, 17, 17, 0.08);
      overflow: hidden;
    }

    .platform-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #821436, #f59e0b);
    }

    .platform-value {
      font-size: 12px;
      font-weight: 700;
      color: #111;
    }

    .core-table table {
      min-width: 100%;
    }

    .core-table th,
    .core-table td {
      border-right: 0;
      border-left: 0;
    }

    @media (max-width: 960px) {
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filters { grid-template-columns: 1fr 1fr; }
      .filters .wide { grid-column: 1 / -1; }
      .viz-row { grid-template-columns: 1fr; }
      .filter-actions { grid-column: 1 / -1; justify-content: flex-end; }
    }

    @media (max-width: 640px) {
      .shell { width: calc(100vw - 10px); margin: 5px auto; }
      .topbar { padding: 14px 16px; border-radius: 16px; }
      .page { padding: 14px 0 18px; }
      .focus-lane { width: 100%; }
      .metrics { grid-template-columns: 1fr; }
      .login-card { padding: 24px; }
      .login-card h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
  ${body}
  <script src="https://cdn.jsdelivr.net/npm/flowbite@4.0.1/dist/flowbite.min.js"></script>
  <script>${script}</script>
</body>
</html>`;
}

function renderLoginPage({ error = '', username = '' } = {}) {
  const body = `
    <div class="login-grid">
      <form class="login-card" method="POST" action="/login">
        <div class="brand" style="margin-bottom:18px;">
          <div class="brand-mark">DF</div>
          <div>
            <h2>${escapeHtml(env.SERVICE_NAME)}</h2>
            <small>Acceso al panel</small>
          </div>
        </div>
        <h1>Ingresar</h1>
        <p>Una sola pantalla. Entras y vas directo al dashboard.</p>
        ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
        <div class="field">
          <label for="username">Usuario</label>
          <input id="username" name="username" value="${escapeHtml(username)}" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <input id="password" type="password" name="password" autocomplete="current-password" required />
        </div>
        <button class="pill-button" type="submit" style="width:100%;margin-top:8px;">Entrar</button>
      </form>
    </div>`;

  return renderLayout({ title: 'Login', body });
}

function isMetaPlatform(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return ['META', 'FB', 'IG', 'INSTAGRAM'].includes(normalized);
}

function isGooglePlatform(value) {
  return String(value || '').trim().toUpperCase() === 'GOOGLE';
}

function normalizePlatformFilter(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'INSTAGRAM') {
    return 'IG';
  }

  return normalized;
}

function appendPlatformFilter(where, params, platform, dimensionColumn) {
  const normalized = normalizePlatformFilter(platform);
  if (!normalized) {
    return;
  }

  if (normalized === 'META') {
    params.push(['META', 'FB', 'IG']);
    where.push(`${dimensionColumn} = ANY($${params.length}::text[])`);
    return;
  }

  if (normalized === 'FB') {
    params.push(['FB', 'META']);
    where.push(`${dimensionColumn} = ANY($${params.length}::text[])`);
    return;
  }

  if (normalized === 'IG') {
    params.push(['IG', 'META']);
    where.push(`${dimensionColumn} = ANY($${params.length}::text[])`);
    return;
  }

  params.push(normalized);
  where.push(`${dimensionColumn} = $${params.length}`);
}

async function resolveDashboardAccountIds(pool, platform, accountId) {
  const selectedAccountId = String(accountId || '').trim();
  if (!selectedAccountId) {
    return [];
  }

  if (!isGooglePlatform(platform)) {
    return [selectedAccountId];
  }

  try {
    const { rows } = await pool.query(
      `
        WITH RECURSIVE account_tree AS (
          SELECT account_id
          FROM bi.dim_ad_account
          WHERE source = 'GOOGLE' AND account_id = $1
          UNION ALL
          SELECT child.account_id
          FROM bi.dim_ad_account child
          JOIN account_tree parent ON child.parent_account_id = parent.account_id
          WHERE child.source = 'GOOGLE'
        )
        SELECT DISTINCT account_id
        FROM account_tree
      `,
      [selectedAccountId]
    );

    const ids = rows.map((row) => String(row.account_id || '').trim()).filter(Boolean);
    return ids.length ? ids : [selectedAccountId];
  } catch (error) {
    return [selectedAccountId];
  }
}

async function fetchDashboardOptions(platform = '', accountId = '') {
  const pool = getPool();

  if (!pool) {
    return { platforms: [], accounts: [], campaigns: [] };
  }

  const normalizedPlatform = String(platform || '').trim().toUpperCase();
  const accountPlatform = normalizePlatformFilter(normalizedPlatform);
  const normalizedAccountId = String(accountId || '').trim();
  const resolvedAccountIds = await resolveDashboardAccountIds(pool, accountPlatform, normalizedAccountId);

  const dimensionCandidates = ['platform', 'source'];
  let lastError = null;

  for (const dimensionColumn of dimensionCandidates) {
    try {
      const [platformsResult, campaignsResult] = await Promise.all([
        pool.query(
          `SELECT DISTINCT ${dimensionColumn} AS dimension FROM bi.v_dashboard_monthly WHERE COALESCE(${dimensionColumn}, '') <> '' ORDER BY ${dimensionColumn} ASC`
        ),
        (() => {
          const campaignParams = [];
          const campaignWhere = [`COALESCE(campaign_name, '') <> ''`];

          appendPlatformFilter(campaignWhere, campaignParams, normalizedPlatform, dimensionColumn);

          if (normalizedAccountId) {
            if (resolvedAccountIds.length === 1) {
              campaignParams.push(resolvedAccountIds[0]);
              campaignWhere.push(`provider_account_id = $${campaignParams.length}`);
            } else if (resolvedAccountIds.length > 1) {
              campaignParams.push(resolvedAccountIds);
              campaignWhere.push(`provider_account_id = ANY($${campaignParams.length}::text[])`);
            }
          }

          return pool.query(
            `SELECT DISTINCT campaign_name FROM bi.v_dashboard_monthly WHERE ${campaignWhere.join(' AND ')} ORDER BY campaign_name ASC`,
            campaignParams
          );
        })()
      ]);

      let accountsResult = { rows: [] };
      if (isMetaPlatform(accountPlatform)) {
        try {
          const accountWhere = [];
          const accountParams = [];
          appendPlatformFilter(accountWhere, accountParams, accountPlatform, dimensionColumn);

          accountsResult = await pool.query(
            `
              SELECT
                provider_account_id,
                COALESCE(MAX(NULLIF(provider_account_name, '')), provider_account_id) AS provider_account_name
              FROM bi.v_dashboard_monthly
              WHERE ${accountWhere.length ? accountWhere.join(' AND ') : '1=1'}
                AND COALESCE(provider_account_id, '') <> ''
              GROUP BY provider_account_id
              ORDER BY provider_account_name ASC, provider_account_id ASC
            `,
            accountParams
          );
        } catch (accountsError) {
          if (accountsError?.code !== '42703') {
            throw accountsError;
          }
        }
      } else if (isGooglePlatform(accountPlatform)) {
        try {
          accountsResult = await pool.query(
            `
              SELECT
                account_id AS provider_account_id,
                account_name AS provider_account_name,
                level,
                is_manager
              FROM bi.dim_ad_account
              WHERE source = 'GOOGLE'
              ORDER BY level ASC, account_name ASC, account_id ASC
            `
          );
        } catch (accountsError) {
          if (accountsError?.code !== '42P01') {
            throw accountsError;
          }
        }
      }

      return {
        platforms: (() => {
          const values = platformsResult.rows.map(row => String(row.dimension || '').trim().toUpperCase()).filter(Boolean);
          const set = new Set(values);

          if (set.has('META') || set.has('FB') || set.has('IG')) {
            set.add('META');
            set.add('FB');
            set.add('IG');
          }

          return [...set].sort((a, b) => a.localeCompare(b));
        })(),
        accounts: accountsResult.rows
          .map((row) => ({
            id: String(row.provider_account_id || '').trim(),
            name: String(row.provider_account_name || '').trim() || String(row.provider_account_id || '').trim(),
            level: Number(row.level || 0),
            is_manager: Boolean(row.is_manager)
          }))
          .filter((row) => row.id),
        campaigns: campaignsResult.rows.map(row => String(row.campaign_name || '').trim()).filter(Boolean)
      };
    } catch (error) {
      lastError = error;
      if (error?.code !== '42703') {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  return { platforms: [], accounts: [], campaigns: [] };
}

function renderDashboardPage({ username, filters, options }) {
  const selectedPlatform = String(filters.platform || '').trim();
  const selectedAccountId = String(filters.account_id || '').trim();
  const selectedCampaign = String(filters.campaign || '').trim();
  const startDate = String(filters.start_date || '').trim();
  const endDate = String(filters.end_date || '').trim();

  const platformOptions = ['ALL', ...options.platforms];
  const accountOptions = Array.isArray(options.accounts) ? options.accounts : [];
  const selectedAccountRow = accountOptions.find((row) => row.id === selectedAccountId) || null;
  const selectedAccountLabel = selectedAccountRow
    ? `${selectedAccountRow.level > 0 ? '· '.repeat(selectedAccountRow.level) : ''}${selectedAccountRow.name}${selectedAccountRow.is_manager ? ' (MCC)' : ''}`
    : 'Todas';
  const campaignOptions = options.campaigns;

  const body = `
    <div class="dashboard-root">
      <div class="topbar focus-lane">
        <div class="brand">
          <div class="brand-mark">DF</div>
          <div>
            <h1>Dashboard</h1>
            <small>Sesión: ${escapeHtml(username)}</small>
          </div>
        </div>
        <a class="custom-btn custom-btn--primary" href="/logout">Salir</a>
      </div>
      <div class="page">
        <div class="focus-lane stack">
        <section class="filter-bar">
          <form class="filters" method="GET" action="/dashboard">
            <div class="field">
              <label for="start_date">Desde</label>
              <div class="date-input-wrap relative max-w-sm">
                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <svg class="date-input-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1H7V1a1 1 0 0 0-2 0v1H3a2 2 0 0 0-2 2v2h20V4Zm0 4H0v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8ZM7 12H5v-2h2v2Zm4 0H9v-2h2v2Zm4 0h-2v-2h2v2Zm-8 4H5v-2h2v2Zm4 0H9v-2h2v2Zm4 0h-2v-2h2v2Z" />
                  </svg>
                </div>
                <input id="start_date" type="text" name="start_date" class="date-input" datepicker datepicker-autohide datepicker-format="yyyy-mm-dd" autocomplete="off" placeholder="YYYY-MM-DD" value="${escapeHtml(startDate)}" />
              </div>
            </div>
            <div class="field">
              <label for="end_date">Hasta</label>
              <div class="date-input-wrap relative max-w-sm">
                <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <svg class="date-input-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1H7V1a1 1 0 0 0-2 0v1H3a2 2 0 0 0-2 2v2h20V4Zm0 4H0v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8ZM7 12H5v-2h2v2Zm4 0H9v-2h2v2Zm4 0h-2v-2h2v2Zm-8 4H5v-2h2v2Zm4 0H9v-2h2v2Zm4 0h-2v-2h2v2Z" />
                  </svg>
                </div>
                <input id="end_date" type="text" name="end_date" class="date-input" datepicker datepicker-autohide datepicker-format="yyyy-mm-dd" autocomplete="off" placeholder="YYYY-MM-DD" value="${escapeHtml(endDate)}" />
              </div>
            </div>
            <div class="field dropdown-field">
              <label for="platform">Plataforma</label>
              <div class="dropdown-wrap" data-dropdown="platform">
                <input type="hidden" id="platform" name="platform" value="${escapeHtml(selectedPlatform)}" />
                <button type="button" class="dropdown-trigger" data-dropdown-button="platform" aria-haspopup="listbox" aria-expanded="false">
                  <span class="dropdown-value" data-dropdown-label="platform">${escapeHtml(selectedPlatform || 'Todas')}</span>
                  <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
                  </svg>
                </button>
                <div class="dropdown-menu" data-dropdown-menu="platform" role="listbox">
                  ${platformOptions.map(value => {
                    const normalizedValue = value === 'ALL' ? '' : value;
                    const label = value === 'ALL' ? 'Todas' : value;
                    const selectedClass = selectedPlatform === normalizedValue ? ' is-selected' : '';
                    return `<button type="button" class="dropdown-option${selectedClass}" data-dropdown-option="platform" data-value="${escapeHtml(normalizedValue)}" data-label="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
                  }).join('')}
                </div>
              </div>
            </div>
            <div class="field dropdown-field" id="account-filter-field">
              <div class="label-row">
                <label for="account_id">Cuenta publicitaria</label>
                <span class="dropdown-hint">Meta o Google Ads</span>
              </div>
              <div class="dropdown-wrap" data-dropdown="account_id">
                <input type="hidden" id="account_id" name="account_id" value="${escapeHtml(selectedAccountId)}" />
                <button type="button" class="dropdown-trigger" data-dropdown-button="account_id" aria-haspopup="listbox" aria-expanded="false">
                  <span class="dropdown-value" data-dropdown-label="account_id">${escapeHtml(selectedAccountLabel)}</span>
                  <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
                  </svg>
                </button>
                <div class="dropdown-menu" data-dropdown-menu="account_id" role="listbox">
                  <button type="button" class="dropdown-option${selectedAccountId ? '' : ' is-selected'}" data-dropdown-option="account_id" data-value="" data-label="Todas">Todas</button>
                  ${accountOptions.map((account) => {
                    const selectedClass = selectedAccountId === account.id ? ' is-selected' : '';
                    const displayName = `${account.level > 0 ? '· '.repeat(account.level) : ''}${account.name}${account.is_manager ? ' (MCC)' : ''}`;
                    return `<button type="button" class="dropdown-option${selectedClass}" data-dropdown-option="account_id" data-value="${escapeHtml(account.id)}" data-label="${escapeHtml(displayName)}">${escapeHtml(displayName)}</button>`;
                  }).join('')}
                </div>
              </div>
            </div>
            <div class="field dropdown-field wide">
              <div class="label-row">
                <label for="campaign">Campaña</label>
                <span class="dropdown-hint">Se ajusta según plataforma</span>
              </div>
              <div class="dropdown-wrap" data-dropdown="campaign">
                <input type="hidden" id="campaign" name="campaign" value="${escapeHtml(selectedCampaign)}" />
                <button type="button" class="dropdown-trigger" data-dropdown-button="campaign" aria-haspopup="listbox" aria-expanded="false">
                  <span class="dropdown-value" data-dropdown-label="campaign">${escapeHtml(selectedCampaign || 'Todas')}</span>
                  <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
                  </svg>
                </button>
                <div class="dropdown-menu" data-dropdown-menu="campaign" role="listbox">
                  <button type="button" class="dropdown-option${selectedCampaign ? '' : ' is-selected'}" data-dropdown-option="campaign" data-value="" data-label="Todas">Todas</button>
                  ${campaignOptions.map(value => {
                    const selectedClass = selectedCampaign === value ? ' is-selected' : '';
                    return `<button type="button" class="dropdown-option${selectedClass}" data-dropdown-option="campaign" data-value="${escapeHtml(value)}" data-label="${escapeHtml(value)}">${escapeHtml(value)}</button>`;
                  }).join('')}
                </div>
              </div>
            </div>
            <div class="filter-actions">
              <button type="button" class="custom-btn custom-btn--ghost" id="manual-refresh-button">Actualizar</button>
              <button class="custom-btn custom-btn--primary" type="submit">Aplicar</button>
            </div>
          </form>
          <div class="refresh-status" id="manual-refresh-status">Sync diario a las 09:00. Botón manual refresca ayer y hoy.</div>
        </section>

        <section class="metrics" id="summary-metrics">
          <div class="metric-card"><span>Spend</span><strong>—</strong><small>MoM: —</small></div>
          <div class="metric-card"><span>Clicks</span><strong>—</strong><small>MoM: —</small></div>
          <div class="metric-card"><span>Leads</span><strong>—</strong><small>MoM: —</small></div>
          <div class="metric-card"><span>Ventas</span><strong>—</strong><small>MoM: —</small></div>
        </section>

        <section class="viz-row">
          <article class="viz-card viz-wide">
            <div class="viz-head">
              <h3>Tendencia histórica: Leads vs Spend</h3>
              <span class="subtle">Vista mensual consolidada</span>
            </div>
            <div id="trend-chart-body" class="viz-body">
              <div class="viz-empty">Cargando gráfico...</div>
            </div>
          </article>
          <article class="viz-card viz-narrow">
            <div class="viz-head">
              <h3>Leads por plataforma</h3>
              <span class="subtle">META agrupa FB + IG</span>
            </div>
            <div id="platform-bars-body" class="platform-bars">
              <div class="viz-empty">Cargando gráfico...</div>
            </div>
          </article>
        </section>

        <section class="panel data-core">
          <div class="panel-head">
            <div>
              <strong style="font-size:18px;">Tabla core</strong>
              <div class="subtle">Vista plana por campaña para análisis operativo.</div>
            </div>
          </div>
          <div id="core-table-body">
            <div class="table-wrap"><table><tbody><tr><td>Cargando...</td></tr></tbody></table></div>
          </div>
        </section>
        </div>
      </div>
    </div>`;

  const script = `
    (function () {
      const filters = ${JSON.stringify({ start_date: startDate, end_date: endDate, platform: selectedPlatform, account_id: selectedAccountId, campaign: selectedCampaign })};

      function isMetaPlatform(value) {
        const normalized = String(value || '').toUpperCase();
        return normalized === 'META' || normalized === 'FB' || normalized === 'IG' || normalized === 'INSTAGRAM';
      }

      function isGooglePlatform(value) {
        return String(value || '').toUpperCase() === 'GOOGLE';
      }

      const useMetaApi = isMetaPlatform(filters.platform || '');
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const query = params.toString() ? '?' + params.toString() : '';

      function money(value) {
        const number = Number(value || 0);
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(number);
      }

      function number(value) {
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
      }

      function calcTrendPercent(current, previous) {
        const base = Number(previous || 0);
        const now = Number(current || 0);
        if (!base) {
          return 0;
        }

        return ((now - base) / Math.abs(base)) * 100;
      }

      function buildSparklinePath(points, width, height) {
        const safe = Array.isArray(points) && points.length ? points : [0, 0, 0, 0, 0, 0];
        const max = Math.max.apply(null, safe.map(function (value) { return Number(value || 0); }));
        const min = Math.min.apply(null, safe.map(function (value) { return Number(value || 0); }));
        const range = Math.max(1, max - min);
        const step = safe.length > 1 ? width / (safe.length - 1) : width;

        return safe.map(function (point, index) {
          const x = Number((index * step).toFixed(2));
          const y = Number((height - (((Number(point || 0) - min) / range) * height)).toFixed(2));
          return (index === 0 ? 'M' : 'L') + x + ' ' + y;
        }).join(' ');
      }

      function metricCard(label, value, trendPercent, points) {
        const trend = Number(trendPercent || 0);
        const trendClass = trend >= 0 ? 'up' : 'down';
        const trendLabel = (trend >= 0 ? '+' : '') + trend.toFixed(1) + '% MoM';
        const path = buildSparklinePath(points, 120, 30);

        return '<div class="metric-card">' +
          '<span>' + label + '</span>' +
          '<strong>' + value + '</strong>' +
          '<svg class="sparkline" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true"><path d="' + path + '"></path></svg>' +
          '<small class="metric-trend ' + trendClass + '">' + trendLabel + '</small>' +
        '</div>';
      }

      function metricValueFromRow(row) {
        const leadsApi = Number(row?.leads_api || 0);
        const leadsCrm = Number(row?.leads_new_count || 0);
        return leadsApi > 0 ? leadsApi : leadsCrm;
      }

      function normalizePlatformBucket(value, selectedPlatform) {
        const normalized = String(value || '').trim().toUpperCase();
        const selected = String(selectedPlatform || '').trim().toUpperCase();
        if (!normalized) {
          return 'OTRO';
        }

        if (selected === 'FB' && (normalized === 'FB' || normalized === 'META')) {
          return 'FB';
        }

        if (selected === 'IG' && (normalized === 'IG' || normalized === 'INSTAGRAM' || normalized === 'META')) {
          return 'IG';
        }

        if (normalized === 'META' || normalized === 'FB' || normalized === 'IG' || normalized === 'INSTAGRAM') {
          return 'META';
        }

        if (normalized.includes('GOOGLE')) {
          return 'GOOGLE';
        }

        if (normalized.includes('TIKTOK')) {
          return 'TIKTOK';
        }

        return normalized;
      }

      function setRefreshStatus(message, tone) {
        const status = document.getElementById('manual-refresh-status');
        if (!status) {
          return;
        }

        status.textContent = message;
        status.classList.remove('is-error', 'is-success');
        if (tone) {
          status.classList.add(tone);
        }
      }

      async function fetchJson(path) {
        const response = await fetch(path + query, { credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      }

      async function fetchCampaignOptions(platform, accountId) {
        const params = new URLSearchParams();
        if (platform) {
          params.set('platform', platform);
        }

        if (accountId) {
          params.set('account_id', accountId);
        }

        const response = await fetch('/api/analytics/dashboard/campaign-options' + (params.toString() ? '?' + params.toString() : ''), { credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        const payload = await response.json();
        const candidates = [
          payload?.data,
          payload?.data?.data,
          payload?.items,
          payload
        ];

        for (const candidate of candidates) {
          if (Array.isArray(candidate)) {
            return candidate;
          }
        }

        return [];
      }

      async function fetchAccountOptions(platform) {
        const params = new URLSearchParams();
        if (platform) {
          params.set('platform', platform);
        }

        const response = await fetch('/api/analytics/dashboard/account-options' + (params.toString() ? '?' + params.toString() : ''), { credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        const payload = await response.json();
        const candidates = [payload?.data?.data, payload?.data, payload?.items, payload];

        for (const candidate of candidates) {
          if (Array.isArray(candidate)) {
            return candidate
              .map(function (item) {
                const id = String(item?.id || item?.provider_account_id || '').trim();
                const name = String(item?.name || item?.provider_account_name || id).trim();
                return { id: id, name: name || id };
              })
              .filter(function (item) {
                return item.id;
              });
          }
        }

        return [];
      }

      async function fetchGoogleAccountTree(platform) {
        const params = new URLSearchParams();
        if (platform) {
          params.set('platform', platform);
        }

        const response = await fetch('/api/analytics/dashboard/account-tree' + (params.toString() ? '?' + params.toString() : ''), { credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        const payload = await response.json();
        const candidates = [payload?.data?.data, payload?.data, payload?.items, payload];

        for (const candidate of candidates) {
          if (Array.isArray(candidate)) {
            return candidate
              .map(function (item) {
                const id = String(item?.id || item?.account_id || '').trim();
                const name = String(item?.name || item?.account_name || id).trim();
                const level = Number(item?.level || 0);
                const isManager = Boolean(item?.is_manager);

                return {
                  id: id,
                  parent_id: String(item?.parent_id || item?.parent_account_id || '').trim() || null,
                  name: name || id,
                  level: level,
                  is_manager: isManager
                };
              })
              .filter(function (item) {
                return item.id;
              });
          }
        }

        return [];
      }

      function escapeHtml(value) {
        return String(value == null ? '' : value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function renderDropdownState(name, value, label) {
        const hidden = document.getElementById(name);
        const display = document.querySelector('[data-dropdown-label="' + name + '"]');

        if (hidden) {
          hidden.value = value || '';
        }

        if (display) {
          display.textContent = label || 'Todas';
        }
      }

      function toGoogleTreeRows(values) {
        const nodes = Array.isArray(values) ? values : [];
        const byId = new Map();
        const childrenByParent = new Map();

        nodes.forEach(function (node) {
          byId.set(node.id, node);
        });

        nodes.forEach(function (node) {
          const parentId = node.parent_id && byId.has(node.parent_id) ? node.parent_id : '__root__';
          if (!childrenByParent.has(parentId)) {
            childrenByParent.set(parentId, []);
          }
          childrenByParent.get(parentId).push(node);
        });

        childrenByParent.forEach(function (group) {
          group.sort(function (a, b) {
            return String(a.name || '').localeCompare(String(b.name || ''));
          });
        });

        const ordered = [];
        function visit(node, depth) {
          const prefix = depth > 0 ? Array(depth).fill('|--').join('') + ' ' : '';
          const managerTag = node.is_manager ? ' (MCC)' : '';
          ordered.push({
            id: node.id,
            name: prefix + String(node.name || node.id) + managerTag,
            is_manager: Boolean(node.is_manager)
          });

          const children = childrenByParent.get(node.id) || [];
          children.forEach(function (child) {
            visit(child, depth + 1);
          });
        }

        (childrenByParent.get('__root__') || []).forEach(function (root) {
          visit(root, 0);
        });

        if (ordered.length) {
          return ordered;
        }

        return nodes.map(function (node) {
          const managerTag = node.is_manager ? ' (MCC)' : '';
          return {
            id: node.id,
            name: String(node.name || node.id) + managerTag,
            is_manager: Boolean(node.is_manager)
          };
        });
      }

      function closeDropdown(name) {
        const menu = document.querySelector('[data-dropdown-menu="' + name + '"]');
        const button = document.querySelector('[data-dropdown-button="' + name + '"]');

        if (menu) {
          menu.classList.remove('open');
        }

        if (button) {
          button.setAttribute('aria-expanded', 'false');
        }
      }

      function openDropdown(name) {
        ['platform', 'account_id', 'campaign'].forEach(function (current) {
          if (current !== name) {
            closeDropdown(current);
          }
        });

        const menu = document.querySelector('[data-dropdown-menu="' + name + '"]');
        const button = document.querySelector('[data-dropdown-button="' + name + '"]');

        if (menu) {
          menu.classList.add('open');
        }

        if (button) {
          button.setAttribute('aria-expanded', 'true');
        }
      }

      let accountMetaById = {};

      function renderAccountOptions(values, selectedValue) {
        const safeSelected = selectedValue || '';
        const menu = document.querySelector('[data-dropdown-menu="account_id"]');
        const accountRows = Array.isArray(values) ? values : [];
        const normalizedPlatform = String(document.getElementById('platform')?.value || '').trim().toUpperCase();
        const displayRows = normalizedPlatform === 'GOOGLE' ? toGoogleTreeRows(accountRows) : accountRows.map(function (value) {
          const id = String(value?.id || '').trim();
          return {
            id: id,
            name: String(value?.name || id).trim(),
            is_manager: Boolean(value?.is_manager)
          };
        });

        accountMetaById = {};
        accountRows.forEach(function (row) {
          const id = String(row?.id || '').trim();
          if (id) {
            accountMetaById[id] = { is_manager: Boolean(row?.is_manager) };
          }
        });

        const optionsHtml = ['<button type="button" class="dropdown-option' + (safeSelected ? '' : ' is-selected') + '" data-dropdown-option="account_id" data-value="" data-label="Todas">Todas</button>'].concat(displayRows.map(function (value) {
          const id = String(value?.id || '').trim();
          const name = String(value?.name || id).trim();
          const selected = safeSelected === id ? ' is-selected' : '';
          return '<button type="button" class="dropdown-option' + selected + '" data-dropdown-option="account_id" data-value="' + escapeHtml(id) + '" data-label="' + escapeHtml(name) + '">' + escapeHtml(name) + '</button>';
        }));

        if (menu) {
          menu.innerHTML = optionsHtml.join('');
        }

        const validIds = displayRows.map(function (row) {
          return String(row?.id || '').trim();
        });

        if (safeSelected && !validIds.includes(safeSelected)) {
          renderDropdownState('account_id', '', 'Todas');
        } else {
          const selected = displayRows.find(function (row) {
            return String(row?.id || '').trim() === safeSelected;
          });
          renderDropdownState('account_id', safeSelected, selected ? selected.name : 'Todas');
        }
      }

      function syncAccountFilterVisibility() {
        const field = document.getElementById('account-filter-field');
        const currentPlatform = String(document.getElementById('platform')?.value || '').toUpperCase();
        const visible = isMetaPlatform(currentPlatform) || isGooglePlatform(currentPlatform);

        if (!field) {
          return;
        }

        field.style.display = visible ? '' : 'none';
      }

      function renderCampaignOptions(values, selectedValue) {
        const campaignSelect = document.getElementById('campaign');
        const safeSelected = selectedValue || '';

        const menu = document.querySelector('[data-dropdown-menu="campaign"]');
        const optionsHtml = ['<button type="button" class="dropdown-option' + (safeSelected ? '' : ' is-selected') + '" data-dropdown-option="campaign" data-value="" data-label="Todas">Todas</button>'].concat(values.map(function (value) {
          const selected = safeSelected === value ? ' is-selected' : '';
          const escaped = escapeHtml(value);
          return '<button type="button" class="dropdown-option' + selected + '" data-dropdown-option="campaign" data-value="' + escaped + '" data-label="' + escaped + '">' + escaped + '</button>';
        }));

        if (menu) {
          menu.innerHTML = optionsHtml.join('');
        }

        if (safeSelected && !values.includes(safeSelected)) {
          renderDropdownState('campaign', '', 'Todas');
        } else {
          renderDropdownState('campaign', safeSelected, safeSelected || 'Todas');
        }
      }

      function aggregateCampaignRows(rows) {
        return rows.reduce(function (acc, row) {
          const key = String(row.campaign_name || 'Sin campaña').trim() || 'Sin campaña';
          if (!acc[key]) {
            acc[key] = {
              campaign_name: key,
              spend: 0,
              clicks: 0,
              leads: 0,
              conversions_web: 0
            };
          }

          acc[key].spend += Number(row.spend || 0);
          acc[key].clicks += Number(row.clicks || 0);
          acc[key].leads += metricValueFromRow(row);
          acc[key].conversions_web += Number(row.conversions_web || 0);
          return acc;
        }, {});
      }

      function renderSummary(data, monthlyRows) {
        const container = document.getElementById('summary-metrics');
        const leadsValue = useMetaApi ? Number(data.leads_api || 0) : Number(data.leads_new_count || 0);

        const monthlyGroups = (Array.isArray(monthlyRows) ? monthlyRows : []).reduce(function (acc, row) {
          const month = row.month_start ? String(row.month_start).slice(0, 7) : '';
          if (!month) {
            return acc;
          }

          if (!acc[month]) {
            acc[month] = { spend: 0, clicks: 0, leads: 0, ventas: 0 };
          }

          acc[month].spend += Number(row.spend || 0);
          acc[month].clicks += Number(row.clicks || 0);
          acc[month].leads += metricValueFromRow(row);
          acc[month].ventas += Number(row.conversions_web || 0);
          return acc;
        }, {});

        const sortedMonths = Object.keys(monthlyGroups).sort();
        const currentMonth = sortedMonths[sortedMonths.length - 1];
        const previousMonth = sortedMonths[sortedMonths.length - 2];
        const current = currentMonth ? monthlyGroups[currentMonth] : { spend: data.spend || 0, clicks: data.clicks || 0, leads: leadsValue, ventas: data.conversions_web || 0 };
        const previous = previousMonth ? monthlyGroups[previousMonth] : { spend: 0, clicks: 0, leads: 0, ventas: 0 };

        const sparkSeries = {
          spend: sortedMonths.map(function (month) { return monthlyGroups[month].spend; }),
          clicks: sortedMonths.map(function (month) { return monthlyGroups[month].clicks; }),
          leads: sortedMonths.map(function (month) { return monthlyGroups[month].leads; }),
          ventas: sortedMonths.map(function (month) { return monthlyGroups[month].ventas; })
        };

        container.innerHTML = [
          metricCard('Spend', money(data.spend), calcTrendPercent(current.spend, previous.spend), sparkSeries.spend),
          metricCard('Clicks', number(data.clicks), calcTrendPercent(current.clicks, previous.clicks), sparkSeries.clicks),
          metricCard('Leads', number(leadsValue), calcTrendPercent(current.leads, previous.leads), sparkSeries.leads),
          metricCard('Ventas', number(data.conversions_web), calcTrendPercent(current.ventas, previous.ventas), sparkSeries.ventas)
        ].join('');
      }

      function renderTrendChart(monthlyRows) {
        const container = document.getElementById('trend-chart-body');
        if (!container) {
          return;
        }

        const byMonth = (Array.isArray(monthlyRows) ? monthlyRows : []).reduce(function (acc, row) {
          const month = row.month_start ? String(row.month_start).slice(0, 7) : '';
          if (!month) {
            return acc;
          }

          if (!acc[month]) {
            acc[month] = { spend: 0, leads: 0 };
          }

          acc[month].spend += Number(row.spend || 0);
          acc[month].leads += metricValueFromRow(row);
          return acc;
        }, {});

        const labels = Object.keys(byMonth).sort();
        if (!labels.length) {
          container.innerHTML = '<div class="viz-empty">Sin datos para construir tendencia.</div>';
          return;
        }

        const spends = labels.map(function (label) { return byMonth[label].spend; });
        const leads = labels.map(function (label) { return byMonth[label].leads; });
        const spendPath = buildSparklinePath(spends, 560, 180);
        const leadsPath = buildSparklinePath(leads, 560, 180);

        container.innerHTML = '<svg class="line-chart-svg" viewBox="0 0 560 220" preserveAspectRatio="none" aria-label="Tendencia Leads vs Spend">' +
          '<line class="grid-line" x1="0" y1="44" x2="560" y2="44"></line>' +
          '<line class="grid-line" x1="0" y1="88" x2="560" y2="88"></line>' +
          '<line class="grid-line" x1="0" y1="132" x2="560" y2="132"></line>' +
          '<line class="grid-line" x1="0" y1="176" x2="560" y2="176"></line>' +
          '<path class="spend-line" d="' + spendPath + '"></path>' +
          '<path class="leads-line" d="' + leadsPath + '"></path>' +
        '</svg>';
      }

      function renderPlatformBars(rows) {
        const container = document.getElementById('platform-bars-body');
        if (!container) {
          return;
        }

        const activePlatform = String(document.getElementById('platform')?.value || filters.platform || '').trim().toUpperCase();

        const bucket = (Array.isArray(rows) ? rows : []).reduce(function (acc, row) {
          const key = normalizePlatformBucket(row.platform || row.source, activePlatform);
          acc[key] = (acc[key] || 0) + metricValueFromRow(row);
          return acc;
        }, {});

        const entries = Object.entries(bucket).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
        if (!entries.length) {
          container.innerHTML = '<div class="viz-empty">Sin datos para plataforma.</div>';
          return;
        }

        const maxValue = Math.max.apply(null, entries.map(function (entry) { return Number(entry[1] || 0); }));
        container.innerHTML = entries.map(function (entry) {
          const label = entry[0];
          const value = Number(entry[1] || 0);
          const pct = maxValue > 0 ? Math.max(8, (value / maxValue) * 100) : 0;
          return '<div class="platform-row">' +
            '<div class="platform-label">' + escapeHtml(label) + '</div>' +
            '<div class="platform-track"><div class="platform-fill" style="width:' + pct.toFixed(2) + '%"></div></div>' +
            '<div class="platform-value">' + number(value) + '</div>' +
          '</div>';
        }).join('');
      }

      function renderCoreTable(dailyRows, monthlyRows) {
        const body = document.getElementById('core-table-body');
        const sourceRows = (Array.isArray(dailyRows) && dailyRows.length) ? dailyRows : monthlyRows;
        const aggregate = aggregateCampaignRows(Array.isArray(sourceRows) ? sourceRows : []);
        const rows = Object.values(aggregate).sort(function (a, b) {
          return b.spend - a.spend;
        });

        if (!rows.length) {
          body.innerHTML = '<div class="table-wrap core-table"><table><tbody><tr><td>Sin datos</td></tr></tbody></table></div>';
          return;
        }

        const tableRows = rows.map(function (row) {
          const spend = Number(row.spend || 0);
          const leads = Number(row.leads || 0);
          const ventas = Number(row.conversions_web || 0);
          const cpa = spend > 0 ? leads / spend : 0;
          const conversionRate = leads > 0 ? (ventas / leads) * 100 : 0;

          return '<tr>' +
            '<td>' + escapeHtml(row.campaign_name) + '</td>' +
            '<td>' + money(spend) + '</td>' +
            '<td>' + number(row.clicks) + '</td>' +
            '<td>' + number(leads) + '</td>' +
            '<td>' + cpa.toFixed(3) + '</td>' +
            '<td>' + number(ventas) + '</td>' +
            '<td>' + conversionRate.toFixed(1) + '%</td>' +
          '</tr>';
        }).join('');

        body.innerHTML = '<div class="table-wrap core-table"><table><thead><tr><th>Programa/Campaña</th><th>Spend</th><th>Clicks</th><th>Leads</th><th>CPA (Leads/Spend)</th><th>Ventas</th><th>Tasa de Conversión</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>';
      }

      async function loadDashboardData() {
        try {
          const [summary, monthly, daily] = await Promise.all([
            fetchJson('/api/analytics/dashboard/summary'),
            fetchJson('/api/analytics/dashboard/monthly'),
            fetchJson('/api/analytics/dashboard/daily')
          ]);

          const summaryData = summary.data || summary || {};
          const monthlyRows = (((monthly.data || {}).data) || []);
          const dailyRows = (((daily.data || {}).data) || []);

          renderSummary(summaryData, monthlyRows);
          renderTrendChart(monthlyRows);
          renderPlatformBars(dailyRows.length ? dailyRows : monthlyRows);
          renderCoreTable(dailyRows, monthlyRows);
        } catch (error) {
          document.getElementById('summary-metrics').innerHTML = '<div class="metric-card"><span>Error</span><strong>—</strong><small>No se pudo cargar</small></div>';
          document.getElementById('trend-chart-body').innerHTML = '<div class="viz-empty">Error cargando gráfico.</div>';
          document.getElementById('platform-bars-body').innerHTML = '<div class="viz-empty">Error cargando plataformas.</div>';
          document.getElementById('core-table-body').innerHTML = '<div class="table-wrap core-table"><table><tbody><tr><td>Error cargando datos</td></tr></tbody></table></div>';
          throw error;
        }
      }

      const platformSelect = document.getElementById('platform');
      const accountSelect = document.getElementById('account_id');
      const campaignSelect = document.getElementById('campaign');
      const manualRefreshButton = document.getElementById('manual-refresh-button');
      document.querySelectorAll('[data-dropdown-button]').forEach(function (button) {
        button.addEventListener('click', function (event) {
          event.preventDefault();
          const name = button.getAttribute('data-dropdown-button');
          const isOpen = document.querySelector('[data-dropdown-menu="' + name + '"]').classList.contains('open');
          if (isOpen) {
            closeDropdown(name);
          } else {
            openDropdown(name);
          }
        });
      });

      document.addEventListener('click', function (event) {
        const target = event.target;
        if (!target.closest || !target.closest('[data-dropdown]')) {
          closeDropdown('platform');
          closeDropdown('account_id');
          closeDropdown('campaign');
        }
      });

      document.addEventListener('click', async function (event) {
        const option = event.target.closest && event.target.closest('[data-dropdown-option]');
        if (!option) {
          return;
        }

        const name = option.getAttribute('data-dropdown-option');
        const value = option.getAttribute('data-value') || '';
        const label = option.getAttribute('data-label') || 'Todas';

        if (name === 'platform') {
          renderDropdownState('platform', value, label);
          closeDropdown('platform');
          syncAccountFilterVisibility();

          if (!isMetaPlatform(value) && !isGooglePlatform(value)) {
            renderAccountOptions([], '');
            renderDropdownState('account_id', '', 'Todas');
          }

          try {
            const isMeta = isMetaPlatform(value);
            const isGoogle = isGooglePlatform(value);
            let selectedAccountId = '';

            if (isMeta || isGoogle) {
              accountSelect.setAttribute('aria-busy', 'true');
              const accountValues = isGoogle ? await fetchGoogleAccountTree(value) : await fetchAccountOptions(value);
              renderAccountOptions(accountValues, '');
              selectedAccountId = '';
            }

            campaignSelect.setAttribute('aria-busy', 'true');
            const campaignValues = await fetchCampaignOptions(value, selectedAccountId);
            renderCampaignOptions(campaignValues, '');
          } catch (error) {
            console.error(error);
            const accountMenu = document.querySelector('[data-dropdown-menu="account_id"]');
            if (accountMenu && (isMetaPlatform(value) || isGooglePlatform(value))) {
              accountMenu.innerHTML = '<div class="dropdown-empty">No se pudieron cargar</div>';
            }
            const menu = document.querySelector('[data-dropdown-menu="campaign"]');
            if (menu) {
              menu.innerHTML = '<div class="dropdown-empty">No se pudieron cargar</div>';
            }
            renderDropdownState('account_id', '', 'Todas');
            renderDropdownState('campaign', '', 'Todas');
          } finally {
            accountSelect.removeAttribute('aria-busy');
            campaignSelect.removeAttribute('aria-busy');
          }

          return;
        }

        if (name === 'account_id') {
          renderDropdownState('account_id', value, label);
          closeDropdown('account_id');

          try {
            campaignSelect.setAttribute('aria-busy', 'true');
            const platformValue = String(platformSelect.value || '').trim();

            if (isGooglePlatform(platformValue) && value && accountMetaById[value]?.is_manager) {
              const menu = document.querySelector('[data-dropdown-menu="campaign"]');
              if (menu) {
                menu.innerHTML = '<div class="dropdown-empty">Selecciona una subcuenta final para ver campañas</div>';
              }
              renderDropdownState('campaign', '', 'Todas');
              return;
            }

            const campaignValues = await fetchCampaignOptions(platformValue, value);
            renderCampaignOptions(campaignValues, '');
          } catch (error) {
            console.error(error);
            const menu = document.querySelector('[data-dropdown-menu="campaign"]');
            if (menu) {
              menu.innerHTML = '<div class="dropdown-empty">No se pudieron cargar</div>';
            }
            renderDropdownState('campaign', '', 'Todas');
          } finally {
            campaignSelect.removeAttribute('aria-busy');
          }

          return;
        }

        if (name === 'campaign') {
          renderDropdownState('campaign', value, label);
          closeDropdown('campaign');
        }
      });

      platformSelect.value = ${JSON.stringify(selectedPlatform)};
      accountSelect.value = ${JSON.stringify(selectedAccountId)};
      campaignSelect.value = ${JSON.stringify(selectedCampaign)};
      renderDropdownState('platform', ${JSON.stringify(selectedPlatform)}, ${JSON.stringify(selectedPlatform || 'Todas')});
      renderDropdownState('account_id', ${JSON.stringify(selectedAccountId)}, ${JSON.stringify(selectedAccountLabel)});
      renderDropdownState('campaign', ${JSON.stringify(selectedCampaign)}, ${JSON.stringify(selectedCampaign || 'Todas')});
      syncAccountFilterVisibility();

      platformSelect.setAttribute('aria-hidden', 'true');
      accountSelect.setAttribute('aria-hidden', 'true');
      campaignSelect.setAttribute('aria-hidden', 'true');
      platformSelect.style.position = 'absolute';
      platformSelect.style.left = '-9999px';
      accountSelect.style.position = 'absolute';
      accountSelect.style.left = '-9999px';
      campaignSelect.style.position = 'absolute';
      campaignSelect.style.left = '-9999px';

      if (manualRefreshButton) {
        manualRefreshButton.addEventListener('click', async function () {
          manualRefreshButton.disabled = true;
          setRefreshStatus('Actualizando Meta y Google Ads para ayer y hoy...', '');

          try {
            const response = await fetch('/api/analytics/dashboard/refresh', {
              method: 'POST',
              credentials: 'same-origin',
              headers: {
                'Content-Type': 'application/json'
              },
              body: '{}'
            });

            const payload = await response.json();
            if (!response.ok) {
              const retryAfterMs = Number(payload?.details?.retry_after_ms || 0);
              if (response.status === 429 && retryAfterMs > 0) {
                const retryMinutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
                throw new Error('Refresh reciente. Intenta otra vez en ' + retryMinutes + ' min.');
              }

              throw new Error(payload?.error || 'No se pudo actualizar');
            }

            await loadDashboardData();
            const metaOk = payload?.data?.platforms?.META?.ok;
            const googleOk = payload?.data?.platforms?.GOOGLE?.ok;
            if (metaOk && googleOk) {
              setRefreshStatus('Datos actualizados desde Meta y Google Ads.', 'is-success');
            } else if (metaOk || googleOk) {
              setRefreshStatus('Actualización parcial completada. Revisa logs si falta una plataforma.', 'is-success');
            } else {
              setRefreshStatus('No hubo datos nuevos en el refresh manual.', '');
            }
          } catch (error) {
            setRefreshStatus(error.message || 'No se pudo completar la actualización manual.', 'is-error');
            console.error(error);
          } finally {
            manualRefreshButton.disabled = false;
          }
        });
      }

      loadDashboardData().catch((error) => {
        console.error(error);
      });
    })();
  `;

  return renderLayout({ title: 'Dashboard', body, script });
}

async function root(req, res) {
  if (isAuthenticated(req)) {
    return res.redirect('/dashboard');
  }

  return res.redirect('/login');
}

function getLoginPage(req, res) {
  if (!isDashboardAuthConfigured()) {
    return res.status(503).send('Dashboard auth is not configured');
  }

  if (isAuthenticated(req)) {
    return res.redirect('/dashboard');
  }

  const error = req.query.error ? 'Usuario o contraseña incorrectos.' : '';
  const username = req.query.username ? String(req.query.username) : '';
  return res.send(renderLoginPage({ error, username }));
}

function postLogin(req, res) {
  if (!isDashboardAuthConfigured()) {
    return res.status(503).send('Dashboard auth is not configured');
  }

  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();

  if (verifyDashboardCredentials(username, password)) {
    attachDashboardAuthCookie(req, res);
    return res.redirect('/dashboard');
  }

  return res.status(302).redirect(`/login?error=1&username=${encodeURIComponent(username)}`);
}

function logout(req, res) {
  clearDashboardAuthCookie(res);
  return res.redirect('/login');
}

async function getDashboardPage(req, res, next) {
  try {
    const selectedPlatform = String(req.query.platform || '').trim();
    const selectedAccountId = String(req.query.account_id || '').trim();
    let options = { platforms: [], accounts: [], campaigns: [] };

    try {
      options = await fetchDashboardOptions(selectedPlatform, selectedAccountId);
    } catch (error) {
      options = { platforms: [], accounts: [], campaigns: [] };
    }

    return res.send(
      renderDashboardPage({
        username: env.DASHBOARD_USERNAME,
        filters: req.query,
        options
      })
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboardPage,
  getLoginPage,
  logout,
  postLogin,
  root
};
