(function () {
  var scriptEl = document.currentScript;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function upper(value) {
    return clean(value).toUpperCase();
  }

  function normalizeVariant(value) {
    var raw = clean(value).toLowerCase();
    if (!raw) {
      return 'stepper';
    }

    if (raw === 'wa' || raw === 'ws' || raw === 'whatsapp' || raw === 'form_ws') {
      return 'wa';
    }

    if (raw === 'stepper' || raw === 'full' || raw === 'form_web_stepper') {
      return 'stepper';
    }

    return raw;
  }

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function getRuntimeDataset() {
    var dataset = (scriptEl && scriptEl.dataset) || {};
    return {
      programa: clean(dataset.programa || dataset.program || dataset.programaOculto || dataset.hiddenPrograma || ''),
      modalidad: clean(dataset.modalidad || dataset.modalidadOculta || dataset.hiddenModalidad || ''),
      nivel: clean(dataset.nivel || dataset.nivelOculto || dataset.hiddenNivel || '')
    };
  }

  function getScriptConfig() {
    var dataset = (scriptEl && scriptEl.dataset) || {};
    var src = scriptEl && scriptEl.src ? new URL(scriptEl.src, window.location.href) : new URL(window.location.href);
    var baseUrl = dataset.baseUrl ? clean(dataset.baseUrl) : src.origin;
    var variant = normalizeVariant(dataset.variant || dataset.formVariant || 'stepper');
    var defaultUtmSource = 'FORM_WEB';

    return {
      variant: variant,
      programa: clean(dataset.programa || dataset.program || dataset.programaOculto || dataset.hiddenPrograma || 'Programa General'),
      modalidad: clean(dataset.modalidad || dataset.modalidadOculta || dataset.hiddenModalidad || 'Online'),
      nivel: clean(dataset.nivel || dataset.nivelOculto || dataset.hiddenNivel || 'Grado'),
      platform: upper(dataset.platform || dataset.source || 'LANDING') || 'LANDING',
      submitUrl: clean(dataset.submitUrl || (baseUrl + '/widgets/lead/submit')),
      whatsappNumber: clean(dataset.whatsapp || ''),
      successMessage: clean(dataset.successMessage || 'Enviado correctamente'),
      defaultUtm: {
        utm_source: upper(dataset.defaultUtmSource || dataset.utmSourceDefault || defaultUtmSource),
        utm_medium: upper(dataset.defaultUtmMedium || dataset.utmMediumDefault || 'TRAFICO'),
        utm_campaign: upper(dataset.defaultUtmCampaign || dataset.utmCampaignDefault || 'UEES_GRADO_EC'),
        utm_content: upper(dataset.defaultUtmContent || dataset.utmContentDefault || 'CAMP_LANDINGS_ABR26'),
        utm_term: upper(dataset.defaultUtmTerm || dataset.utmTermDefault || 'ORGANICO')
      }
    };
  }

  function extractUtm() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: clean(params.get('utm_source')),
      utm_medium: clean(params.get('utm_medium')),
      utm_campaign: clean(params.get('utm_campaign')),
      utm_content: clean(params.get('utm_content')),
      utm_term: clean(params.get('utm_term')),
      utm_id: clean(params.get('utm_id'))
    };
  }

  function hasAnyUtm(utm) {
    if (!utm) {
      return false;
    }

    return Boolean(
      clean(utm.utm_source) ||
      clean(utm.utm_medium) ||
      clean(utm.utm_campaign) ||
      clean(utm.utm_content) ||
      clean(utm.utm_term) ||
      clean(utm.utm_id)
    );
  }

  function getPresenceCountries() {
    return [
      { value: 'EC', label: 'Ecuador', dialCode: '+593', flag: 'EC' },
      { value: 'US', label: 'Estados Unidos', dialCode: '+1', flag: 'US' },
      { value: 'CO', label: 'Colombia', dialCode: '+57', flag: 'CO' },
      { value: 'PE', label: 'Peru', dialCode: '+51', flag: 'PE' },
      { value: 'MX', label: 'Mexico', dialCode: '+52', flag: 'MX' },
      { value: 'IT', label: 'Italia', dialCode: '+39', flag: 'IT' },
      { value: 'FR', label: 'Francia', dialCode: '+33', flag: 'FR' },
      { value: 'ES', label: 'Espana', dialCode: '+34', flag: 'ES' }
    ];
  }

  function normalizeAscii(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .trim();
  }

  function mapCountryFromRemote(code, item) {
    var numericCode = Array.isArray(item && item.phone) && item.phone.length ? String(item.phone[0]) : '';
    var dialCode = numericCode ? ('+' + numericCode) : '';
    if (!dialCode) {
      return null;
    }

    var normalizedCode = clean(code).toUpperCase();
    if (!normalizedCode) {
      return null;
    }

    var labelsOverride = {
      EC: 'Ecuador',
      US: 'Estados Unidos',
      CO: 'Colombia',
      PE: 'Peru',
      MX: 'Mexico',
      IT: 'Italia',
      FR: 'Francia',
      ES: 'Espana'
    };

    return {
      value: normalizedCode,
      label: labelsOverride[normalizedCode] || normalizeAscii(item && item.name ? item.name : normalizedCode),
      dialCode: dialCode,
      flag: normalizedCode
    };
  }

  function mergeCountries(primary, secondary) {
    var map = {};
    var merged = [];

    function addList(list) {
      list.forEach(function (country) {
        var key = clean(country && country.value).toUpperCase();
        if (!key || map[key]) {
          return;
        }
        map[key] = true;
        merged.push(country);
      });
    }

    addList(primary || []);
    addList(secondary || []);

    merged.sort(function (a, b) {
      return clean(a.label).localeCompare(clean(b.label));
    });

    return merged;
  }

  function loadAllCountries() {
    return fetch('https://raw.githubusercontent.com/annexare/Countries/master/dist/countries.min.json')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('countries_load_failed');
        }
        return response.json();
      })
      .then(function (rawData) {
        var mapped = [];
        Object.keys(rawData || {}).forEach(function (code) {
          var item = mapCountryFromRemote(code, rawData[code]);
          if (item) {
            mapped.push(item);
          }
        });
        return mapped;
      });
  }

  function getIdLengthRulesByCountry() {
    return {
      EC: 10,
      PE: 8,
      CO: 10,
      US: 9,
      MX: 13,
      IT: 11,
      FR: 15,
      ES: 8
    };
  }

  function getPhonePlaceholderByCountry(country) {
    var key = clean(country && country.value).toUpperCase();
    var byCountry = {
      EC: '0999999999',
      PE: '912345678',
      CO: '3001234567',
      US: '2025550123',
      MX: '5512345678',
      IT: '3331234567',
      FR: '612345678',
      ES: '612345678'
    };

    if (byCountry[key]) {
      return byCountry[key];
    }

    return '#########';
  }

  function countryOptionHtml(country) {
    return '<option value="' + escapeAttr(country.value) + '" data-dial-code="' + escapeAttr(country.dialCode) + '" data-flag="' + escapeAttr(country.flag) + '">' + escapeAttr(country.label) + '</option>';
  }

  function buildPhonePrefixHtml(country) {
    var flagCode = clean(country && country.flag).toLowerCase();
    var dialCode = escapeAttr(clean(country && country.dialCode));
    var flagHtml = '';

    if (flagCode === 'ac' || flagCode === 'ta') {
      flagHtml = '<span class="fi fi-sh-' + flagCode + ' dm-phone-flag" aria-hidden="true"></span>';
    } else if (/^[a-z]{2}$/.test(flagCode)) {
      flagHtml = '<span class="fi fi-' + flagCode + ' dm-phone-flag" aria-hidden="true"></span>';
    } else {
      flagHtml = '<span class="dm-phone-flag-fallback" aria-hidden="true">' + escapeAttr(clean(country && country.flag).toUpperCase()) + '</span>';
    }

    return flagHtml + '<span>' + dialCode + '</span>';
  }

  function injectStyles() {
    if (document.getElementById('dm-lead-stepper-style')) {
      return;
    }

    if (!document.getElementById('dm-flag-icons-style')) {
      var flagsLink = document.createElement('link');
      flagsLink.id = 'dm-flag-icons-style';
      flagsLink.rel = 'stylesheet';
      flagsLink.href = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/css/flag-icons.min.css';
      document.head.appendChild(flagsLink);
    }

    if (!document.getElementById('dm-bootstrap-icons-style')) {
      var iconsLink = document.createElement('link');
      iconsLink.id = 'dm-bootstrap-icons-style';
      iconsLink.rel = 'stylesheet';
      iconsLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
      document.head.appendChild(iconsLink);
    }

    var style = document.createElement('style');
    style.id = 'dm-lead-stepper-style';
    style.textContent = '' +
      '.dm-widget-host .dm-stepper{font-family:Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;color:#111827;width:100%;max-width:760px;box-sizing:border-box;background:#fff;padding:1px;border:1px solid #d0d5dd;border-radius:16px;box-shadow:0 10px 24px rgba(16,24,40,.08);}' +
      '.dm-widget-host .dm-stepper-form{background:#fff;border-radius:15px;padding:28px;}' +
      '.dm-widget-host .dm-stepper,.dm-widget-host .dm-stepper *{font-family:Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif !important;text-transform:none !important;letter-spacing:normal !important;}' +
      '.dm-widget-host .dm-stepper h2,.dm-widget-host .dm-stepper h3,.dm-widget-host .dm-stepper h4,.dm-widget-host .dm-stepper p,.dm-widget-host .dm-stepper label,.dm-widget-host .dm-stepper span,.dm-widget-host .dm-stepper strong,.dm-widget-host .dm-stepper small,.dm-widget-host .dm-stepper input,.dm-widget-host .dm-stepper select,.dm-widget-host .dm-stepper button{font-style:normal !important;}' +
      '.dm-widget-host .dm-wa-card,.dm-widget-host .dm-wa-card *{font-family:Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif !important;text-transform:none !important;letter-spacing:normal !important;}' +
      '.dm-widget-host .dm-wa-card h2,.dm-widget-host .dm-wa-card h3,.dm-widget-host .dm-wa-card h4,.dm-widget-host .dm-wa-card p,.dm-widget-host .dm-wa-card label,.dm-widget-host .dm-wa-card span,.dm-widget-host .dm-wa-card strong,.dm-widget-host .dm-wa-card small,.dm-widget-host .dm-wa-card input,.dm-widget-host .dm-wa-card select,.dm-widget-host .dm-wa-card button{font-style:normal !important;}' +
      '.dm-widget-host .dm-form-header{text-align:center;margin-bottom:20px;}' +
      '.dm-widget-host .dm-form-header h2{margin:0 0 8px;font-size:30px;line-height:1.1;font-weight:700;color:#111827;}' +
      '.dm-widget-host .dm-form-header p{margin:0;color:#6b7280 !important;font-size:13px;}' +
      '.dm-widget-host .dm-step-panel{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff;transition:all .25s ease;margin-bottom:12px;}' +
      '.dm-widget-host .dm-step-head{display:flex;align-items:center;gap:14px;padding:16px 18px;background:#f9fafb;color:#111827;cursor:pointer;}' +
      '.dm-widget-host .dm-step-head-main{flex:1;min-width:0;}' +
      '.dm-widget-host .dm-step-head-title{margin:0 0 2px;font-size:16px;font-weight:700;color:#111827 !important;}' +
      '.dm-widget-host .dm-step-panel:not(.active) .dm-step-head-title{color:#111827 !important;}' +
      '.dm-widget-host .dm-step-panel.active .dm-step-head-title{color:#fff !important;}' +
      '.dm-widget-host .dm-step-head-sub{display:none;margin:0;font-size:12px;color:#6b7280 !important;line-height:1.35;}' +
      '.dm-widget-host .dm-step-chevron{font-size:20px;color:#9ca3af;transform:rotate(0deg);transition:transform .2s ease;}' +
      '.dm-widget-host .dm-step-panel.active .dm-step-head{background:#821436;color:#fff;}' +
      '.dm-widget-host .dm-step-panel.done .dm-step-head{background:#10b981;color:#fff;}' +
      '.dm-widget-host .dm-step-panel.done .dm-step-head:hover{background:#6e112e;color:#fff;}' +
      '.dm-widget-host .dm-step-panel.active .dm-step-head-sub{display:block;color:rgba(255,255,255,.9) !important;}' +
      '.dm-widget-host .dm-step-panel.active .dm-step-chevron{color:#fff;transform:rotate(180deg);}' +
      '.dm-widget-host .dm-step-panel.done .dm-step-chevron{color:#fff;}' +
      '.dm-widget-host .dm-step-panel.dm-pulse{animation:dmPulseAura 1.15s ease-in-out infinite;}' +
      '.dm-widget-host .dm-step-panel.dm-pulse .dm-step-head{border-color:#821436;}' +
      '@keyframes dmPulseAura{0%{box-shadow:0 0 0 0 rgba(130,20,54,.00),0 6px 14px rgba(16,24,40,.06);}45%{box-shadow:0 0 0 10px rgba(130,20,54,.20),0 10px 24px rgba(16,24,40,.12);}100%{box-shadow:0 0 0 0 rgba(130,20,54,.00),0 6px 14px rgba(16,24,40,.06);}}' +
      '.dm-widget-host .dm-step-number{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:999px;background:#821436;color:#fff;font-size:15px;font-weight:700;flex:0 0 auto;}' +
      '.dm-widget-host .dm-step-panel.active .dm-step-number,.dm-widget-host .dm-step-panel.done .dm-step-number{background:#fff;color:#821436;}' +
      '.dm-widget-host .dm-step-panel.done .dm-step-number{color:#059669;}' +
      '.dm-widget-host .dm-step-panel .dm-step-body{display:none;padding:18px;border-top:1px solid #e5e7eb;}' +
      '.dm-widget-host .dm-step-panel.active .dm-step-body{display:block;}' +
      '.dm-widget-host .dm-lead-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}' +
      '.dm-widget-host .dm-lead-grid .full{grid-column:1/-1;}' +
      '.dm-widget-host .dm-stepper-form label{display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:#111827;}' +
      '.dm-widget-host .dm-stepper-form input,.dm-widget-host .dm-stepper-form select{width:100%;padding:11px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;box-sizing:border-box;transition:border-color .2s ease,box-shadow .2s ease;}' +
      '.dm-widget-host .dm-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
      '.dm-widget-host .dm-card-option{position:relative;cursor:pointer;display:block;}' +
      '.dm-widget-host .dm-card-option input{position:absolute;opacity:0;pointer-events:none;}' +
      '.dm-widget-host .dm-card-body{display:flex;flex-direction:column;justify-content:space-between;min-height:108px;border:2px solid #d0d5dd;border-radius:10px;padding:12px;background:#fff;transition:all .2s ease;}' +
      '.dm-widget-host .dm-card-body strong{display:block;font-size:13px;color:#111827;margin-bottom:3px;font-weight:700 !important;}' +
      '.dm-widget-host .dm-card-body small{display:block;font-size:12px;color:#667085;line-height:1.35;font-weight:400 !important;}' +
      '.dm-widget-host .dm-card-option:hover .dm-card-body{border-color:#821436;box-shadow:0 4px 10px rgba(16,24,40,.08);}' +
      '.dm-widget-host .dm-card-option input:checked + .dm-card-body{border-color:#821436;background:#fdf2f5;box-shadow:0 0 0 3px rgba(130,20,54,.14);}' +
      '.dm-widget-host .dm-choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}' +
      '.dm-widget-host .dm-choice-option{position:relative;cursor:pointer;display:block;}' +
      '.dm-widget-host .dm-choice-option input{position:absolute;opacity:0;pointer-events:none;}' +
      '.dm-widget-host .dm-choice-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:102px;border:2px solid #d0d5dd;border-radius:10px;padding:12px;background:#fff;transition:all .2s ease;text-align:center;}' +
      '.dm-widget-host .dm-choice-text{display:block;font-size:13px;font-weight:700;color:#111827;line-height:1.2;}' +
      '.dm-widget-host .dm-choice-icon{width:22px;height:22px;color:#344054;display:inline-flex;align-items:center;justify-content:center;font-size:22px;line-height:1;}' +
      '.dm-widget-host .dm-choice-option:hover .dm-choice-card{border-color:#821436;box-shadow:0 4px 10px rgba(16,24,40,.08);}' +
      '.dm-widget-host .dm-choice-option input:checked + .dm-choice-card{border-color:#821436;background:#fdf2f5;box-shadow:0 0 0 3px rgba(130,20,54,.14);}' +
      '.dm-widget-host .dm-choice-option input:checked + .dm-choice-card .dm-choice-icon{color:#821436;}' +
      '.dm-widget-host .dm-stepper-form input:focus,.dm-widget-host .dm-stepper-form select:focus{outline:none;border-color:#821436;box-shadow:0 0 0 3px rgba(130,20,54,.18);}' +
      '.dm-widget-host .dm-stepper-form.dm-show-errors input:invalid,.dm-widget-host .dm-stepper-form.dm-show-errors select:invalid{border-color:#ef4444 !important;box-shadow:0 0 0 3px rgba(239,68,68,.12);background:#fff7f7;}' +
      '.dm-widget-host .dm-lead-legal{margin-top:12px;display:grid;gap:8px;}' +
      '.dm-widget-host .dm-legal-item{display:grid;grid-template-columns:5% 95%;align-items:start;font-size:11px;line-height:1.4;color:#4b5563;font-weight:400 !important;margin-bottom:0 !important;}' +
      '.dm-widget-host .dm-legal-item input{width:auto !important;min-width:14px;height:14px;padding:0 !important;border:0 !important;border-radius:0 !important;margin-top:2px;margin-right:10px;justify-self:start;display:inline-block;background:transparent !important;box-shadow:none !important;}' +
      '.dm-widget-host .dm-legal-item a{display:inline !important;color:#821436;text-decoration:underline;font-weight:400 !important;}' +
      '.dm-widget-host .dm-phone-label{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;}' +
      '.dm-widget-host .dm-phone-label-text{padding-right:75px;}' +
      '.dm-widget-host .dm-phone-prefix{display:inline-flex;align-items:center;justify-content:flex-end;gap:6px;font-size:12px;font-weight:700;color:#475467;background:transparent;border:0;padding:0;white-space:nowrap;margin-left:auto;text-align:right;}' +
      '.dm-widget-host .dm-phone-flag{font-size:15px;line-height:1;display:inline-block;}' +
      '.dm-widget-host .dm-phone-flag-fallback{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:16px;padding:0 3px;border-radius:3px;background:#e5e7eb;color:#374151;font-size:10px;font-weight:700;}' +
      '.dm-widget-host .dm-step-3-grid{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);}' +
      '.dm-widget-host .dm-step-3-grid .full{grid-column:1/-1;}' +
      '.dm-widget-host .dm-country-alert{margin-top:10px;border:1px solid #fca5a5;background:#fef2f2;color:#b91c1c;border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.35;display:none;}' +
      '.dm-widget-host .dm-step-actions{display:flex;gap:8px;margin-top:14px;}' +
      '.dm-widget-host .dm-step-actions .dm-spacer{flex:1;}' +
      '.dm-widget-host .dm-btn{border:0;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;appearance:none;-webkit-appearance:none;transition:all .18s ease;}' +
      '.dm-widget-host .dm-btn-primary{background:#821436;color:#fff;}' +
      '.dm-widget-host .dm-btn-primary:hover{background:#6e112e;}' +
      '.dm-widget-host .dm-btn-secondary{background:#e5e7eb;color:#374151;}' +
      '.dm-widget-host .dm-btn-secondary:hover{background:#d1d5db;}' +
      '.dm-widget-host .dm-btn-block{width:100%;display:block;}' +
      '.dm-widget-host .dm-lead-status{font-size:13px;font-weight:700;margin-top:10px;min-height:18px;}' +
      '.dm-widget-host .dm-lead-status.error{color:#b91c1c;}' +
      '.dm-widget-host .dm-lead-status.ok{color:#047857;}' +
      '.dm-widget-host .dm-wa-open{border:0;border-radius:999px;padding:12px 16px;background:#25D366;color:#fff;font-weight:700;cursor:pointer;}' +
      '.dm-widget-host .dm-wa-open:hover{background:#22c55e;}' +
      '.dm-widget-host .dm-wa-open.is-open{width:44px;height:44px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:24px;line-height:1;}' +
      '.dm-widget-host .dm-wa-float{position:fixed;right:18px;bottom:18px;z-index:99999;}' +
      '.dm-widget-host .dm-wa-card{display:none;width:min(360px,92vw);margin-top:10px;border:1px solid #d0d5dd;border-radius:14px;background:#fff;box-shadow:0 10px 24px rgba(16,24,40,.08);padding:14px;}' +
      '.dm-widget-host .dm-wa-form h4{margin:2px 0 12px;font-size:18px;line-height:1.2;color:#101828;}' +
      '.dm-widget-host .dm-wa-form input{width:100%;margin:0 0 10px;padding:10px 12px;border:1px solid #d0d5dd;border-radius:10px;font-size:14px;box-sizing:border-box;}' +
      '.dm-widget-host .dm-wa-form.dm-show-errors input:invalid{border-color:#ef4444 !important;box-shadow:0 0 0 3px rgba(239,68,68,.12);background:#fff7f7;}' +
      '.dm-widget-host .dm-wa-actions{margin-top:4px;}' +
      '.dm-widget-host .dm-wa-success{display:none;text-align:center;padding:18px 10px;color:#047857;font-weight:700;}' +
      '@media (max-width:640px){.dm-widget-host .dm-stepper-form{padding:18px;}.dm-widget-host .dm-form-header h2{font-size:26px;}.dm-widget-host .dm-lead-grid{grid-template-columns:1fr;}.dm-widget-host .dm-step-3-grid{grid-template-columns:1fr;}.dm-widget-host .dm-card-grid{grid-template-columns:1fr;}.dm-widget-host .dm-choice-grid{grid-template-columns:1fr;}.dm-widget-host .dm-step-head{padding:14px;}}';
    document.head.appendChild(style);
  }

  function buildStepperForm(config) {
    var countryOptions = getPresenceCountries().map(countryOptionHtml).join('');

    return '' +
      '<div class="dm-stepper">' +
      '  <form id="FORM_WEB_STEPPER" name="FORM_WEB_STEPPER" class="dm-stepper-form" novalidate>' +
      '    <div class="dm-form-header"><h2>Solicita más información</h2><p>Nos gustaría conocerte mejor para ofrecerte la mejor experiencia</p></div>' +
      '    <div class="dm-step-panel active" data-step="1">' +
      '      <div class="dm-step-head">' +
      '        <span class="dm-step-number" data-step-indicator="1">1</span>' +
      '        <div class="dm-step-head-main"><h3 class="dm-step-head-title">Identificación Personal</h3><p class="dm-step-head-sub">Esto nos ayuda a saber desde dónde estudiarás y a validar convenios disponibles en tu región</p></div>' +
      '        <span class="dm-step-chevron">⌄</span>' +
      '      </div>' +
      '      <div class="dm-step-body">' +
      '        <div class="dm-lead-grid">' +
      '          <div><label>País</label><select name="pais" required>' + countryOptions + '</select></div>' +
      '          <div><label>Ciudad</label><input name="ciudad" required /></div>' +
      '          <div class="full"><label>Número de identificación</label><input name="cedula" inputmode="numeric" pattern="[0-9]+" required /></div>' +
      '          <div><label>Nombre</label><input name="nombre" required /></div>' +
      '          <div><label>Apellido</label><input name="apellido" required /></div>' +
      '        </div>' +
      '        <div class="dm-country-alert" role="alert"></div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="dm-step-panel" data-step="2">' +
      '      <div class="dm-step-head">' +
      '        <span class="dm-step-number" data-step-indicator="2">2</span>' +
      '        <div class="dm-step-head-main"><h3 class="dm-step-head-title">Tipo de Programa</h3><p class="dm-step-head-sub">Selecciona el mecanismo que mejor se ajusta a tu perfil</p></div>' +
      '        <span class="dm-step-chevron">⌄</span>' +
      '      </div>' +
      '      <div class="dm-step-body">' +
      '        <div class="dm-lead-grid dm-step-3-grid">' +
      '          <div class="full"><label>Mecanismo ingreso</label><div class="dm-card-grid">' +
      '            <label class="dm-card-option"><input type="radio" name="mecanismo" value="Carrera Completa" required /><span class="dm-card-body"><strong>Carrera Completa</strong><small>Deseo cursar el programa desde el inicio</small></span></label>' +
      '            <label class="dm-card-option"><input type="radio" name="mecanismo" value="Homologacion de estudios" required /><span class="dm-card-body"><strong>Homologación</strong><small>Tengo estudios previos similares</small></span></label>' +
      '            <label class="dm-card-option"><input type="radio" name="mecanismo" value="Validacion de conocimientos / estudios de mas de 10 anos" required /><span class="dm-card-body"><strong>Validación de conocimientos</strong><small>Deseo validar mis conocimientos previos</small></span></label>' +
      '            <label class="dm-card-option"><input type="radio" name="mecanismo" value="Validacion de ejercicio profesional" required /><span class="dm-card-body"><strong>Validación de trayectoria</strong><small>Tengo experiencia profesional comprobada</small></span></label>' +
      '          </div></div>' +
      '        </div>' +
      '        <input type="hidden" name="codigo_pais" value="+593" />' +
      '      </div>' +
      '    </div>' +
      '    <div class="dm-step-panel" data-step="3">' +
      '      <div class="dm-step-head">' +
      '        <span class="dm-step-number" data-step-indicator="3">3</span>' +
      '        <div class="dm-step-head-main"><h3 class="dm-step-head-title">Información de Contacto</h3><p class="dm-step-head-sub">Un asesor experto se comunicará contigo para resolver todas tus dudas</p></div>' +
      '        <span class="dm-step-chevron">⌄</span>' +
      '      </div>' +
      '      <div class="dm-step-body">' +
      '        <div class="dm-lead-grid">' +
      '          <div><label>Correo</label><input name="correo" type="email" required /></div>' +
      '          <div><label class="dm-phone-label"><span class="dm-phone-label-text">Teléfono</span><span class="dm-phone-prefix" data-phone-prefix><span class="fi fi-ec dm-phone-flag" aria-hidden="true"></span><span>+593</span></span></label><input name="celular" type="tel" placeholder="0999999999" required /></div>' +
      '          <div class="full"><label>¿Cómo te contactamos?</label><div class="dm-choice-grid">' +
      '            <label class="dm-choice-option"><input type="radio" name="como_te_contactamos" value="whatsapp" required /><span class="dm-choice-card"><i class="bi bi-whatsapp dm-choice-icon" aria-hidden="true"></i><span class="dm-choice-text">WhatsApp</span></span></label>' +
      '            <label class="dm-choice-option"><input type="radio" name="como_te_contactamos" value="llamada" required /><span class="dm-choice-card"><svg class="dm-choice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.8 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.7 2.8.8a2 2 0 0 1 1.7 2z"/></svg><span class="dm-choice-text">Llamada</span></span></label>' +
      '            <label class="dm-choice-option"><input type="radio" name="como_te_contactamos" value="correo" required /><span class="dm-choice-card"><svg class="dm-choice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><span class="dm-choice-text">Correo</span></span></label>' +
      '          </div></div>' +
      '          <div class="full"><label>Franja horaria</label><div class="dm-choice-grid">' +
      '            <label class="dm-choice-option"><input type="radio" name="franja_horaria" value="manana" required /><span class="dm-choice-card"><svg class="dm-choice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><span class="dm-choice-text">Mañana</span></span></label>' +
      '            <label class="dm-choice-option"><input type="radio" name="franja_horaria" value="tarde" required /><span class="dm-choice-card"><svg class="dm-choice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20h12"/><path d="M8 16a4 4 0 1 1 8 0"/><path d="M3 16h18"/></svg><span class="dm-choice-text">Tarde</span></span></label>' +
      '            <label class="dm-choice-option"><input type="radio" name="franja_horaria" value="noche" required /><span class="dm-choice-card"><svg class="dm-choice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><span class="dm-choice-text">Noche</span></span></label>' +
      '          </div></div>' +
      '        </div>' +
      '        <div class="dm-lead-legal">' +
      '          <label class="dm-legal-item"><input type="checkbox" name="autorizacion_contacto" value="SI" required /><span>Autorizo recibir informacion de UEES por medio de llamada telefonica, WhatsApp y SMS, mas de una vez a la semana por diferentes canales de contacto, con el fin de continuar con el proceso de inscripcion. He leido y aceptado el <a href="https://uees.edu.ec/politica-de-privacidad" target="_blank" rel="noopener noreferrer">aviso de privacidad</a>.</span></label>' +
      '          <label class="dm-legal-item"><input type="checkbox" name="acepta_politica_datos" value="SI" required /><span>Acepto la <a href="https://uees.edu.ec/wp-content/uploads/2024/01/politica-de-tratamiento-de-datos-personales.pdf" target="_blank" rel="noopener noreferrer">politica de tratamiento de datos personales</a>.</span></label>' +
      '        </div>' +
      '        <input type="hidden" name="programa" value="' + escapeAttr(config.programa) + '" />' +
      '        <input type="hidden" name="modalidad" value="' + escapeAttr(config.modalidad) + '" />' +
      '        <input type="hidden" name="nivel" value="' + escapeAttr(config.nivel) + '" />' +
      '        <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off" />' +
      '        <div class="dm-step-actions"><button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Enviar</button></div>' +
      '        <div class="dm-lead-status" aria-live="polite"></div>' +
      '      </div>' +
      '    </div>' +
      '  </form>' +
      '</div>';
  }

  function buildWhatsappForm(config) {
    return '' +
      '<div class="dm-wa-float">' +
      '  <button type="button" class="dm-wa-open">Chatear con un asesor</button>' +
      '  <div class="dm-wa-card">' +
      '    <form id="FORM_WS" name="FORM_WS" class="dm-wa-form" novalidate>' +
      '      <h4>Dejanos tus datos</h4>' +
      '      <input type="text" name="nombre" placeholder="Nombre" required />' +
      '      <input type="text" name="apellido" placeholder="Apellido" required />' +
      '      <input type="text" name="cedula" placeholder="Documento de identificacion" required />' +
      '      <input type="email" name="correo" placeholder="Correo" required />' +
      '      <input type="tel" name="telefono" placeholder="Telefono" required />' +
      '      <input type="hidden" name="programa" value="' + escapeAttr(config.programa) + '" />' +
      '      <input type="hidden" name="modalidad" value="' + escapeAttr(config.modalidad) + '" />' +
      '      <input type="hidden" name="nivel" value="' + escapeAttr(config.nivel) + '" />' +
      '      <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off" />' +
      '      <div class="dm-wa-actions">' +
      '        <button type="submit" class="dm-btn dm-btn-primary dm-btn-block">Iniciar chat</button>' +
      '      </div>' +
      '      <div class="dm-lead-status" aria-live="polite"></div>' +
      '    </form>' +
      '    <div class="dm-wa-success">Gracias, en breve nos contactaremos contigo.</div>' +
      '  </div>' +
      '</div>';
  }

  function createMessage(data) {
    return [
      'Hola, soy ' + (data.nombre || '') + ' ' + (data.apellido || ''),
      'Programa: ' + (data.programa || ''),
      'Documento de identificacion: ' + (data.cedula || ''),
      'Correo: ' + (data.correo || ''),
      'Telefono: ' + (data.celular || ''),
      'Modalidad: ' + (data.modalidad || ''),
      'Nivel: ' + (data.nivel || '')
    ].join('\n');
  }

  function formDataToObject(formEl) {
    var fd = new FormData(formEl);
    var obj = {};
    fd.forEach(function (value, key) {
      obj[key] = clean(value);
    });
    return obj;
  }

  function pushTrackingEvent(eventName, payload, formId) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: String(eventName || '').trim(),
        form_id: String(formId || payload && payload.form_name || '').trim(),
        form_name: payload && payload.form_name ? payload.form_name : '',
        platform: payload && payload.platform ? payload.platform : '',
        programa: payload && payload.programa ? payload.programa : ''
      });
    } catch (error) {
      // no-op
    }
  }

  function normalizeDigits(value) {
    return clean(value).replace(/\D/g, '');
  }

  function readSelectedCountry(selectEl) {
    if (!selectEl || !selectEl.options || !selectEl.options.length) {
      return null;
    }

    var selected = selectEl.options[selectEl.selectedIndex];
    if (!selected) {
      return null;
    }

    return {
      value: clean(selected.value),
      label: clean(selected.textContent || selected.innerText || ''),
      dialCode: clean(selected.getAttribute('data-dial-code') || ''),
      flag: clean(selected.getAttribute('data-flag') || '')
    };
  }

  function findDialCodeFromPhone(phoneDigits, countries, selectedDialCode) {
    var selectedDigits = normalizeDigits(selectedDialCode);
    if (!phoneDigits) {
      return '';
    }

    var i;
    var known = [];
    for (i = 0; i < countries.length; i += 1) {
      known.push(normalizeDigits(countries[i].dialCode));
    }

    known.sort(function (a, b) {
      return b.length - a.length;
    });

    for (i = 0; i < known.length; i += 1) {
      if (phoneDigits.indexOf(known[i]) === 0) {
        return known[i];
      }
    }

    return selectedDigits;
  }

  function hasInternationalPrefix(value) {
    var raw = clean(value);
    return raw.indexOf('+') === 0 || raw.indexOf('00') === 0;
  }

  function attachWhatsappBehaviour(root, config, utm) {
    var waBtn = root.querySelector('.dm-wa-open');
    var waCard = root.querySelector('.dm-wa-card');
    var form = root.querySelector('.dm-wa-form');
    var status = root.querySelector('.dm-lead-status');
    var waSuccess = root.querySelector('.dm-wa-success');

    if (waBtn && waCard) {
      var waBtnLabel = waBtn.textContent || 'Chatear con un asesor';
      waBtn.addEventListener('click', function () {
        var isOpen = waCard.style.display !== 'block';
        waCard.style.display = isOpen ? 'block' : 'none';
        waBtn.classList.toggle('is-open', isOpen);
        waBtn.textContent = isOpen ? 'X' : waBtnLabel;
      });
    }

    if (!form || !status) {
      return;
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      status.className = 'dm-lead-status';
      status.textContent = 'Enviando...';

      if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
        form.classList.add('dm-show-errors');
        status.className = 'dm-lead-status error';
        status.textContent = 'Por favor completa todos los campos obligatorios.';
        if (typeof form.reportValidity === 'function') {
          form.reportValidity();
        }
        return;
      }

      form.classList.remove('dm-show-errors');

      var data = formDataToObject(form);
      var leadPhone = data.celular || data.telefono || '';
      if (!leadPhone) {
        status.className = 'dm-lead-status error';
        status.textContent = 'Por favor completa todos los campos obligatorios.';
        return;
      }

      var runtimeDataset = getRuntimeDataset();
      var immutableProgram = clean(runtimeDataset.programa || data.programa || config.programa || 'Programa General');
      var runtimeModalidad = clean(runtimeDataset.modalidad || data.modalidad || config.modalidad || '');
      var runtimeNivel = clean(runtimeDataset.nivel || data.nivel || config.nivel || '');

      var payload = {
        campaign_name: immutableProgram,
        platform: upper(config.platform || 'WEB'),
        event_type: 'FORM_WS',
        form_name: 'FORM_WS',
        page_url: window.location.href,
        thank_you_url: window.location.href,
        referrer: clean(document.referrer || ''),
        title: clean(document.title || ''),
        timestamp: new Date().toISOString(),
        nombre: clean(data.nombre),
        apellido: clean(data.apellido),
        correo: clean(data.correo),
        celular: clean(leadPhone),
        phone: clean(leadPhone),
        cedula: clean(data.cedula),
        modalidad: runtimeModalidad,
        nivel: runtimeNivel,
        programa: immutableProgram,
        website: clean(data.website || ''),
        utm_source: clean(utm.utm_source),
        utm_medium: clean(utm.utm_medium),
        utm_campaign: clean(utm.utm_campaign),
        utm_content: clean(utm.utm_content),
        utm_term: clean(utm.utm_term),
        utm_id: clean(utm.utm_id)
      };

      if (!hasAnyUtm(utm)) {
        payload.utm_source = config.defaultUtm.utm_source;
        payload.utm_medium = config.defaultUtm.utm_medium;
        payload.utm_campaign = config.defaultUtm.utm_campaign;
        payload.utm_content = config.defaultUtm.utm_content;
        payload.utm_term = config.defaultUtm.utm_term;
      }

      if (!clean(payload.utm_id)) {
        payload.utm_id = 'BTN_FORM_WEB';
      }

      try {
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeoutId = setTimeout(function () {
          if (controller) {
            controller.abort();
          }
        }, 10000);
        var requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        };

        if (controller) {
          requestOptions.signal = controller.signal;
        }

        var response = await fetch(config.submitUrl, requestOptions);
        clearTimeout(timeoutId);

        var responsePayload = null;
        try {
          responsePayload = await response.json();
        } catch (jsonError) {
          responsePayload = null;
        }

        if (!response.ok) {
          var apiError = responsePayload && (responsePayload.error || responsePayload.message);
          throw new Error(apiError || ('HTTP ' + response.status));
        }

        var crmForwarding = responsePayload && responsePayload.data ? responsePayload.data.crm_forwarding : null;
        if (crmForwarding && crmForwarding.ok === false && crmForwarding.skipped !== true) {
          var crmMsg = crmForwarding.response && (crmForwarding.response.msg || crmForwarding.response.message);
          throw new Error('No se pudo enviar al CRM: ' + (crmMsg || crmForwarding.error || 'crm_forward_failed'));
        }

        status.className = 'dm-lead-status ok';
        status.textContent = config.successMessage;

        pushTrackingEvent('FORM_WS_SUBMIT_SUCCESS', payload, 'FORM_WS');

        if (config.whatsappNumber) {
          var phone = config.whatsappNumber.replace(/\D/g, '');
          if (phone) {
            window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(createMessage(payload)), '_blank');
          }
        }

        if (waSuccess) {
          form.style.display = 'none';
          waSuccess.style.display = 'block';
          status.textContent = '';
        }

        form.reset();
      } catch (error) {
        status.className = 'dm-lead-status error';
        status.textContent = 'No se pudo enviar. Intenta nuevamente.';
      }
    });
  }

  function attachBehaviour(root, config, utm) {
    if (config.variant === 'wa') {
      attachWhatsappBehaviour(root, config, utm);
      return;
    }

    var form = root.querySelector('.dm-stepper-form');
    var status = root.querySelector('.dm-lead-status');
    var stepBlocks = root.querySelectorAll('.dm-step-panel');
    var stepHeaders = root.querySelectorAll('.dm-step-head');
    var stepIndicators = root.querySelectorAll('[data-step-indicator]');
    var countrySelect = form.querySelector('select[name="pais"]');
    var phoneInput = form.querySelector('input[name="celular"]');
    var countryCodeInput = form.querySelector('input[name="codigo_pais"]');
    var phonePrefix = form.querySelector('[data-phone-prefix]');
    var countryAlert = root.querySelector('.dm-country-alert');
    var idInput = form.querySelector('input[name="cedula"]');
    var countries = getPresenceCountries();
    var idLengthRules = getIdLengthRulesByCountry();
    var currentStep = 1;
    var maxUnlockedStep = 1;

    if (!form || !status) {
      return;
    }

    function renderStepState(activeStep) {
      currentStep = activeStep;

      stepBlocks.forEach(function (block) {
        var blockStep = Number(block.getAttribute('data-step'));
        block.classList.remove('active');
        block.classList.remove('done');
        if (blockStep === activeStep) {
          block.classList.add('active');
          block.classList.remove('dm-pulse');
        }
        if (blockStep < maxUnlockedStep) {
          block.classList.add('done');
        }
      });

      stepIndicators.forEach(function (indicator) {
        var indicatorStep = Number(indicator.getAttribute('data-step-indicator'));
        indicator.classList.remove('active');
        indicator.classList.remove('done');
        indicator.textContent = String(indicatorStep);
        if (indicatorStep < maxUnlockedStep) {
          indicator.classList.add('done');
          indicator.textContent = '✓';
        }
        if (indicatorStep === activeStep) {
          indicator.classList.add('active');
        }
      });
    }

    function setStep(stepNumber) {
      renderStepState(stepNumber);
    }

    function updateStepAvailability() {
      var step1Valid = validateStep(1);
      var step2Valid = step1Valid && validateStep(2);

      maxUnlockedStep = 1;
      if (step1Valid) {
        maxUnlockedStep = 2;
      }
      if (step2Valid) {
        maxUnlockedStep = 3;
      }

      var step2 = form.querySelector('.dm-step-panel[data-step="2"]');
      var step3 = form.querySelector('.dm-step-panel[data-step="3"]');
      if (step2) {
        if (maxUnlockedStep === 2 && currentStep !== 2) {
          step2.classList.add('dm-pulse');
        } else {
          step2.classList.remove('dm-pulse');
        }
      }

      if (step3) {
        if (maxUnlockedStep === 3 && currentStep !== 3) {
          step3.classList.add('dm-pulse');
        } else {
          step3.classList.remove('dm-pulse');
        }
      }

      renderStepState(currentStep);
    }

    function getStepRequiredElements(stepNumber) {
      var stepContainer = form.querySelector('.dm-step-panel[data-step="' + stepNumber + '"]');
      if (!stepContainer) {
        return [];
      }
      return Array.prototype.slice.call(stepContainer.querySelectorAll('input[required], select[required]'));
    }

    function validatePhoneCountry() {
      var selectedCountry = readSelectedCountry(countrySelect);
      var rawPhone = clean(phoneInput && phoneInput.value || '');
      var selectedDialDigits = normalizeDigits(selectedCountry && selectedCountry.dialCode || '');
      var phoneDigits = normalizeDigits(rawPhone);
      var isInternational = hasInternationalPrefix(rawPhone);

      if (!phoneInput || !selectedCountry || !selectedDialDigits || !phoneDigits) {
        if (phoneInput) {
          phoneInput.setCustomValidity('');
        }
        return true;
      }

      if (isInternational) {
        var detectedDial = findDialCodeFromPhone(phoneDigits, countries, selectedCountry.dialCode);
        if (detectedDial && detectedDial !== selectedDialDigits) {
          phoneInput.setCustomValidity('El teléfono no coincide con el país seleccionado.');
          return false;
        }
      }

      phoneInput.setCustomValidity('');
      return true;
    }

    function validateIdentificationDocument() {
      var selectedCountry = readSelectedCountry(countrySelect);
      var rawId = clean(idInput && idInput.value || '');

      if (!idInput || !selectedCountry || !rawId) {
        if (idInput) {
          idInput.setCustomValidity('');
        }
        return true;
      }

      var digits = normalizeDigits(rawId);
      var expectedLength = idLengthRules[selectedCountry.value];

      if (digits !== rawId) {
        idInput.setCustomValidity('El documento de identificación solo acepta números.');
        return false;
      }

      if (expectedLength && digits.length !== expectedLength) {
        idInput.setCustomValidity('Este campo debe cumplir con ' + expectedLength + ' dígitos.');
        return false;
      }

      idInput.setCustomValidity('');
      return true;
    }

    function validateStep(stepNumber) {
      var requiredElements = getStepRequiredElements(stepNumber);
      var isValid = true;

      requiredElements.forEach(function (field) {
        if (typeof field.checkValidity === 'function' && !field.checkValidity()) {
          isValid = false;
        }
      });

      if (stepNumber === 3 && !validatePhoneCountry()) {
        isValid = false;
      }

      if (stepNumber === 1 && !validateIdentificationDocument()) {
        isValid = false;
      }

      return isValid;
    }

    function updateCountryUI() {
      var selectedCountry = readSelectedCountry(countrySelect);
      if (!selectedCountry) {
        return;
      }

      if (countryCodeInput) {
        countryCodeInput.value = selectedCountry.dialCode;
      }

      if (phonePrefix) {
        phonePrefix.innerHTML = buildPhonePrefixHtml(selectedCountry);
      }

      if (selectedCountry.value !== 'EC') {
        countryAlert.style.display = 'block';
        countryAlert.textContent = 'Todos nuestros programas son autorizados por el CES de Ecuador. Su oferta en el exterior se realiza bajo la modalidad en línea, y su equivalencia académica dependerá de los criterios y normas vigentes del país que lo requiera.';
      } else {
        countryAlert.style.display = 'none';
        countryAlert.textContent = '';
      }

      if (phoneInput) {
        phoneInput.placeholder = getPhonePlaceholderByCountry(selectedCountry);
      }

      validatePhoneCountry();
      validateIdentificationDocument();

      if (idInput) {
        var expectedLength = idLengthRules[selectedCountry.value] || 0;
        idInput.maxLength = expectedLength > 0 ? expectedLength : 20;
      }
    }

    stepHeaders.forEach(function (header) {
      header.addEventListener('click', function () {
        var panel = header.closest('.dm-step-panel');
        if (!panel) {
          return;
        }

        var targetStep = Number(panel.getAttribute('data-step'));
        if (!targetStep || targetStep > maxUnlockedStep) {
          return;
        }

        if (targetStep === currentStep && targetStep < maxUnlockedStep) {
          status.className = 'dm-lead-status';
          status.textContent = '';
          setStep(0);
          return;
        }

        status.className = 'dm-lead-status';
        status.textContent = '';
        setStep(targetStep);
      });
    });

    if (countrySelect) {
      countrySelect.value = 'EC';
      countrySelect.addEventListener('change', function () {
        updateCountryUI();
        updateStepAvailability();
      });
    }

    if (phoneInput) {
      phoneInput.addEventListener('input', function () {
        validatePhoneCountry();
        updateStepAvailability();
      });
    }

    if (idInput) {
      idInput.addEventListener('input', function () {
        var digits = normalizeDigits(idInput.value);
        if (idInput.value !== digits) {
          idInput.value = digits;
        }
        validateIdentificationDocument();
        updateStepAvailability();
      });

      idInput.addEventListener('blur', function () {
        if (!validateIdentificationDocument()) {
          if (typeof idInput.reportValidity === 'function') {
            idInput.reportValidity();
          }
          return;
        }

        if (typeof idInput.setCustomValidity === 'function') {
          idInput.setCustomValidity('');
        }
      });
    }

    Array.prototype.slice.call(form.querySelectorAll('input, select')).forEach(function (field) {
      field.addEventListener('change', updateStepAvailability);
      field.addEventListener('input', updateStepAvailability);
    });

    updateCountryUI();
    updateStepAvailability();

    loadAllCountries()
      .then(function (remoteCountries) {
        countries = mergeCountries(getPresenceCountries(), remoteCountries);

        if (!countrySelect) {
          return;
        }

        var previousValue = countrySelect.value || 'EC';
        countrySelect.innerHTML = countries.map(countryOptionHtml).join('');
        countrySelect.value = previousValue;

        if (!countrySelect.value) {
          countrySelect.value = 'EC';
        }

        updateCountryUI();
        updateStepAvailability();
      })
      .catch(function () {
        // keep local countries fallback
      });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      status.className = 'dm-lead-status';
      status.textContent = 'Enviando...';

      form.classList.add('dm-show-errors');
      var step1Valid = validateStep(1);
      var step2Valid = validateStep(2);
      var step3Valid = validateStep(3);
      if (!step1Valid || !step2Valid || !step3Valid) {
        status.className = 'dm-lead-status error';
        status.textContent = 'Por favor completa todos los campos obligatorios.';
        if (!step1Valid) {
          setStep(1);
        } else if (!step2Valid) {
          setStep(2);
        } else {
          setStep(3);
        }
        if (typeof form.reportValidity === 'function') {
          form.reportValidity();
        }
        return;
      }

      form.classList.remove('dm-show-errors');

      var data = formDataToObject(form);
      var runtimeDataset = getRuntimeDataset();
      var immutableProgram = clean(runtimeDataset.programa || data.programa || config.programa || 'Programa General');
      var runtimeModalidad = clean(runtimeDataset.modalidad || data.modalidad || config.modalidad || '');
      var runtimeNivel = clean(runtimeDataset.nivel || data.nivel || config.nivel || '');

      var payload = {
        campaign_name: immutableProgram,
        platform: upper(config.platform || 'WEB'),
        event_type: 'FORM_WEB_STEPPER',
        form_name: 'FORM_WEB_STEPPER',
        page_url: window.location.href,
        thank_you_url: window.location.href,
        referrer: clean(document.referrer || ''),
        title: clean(document.title || ''),
        timestamp: new Date().toISOString(),
        nombre: clean(data.nombre),
        apellido: clean(data.apellido),
        correo: clean(data.correo),
        celular: clean(data.celular),
        phone: clean(data.celular),
        cedula: clean(data.cedula),
        modalidad: runtimeModalidad,
        nivel: runtimeNivel,
        ciudad: clean(data.ciudad),
        pais: clean(data.pais),
        codigo_pais: clean(data.codigo_pais),
        mecanismo: clean(data.mecanismo),
        como_te_contactamos: clean(data.como_te_contactamos),
        franja_horaria: clean(data.franja_horaria),
        autorizacion_contacto: clean(data.autorizacion_contacto),
        acepta_politica_datos: clean(data.acepta_politica_datos),
        programa: immutableProgram,
        website: clean(data.website || ''),
        utm_source: clean(utm.utm_source),
        utm_medium: clean(utm.utm_medium),
        utm_campaign: clean(utm.utm_campaign),
        utm_content: clean(utm.utm_content),
        utm_term: clean(utm.utm_term),
        utm_id: clean(utm.utm_id)
      };

      if (!hasAnyUtm(utm)) {
        payload.utm_source = config.defaultUtm.utm_source;
        payload.utm_medium = config.defaultUtm.utm_medium;
        payload.utm_campaign = config.defaultUtm.utm_campaign;
        payload.utm_content = config.defaultUtm.utm_content;
        payload.utm_term = config.defaultUtm.utm_term;
      }

      if (!clean(payload.utm_id)) {
        payload.utm_id = 'BTN_FORM_WEB';
      }

      try {
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeoutId = setTimeout(function () {
          if (controller) {
            controller.abort();
          }
        }, 10000);

        var requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        };

        if (controller) {
          requestOptions.signal = controller.signal;
        }

        var response = await fetch(config.submitUrl, requestOptions);
        clearTimeout(timeoutId);

        var responsePayload = null;
        try {
          responsePayload = await response.json();
        } catch (jsonError) {
          responsePayload = null;
        }

        if (!response.ok) {
          var apiError = responsePayload && (responsePayload.error || responsePayload.message);
          throw new Error(apiError || ('HTTP ' + response.status));
        }

        var crmForwarding = responsePayload && responsePayload.data ? responsePayload.data.crm_forwarding : null;
        if (crmForwarding && crmForwarding.ok === false && crmForwarding.skipped !== true) {
          var crmMsg = crmForwarding.response && (crmForwarding.response.msg || crmForwarding.response.message);
          throw new Error('No se pudo enviar al CRM: ' + (crmMsg || crmForwarding.error || 'crm_forward_failed'));
        }

        status.className = 'dm-lead-status ok';
        status.textContent = config.successMessage;

        pushTrackingEvent('FORM_WEB_STEPPER_SUBMIT_SUCCESS', payload, 'FORM_WEB_STEPPER');
        form.reset();
        maxUnlockedStep = 1;
        setStep(1);
        updateCountryUI();
      } catch (error) {
        status.className = 'dm-lead-status error';
        status.textContent = 'No se pudo enviar. Intenta nuevamente.';
      }
    });
  }

  function mountWidget() {
    injectStyles();
    var config = getScriptConfig();
    var utm = extractUtm();
    var host = document.createElement('div');
    host.className = 'dm-widget-host';

    var slotKey = clean((scriptEl && scriptEl.id) || ((scriptEl && scriptEl.getAttribute('data-widget-slot')) || config.variant || 'stepper'))
      .replace(/[^a-zA-Z0-9_-]/g, '') || 'stepper';
    host.setAttribute('data-dm-slot', slotKey);
    host.innerHTML = config.variant === 'wa' ? buildWhatsappForm(config) : buildStepperForm(config);

    if (scriptEl && scriptEl.parentNode) {
      var previousHosts = scriptEl.parentNode.querySelectorAll('.dm-widget-host[data-dm-slot="' + slotKey + '"]');
      previousHosts.forEach(function (node) {
        if (node && node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
      scriptEl.parentNode.insertBefore(host, scriptEl.nextSibling);
    } else {
      document.body.appendChild(host);
    }

    attachBehaviour(host, config, utm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
  } else {
    mountWidget();
  }
})();
