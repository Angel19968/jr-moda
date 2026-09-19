(function () {
  'use strict';

  /* ============ Configuración ============ */
  var WHATSAPP_NUMERO = '51950757578';
  var TIKTOK_URL = 'https://www.tiktok.com/@julissarobles.moda';
  var TEMAS_POR_CATEGORIA = 6; // cuántos estilos de color rotan para las tarjetas de producto
  var CLAVE_FAVORITOS = 'jr-moda-favoritos';

  var CATEGORIAS = Array.isArray(window.JR_CATEGORIAS) ? window.JR_CATEGORIAS.slice() : [];
  var PRODUCTOS = Array.isArray(window.JR_PRODUCTOS) ? window.JR_PRODUCTOS.slice() : [];

  /* ============ Utilidades ============ */
  function $(selector, contexto) { return (contexto || document).querySelector(selector); }
  function crear(tag, clase) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    return el;
  }
  function formatearPrecio(numero) {
    return 'S/ ' + Number(numero).toFixed(2);
  }
  function linkWhatsApp(mensaje) {
    return 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(mensaje);
  }

  function cargarFavoritos() {
    try {
      var guardado = window.localStorage.getItem(CLAVE_FAVORITOS);
      return guardado ? JSON.parse(guardado) : {};
    } catch (e) {
      return {};
    }
  }
  function guardarFavoritos(favoritos) {
    try { window.localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(favoritos)); } catch (e) { /* almacenamiento no disponible */ }
  }
  var favoritos = cargarFavoritos();

  /* ============ Enlaces de WhatsApp ============ */
  function iniciarEnlacesWhatsapp() {
    var general = linkWhatsApp('Hola JR Moda! Quiero ver el catálogo 👑');
    ['btn-whatsapp-header', 'btn-whatsapp-mobile', 'btn-whatsapp-hero', 'btn-whatsapp-cta', 'btn-whatsapp-footer', 'btn-whatsapp-footer-link', 'btn-whatsapp-fab']
      .forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.href = general;
      });
  }

  /* ============ Navegación / menú móvil ============ */
  function iniciarMenu() {
    var boton = document.getElementById('hamburger');
    var menu = document.getElementById('mobile-nav');
    if (!boton || !menu) return;
    boton.addEventListener('click', function () {
      var abierto = menu.classList.toggle('open');
      boton.classList.toggle('open', abierto);
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    menu.addEventListener('click', function (ev) {
      if (ev.target.tagName === 'A') {
        menu.classList.remove('open');
        boton.classList.remove('open');
      }
    });
  }

  /* ============ Header al hacer scroll + botón subir ============ */
  function iniciarScroll() {
    var header = document.getElementById('site-header');
    var botonTop = document.getElementById('btn-top');
    var estado = { scrolled: false, mostrarTop: false };

    function actualizar() {
      var y = window.scrollY || window.pageYOffset || 0;
      var scrolled = y > 40;
      var mostrarTop = y > 800;
      if (scrolled !== estado.scrolled) {
        estado.scrolled = scrolled;
        if (header) header.classList.toggle('scrolled', scrolled);
      }
      if (mostrarTop !== estado.mostrarTop) {
        estado.mostrarTop = mostrarTop;
        if (botonTop) botonTop.classList.toggle('show', mostrarTop);
      }
    }
    window.addEventListener('scroll', actualizar, { passive: true });
    actualizar();

    if (botonTop) {
      botonTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /* ============ Animación al aparecer en pantalla ============ */
  function iniciarRevelado() {
    var elementos = document.querySelectorAll('.reveal, .reveal-stagger');
    if (!('IntersectionObserver' in window) || !elementos.length) {
      elementos.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('in-view');
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    elementos.forEach(function (el) { observador.observe(el); });
  }

  /* ============ Tarjeta de producto ============ */
  var ICONO_CORAZON =
    '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 21s-7.5-4.6-10-9.1C.3 8.7 1.7 5 5.3 4.2 7.6 3.7 9.8 4.7 12 7c2.2-2.3 4.4-3.3 6.7-2.8 3.6.8 5 4.5 3.3 7.7C19.5 16.4 12 21 12 21z"></path></svg>';

  function crearTarjetaProducto(producto, temaClase, etiquetaCategoria) {
    var tarjeta = crear('div', 'p-card');

    var media = crear('div', 'p-media ' + temaClase);

    if (producto.precioAntes) {
      var descuento = Math.round((1 - producto.precio / producto.precioAntes) * 100);
      var badge = crear('span', 'badge-discount');
      badge.textContent = '-' + descuento + '%';
      media.appendChild(badge);
    }

    var favActivo = !!favoritos[producto.id];
    var botonFav = crear('button', favActivo ? 'wish-btn active' : 'wish-btn');
    botonFav.type = 'button';
    botonFav.setAttribute('aria-label', 'Guardar en favoritos');
    botonFav.innerHTML = ICONO_CORAZON;
    botonFav.addEventListener('click', function () {
      favoritos[producto.id] = !favoritos[producto.id];
      if (!favoritos[producto.id]) delete favoritos[producto.id];
      guardarFavoritos(favoritos);
      botonFav.classList.toggle('active', !!favoritos[producto.id]);
    });
    media.appendChild(botonFav);

    var imagenes = producto.imagenes && producto.imagenes.length ? producto.imagenes : [];
    var img = crear('img');
    img.loading = 'lazy';
    img.alt = producto.nombre;
    img.src = imagenes[0] || '';
    media.appendChild(img);

    if (imagenes.length > 1) {
      var dots = crear('div', 'p-dots');
      imagenes.forEach(function (src, indice) {
        var puntito = crear('button', indice === 0 ? 'p-dot active' : 'p-dot');
        puntito.type = 'button';
        puntito.setAttribute('aria-label', 'Ver foto ' + (indice + 1));
        puntito.addEventListener('click', function (ev) {
          ev.preventDefault();
          img.src = src;
          dots.querySelectorAll('.p-dot').forEach(function (d) { d.classList.remove('active'); });
          puntito.classList.add('active');
        });
        dots.appendChild(puntito);
      });
      media.appendChild(dots);
    }

    tarjeta.appendChild(media);

    var info = crear('div', 'p-info');

    var cat = crear('span', 'p-cat');
    cat.textContent = etiquetaCategoria;
    info.appendChild(cat);

    var nombre = crear('h3', 'p-name');
    nombre.textContent = producto.nombre;
    info.appendChild(nombre);

    var filaPrecio = crear('div', 'p-price-row');
    if (producto.precioAntes) {
      var precioAntes = crear('span', 'p-old');
      precioAntes.textContent = formatearPrecio(producto.precioAntes);
      filaPrecio.appendChild(precioAntes);
    }
    var precio = crear('span', 'p-price');
    precio.textContent = formatearPrecio(producto.precio);
    filaPrecio.appendChild(precio);
    info.appendChild(filaPrecio);

    var botonPedir = crear('a', 'p-order-btn');
    botonPedir.href = linkWhatsApp('Hola JR Moda! Quiero pedir: ' + producto.nombre + ' - ' + formatearPrecio(producto.precio));
    botonPedir.target = '_blank';
    botonPedir.rel = 'noopener';
    botonPedir.textContent = 'Pedir por WhatsApp';
    info.appendChild(botonPedir);

    tarjeta.appendChild(info);
    return tarjeta;
  }

  /* ============ Construcción del catálogo ============ */
  function construirCatalogo() {
    var navCategorias = document.getElementById('main-nav');
    var navMovil = document.getElementById('mobile-nav');
    var contenedorPills = document.getElementById('cat-pills');
    var contenedorCategorias = document.getElementById('categorias');
    var footerCategorias = document.getElementById('footer-categorias');
    var seccionDestacados = document.getElementById('catalogo');
    var gridDestacados = document.getElementById('grid-destacados');

    var categoriasOrdenadas = CATEGORIAS.slice().sort(function (a, b) {
      return (a.orden - b.orden) || String(a.etiqueta).localeCompare(String(b.etiqueta), 'es');
    });

    if (!categoriasOrdenadas.length) {
      if (contenedorCategorias) {
        var vacio = crear('div', 'section');
        vacio.innerHTML = '<div class="empty-state">Muy pronto vas a encontrar aquí todo el catálogo. ✨</div>';
        contenedorCategorias.appendChild(vacio);
      }
      if (footerCategorias) footerCategorias.innerHTML = '<span>Próximamente</span>';
      return;
    }

    var temaPorCategoria = {};
    categoriasOrdenadas.forEach(function (cat, indice) {
      temaPorCategoria[cat.id] = 'tema-' + ((indice % TEMAS_POR_CATEGORIA) + 1);
    });

    var productosPorCategoria = {};
    PRODUCTOS.forEach(function (producto) {
      if (!productosPorCategoria[producto.categoria]) productosPorCategoria[producto.categoria] = [];
      productosPorCategoria[producto.categoria].push(producto);
    });

    /* -- nav + pills + footer -- */
    if (footerCategorias) footerCategorias.innerHTML = '';
    categoriasOrdenadas.forEach(function (cat, indice) {
      var enlaceDesktop = crear('a');
      enlaceDesktop.href = '#' + cat.id;
      enlaceDesktop.textContent = cat.etiqueta;
      if (navCategorias) navCategorias.insertBefore(enlaceDesktop, navCategorias.children[1 + indice] || null);

      var enlaceMovil = crear('a');
      enlaceMovil.href = '#' + cat.id;
      enlaceMovil.textContent = cat.etiqueta;
      if (navMovil) navMovil.insertBefore(enlaceMovil, navMovil.children[1 + indice] || null);

      var pill = crear('a', 'pill');
      pill.href = '#' + cat.id;
      pill.dataset.cat = cat.id;
      pill.textContent = cat.etiqueta;
      if (contenedorPills) contenedorPills.appendChild(pill);

      var enlaceFooter = crear('a');
      enlaceFooter.href = '#' + cat.id;
      enlaceFooter.textContent = cat.etiqueta;
      if (footerCategorias) footerCategorias.appendChild(enlaceFooter);
    });

    /* -- destacados -- */
    var destacados = PRODUCTOS.filter(function (p) { return p.destacado; });
    if (destacados.length && seccionDestacados && gridDestacados) {
      seccionDestacados.style.display = '';
      var mapaEtiquetas = {};
      categoriasOrdenadas.forEach(function (c) { mapaEtiquetas[c.id] = c.etiqueta; });
      destacados.forEach(function (producto) {
        var tarjeta = crearTarjetaProducto(producto, temaPorCategoria[producto.categoria] || 'tema-1', mapaEtiquetas[producto.categoria] || '');
        gridDestacados.appendChild(tarjeta);
      });
    }

    /* -- una sección por categoría -- */
    categoriasOrdenadas.forEach(function (cat, indice) {
      var productosCategoria = productosPorCategoria[cat.id] || [];

      var seccion = crear('section', 'section' + (indice % 2 === 1 ? ' band' : ''));
      seccion.id = cat.id;

      var head = crear('div', 'section-head reveal');
      head.innerHTML =
        '<span class="kicker">Categoría</span>' +
        '<h2></h2>' +
        '<p></p>';
      head.querySelector('h2').textContent = cat.etiqueta;
      head.querySelector('p').textContent = cat.descripcion || ('Descubre nuestra selección de ' + cat.etiqueta + '.');
      seccion.appendChild(head);

      var grid = crear('div', 'grid reveal-stagger');
      if (productosCategoria.length) {
        productosCategoria.forEach(function (producto) {
          grid.appendChild(crearTarjetaProducto(producto, temaPorCategoria[cat.id], cat.etiqueta));
        });
      } else {
        grid.innerHTML = '<div class="empty-state">Muy pronto vas a encontrar prendas de ' + cat.etiqueta + ' aquí. ✨</div>';
      }
      seccion.appendChild(grid);

      if (contenedorCategorias) contenedorCategorias.appendChild(seccion);
    });
  }

  /* ============ Resaltar la categoría visible (scrollspy) ============ */
  function iniciarScrollspy() {
    var pills = document.querySelectorAll('.pill');
    if (!pills.length || !('IntersectionObserver' in window)) return;
    var secciones = [];
    pills.forEach(function (pill) {
      var seccion = document.getElementById(pill.dataset.cat);
      if (seccion) secciones.push(seccion);
    });
    if (!secciones.length) return;

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        var pill = document.querySelector('.pill[data-cat="' + entrada.target.id + '"]');
        if (!pill) return;
        if (entrada.isIntersecting) {
          pills.forEach(function (p) { p.classList.remove('active'); });
          pill.classList.add('active');
        }
      });
    }, { threshold: 0.3, rootMargin: '-40% 0px -40% 0px' });
    secciones.forEach(function (s) { observador.observe(s); });
  }

  /* ============ Arranque ============ */
  document.addEventListener('DOMContentLoaded', function () {
    iniciarEnlacesWhatsapp();
    iniciarMenu();
    iniciarScroll();
    construirCatalogo();
    iniciarScrollspy();
    iniciarRevelado();
  });
})();
