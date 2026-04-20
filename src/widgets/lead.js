(function () {
  var scriptEl = document.currentScript;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function upper(value) {
    return clean(value).toUpperCase();
  }

  function getScriptConfig() {
    var dataset = (scriptEl && scriptEl.dataset) || {};
    var src = scriptEl && scriptEl.src ? new URL(scriptEl.src, window.location.href) : new URL(window.location.href);
    var baseUrl = dataset.baseUrl ? clean(dataset.baseUrl) : src.origin;
    var platform = clean(dataset.platform || dataset.source || 'web').toUpperCase();

    return {
      variant: clean(dataset.variant || 'full').toLowerCase(),
      programa: clean(dataset.programa || dataset.program || 'Programa General'),
      submitUrl: clean(dataset.submitUrl || (baseUrl + '/widgets/lead/submit')),
      platform: platform || 'WEB',
      whatsappNumber: clean(dataset.whatsapp || ''),
      successMessage: clean(dataset.successMessage || 'Enviado correctamente')
    };
  }

  function extractUtm() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: clean(params.get('utm_source')),
      utm_medium: clean(params.get('utm_medium')),
      utm_campaign: clean(params.get('utm_campaign')),
      utm_content: clean(params.get('utm_content')),
      utm_term: clean(params.get('utm_term'))
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
      clean(utm.utm_term)
    );
  }

  function injectStyles() {
    if (document.getElementById('dm-lead-widget-style')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'dm-lead-widget-style';
    style.textContent = '' +
      '.dm-widget-host .dm-lead-widget{font-family:Verdana,sans-serif;color:#101828;width:100%;max-width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:14px;background:#fff;box-shadow:0 10px 24px rgba(16,24,40,.08);padding:32px;}' +
      '.dm-widget-host .dm-lead-widget h2{margin:0 0 10px;font-size:38px;line-height:1.1;font-weight:800;}' +
      '.dm-widget-host .dm-lead-widget p{margin:0 0 14px;font-size:16px;line-height:1.45;color:#667085;}' +
      '.dm-widget-host .dm-lead-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
      '.dm-widget-host .dm-lead-grid .full{grid-column:1/-1;}' +
      '.dm-widget-host .dm-lead-widget label{display:block;font-size:12px;font-weight:700;margin-bottom:4px;}' +
      '.dm-widget-host .dm-lead-widget input,.dm-widget-host .dm-lead-widget select{width:100%;padding:10px;border:1px solid #d0d5dd;border-radius:10px;font-size:14px;box-sizing:border-box;}' +
      '.dm-widget-host .dm-lead-actions{display:flex;gap:8px;margin-top:12px;}' +
      '.dm-widget-host .dm-lead-btn,.dm-widget-host .dm-wa-open{border:0;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;appearance:none;-webkit-appearance:none;transition:background .18s ease,transform .08s ease,box-shadow .18s ease;}' +
      '.dm-widget-host .dm-lead-btn{background:#821436;color:#fff;}' +
      '.dm-widget-host .dm-lead-btn:hover{background:#6e112e;}' +
      '.dm-widget-host .dm-lead-btn:active{background:#580d25;transform:translateY(1px);}' +
      '.dm-widget-host .dm-lead-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(130,20,54,.28);}' +
      '.dm-widget-host .dm-wa-open{border-radius:999px;padding:12px 16px;background:#25D366;color:#fff;}' +
      '.dm-widget-host .dm-wa-open:hover{background:#22c55e;}' +
      '.dm-widget-host .dm-wa-open:active{background:#1e9e53;transform:translateY(1px);}' +
      '.dm-widget-host .dm-wa-open:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(37,211,102,.35);}' +
      '.dm-widget-host .dm-wa-open.is-open{width:44px;height:44px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:24px;line-height:1;}' +
      '.dm-widget-host .dm-lead-status{font-size:13px;font-weight:700;margin-top:10px;min-height:18px;}' +
      '.dm-widget-host .dm-lead-status.error{color:#b42318;}' +
      '.dm-widget-host .dm-lead-status.ok{color:#067647;}' +
      '.dm-widget-host .dm-wa-float{position:fixed;right:18px;bottom:18px;z-index:99999;}' +
      '.dm-widget-host .dm-wa-card{display:none;width:min(360px,92vw);margin-top:10px;border:1px solid #d0d5dd;border-radius:14px;background:#fff;box-shadow:0 10px 24px rgba(16,24,40,.08);padding:14px;}' +
      '.dm-widget-host .dm-wa-form h4{margin:2px 0 12px;font-size:18px;line-height:1.2;color:#101828;}' +
      '.dm-widget-host .dm-wa-form input{width:100%;margin:0 0 10px;padding:10px 12px;border:1px solid #d0d5dd;border-radius:10px;font-size:14px;box-sizing:border-box;}' +
      '.dm-widget-host .dm-wa-actions{margin-top:4px;}' +
      '.dm-widget-host .dm-wa-actions .dm-lead-btn{width:100%;display:block;}' +
      '.dm-widget-host .dm-wa-success{display:none;text-align:center;padding:18px 10px;color:#067647;font-weight:700;}' +
      '@media (max-width:640px){.dm-widget-host .dm-lead-grid{grid-template-columns:1fr;}.dm-widget-host .dm-lead-widget h2{font-size:32px;}}';

    document.head.appendChild(style);
  }

  function buildFullForm(config) {
    return '' +
      '<div class="dm-lead-widget">' +
      '  <form class="dm-lead-form" novalidate>' +
    '    <h2>Solicita información</h2>' +
    '    <p>Déjanos tus datos y te contactaremos con el plan de estudios, costos y próximos inicios.</p>' +
      '    <div class="dm-lead-grid">' +
      '      <div><label>Nombre</label><input name="nombre" required /></div>' +
      '      <div><label>Apellido</label><input name="apellido" required /></div>' +
      '      <div><label>Correo</label><input name="correo" type="email" required /></div>' +
      '      <div><label>Telefono</label><input name="celular" required /></div>' +
      '      <div class="full"><label>Cedula</label><input name="cedula" /></div>' +
      '      <div><label>Modalidad</label><input name="modalidad" value="Online" /></div>' +
      '      <div><label>Nivel</label><input name="nivel" value="Grado" /></div>' +
      '      <div class="full"><label>Ciudad</label><input name="ciudad" /></div>' +
      '      <div><label>Mecanismo ingreso</label><select name="mecanismo"><option value="">Selecciona</option><option value="Carrera Completa">Carrera Completa</option><option value="Homologacion de estudios">Homologacion de estudios</option><option value="Validacion de conocimientos / estudios de mas de 10 años">Validacion de conocimientos / estudios de mas de 10 anos</option><option value="Validacion de ejercicio profesional">Validacion de ejercicio profesional</option></select></div>' +
      '      <div><label>Como te contactamos</label><select name="como_te_contactamos"><option value="">Selecciona</option><option value="whatsapp">WhatsApp</option><option value="llamada">Llamada</option><option value="correo">Correo</option></select></div>' +
      '      <div class="full"><label>Franja horaria</label><select name="franja_horaria"><option value="">Selecciona</option><option value="manana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option></select></div>' +
      '    </div>' +
      '    <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off" />' +
        '    <div class="dm-lead-actions"><button type="submit" class="dm-lead-btn">Enviar</button></div>' +
      '    <div class="dm-lead-status" aria-live="polite"></div>' +
      '  </form>' +
      '</div>';
  }

  function buildWhatsappForm(config) {
    return '' +
      '<div class="dm-wa-float">' +
      '  <button type="button" class="dm-wa-open">Chatear con un asesor</button>' +
      '  <div class="dm-wa-card">' +
      '    <form class="dm-wa-form" novalidate>' +
      '      <h4>Dejanos tus datos</h4>' +
      '      <input type="text" name="nombre" placeholder="Nombre" required />' +
      '      <input type="text" name="apellido" placeholder="Apellido" required />' +
      '      <input type="text" name="cedula" placeholder="Cedula" required />' +
      '      <input type="email" name="correo" placeholder="Correo" required />' +
      '      <input type="tel" name="telefono" placeholder="Telefono" required />' +
      '      <input type="hidden" name="modalidad" value="Online" />' +
      '      <input type="hidden" name="nivel" value="Grado" />' +
      '      <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off" />' +
      '      <div class="dm-wa-actions">' +
      '        <button type="submit" class="dm-lead-btn">Iniciar chat</button>' +
      '      </div>' +
      '      <div class="dm-lead-status" aria-live="polite"></div>' +
      '    </form>' +
      '    <div class="dm-wa-success">Gracias, en breve nos contactaremos contigo.</div>' +
      '  </div>' +
      '</div>';
  }

  function formDataToObject(formEl) {
    var fd = new FormData(formEl);
    var obj = {};
    fd.forEach(function (value, key) {
      obj[key] = clean(value);
    });
    return obj;
  }

  function createMessage(data) {
    return [
      'Hola, soy ' + (data.nombre || '') + ' ' + (data.apellido || ''),
      'Programa: ' + (data.programa || ''),
      'Cedula: ' + (data.cedula || ''),
      'Correo: ' + (data.correo || ''),
      'Telefono: ' + (data.celular || ''),
      'Modalidad: ' + (data.modalidad || ''),
      'Nivel: ' + (data.nivel || '')
    ].join('\n');
  }

  function attachBehaviour(root, config, utm) {
    var waBtn = root.querySelector('.dm-wa-open');
    var waCard = root.querySelector('.dm-wa-card');

    if (waBtn && waCard) {
      var waBtnLabel = waBtn.textContent || 'Chatear con un asesor';

      waBtn.addEventListener('click', function () {
        var isOpen = waCard.style.display !== 'block';
        waCard.style.display = isOpen ? 'block' : 'none';
        waBtn.classList.toggle('is-open', isOpen);
        waBtn.textContent = isOpen ? 'X' : waBtnLabel;
      });
    }

    var form = root.querySelector(config.variant === 'wa' ? '.dm-wa-form' : '.dm-lead-form');
    var status = root.querySelector('.dm-lead-status');
    var waSuccess = root.querySelector('.dm-wa-success');

    if (!form || !status) {
      return;
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      status.className = 'dm-lead-status';
      status.textContent = 'Enviando...';

      var data = formDataToObject(form);
      var leadPhone = data.celular || data.telefono || '';

      if (!data.nombre || !data.apellido || !data.correo || !leadPhone) {
        status.className = 'dm-lead-status error';
        status.textContent = 'Completa los campos obligatorios';
        return;
      }

      var immutableProgram = upper(config.programa || 'Programa General');

      var payload = {
        campaign_name: immutableProgram,
        platform: upper(config.platform || 'WEB'),
        event_type: config.variant === 'wa' ? 'FORM_WS' : 'FORM_WEB',
        form_name: config.variant === 'wa' ? 'FORM_WS' : 'FORM_WEB',
        page_url: window.location.href,
        thank_you_url: window.location.href,
        referrer: upper(document.referrer || ''),
        title: upper(document.title || ''),
        timestamp: new Date().toISOString(),
        nombre: upper(data.nombre),
        apellido: upper(data.apellido),
        correo: upper(data.correo),
        celular: upper(leadPhone),
        phone: upper(leadPhone),
        cedula: upper(data.cedula),
        modalidad: upper(data.modalidad),
        nivel: upper(data.nivel),
        ciudad: upper(data.ciudad),
        mecanismo: upper(data.mecanismo),
        como_te_contactamos: upper(data.como_te_contactamos),
        franja_horaria: upper(data.franja_horaria),
        programa: immutableProgram,
        website: upper(data.website || ''),
        utm_source: upper(utm.utm_source),
        utm_medium: upper(utm.utm_medium),
        utm_campaign: upper(utm.utm_campaign),
        utm_content: upper(utm.utm_content),
        utm_term: upper(utm.utm_term)
      };

      if (!hasAnyUtm(utm)) {
        payload.platform = 'GOOGLE';
        payload.utm_source = 'LANDING';
        payload.utm_medium = 'TRAFICO';
        payload.utm_campaign = 'GOOGLE_TRAFICO GRADO_ONLINE LANDING';
        payload.utm_content = 'GOOGLE_LANDING ADM_EMPRESAS';
        payload.utm_term = 'ADM_EMPRESAS';
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

        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        status.className = 'dm-lead-status ok';
        status.textContent = config.successMessage;

        if (config.variant === 'wa' && config.whatsappNumber) {
          var phone = config.whatsappNumber.replace(/\D/g, '');
          if (phone) {
            window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(createMessage(payload)), '_blank');
          }
        }

        if (config.variant === 'wa' && waSuccess) {
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

  function mountWidget() {
    injectStyles();

    var config = getScriptConfig();
    var utm = extractUtm();
    var host = document.createElement('div');
    host.className = 'dm-widget-host';

    if (config.variant === 'wa') {
      host.innerHTML = buildWhatsappForm(config);
    } else {
      host.innerHTML = buildFullForm(config);
    }

    if (scriptEl && scriptEl.parentNode) {
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
