<?php
$utm_source = $_GET['utm_source'] ?? 'web';
$link = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];

if (!function_exists('obtenerFechaInauguracion')) {
    function obtenerFechaInauguracion($nombre) {
        $url = "https://webservices.uees.edu.ec/CRM_Admin/index.php?action=get_inauguracion_by_name&nombre=" . urlencode($nombre);

        $response = false;
        $httpCode = 0;

        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $response = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
        } else {
            $response = @file_get_contents($url);
            $httpCode = $response !== false ? 200 : 0;
        }

        if ($httpCode !== 200 || !$response) {
            return '';
        }

        $data = json_decode($response, true);

        if (isset($data['success']) && $data['success'] === true) {
            return $data['fecha_formateada'] ?? '';
        }

        return '';
    }
}

// Definir los posibles valores para las rutas
$pages = [
    '/' => 'Inicio',
    '/index.php' => 'Inicio',
    '/carreras-de-grado.php' => 'Carreras de grado',
    '/validacion-de-trayectorias-profesionales.php' => 'Validación de trayectorias profesionales',
    '/validacion-de-conocimientos.php' => 'Validación de conocimientos',
    '/permeabilidad.php' => 'Permeabilidad',
    '/requisitos-por-permeabilidad-de-tercer-nivel.php' => 'Requisitos por permeabilidad',
    '/programas-validaciones.php' => 'Profesionalízate',
];

$route_carreras = [
    'administracion-de-empresas-online' => 'Administración de empresas',
    'ciencias-de-la-computacion-online' => 'Ciencias de la computación',
    'comercio-exterior-online' => 'Comercio Exterior',
    'comunicacion-online' => 'Comunicación',
    'contabilidad-y-auditoria-online' => 'Contabilidad y auditoría',
    'derecho-online' => 'Derecho',
    'educacion-online' => 'Educación',
    'finanzas-online' => 'Finanzas',
    'marketing-online' => 'Marketing',
    'psicologia-online' => 'Psicología',
    'turismo-online' => 'Turismo',
    'seguridad-ciudadana-y-ciencias-policiales' => 'Seguridad Ciudadana y Ciencias Policiales',
    'carreras-de-postgrado' => 'Carreras de postgrados',
    'educacion' => 'Escuela de Postgrados en Educación',
    'postgrado-derecho' => 'Escuela de Postgrado en Derecho',
    'esai' => 'ESAI Business School',
    'maestria-en-administracion-publica' => 'Maestría en administración pública',
    'maestria-en-auditoria-integral-y-gestion-empresarial' => 'Maestría en auditoría integral y gestión-empresarial',
    'maestria-en-banca-y-gestion-de-mercados-financieros' => 'Maestría en banca y gestión de mercados financieros',
    'maestria-en-gestion-comercial-y-relaciones-con-los-clientes' => 'Maestría en gestión comercial y relaciones con los clientes',
    'maestria-en-gestion-de-la-calidad' => 'Maestría en gestión de la calidad',
    'maestria-en-gestion-de-proyectos' => 'Maestría en gestión de proyectos',
    'maestria-en-gestion-educativa' => 'Maestría en gestión educativa',
    'maestria-en-gestion-financiera-y-riesgo' => 'Maestría en gestión financiera y riesgo',
    'maestria-en-gestion-y-operacion-de-la-cadena-de-suministro' => 'Maestría en gestión y operación de la cadena de suministro',
    'maestria-en-inteligencia-de-negocios-y-ciencia-de-datos' => 'Maestría en inteligencia de negocios y ciencia de datos',
    'maestria-en-management-estrategico' => 'Maestría en management estratégico',
    'maestria-en-marketing-digital' => 'Maestría en marketing digital',
    'maestria-en-seguridad-y-salud-ocupacional' => 'Maestría en seguridad y salud ocupacional',
    'maestria-en-derecho-constitucional' => 'Maestría en derecho constitucional',
    'maestria-en-derecho-penal' => 'Maestría en derecho penal',
    'maestria-en-derecho-procesal' => 'Maestría en derecho procesal',
    'maestria-en-criminalistica-y-ciencias-forenses' => 'Maestría en Criminalística y ciencias Forenses',
    'maestria-en-derecho-ambiental' => 'Maestría en Derecho Ambiental Con Mención En Sostenibilidad',
    'maestria-en-derecho-administrativo-mencion-contratacion-publica' => 'Maestría en Derecho Administrativo Con Mención En Contratación Pública',
    'maestria-en-direccion-de-empresas-con-mencion-en-gestion-de-empresas-de-servicios' => 'Maestría en Dirección de Empresas con Mención en Gestión de Empresas de Servicios',
    'maestria-en-gerencia-en-servicios-de-salud' => 'Maestría en Gerencia en Servicios de la Salud',
    'maestria-en-derecho-con-mencion-en-magistratura-y-derecho-judicial' => 'Maestría en Derecho con Mención en Magistratura y Derecho Judicial',
    'maestria-en-comercio-electronico-y-logistica' => 'Maestría en Comercio Electrónico y Logística',
    'maestria-en-contabilidad-y-auditoria-con-mencion-en-gestion-tributaria' => 'Maestría en Contabilidad y Auditoría con mención en Gestión Tributaria',
    'maestria-en-liderazgo-y-emprendimiento-educativo' => 'Maestría en Liderazgo y Emprendimiento Educativo',
    'maestria-en-inteligencia-artificial' => 'Maestría en Inteligencia Artificial',
    'maestria-en-neuromarketing' => 'Maestría en Neuromarketing',
    'maestria-en-comunicacion-marketing-y-negocios' => 'Maestría en Comunicación, Marketing y negocios',
    'maestria-en-gestion-de-la-seguridad-privada' => 'Maestría en Gestión de la seguridad privada',
];

$page = $pages[$_SERVER['REQUEST_URI']] ?? '';

$route = explode("/", trim($_SERVER["REQUEST_URI"], "/"));
if (count($route) == 2) {
    $route_carrera = $route[1];
    if (isset($route_carreras[$route_carrera])) {
        $page = $route_carreras[$route_carrera];
    }
}

function redirigirSiEsColombia() {
    // Obtener la IP del cliente
    $ip = $_SERVER['REMOTE_ADDR'];

    // URL de la API para obtener la información de la IP
    $url = "https://ipinfo.io/{$ip}/json";

    // Realizar la solicitud a la API
    $json = file_get_contents($url);
    $details = json_decode($json, true); // Decodificar la respuesta en un array

    // Verificar si la ubicación es Colombia
    if (isset($details['country']) && $details['country'] == 'CO') {
        // Redirigir a la página de Colombia
        header("Location: https://uees.edu.ec/colombia/");
        exit(); // Terminar la ejecución del script después de redirigir
    }
}

// Llamar a la función al inicio del script
//redirigirSiEsColombia();

?>

<!DOCTYPE html>
<html lang="es-EC" class="no-js">
    <head>
        <title><?php echo $page ?> UEES ONLINE - Universidad Espíritu Santo</title>
        <meta name="description" content="La UEES es una institución de educación superior que ofrece una oferta académica internacional sin salir del Ecuador." />
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index,follow" />
        <meta name="googlebot" content="index, follow" />
        <meta name="distribution" content="global" />
        <meta name="author" content="UEES ONLINE - Universidad Espíritu Santo" />
        <meta name="geo.region" content="EC-G" />
        <meta name="geo.position" content="-2.01536;-79.734065" />
        <meta name="geo.placename" content="Samborondón" />
        <link rel="canonical" href="https://online.uees.edu.ec/" />
        <meta
            name="keywords"
            content="uees online, uees en linea, Universidad Espíritu Santo, uees blackboard,uees aula virtual,uees correo,uees ecuador,uees en linea,uees guayaquil,uees homologacion,uees inscripciones,uees maestrias,uees maestrias en linea, uees maestrias online,uees mesa de ayuda,uees online pregrado,uees online grado, uees online postgrado, uees online posgrado,uees portal estudiante,universidad uees maestrias online, universidad uees maestrias en linea, universidad a distancia, estudiar a distancia, validar estudios,<?php echo $page ?>"
        />
        <meta property="og:locale" content="es_ES" />
        <meta property="og:type" content="Web" />
        <meta property="og:title" content="<?php echo $page ?> - UEES ONLINE - Universidad Espíritu Santo" />
        <meta property="og:description" content="La UEES modalidad En Línea ofrece formación universitaria de grado y postgrado con estándares de calidad con apoyo de las mejores tecnologías de información y comunicación." />
        <meta property="og:url" content="https://online.uees.edu.ec/" />
        <meta property="og:site_name" content="UEES ONLINE- Universidad Espíritu Santo" />
        <meta property="og:image" content="https://online.uees.edu.ec/images/logo-redes.jpg" />
        <meta property="og:image:url" content="https://online.uees.edu.ec/images/logo-redes.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="300" />
        <meta property="og:image:height" content="300" />
        <meta property="og:locality" content="Samborondón" />
        <meta property="og:country-name" content="Ecuador" />
 
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="UEES ONLINE - Universidad Espíritu Santo" />
        <meta name="twitter:description" content="La UEES modalidad En Línea ofrece formación universitaria de grado y postgrado con estándares de calidad con apoyo de las mejores tecnologías de información y comunicación." />
        <meta name="twitter:image" content="https://online.uees.edu.ec/images/logo-redes.jpg" />
        <meta name="twitter:site" content="@uees_online" />

        <link rel="stylesheet" href="<?php echo $link; ?>/plugins/goodlayers-core/plugins/combine/style.css" type="text/css" media="all" />
        <link rel="stylesheet" href="<?php echo $link; ?>/plugins/goodlayers-core/include/css/page-builder.css" type="text/css" media="all" defer />
        <link rel="stylesheet" href="<?php echo $link; ?>/plugins/revslider/public/assets/css/settings.css" type="text/css" media="all" />
        <link rel="stylesheet" href="<?php echo $link; ?>/css/style-core.css" type="text/css" media="all" defer />
        <link rel="stylesheet" href="<?php echo $link; ?>/css/kingster-style-custom.css" type="text/css" media="all" defer />
        <link rel="shortcut icon" href="<?php echo $link; ?>/images/favicon.ico" type="image/x-icon" />
        <link rel="icon" href="<?php echo $link; ?>/images/favicon.ico" type="image/x-icon" />

       
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" referrerpolicy="no-referrer" />


        <link href="https://fonts.googleapis.com/css?family=Playfair+Display:700%2C400" rel="stylesheet" property="stylesheet" type="text/css" media="all" defer />
        <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Poppins%3A100%2C100italic%2C200%2C200italic%2C300%2C300italic%2Cregular%2Citalic%2C500%2C500italic%2C600%2C600italic%2C700%2C700italic%2C800%2C800italic%2C900%2C900italic%7CABeeZee%3Aregular%2Citalic&amp;subset=latin%2Clatin-ext%2Cdevanagari&amp;ver=5.0.3"
            type="text/css"
            media="all"
        />
        <style>
    .modal {
        display: none;
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
    }

    .modal-contenido {
        background-color: #fefefe;
        margin: 10% auto; /* Centrado vertical y horizontal */
        padding: 20px;
        border: 1px solid #888;
        width: 90%;          /* Más responsivo */
        max-width: 500px;    /* Más pequeño */
        border-radius: 8px;  /* Opcional: bordes redondeados */
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); /* Mejor visibilidad */
    }

    .modal-imagen {
        width: 100%;
        height: auto;
        max-width: 100%;
    }

    .cerrar {
        color: #aaa;
        float: right;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
    }

    .cerrar:hover,
    .cerrar:focus {
        color: black;
        text-decoration: none;
    }
</style>


<script>
document.addEventListener('DOMContentLoaded', function () {
  if (window.__UEES_UTM_BRIDGE_LOADED__) {
    return;
  }
  window.__UEES_UTM_BRIDGE_LOADED__ = true;

  var UTM_TTL_MINUTES = 120;
  var STORAGE_KEYS = {
    utm_source: 'utm_source',
    utm_campaign: 'utm_campaign',
    utm_id: 'utm_id',
    utm_term: 'utm_term',
    utm_medium: 'utm_medium',
    utm_content: 'utm_content',
    referrer_full: 'referrer_full',
    referrer_clean: 'referrer_clean'
  };

  var utmParams = ['utm_source', 'utm_campaign', 'utm_id', 'utm_term', 'utm_medium', 'utm_content'];
  var referrerParams = ['referrer_full', 'referrer_clean'];

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function getDefaultCampaignByPath() {
    var path = clean(window.location.pathname).toLowerCase();

    if (path.indexOf('/postgrado/') >= 0) {
      return 'UEES_POSTGRADO_EC';
    }

    if (path.indexOf('/grado/') >= 0) {
      return 'UEES_GRADO_EC';
    }

    return 'UEES_GRADO_EC';
  }

  function buildQueryParamMap() {
    var map = {};

    function addFromQueryString(queryString) {
      if (!queryString) {
        return;
      }

      var qs = queryString.charAt(0) === '?' ? queryString.slice(1) : queryString;
      if (!qs) {
        return;
      }

      var params = new URLSearchParams(qs);
      params.forEach(function (value, key) {
        var normalizedKey = clean(key).toLowerCase();
        if (!normalizedKey) {
          return;
        }
        map[normalizedKey] = clean(value);
      });
    }

    addFromQueryString(window.location.search || '');

    var hash = window.location.hash || '';
    var hashQueryStart = hash.indexOf('?');
    if (hashQueryStart >= 0) {
      addFromQueryString(hash.slice(hashQueryStart + 1));
    }

    return map;
  }

  function buildReferrerQueryParamMap() {
    var map = {};
    var ref = clean(document.referrer || '');
    if (!ref) {
      return map;
    }

    var refUrl;
    try {
      refUrl = new URL(ref);
    } catch (error) {
      return map;
    }

    refUrl.searchParams.forEach(function (value, key) {
      var normalizedKey = clean(key).toLowerCase();
      if (!normalizedKey) {
        return;
      }
      map[normalizedKey] = clean(value);
    });

    return map;
  }

  function getParameterByName(name, queryMap) {
    var key = clean(name).toLowerCase();
    if (!key) {
      return '';
    }
    if (Object.prototype.hasOwnProperty.call(queryMap, key)) {
      return clean(queryMap[key]);
    }
    return '';
  }

  function setItemWithExpiration(key, value, expirationInMinutes) {
    try {
      var now = new Date();
      var expirationTime = now.getTime() + expirationInMinutes * 60000;
      var item = {
        value: clean(value),
        expiration: expirationTime
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      // no-op
    }
  }

  function getItemWithExpiration(key) {
    var itemStr;
    try {
      itemStr = localStorage.getItem(key);
    } catch (error) {
      return null;
    }

    if (!itemStr) {
      return null;
    }

    var item;
    try {
      item = JSON.parse(itemStr);
    } catch (parseError) {
      var fallbackRaw = clean(itemStr);
      return fallbackRaw || null;
    }

    if (!item || typeof item !== 'object') {
      return null;
    }

    var now = new Date();
    if (!item.expiration || now.getTime() > item.expiration) {
      try {
        localStorage.removeItem(key);
      } catch (removeExpiredError) {
        // no-op
      }
      return null;
    }

    return clean(item.value);
  }

  var defaultValues = {
    utm_source: 'WEB',
    utm_campaign: getDefaultCampaignByPath(),
    utm_id: '',
    utm_term: '',
    utm_medium: '',
    utm_content: ''
  };

  var queryMap = buildQueryParamMap();
  var referrerQueryMap = buildReferrerQueryParamMap();
  var utmValues = {};

  utmParams.forEach(function (param) {
    var urlValue = getParameterByName(param, queryMap);
    var referrerValue = getParameterByName(param, referrerQueryMap);
    var storedValue = getItemWithExpiration(STORAGE_KEYS[param]);

    if (urlValue) {
      utmValues[param] = urlValue;
    } else if (referrerValue) {
      utmValues[param] = referrerValue;
    } else if (storedValue) {
      utmValues[param] = storedValue;
    } else {
      utmValues[param] = defaultValues[param];
    }

    setItemWithExpiration(STORAGE_KEYS[param], utmValues[param], UTM_TTL_MINUTES);
  });

  var refValues = {
    referrer_full: clean(getParameterByName('referrer_full', queryMap)),
    referrer_clean: clean(getParameterByName('referrer_clean', queryMap))
  };

  if (!refValues.referrer_full) {
    refValues.referrer_full = clean(document.referrer || '');
  }

  if (!refValues.referrer_clean && refValues.referrer_full) {
    try {
      var parsedRef = new URL(refValues.referrer_full);
      refValues.referrer_clean = parsedRef.protocol + '//' + parsedRef.hostname + parsedRef.pathname;
    } catch (error) {
      refValues.referrer_clean = '';
    }
  }

  referrerParams.forEach(function (key) {
    if (!refValues[key]) {
      var stored = getItemWithExpiration(STORAGE_KEYS[key]);
      if (stored) {
        refValues[key] = stored;
      }
    }

    if (refValues[key]) {
      setItemWithExpiration(STORAGE_KEYS[key], refValues[key], UTM_TTL_MINUTES);
    }
  });

  function publishPersistedUtmToDataLayer() {
    window.dataLayer = window.dataLayer || [];

    var payload = {
      event: 'uees_utm_ready',
      utm_source: clean(utmValues.utm_source || ''),
      utm_medium: clean(utmValues.utm_medium || ''),
      utm_campaign: clean(utmValues.utm_campaign || ''),
      utm_content: clean(utmValues.utm_content || ''),
      utm_term: clean(utmValues.utm_term || ''),
      utm_id: clean(utmValues.utm_id || ''),
      referrer_full: clean(refValues.referrer_full || ''),
      referrer_clean: clean(refValues.referrer_clean || '')
    };

    var dedupeKey = [
      'uees_utm_ready_sent',
      clean(window.location.pathname || '').toLowerCase(),
      clean(payload.utm_campaign || '').toLowerCase(),
      clean(payload.utm_source || '').toLowerCase()
    ].join('__');

    try {
      if (sessionStorage.getItem(dedupeKey) === '1') {
        window.__UEES_PERSISTED_UTM__ = payload;
        return;
      }
      sessionStorage.setItem(dedupeKey, '1');
    } catch (error) {
      // no-op
    }

    window.__UEES_PERSISTED_UTM__ = payload;
    window.dataLayer.push(payload);
  }

  function isThankYouPath(pathname) {
    var path = clean(pathname || '').toLowerCase();
    if (!path) {
      return false;
    }

    var normalized = path.replace(/\/+$/, '');
    if (!normalized) {
      return false;
    }

    if (normalized === '/gracias' || normalized.endsWith('/gracias')) {
      return true;
    }

    var segments = normalized.split('/').filter(Boolean);
    if (!segments.length) {
      return false;
    }

    var last = segments[segments.length - 1];
    if (last.endsWith('.php')) {
      last = last.slice(0, -4);
    }

    return last === 'gracias' || last.endsWith('-gracias');
  }

  function publishThankYouEvent() {
    var pagePath = clean(window.location.pathname || '').toLowerCase();

    if (!isThankYouPath(pagePath)) {
      return;
    }

    window.dataLayer = window.dataLayer || [];

    var successEvent = 'uees_thank_you_view';
    if (pagePath.indexOf('/postgrado/') >= 0) {
      successEvent = 'postgrado_success';
    } else if (pagePath.indexOf('/grado/') >= 0) {
      successEvent = 'grado_success';
    }

    var payload = {
      event: successEvent,
      page_path: clean(window.location.pathname || ''),
      utm_source: clean(utmValues.utm_source || ''),
      utm_medium: clean(utmValues.utm_medium || ''),
      utm_campaign: clean(utmValues.utm_campaign || ''),
      utm_content: clean(utmValues.utm_content || ''),
      utm_term: clean(utmValues.utm_term || ''),
      utm_id: clean(utmValues.utm_id || '')
    };

    var dedupeKey = [
      'uees_success_sent',
      successEvent,
      payload.page_path.toLowerCase(),
      clean(payload.utm_campaign || '').toLowerCase()
    ].join('__');

    try {
      if (sessionStorage.getItem(dedupeKey) === '1') {
        return;
      }
      sessionStorage.setItem(dedupeKey, '1');
    } catch (error) {
      // no-op
    }

    window.dataLayer.push(payload);

    window.dataLayer.push({
      event: 'uees_thank_you_view',
      page_path: payload.page_path,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      utm_content: payload.utm_content,
      utm_term: payload.utm_term,
      utm_id: payload.utm_id,
      success_event: successEvent
    });
  }

  publishPersistedUtmToDataLayer();
  publishThankYouEvent();

  function findTargetIframes() {
    var selectors = [
      '#form-params-dinamic',
      'iframe[src*="webservices.uees.edu.ec/formularios"]',
      'iframe[src*="/formularios/v2/"]',
      'div[id^="form-"] iframe[src*="formularios"]'
    ];

    var list = [];
    var seen = [];

    selectors.forEach(function (selector) {
      var nodes = document.querySelectorAll(selector);
      nodes.forEach(function (node) {
        if (node && node.tagName && node.tagName.toLowerCase() === 'iframe' && seen.indexOf(node) === -1) {
          seen.push(node);
          list.push(node);
        }
      });
    });

    return list;
  }

  function patchIframeSrc(iframe) {
    if (!iframe) {
      return false;
    }

    var currentSrc = clean(iframe.getAttribute('src') || '');
    if (!currentSrc) {
      return false;
    }

    var url;
    try {
      url = new URL(currentSrc, window.location.origin);
    } catch (error) {
      return false;
    }

    utmParams.forEach(function (param) {
      url.searchParams.set(param, clean(utmValues[param] || ''));
    });

    referrerParams.forEach(function (param) {
      if (refValues[param]) {
        url.searchParams.set(param, clean(refValues[param]));
      }
    });

    var nextSrc = url.toString();
    if (nextSrc !== currentSrc) {
      iframe.setAttribute('src', nextSrc);
      return true;
    }

    return false;
  }

  function buildUtmPayload() {
    var payload = { type: 'utm_params' };

    utmParams.forEach(function (key) {
      payload[key] = clean(utmValues[key] || '');
    });

    referrerParams.forEach(function (key) {
      payload[key] = clean(refValues[key] || '');
    });

    return payload;
  }

  function attachPostMessageBridge(iframe) {
    if (!iframe || iframe.dataset.utmBridgeBound === '1') {
      return;
    }

    iframe.dataset.utmBridgeBound = '1';
    iframe.addEventListener('load', function () {
      try {
        iframe.contentWindow.postMessage(buildUtmPayload(), 'https://webservices.uees.edu.ec');
      } catch (error) {
        // no-op
      }
    });
  }

  function runInjection() {
    var iframes = findTargetIframes();
    if (!iframes.length) {
      return;
    }

    iframes.forEach(function (iframe) {
      patchIframeSrc(iframe);
      attachPostMessageBridge(iframe);
    });
  }

  runInjection();

  var observer = new MutationObserver(function () {
    runInjection();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  var retries = 0;
  var maxRetries = 20;
  var interval = setInterval(function () {
    retries += 1;
    runInjection();

    if (retries >= maxRetries) {
      clearInterval(interval);
    }
  }, 500);
});

</script>

        <!-- Google Tag Manager add UEES-->
        <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-5GN4JXQG');</script>
        <!-- End Google Tag Manager add UEES-->


        <!-- Google Tag Manager Add Dots-->
        <script defer>
            (function (w, d, s, l, i) {
                w[l] = w[l] || [];
                w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
                var f = d.getElementsByTagName(s)[0],
                    j = d.createElement(s),
                    dl = l != "dataLayer" ? "&l=" + l : "";
                j.async = true;
                j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
                f.parentNode.insertBefore(j, f);
            })(window, document, "script", "dataLayer", "GTM-TCVVF6M");
        </script>
        <!-- End Google Tag Manager Add Dots-->

    
         <!-- Meta Pixel Code UEES-->
        <script>
            !(function (f, b, e, v, n, t, s) {
                if (f.fbq) return;
                n = f.fbq = function () {
                    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
                };
                if (!f._fbq) f._fbq = n;
                n.push = n;
                n.loaded = !0;
                n.version = "2.0";
                n.queue = [];
                t = b.createElement(e);
                t.async = !0;
                t.src = v;
                s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s);
            })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
            fbq("init", "1646320559051749");
            fbq("track", "PageView");
        </script>
        <noscript><img height="1" width="1" style="display: none;" src="https://www.facebook.com/tr?id=1646320559051749&ev=PageView&noscript=1" /></noscript>
        <!-- End Meta Pixel Code -->

        <!-- tik tok pixel UEES -->
        <script>
            !(function (w, d, t) {
                w.TiktokAnalyticsObject = t;
                var ttq = (w[t] = w[t] || []);
                (ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"]),
                    (ttq.setAndDefer = function (t, e) {
                        t[e] = function () {
                            t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
                        };
                    });
                for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
                (ttq.instance = function (t) {
                    for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
                    return e;
                }),
                    (ttq.load = function (e, n) {
                        var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
                        (ttq._i = ttq._i || {}), (ttq._i[e] = []), (ttq._i[e]._u = i), (ttq._t = ttq._t || {}), (ttq._t[e] = +new Date()), (ttq._o = ttq._o || {}), (ttq._o[e] = n || {});
                        var o = document.createElement("script");
                        (o.type = "text/javascript"), (o.async = !0), (o.src = i + "?sdkid=" + e + "&lib=" + t);
                        var a = document.getElementsByTagName("script")[0];
                        a.parentNode.insertBefore(o, a);
                    });

                ttq.load("CNJKK53C77U697LMHUR0");
                ttq.page();
            })(window, document, "ttq");
        </script>
        <!-- End Tik tok pixel -->


        <!-- Global site tag (gtag.js) - Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-DYZDH2YNK7"></script>
        <script defer>
            window.dataLayer = window.dataLayer || [];
            function gtag() {
                dataLayer.push(arguments);
            }
            gtag("js", new Date());

            gtag("config", "G-DYZDH2YNK7");
        </script>
        <!-- Global site tag (gtag.js) - Google Analytics -->


        <script type="text/javascript">
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "on70elkgx9");
        </script>
        <script type="application/ld+json">
            {
                "@context": "http://schema.org",
                "@type": "Organization",
                "name": "Universidad Espíritu Santo Online",
                "url": "https://online.uees.edu.ec/",
                "address": "Samborondón, Ecuador",
                "sameAs": ["https://www.facebook.com/UEESOnline", "https://www.instagram.com/uees_online/", "https://www.linkedin.com/company/uees-on-line/"]
            }
        </script>
    </head>
</html>
<!-- Google Tag Manager (noscript) add UEES-->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5GN4JXQG"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) add UEES-->
