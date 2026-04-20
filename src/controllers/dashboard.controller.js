const { getPool } = require('../config/database');
const { env } = require('../config/env');
const {
  attachDashboardAuthCookie,
  clearDashboardAuthCookie,
  isAuthenticated
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
      --bg: #f4efe7;
      --panel: rgba(255, 255, 255, 0.82);
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
        radial-gradient(circle at top left, rgba(130, 20, 54, 0.16), transparent 28%),
        radial-gradient(circle at top right, rgba(245, 158, 11, 0.16), transparent 26%),
        linear-gradient(180deg, #fffaf4 0%, #f3efe8 100%);
    }

    .shell {
      width: min(1180px, calc(100vw - 32px));
      margin: 16px auto;
      border: 1px solid var(--line);
      border-radius: 28px;
      background: var(--panel);
      backdrop-filter: blur(18px);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 22px 28px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(90deg, rgba(130, 20, 54, 0.08), rgba(245, 158, 11, 0.08));
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
      border-radius: 16px;
      background: linear-gradient(135deg, var(--brand), #4c0f22);
      color: #fff;
      display: grid;
      place-items: center;
      font-weight: 800;
      box-shadow: 0 12px 24px rgba(130, 20, 54, 0.28);
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
      background: var(--brand);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .page {
      padding: 28px;
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
      border-radius: 14px;
      min-height: 46px;
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
      min-height: 46px;
      padding: 10px 14px 10px 40px !important;
      border: 1px solid #d1d5db;
      border-radius: 10px;
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
      min-height: 46px;
      border: 1px solid rgba(148, 163, 184, 0.55);
      border-radius: 14px;
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
      border-radius: 14px;
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
      margin-top: 18px;
    }

    .metric-card {
      padding: 18px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--line);
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
      margin-top: 18px;
      padding: 20px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid var(--line);
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .filters {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr auto;
      gap: 12px;
      align-items: end;
    }

    .filters .field {
      margin-bottom: 0;
    }

    .table-wrap {
      overflow: auto;
      border-radius: 18px;
      border: 1px solid var(--line);
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
      gap: 18px;
    }

    @media (max-width: 960px) {
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filters { grid-template-columns: 1fr 1fr; }
      .filters .wide { grid-column: 1 / -1; }
    }

    @media (max-width: 640px) {
      .shell { width: min(100vw - 16px, 1180px); margin: 8px auto; border-radius: 22px; }
      .topbar, .page { padding: 18px; }
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

async function fetchDashboardOptions(platform = '') {
  const pool = getPool();

  if (!pool) {
    return { platforms: [], campaigns: [] };
  }

  const normalizedPlatform = String(platform || '').trim().toUpperCase();

  const [platformsResult, campaignsResult] = await Promise.all([
    pool.query(`SELECT DISTINCT source FROM bi.v_dashboard_monthly WHERE COALESCE(source, '') <> '' ORDER BY source ASC`),
    normalizedPlatform
      ? pool.query(
          `SELECT DISTINCT campaign_name FROM bi.v_dashboard_monthly WHERE COALESCE(campaign_name, '') <> '' AND source = $1 ORDER BY campaign_name ASC`,
          [normalizedPlatform]
        )
      : pool.query(`SELECT DISTINCT campaign_name FROM bi.v_dashboard_monthly WHERE COALESCE(campaign_name, '') <> '' ORDER BY campaign_name ASC`)
  ]);

  return {
    platforms: platformsResult.rows.map(row => String(row.source || '').trim()).filter(Boolean),
    campaigns: campaignsResult.rows.map(row => String(row.campaign_name || '').trim()).filter(Boolean)
  };
}

function renderDashboardPage({ username, filters, options }) {
  const selectedPlatform = String(filters.platform || '').trim();
  const selectedCampaign = String(filters.campaign || '').trim();
  const startDate = String(filters.start_date || '').trim();
  const endDate = String(filters.end_date || '').trim();

  const platformOptions = ['ALL', ...options.platforms];
  const campaignOptions = options.campaigns;

  const body = `
    <div class="shell">
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark">DF</div>
          <div>
            <h1>Dashboard</h1>
            <small>Sesión: ${escapeHtml(username)}</small>
          </div>
        </div>
        <a class="pill-link" href="/logout">Salir</a>
      </div>
      <div class="page stack">
        <section class="panel">
          <div class="panel-head">
            <div>
              <strong style="font-size:18px;">Filtros</strong>
              <div class="subtle">Solo fecha, plataforma y campaña.</div>
            </div>
          </div>
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
            <button class="pill-button" type="submit" style="min-height:46px;">Aplicar</button>
          </form>
        </section>

        <section class="metrics" id="summary-metrics">
          <div class="metric-card"><span>Spend</span><strong>—</strong></div>
          <div class="metric-card"><span>Clicks</span><strong>—</strong></div>
          <div class="metric-card"><span>Leads</span><strong>—</strong></div>
          <div class="metric-card"><span>Ventas</span><strong>—</strong></div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <strong style="font-size:18px;">Resumen mensual</strong>
              <div class="subtle">Lo que verá el dashboard por mes y campaña.</div>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mes</th><th>Plataforma</th><th>Campaña</th><th>Spend</th><th>Clicks</th><th>Leads</th><th>Ventas</th><th>CPL</th><th>CPA</th>
                </tr>
              </thead>
              <tbody id="monthly-table-body">
                <tr><td colspan="9">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <strong style="font-size:18px;">Detalle diario</strong>
              <div class="subtle">Últimos registros según el filtro actual.</div>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Plataforma</th><th>Campaña</th><th>Spend</th><th>Clicks</th><th>Impr.</th><th>Reach</th><th>Leads</th><th>Ventas</th>
                </tr>
              </thead>
              <tbody id="daily-table-body">
                <tr><td colspan="9">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>`;

  const script = `
    (function () {
      const filters = ${JSON.stringify({ start_date: startDate, end_date: endDate, platform: selectedPlatform, campaign: selectedCampaign })};
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

      function metricCard(label, value) {
        return '<div class="metric-card"><span>' + label + '</span><strong>' + value + '</strong></div>';
      }

      async function fetchJson(path) {
        const response = await fetch(path + query, { credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      }

      async function fetchCampaignOptions(platform) {
        const params = new URLSearchParams();
        if (platform) {
          params.set('platform', platform);
        }

        const response = await fetch('/api/analytics/dashboard/campaign-options' + (params.toString() ? '?' + params.toString() : ''), { credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        const payload = await response.json();
        return ((payload && payload.data) || []);
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
        ['platform', 'campaign'].forEach(function (current) {
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

      function renderSummary(data) {
        const container = document.getElementById('summary-metrics');
        container.innerHTML = [
          metricCard('Spend', money(data.spend)),
          metricCard('Clicks', number(data.clicks)),
          metricCard('Leads', number(data.leads_new_count)),
          metricCard('Ventas', number(data.conversions_web))
        ].join('');
      }

      function renderMonthly(rows) {
        const body = document.getElementById('monthly-table-body');
        if (!rows.length) {
          body.innerHTML = '<tr><td colspan="9">Sin datos</td></tr>';
          return;
        }

        body.innerHTML = rows.map((row) => {
          const month = row.month_start ? String(row.month_start).slice(0, 10) : '';
          return '<tr>' +
            '<td>' + month + '</td>' +
            '<td>' + (row.source || '') + '</td>' +
            '<td>' + (row.campaign_name || '') + '</td>' +
            '<td>' + money(row.spend) + '</td>' +
            '<td>' + number(row.clicks) + '</td>' +
            '<td>' + number(row.leads_new_count) + '</td>' +
            '<td>' + number(row.conversions_web) + '</td>' +
            '<td>' + (row.cpl == null ? '—' : money(row.cpl)) + '</td>' +
            '<td>' + (row.cpa == null ? '—' : money(row.cpa)) + '</td>' +
          '</tr>';
        }).join('');
      }

      function renderDaily(rows) {
        const body = document.getElementById('daily-table-body');
        if (!rows.length) {
          body.innerHTML = '<tr><td colspan="9">Sin datos</td></tr>';
          return;
        }

        body.innerHTML = rows.map((row) => {
          const day = row.day ? String(row.day).slice(0, 10) : '';
          return '<tr>' +
            '<td>' + day + '</td>' +
            '<td>' + (row.source || '') + '</td>' +
            '<td>' + (row.campaign_name || '') + '</td>' +
            '<td>' + money(row.spend) + '</td>' +
            '<td>' + number(row.clicks) + '</td>' +
            '<td>' + number(row.impressions) + '</td>' +
            '<td>' + number(row.reach) + '</td>' +
            '<td>' + number(row.leads_new_count) + '</td>' +
            '<td>' + number(row.conversions_web) + '</td>' +
          '</tr>';
        }).join('');
      }

      const platformSelect = document.getElementById('platform');
      const campaignSelect = document.getElementById('campaign');
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

          try {
            campaignSelect.setAttribute('aria-busy', 'true');
            const campaignValues = await fetchCampaignOptions(value);
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
      campaignSelect.value = ${JSON.stringify(selectedCampaign)};
      renderDropdownState('platform', ${JSON.stringify(selectedPlatform)}, ${JSON.stringify(selectedPlatform || 'Todas')});
      renderDropdownState('campaign', ${JSON.stringify(selectedCampaign)}, ${JSON.stringify(selectedCampaign || 'Todas')});

      platformSelect.setAttribute('aria-hidden', 'true');
      campaignSelect.setAttribute('aria-hidden', 'true');
      platformSelect.style.position = 'absolute';
      platformSelect.style.left = '-9999px';
      campaignSelect.style.position = 'absolute';
      campaignSelect.style.left = '-9999px';

      Promise.all([
        fetchJson('/api/analytics/dashboard/summary'),
        fetchJson('/api/analytics/dashboard/monthly'),
        fetchJson('/api/analytics/dashboard/daily')
      ]).then(([summary, monthly, daily]) => {
        renderSummary(summary.data || summary || {});
        renderMonthly((((monthly.data || {}).data) || []));
        renderDaily((((daily.data || {}).data) || []));
      }).catch((error) => {
        document.getElementById('summary-metrics').innerHTML = '<div class="metric-card"><span>Error</span><strong>—</strong></div>';
        document.getElementById('monthly-table-body').innerHTML = '<tr><td colspan="9">Error cargando datos</td></tr>';
        document.getElementById('daily-table-body').innerHTML = '<tr><td colspan="9">Error cargando datos</td></tr>';
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
  if (isAuthenticated(req)) {
    return res.redirect('/dashboard');
  }

  const error = req.query.error ? 'Usuario o contraseña incorrectos.' : '';
  const username = req.query.username ? String(req.query.username) : '';
  return res.send(renderLoginPage({ error, username }));
}

function postLogin(req, res) {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();

  if (username === env.DASHBOARD_USERNAME && password === env.DASHBOARD_PASSWORD) {
    attachDashboardAuthCookie(res);
    return res.redirect('/dashboard');
  }

  return res.status(302).redirect(`/login?error=1&username=${encodeURIComponent(username)}`);
}

function logout(req, res) {
  clearDashboardAuthCookie(res);
  return res.redirect('/login');
}

async function getDashboardPage(req, res) {
  const selectedPlatform = String(req.query.platform || '').trim();
  const options = await fetchDashboardOptions(selectedPlatform);

  return res.send(
    renderDashboardPage({
      username: env.DASHBOARD_USERNAME,
      filters: req.query,
      options
    })
  );
}

module.exports = {
  getDashboardPage,
  getLoginPage,
  logout,
  postLogin,
  root
};