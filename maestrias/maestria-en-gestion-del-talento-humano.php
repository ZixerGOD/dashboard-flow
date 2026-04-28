<?php 

function obtenerFechaInauguracion($nombre) {
    $url = "https://webservices.uees.edu.ec/CRM_Admin/index.php?action=get_inauguracion_by_name&nombre=" . urlencode($nombre);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 segundos máximo
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Úsalo si tienes problemas con SSL localmente
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // Si el código no es 200 o falla la petición, retornamos vacío
    if ($httpCode !== 200 || !$response) {
        return "";
    }

    $data = json_decode($response, true);
    
    // Verificamos si la API encontró el programa
    if (isset($data['success']) && $data['success'] === true) {
        return $data['fecha_formateada'];
    }

    return ""; // Retorna vacío si success es false
}



?>
<?php  include '../extended/header.php'; ?> 
<body class="home page-template-default page page-id-2039 gdlr-core-body woocommerce-no-js tribe-no-js kingster-body kingster-body-front kingster-full  kingster-with-sticky-navigation  kingster-blockquote-style-1 gdlr-core-link-to-lightbox">
   <?php  include '../extended/menu_mobile.php'; ?> 
   <div class="kingster-body-outer-wrapper ">
      <div class="kingster-body-wrapper clearfix  kingster-with-frame">
         <?php  include '../extended/top_bar.php'; ?> <?php  include '../extended/menu_home.php'; ?> 
         <div class="kingster-page-title-wrap  kingster-style-custom kingster-left-align" style="background-image: url(../images/carreras/maestria-en-gestion-del-talento-humano-top.jpg) ;">
            <div class="kingster-header-transparent-substitute"></div>
            <div class="kingster-page-title-overlay"></div>
            <div class="kingster-page-title-bottom-gradient"></div>
            <div class="kingster-page-title-container kingster-container">
               <div class="kingster-page-title-content kingster-item-pdlr" style="padding-top: 200px ;padding-bottom: 80px ;">
                  <div class="kingster-page-caption">Modalidad En L&iacute;nea</div>
                  <h1 class="kingster-page-title" style="text-transform: none ;">Maestr&iacute;a en Gesti&oacute;n del Talento Humano</h1>
               </div>
            </div>
         </div>
         <div class="kingster-page-wrapper" id="kingster-page-wrapper">
            <div class="gdlr-core-page-builder-body">
               <div class="gdlr-core-pbf-sidebar-wrapper " style="margin: 0px 0px 0px 0px;">
                  <div class="gdlr-core-pbf-sidebar-container gdlr-core-line-height-0 clearfix gdlr-core-js gdlr-core-container">
                     <div class="gdlr-core-pbf-sidebar-content  gdlr-core-column-40 gdlr-core-pbf-sidebar-padding gdlr-core-line-height gdlr-core-column-extend-left" style="padding: 35px 0px 20px 0px;">
                        <div class="gdlr-core-pbf-sidebar-content-inner" style="padding-top: 20px">   
                           <div class="gdlr-core-pbf-element" style="background-color:#800f34;">
                              <div class="gdlr-core-title-item gdlr-core-item-pdb clearfix  gdlr-core-center-align gdlr-core-title-item-caption-top gdlr-core-item-pdlr" style="padding-bottom: 15px; padding-top:15px;">
                                 <div class="gdlr-core-title-item-title-wrap clearfix">
                                    <h3 class="gdlr-core-title-item-title gdlr-core-skin-title " style="font-size: 26px ;font-weight: 600 ;letter-spacing: 0px ;text-transform: none ;color: #ffffff;margin-right: 30px;">Inauguración: <?php echo obtenerFechaInauguracion("Maestria en Gestion del Talento Humano Online");?></h3>                                    
                                 </div>
                              </div>
                           </div>                        
                           <div class="gdlr-core-pbf-element" style="padding-top: 30px;">
                              <div class="gdlr-core-title-item gdlr-core-item-pdb clearfix  gdlr-core-left-align gdlr-core-title-item-caption-top gdlr-core-item-pdlr" style="padding-bottom: 40px ;">
                                 <div class="gdlr-core-title-item-title-wrap clearfix">
                                    <h3 class="gdlr-core-title-item-title gdlr-core-skin-title " style="font-size: 30px ;font-weight: 600 ;letter-spacing: 0px ;text-transform: none ;color: #161616 ;margin-right: 30px ;">Dirigido a </h3>
                                    <div class="gdlr-core-title-item-divider gdlr-core-right gdlr-core-skin-divider" style="font-size: 22px ;border-bottom-width: 3px ;"></div>
                                 </div>
                              </div>
                           </div>
                           <div class="gdlr-core-pbf-element">
                              <div class="gdlr-core-text-box-item gdlr-core-item-pdlr gdlr-core-item-pdb gdlr-core-left-align">
                                 <div class="gdlr-core-text-box-item-content" style="font-size: 16px ;text-transform: none ;">
                                    <p>La Maestría en Gestión del Talento Humano está dirigida a profesionales de tercer nivel de grado
                                       (debidamente registrado en el Sistema Nacional de Información de Educación Superior del Ecuador
                                       (SNIESE)) preferentemente en el campo amplio de la Administración, Ciencias Sociales, con experiencia de
                                       al menos 1 año y a profesionales de otras áreas que deseen fortalecer sus conocimientos y habilidades en
                                       el campo de la gestión del talento humano.
                                    </p>
                                    <p><strong>Duraci&oacute;n De Programa:</strong> 12 Meses</p>
                                    <p><strong>Tutorías sincrónicas: </strong> Sábados o domingos de 08:30 - 13:00</p>
                                 </div>                                 
                              </div>
                           </div>
                           <div class=" gdlr-core-pbf-wrapper-container-inner gdlr-core-item-mglr clearfix">
                              <div class="gdlr-core-pbf-column gdlr-core-column-30 gdlr-core-column-first">
                                 <div class="gdlr-core-pbf-column-content-margin gdlr-core-js " style="padding: 10px 0px 0px 0px;">
                                    <div class="gdlr-core-pbf-background-wrap"></div>
                                    <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js ">
                                       <div class="gdlr-core-pbf-element">
                                          <div class="gdlr-core-column-service-item gdlr-core-item-pdb  gdlr-core-left-align gdlr-core-column-service-icon-left gdlr-core-with-caption gdlr-core-item-pdlr" style="padding-bottom: 30px;">
                                             <div class="gdlr-core-column-service-media gdlr-core-media-image"><img class="lazy loaded" src="https://www.uees.edu.ec/wp-content/uploads/2021/06/icono-grado.png" data-src="https://www.uees.edu.ec/wp-content/uploads/2021/06/icono-grado.png" alt="" width="45" height="45" title="Grado" data-was-processed="true"></div>
                                             <div class="gdlr-core-column-service-content-wrapper">
                                                <div class="gdlr-core-column-service-title-wrap">
                                                   <h3 class="gdlr-core-column-service-title gdlr-core-skin-title" style="font-size: 18px ;font-weight: 600 ;text-transform: none ;color: #161616">Título a obtener</h3>
                                                   <div class="gdlr-core-column-service-caption gdlr-core-info-font gdlr-core-skin-caption" style="font-size: 15px ;font-weight: 500 ;font-style: normal ;">Mag&iacute;ster en Gesti&oacute;n del Talento Humano</div>
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <div class="gdlr-core-pbf-column gdlr-core-column-30" id="gdlr-core-column-94849">
                                 <div class="gdlr-core-pbf-column-content-margin gdlr-core-js " style="margin: 0px 0px 0px 0px;padding: 10px 0px 0px 0px;">
                                    <div class="gdlr-core-pbf-background-wrap"></div>
                                    <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js ">
                                       <div class="gdlr-core-pbf-element">
                                          <div class="gdlr-core-column-service-item gdlr-core-item-pdb  gdlr-core-left-align gdlr-core-column-service-icon-left gdlr-core-with-caption gdlr-core-item-pdlr" style="padding-bottom: 30px;">
                                             <div class="gdlr-core-column-service-media gdlr-core-media-image"><img class="lazy loaded" src="https://www.uees.edu.ec/wp-content/uploads/2021/07/icono-resolucion.png" data-src="https://www.uees.edu.ec/wp-content/uploads/2021/07/icono-resolucion.png" alt="" width="45" height="45" title="icono-resolucion" data-was-processed="true"></div>
                                             <div class="gdlr-core-column-service-content-wrapper">
                                                <div class="gdlr-core-column-service-title-wrap">
                                                   <h3 class="gdlr-core-column-service-title gdlr-core-skin-title" style="font-size: 18px ;font-weight: 600 ;text-transform: none ;color: #161616">Modalidad En L&iacute;nea</h3>
                                                   <div class="gdlr-core-column-service-caption gdlr-core-info-font gdlr-core-skin-caption" style="font-size: 15px ;font-weight: 500 ;font-style: normal ;">RPC-SO-51-No.836-2022</div>
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <?php include 'banner_equivalencias.php' ?>
                        </div>
                     </div>
                     <div class="gdlr-core-pbf-sidebar-right gdlr-core-column-extend-right  kingster-sidebar-area gdlr-core-column-20 gdlr-core-pbf-sidebar-padding  gdlr-core-line-height" style="padding: 50px 0px 0px 0px;" id="formulario_pagina_web">
                        <div class="gdlr-core-sidebar-item gdlr-core-item-pdlr">
                           <div id="text-23" class="widget widget_text kingster-widget">
                              <div class="textwidget" style="box-shadow: 0 -6px 24px rgba(10, 10, 10,0.09); -moz-box-shadow: 0 -6px 24px rgba(10, 10, 10,0.09); -webkit-box-shadow: 0 -6px 24px rgba(10, 10, 10,0.09); background-color: #ffffff ;border-radius:  3px 3px ;-moz-border-radius:  3px 3px ;-webkit-border-radius:  3px 3px ;">
                                 <div class="gdlr-core-widget-box-shortcode " style="color: #821436 ;padding: 25px 5px;background-color: #ffffff ;">
                                    <div class="gdlr-core-widget-box-shortcode-content">
                                       <div class="gdlr-core-pbf-element">
                                          <div class="gdlr-core-title-item gdlr-core-item-pdb clearfix  gdlr-core-left-align gdlr-core-title-item-caption-top gdlr-core-item-pdlr" style="padding-bottom: 15px ;">
                                             <div class="gdlr-core-title-item-title-wrap clearfix">
                                                <h3 class="gdlr-core-title-item-title gdlr-core-skin-title " style="font-size: 24px ;font-weight: 600 ;letter-spacing: 0px ;text-transform: none ;color: #1a1a1a ;">Reciba más información</h3>
                                             </div>
                                          </div>
                                       </div>
                                       <div class="gdlr-core-pbf-element">
                                          <div id="form-82221"></div>
                                          <script src="https://webservices.uees.edu.ec/formularios/v2/form-embed.js" data-programa-id="822" data-nivel-id="2" data-modalidad-id="1" data-height="900" data-container="form-82221" defer></script>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            <div class="gdlr-core-pbf-wrapper " style="padding: 0px 0px 0px 0px;">
               <div class="gdlr-core-pbf-background-wrap" style="background-color: #f2f2f2 ;"></div>
               <div class="gdlr-core-pbf-wrapper-content gdlr-core-js ">
                  <div class="gdlr-core-pbf-wrapper-container clearfix gdlr-core-container">
                     <div class="gdlr-core-pbf-column gdlr-core-column-30 gdlr-core-column-first" id="gdlr-core-column-8638">
                        <div class="gdlr-core-pbf-column-content-margin gdlr-core-js  gdlr-core-column-extend-left" data-sync-height="height-2" style="height: 860.461px;">
                           <div class="gdlr-core-pbf-background-wrap">
                              <div class="gdlr-core-pbf-background gdlr-core-parallax gdlr-core-js" style="background-image: url(../images/carreras/maestria-en-gestion-del-talento-humano-01.jpg); background-size: cover; background-position: center center; height: 875.969px; transform: translate(0px, -43.5328px);" data-parallax-speed="0.2"></div>
                           </div>
                           <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js  gdlr-core-sync-height-content"></div>
                        </div>
                     </div>
                     <div class="gdlr-core-pbf-column gdlr-core-column-30">
                        <div class="gdlr-core-pbf-column-content-margin gdlr-core-js " style="padding: 100px 0px 50px 50px; height: 860.461px;" data-sync-height="height-2" data-sync-height-center="">
                           <div class="gdlr-core-pbf-background-wrap" style="background-color: #f2f2f2 ;"></div>
                           <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js  gdlr-core-sync-height-content">
                              <div class="gdlr-core-pbf-element">
                                 <div class="gdlr-core-title-item gdlr-core-item-pdb clearfix  gdlr-core-left-align gdlr-core-title-item-caption-bottom gdlr-core-item-pdlr" style="padding-bottom: 25px ;">
                                    <div class="gdlr-core-title-item-title-wrap clearfix">
                                       <h3 class="gdlr-core-title-item-title gdlr-core-skin-title " style="font-size: 30px ;font-weight: 600 ;letter-spacing: 0px ;text-transform: none ;">Objetivos</h3>
                                    </div>
                                 </div>
                              </div>
                              <div class="gdlr-core-pbf-element">
                                 <div class="gdlr-core-text-box-item gdlr-core-item-pdlr gdlr-core-item-pdb gdlr-core-left-align">
                                    <div class="gdlr-core-text-box-item-content" style="font-size: 17px ;text-transform: none ;">
                                       <p>La Maestría en Gestión del Talento Humano tiene como objetivo formar profesionales con pensamiento
                                            estratégico y visión sistémica, capaces de dirigir y gestionar el talento humano de la organización en
                                            forma coherente, aplicando las prácticas de alto rendimiento, promoviendo la investigación, el trabajo en
                                            equipo, la ética y la responsabilidad social de sus colaboradores, con el apoyo de las nuevas tecnologías
                                            de información y la comunicación.
                                       </p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            <div class="gdlr-core-pbf-wrapper " style="padding: 0px 0px 0px 0px;">
               <div class="gdlr-core-pbf-background-wrap" style="background-color: #f2f2f2 ;"></div>
               <div class="gdlr-core-pbf-wrapper-content gdlr-core-js ">
                  <div class="gdlr-core-pbf-wrapper-container clearfix gdlr-core-container">
                     <div class="gdlr-core-pbf-column gdlr-core-column-30 gdlr-core-column-first">
                        <div class="gdlr-core-pbf-column-content-margin gdlr-core-js " style="padding: 100px 40px 50px 10px; height: 653.976px;" data-sync-height="height-1" data-sync-height-center="">
                           <div class="gdlr-core-sync-height-pre-spaces" style="padding-top: 53.75px;"></div>
                           <div class="gdlr-core-pbf-background-wrap" style="background-color: #f2f2f2 ;"></div>
                           <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js  gdlr-core-sync-height-content">
                              <div class="gdlr-core-pbf-element">
                                 <div class="gdlr-core-title-item gdlr-core-item-pdb clearfix  gdlr-core-left-align gdlr-core-title-item-caption-bottom gdlr-core-item-pdlr" style="padding-bottom: 25px ;">
                                    <div class="gdlr-core-title-item-title-wrap clearfix">
                                       <h3 class="gdlr-core-title-item-title gdlr-core-skin-title " style="font-size: 30px ;font-weight: 600 ;letter-spacing: 0px ;text-transform: none ;">Perfil Profesional</h3>
                                    </div>
                                 </div>
                              </div>
                              <div class="gdlr-core-pbf-element">
                                 <div class="gdlr-core-text-box-item gdlr-core-item-pdlr gdlr-core-item-pdb gdlr-core-left-align">
                                    <div class="gdlr-core-text-box-item-content" style="font-size: 17px ;text-transform: none ;">
                                       <ul>
                                          <li class=" gdlr-core-skin-divider clearfix">
                                             <div class="gdlr-core-icon-list-content-wrap">
                                                <span class="gdlr-core-icon-list-content" style="font-size: 16px;text-align: justify;">Promover el desarrollo de competencias claves para gestionar el talento humano en las organizaciones,
buscando la eficiencia, y la calidad profesional, dentro de un marco legal, ético y socialmente responsable,
generadores de valor desde un enfoque humanístico, basados en los principios de la comunicación, la
transparencia, la equidad y la solidaridad.</span>
                                             </div>
                                          </li>
                                          <li class=" gdlr-core-skin-divider clearfix">
                                             <div class="gdlr-core-icon-list-content-wrap">
                                                <span class="gdlr-core-icon-list-content" style="font-size: 16px;text-align: justify;">Diseñar, implementar y evaluar políticas de recursos humanos desde una perspectiva estratégica con un
enfoque en los derechos, la igualdad y la interculturalidad a través del uso de las tecnologías de información
que promuevan el desarrollo de carrera, el bienestar y mejore la calidad de vida de los colaboradores de la
organización.</span>
                                             </div>
                                          </li>
                                          <li class=" gdlr-core-skin-divider clearfix">
                                             <div class="gdlr-core-icon-list-content-wrap">
                                                <span class="gdlr-core-icon-list-content" style="font-size: 16px;text-align: justify;">Liderar equipos de trabajo a través de la implementación de las prácticas de alto rendimiento, y la aplicación
de los modelos de gestión humana como base de propuestas de acciones innovadoras que contribuyan al
logro de los objetivos de la organización y generen impactos positivos en la realidad nacional.</span>
                                             </div>
                                          </li>
                                          <li class=" gdlr-core-skin-divider clearfix">
                                             <div class="gdlr-core-icon-list-content-wrap">
                                                <span class="gdlr-core-icon-list-content" style="font-size: 16px;text-align: justify;">Utilizar las herramientas estadísticas para la generación y análisis de indicadores del talento humano y
proponer oportunidades de mejora para su gestión.</span>
                                             </div>
                                          </li>                                                                                   
                                       </ul>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div class="gdlr-core-pbf-column gdlr-core-column-30" id="gdlr-core-column-36639">
                        <div class="gdlr-core-pbf-column-content-margin gdlr-core-js  gdlr-core-column-extend-right" data-sync-height="height-1" style="height: 653.976px;">
                           <div class="gdlr-core-pbf-background-wrap">
                              <div class="gdlr-core-pbf-background gdlr-core-parallax gdlr-core-js" style="background-image: url(../images/carreras/maestria-en-gestion-del-talento-humano-02.jpg); background-size: cover; background-position: center center; height: 710.762px; transform: translate(0px, -35.625px);" data-parallax-speed="0.2"></div>
                           </div>
                           <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js  gdlr-core-sync-height-content"></div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            <?php include '../grado/section_metodologia.php' ?>    
            <div class="gdlr-core-pbf-wrapper" style="padding: 60px 0px 0px;" >
               <div class="gdlr-core-pbf-wrapper-content gdlr-core-js ">
                  <div class="gdlr-core-pbf-wrapper-container clearfix gdlr-core-container">
                     <div class="gdlr-core-pbf-column gdlr-core-column-30">
                        <div class="gdlr-core-pbf-column-content-margin gdlr-core-js ">
                           <div class="gdlr-core-pbf-background-wrap"></div>
                           <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js ">
                              <div class="gdlr-core-pbf-element">
                                 <div class="gdlr-core-title-item gdlr-core-item-pdb clearfix  gdlr-core-left-align gdlr-core-title-item-caption-top gdlr-core-item-pdlr" style="padding-bottom: 35px ;">
                                    <div class="gdlr-core-title-item-title-wrap clearfix">
                                       <h3 class="gdlr-core-title-item-title gdlr-core-skin-title " style="font-size: 30px ;font-weight: 600 ;letter-spacing: 0px ;text-transform: none ;color: #1a1a1a ;">Requisitos de admisi&oacute;n</h3>
                                    </div>
                                 </div>
                              </div>
                              <div class="gdlr-core-pbf-element">
                                 <div class="gdlr-core-text-box-item gdlr-core-item-pdlr gdlr-core-item-pdb gdlr-core-left-align" style="padding-bottom: 15px ;">
                                    <div class="gdlr-core-text-box-item-content" style="font-size: 16px ;text-transform: none ;color: #6b6b6b;">
                                       <ol>
                                          <li>
                                             Llenar el formulario de admisión en línea y cargar los siguientes documentos:
                                             <ul>
                                                <li>Cédula de Identidad</li>
                                                <li>Registro en SENESCYT del título de tercer nivel de grado.</li>
                                             </ul>
                                          </li>
                                          <li>Pagar el valor de la inscripción en  línea</li>
                                          <li>Realizar la prueba de aptitud</li>
                                          <li>Realizar formulario de entrevista.</li>
                                       </ol>
                                    </div>
                                 </div>
                              </div>
                              <div class="gdlr-core-pbf-element" style="padding: 10px 0px 0px;">
                                 <div class="gdlr-core-title-item gdlr-core-item-pdb clearfix  gdlr-core-left-align gdlr-core-title-item-caption-top gdlr-core-item-pdlr" style="padding-bottom: 35px ;">
                                    <div class="gdlr-core-title-item-title-wrap clearfix">
                                       <h3 class="gdlr-core-title-item-title gdlr-core-skin-title " style="font-size: 30px ;font-weight: 600 ;letter-spacing: 0px ;text-transform: none ;color: #1a1a1a ;">Financiamiento</h3>
                                    </div>
                                 </div>
                              </div>
                              <div class="gdlr-core-pbf-column gdlr-core-column-30 gdlr-core-column-first" data-skin="Green Form">
                                 <div class="gdlr-core-pbf-column-content-margin gdlr-core-js ">
                                    <div class="gdlr-core-pbf-background-wrap"></div>
                                    <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js ">
                                       <div class="gdlr-core-pbf-element">
                                          <div class="gdlr-core-column-service-item gdlr-core-item-pdb  gdlr-core-center-align gdlr-core-no-caption gdlr-core-item-pdlr" style="padding-bottom: 30px;">
                                             <div class="gdlr-core-column-service-media gdlr-core-media-image" style="margin-left: auto ;margin-right: auto ;"><img src="../images/icon/icon-08.png" alt="" width="80" height="80"></div>
                                             <div class="gdlr-core-column-service-content-wrapper">
                                                <div class="gdlr-core-column-service-content" style="text-transform: none ;font-size: 12px">
                                                   <p style="line-height: 1.2;">Cr&eacute;dito directo <br>con UEES Online <br>sin inter&eacute;s</p>
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <div class="gdlr-core-pbf-column gdlr-core-column-30" data-skin="Green Form">
                                 <div class="gdlr-core-pbf-column-content-margin gdlr-core-js ">
                                    <div class="gdlr-core-pbf-background-wrap"></div>
                                    <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js ">
                                       <div class="gdlr-core-pbf-element">
                                          <div class="gdlr-core-column-service-item gdlr-core-item-pdb  gdlr-core-center-align gdlr-core-no-caption gdlr-core-item-pdlr" style="padding-bottom: 30px;">
                                             <div class="gdlr-core-column-service-media gdlr-core-media-image" style="margin-left: auto ;margin-right: auto ;"><img src="../images/icon/icon-07.png" alt="" width="80" height="80" ></div>
                                             <div class="gdlr-core-column-service-content-wrapper">
                                                <div class="gdlr-core-column-service-content" style="text-transform: none ;font-size: 12px">
                                                   <p style="line-height: 1.2;">Descuento por <br>pronto pago</p>
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                     <div class="gdlr-core-pbf-column gdlr-core-column-30">
                        <div class="gdlr-core-pbf-column-content-margin gdlr-core-js ">
                           <div class="gdlr-core-pbf-background-wrap"></div>
                           <div class="gdlr-core-pbf-column-content clearfix gdlr-core-js ">
                              <div class="gdlr-core-pbf-element">
                                 <table>
                                    <tr style="background-color: #821436;color: #ffffff">
                                       <td style="font-size:16px;font-weight: 600;letter-spacing: 0px ;text-transform: none;">Asignatura</td>
                                       <td style="font-size:16px;font-weight: 600;letter-spacing: 0px ;text-transform: none;">Horas con docente</td>
                                    </tr>
                                    <tr style="background-color: #ffffff">
                                       <td>Coaching, Mentoring y Liderazgo</td>
                                       <td>18</td>
                                    </tr>
                                    <tr>
                                       <td>Finanzas para la Toma de Decisiones</td>
                                       <td>18</td>
                                    </tr>
                                    <tr>
                                       <td>Business Analytics y Tecnologías para el Talento Humano</td>
                                       <td>18</td>
                                    </tr>
                                    <tr>
                                       <td>Comportamiento, Clima y Cultura Organizacional</td>
                                       <td>18</td>
                                    </tr>
                                    <tr>
                                       <td>Gestión Estratégica e Innovación del Talento Humano</td>
                                       <td>18</td>
                                    </tr>
                                    <tr>
                                       <td>Ética y Legislación Laboral</td>
                                       <td>12</td>
                                    </tr>
                                    <tr>
                                       <td>People Analytics, Reclutamiento y Selección</td>
                                       <td>12</td>
                                    </tr>
                                    <tr>
                                       <td>Planes de Carrera, Formación y Desarrollo del Recurso Humano</td>
                                       <td>12</td>
                                    </tr>
                                    <tr>
                                       <td>Evaluación del Desempeño y Retención del Talento</td>
                                       <td>12</td>
                                    </tr>
                                    <tr>
                                       <td>Comunicación, Mediación y Resolución de Conflictos</td>
                                       <td>12</td>
                                    </tr>
                                    <tr>
                                       <td>Sostenibilidad, Empresas Saludables y Salud Ocupacional</td>
                                       <td>12</td>
                                    </tr>
                                    <tr>
                                       <td>Titulación</td>
                                       <td>24</td>
                                    </tr>
                                 </table>
                              </div>                              
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
      <?php include '../extended/footer.php' ?>
   </div>
   </div> <?php  include '../extended/footer_scripts.php'; ?> 
</body>
</html>