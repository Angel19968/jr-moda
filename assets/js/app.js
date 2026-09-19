(function () {
  'use strict';

  /* ============ Configuración ============ */
  var WHATSAPP_NUMERO = '51950757578';
  var TIKTOK_URL = 'https://www.tiktok.com/@julissarobles.moda';
  var TEMAS_POR_CATEGORIA = 6; // cuántos estilos de color rotan para las tarjetas de producto
  var STOCK_URGENTE = 4; // a partir de cuántas unidades deja de verse "urgente"
  var CLAVE_FAVORITOS = 'jr-moda-favoritos';
  var CLAVE_CARRITO = 'jr-moda-carrito';

  var CATEGORIAS = Array.isArray(window.JR_CATEGORIAS) ? window.JR_CATEGORIAS.slice() : [];
  var PRODUCTOS = Array.isArray(window.JR_PRODUCTOS) ? window.JR_PRODUCTOS.slice() : [];
  var MAPA_PRODUCTOS = {};
  var MAPA_ETIQUETAS = {};
  var MAPA_TEMAS = {};
  PRODUCTOS.forEach(function (p) { MAPA_PRODUCTOS[p.id] = p; });

  /* ============ Utilidades ============ */
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
  function leerAlmacen(clave) {
    try {
      var guardado = window.localStorage.getItem(clave);
      return guardado ? JSON.parse(guardado) : {};
    } catch (e) { return {}; }
  }
  function guardarAlmacen(clave, valor) {
    try { window.localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* almacenamiento no disponible */ }
  }

  var favoritos = leerAlmacen(CLAVE_FAVORITOS);
  var carrito = leerAlmacen(CLAVE_CARRITO); // { [productoId]: cantidad }
  // Si el catálogo cambió y algún producto guardado ya no existe, se limpia solo.
  (function limpiarCarritoObsoleto() {
    var huboCambios = false;
    Object.keys(carrito).forEach(function (id) {
      if (!MAPA_PRODUCTOS[id]) { delete carrito[id]; huboCambios = true; }
    });
    if (huboCambios) guardarAlmacen(CLAVE_CARRITO, carrito);
  })();

  /* ============ Notificaciones (toast) ============ */
  function mostrarToast(mensaje) {
    var pila = document.getElementById('toast-pila');
    if (!pila) return;
    var toast = crear('div', 'toast');
    toast.textContent = mensaje;
    pila.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 350);
    }, 2200);
  }

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

  /* ============ Overlay compartido (carrito + vista rápida) ============ */
  function iniciarOverlay() {
    var overlay = document.getElementById('overlay');
    if (!overlay) return;
    overlay.addEventListener('click', function () {
      cerrarCarrito();
      cerrarVistaRapida();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { cerrarCarrito(); cerrarVistaRapida(); }
    });
  }
  function mostrarOverlay() {
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('show');
    document.body.classList.add('no-scroll');
  }
  function ocultarOverlaySiNadaAbierto() {
    var drawer = document.getElementById('cart-drawer');
    var modal = document.getElementById('qv-modal');
    var overlay = document.getElementById('overlay');
    var algoAbierto = (drawer && drawer.classList.contains('open')) || (modal && modal.classList.contains('show'));
    if (!algoAbierto) {
      if (overlay) overlay.classList.remove('show');
      document.body.classList.remove('no-scroll');
    }
  }

  /* ============ Carrito de compra ============ */
  function guardarCarrito() { guardarAlmacen(CLAVE_CARRITO, carrito); }

  function cantidadTotalCarrito() {
    var total = 0;
    Object.keys(carrito).forEach(function (id) { total += carrito[id]; });
    return total;
  }
  function totalPrecioCarrito() {
    var total = 0;
    Object.keys(carrito).forEach(function (id) {
      var p = MAPA_PRODUCTOS[id];
      if (p) total += p.precio * carrito[id];
    });
    return total;
  }
  function actualizarBadgeCarrito() {
    var badge = document.getElementById('cart-badge');
    if (!badge) return;
    var total = cantidadTotalCarrito();
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.hidden = total === 0;
    badge.classList.remove('bump');
    void badge.offsetWidth; // reinicia la animación
    badge.classList.add('bump');
  }

  function agregarAlCarrito(producto) {
    var disponibles = producto.stock;
    var enCarrito = carrito[producto.id] || 0;
    if (disponibles !== null && disponibles !== undefined && enCarrito >= disponibles) {
      mostrarToast('Ya agregaste todo el stock disponible de "' + producto.nombre + '"');
      return;
    }
    carrito[producto.id] = enCarrito + 1;
    guardarCarrito();
    actualizarBadgeCarrito();
    renderCarrito();
    mostrarToast('Agregado al carrito: ' + producto.nombre + ' ✓');
  }

  function cambiarCantidadCarrito(id, delta) {
    var producto = MAPA_PRODUCTOS[id];
    var actual = carrito[id] || 0;
    var nueva = actual + delta;
    if (producto && producto.stock !== null && producto.stock !== undefined && nueva > producto.stock) {
      mostrarToast('No hay más stock disponible de "' + producto.nombre + '"');
      return;
    }
    if (nueva <= 0) {
      delete carrito[id];
    } else {
      carrito[id] = nueva;
    }
    guardarCarrito();
    actualizarBadgeCarrito();
    renderCarrito();
  }

  function quitarDelCarrito(id) {
    delete carrito[id];
    guardarCarrito();
    actualizarBadgeCarrito();
    renderCarrito();
  }

  function vaciarCarrito() {
    carrito = {};
    guardarCarrito();
    actualizarBadgeCarrito();
    renderCarrito();
  }

  function mensajeWhatsAppCarrito() {
    var lineas = ['¡Hola JR Moda! Quiero pedir:'];
    Object.keys(carrito).forEach(function (id) {
      var p = MAPA_PRODUCTOS[id];
      if (!p) return;
      var cant = carrito[id];
      lineas.push('• ' + p.nombre + ' x' + cant + ' — ' + formatearPrecio(p.precio * cant));
    });
    lineas.push('');
    lineas.push('Total: ' + formatearPrecio(totalPrecioCarrito()));
    return linkWhatsApp(lineas.join('\n'));
  }

  function renderCarrito() {
    var cuerpo = document.getElementById('cart-drawer-body');
    var pie = document.getElementById('cart-drawer-foot');
    if (!cuerpo || !pie) return;

    var ids = Object.keys(carrito).filter(function (id) { return MAPA_PRODUCTOS[id]; });

    if (!ids.length) {
      cuerpo.innerHTML =
        '<div class="cart-empty">' +
        '<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.5 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 8H6"></path></svg>' +
        '<p>Tu carrito está vacío</p>' +
        '</div>';
      pie.innerHTML = '';
      return;
    }

    cuerpo.innerHTML = '';
    ids.forEach(function (id) {
      var p = MAPA_PRODUCTOS[id];
      var cant = carrito[id];
      var fila = crear('div', 'cart-item');
      fila.innerHTML =
        '<img class="cart-item-img" src="' + (p.imagenes[0] || '') + '" alt="' + p.nombre + '">' +
        '<div class="cart-item-info">' +
        '<div class="cart-item-nombre">' + p.nombre + '</div>' +
        '<div class="cart-item-precio">' + formatearPrecio(p.precio) + ' c/u</div>' +
        '<div class="cart-item-qty">' +
        '<button class="qty-btn" data-accion="menos" type="button" aria-label="Quitar una unidad">−</button>' +
        '<span class="qty-valor">' + cant + '</span>' +
        '<button class="qty-btn" data-accion="mas" type="button" aria-label="Agregar una unidad">+</button>' +
        '</div>' +
        '</div>' +
        '<button class="cart-item-quitar" type="button" aria-label="Quitar del carrito">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>' +
        '</button>';
      fila.querySelector('[data-accion="menos"]').addEventListener('click', function () { cambiarCantidadCarrito(id, -1); });
      fila.querySelector('[data-accion="mas"]').addEventListener('click', function () { cambiarCantidadCarrito(id, 1); });
      fila.querySelector('.cart-item-quitar').addEventListener('click', function () { quitarDelCarrito(id); });
      cuerpo.appendChild(fila);
    });

    pie.innerHTML =
      '<div class="cart-total-row"><span>Total (' + cantidadTotalCarrito() + ' prenda' + (cantidadTotalCarrito() === 1 ? '' : 's') + ')</span><b>' + formatearPrecio(totalPrecioCarrito()) + '</b></div>' +
      '<a class="btn-whatsapp full" id="btn-finalizar-pedido" href="' + mensajeWhatsAppCarrito() + '" target="_blank" rel="noopener">Finalizar pedido por WhatsApp</a>' +
      '<a class="cart-vaciar" id="btn-vaciar-carrito" href="#">Vaciar carrito</a>';
    var btnVaciar = document.getElementById('btn-vaciar-carrito');
    if (btnVaciar) btnVaciar.addEventListener('click', function (ev) { ev.preventDefault(); vaciarCarrito(); });
  }

  function abrirCarrito() {
    cerrarVistaRapida();
    var drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    renderCarrito();
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    mostrarOverlay();
  }
  function cerrarCarrito() {
    var drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    ocultarOverlaySiNadaAbierto();
  }

  function iniciarCarrito() {
    var btnAbrir = document.getElementById('btn-abrir-carrito');
    var btnCerrar = document.getElementById('btn-cerrar-carrito');
    if (btnAbrir) btnAbrir.addEventListener('click', abrirCarrito);
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarCarrito);
    actualizarBadgeCarrito();
  }

  /* ============ Vista rápida (quick view) ============ */
  function abrirVistaRapida(producto, temaClase, etiquetaCategoria) {
    cerrarCarrito();
    var modal = document.getElementById('qv-modal');
    var panel = document.getElementById('qv-panel');
    if (!modal || !panel) return;

    var imagenes = producto.imagenes && producto.imagenes.length ? producto.imagenes : [''];
    var puntos = imagenes.length > 1
      ? '<div class="p-dots">' + imagenes.map(function (_, i) { return '<button class="p-dot' + (i === 0 ? ' active' : '') + '" type="button" data-i="' + i + '" aria-label="Ver foto ' + (i + 1) + '"></button>'; }).join('') + '</div>'
      : '';

    var filaPrecio = '';
    if (producto.precioAntes) {
      filaPrecio += '<span class="p-old">' + formatearPrecio(producto.precioAntes) + '</span>';
    }
    filaPrecio += '<span class="p-price">' + formatearPrecio(producto.precio) + '</span>';

    var stockHtml = construirBadgeStock(producto);
    var agotado = !!producto.agotado;

    panel.innerHTML =
      '<div class="qv-media ' + temaClase + '">' +
      '<button class="qv-cerrar" type="button" aria-label="Cerrar">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>' +
      '</button>' +
      '<img id="qv-img" src="' + imagenes[0] + '" alt="' + producto.nombre + '">' +
      puntos +
      '</div>' +
      '<div class="qv-info">' +
      '<span class="p-cat">' + etiquetaCategoria + '</span>' +
      '<h2>' + producto.nombre + '</h2>' +
      '<div class="p-price-row">' + filaPrecio + '</div>' +
      stockHtml +
      '<p class="qv-desc">Escríbenos si tienes dudas sobre talla o color — te respondemos al instante por WhatsApp.</p>' +
      '<div class="qv-actions">' +
      (agotado
        ? '<a class="p-order-btn aviso" id="qv-avisar" href="#">Avisarme cuando vuelva</a>'
        : '<button class="p-add-btn" id="qv-agregar" type="button">Agregar al carrito</button>' +
          '<a class="p-order-btn" id="qv-pedir" href="#">Pedir directo por WhatsApp</a>') +
      '</div>' +
      '</div>';

    panel.querySelector('.qv-cerrar').addEventListener('click', cerrarVistaRapida);
    var img = panel.querySelector('#qv-img');
    panel.querySelectorAll('.p-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        img.src = imagenes[parseInt(dot.dataset.i, 10)];
        panel.querySelectorAll('.p-dot').forEach(function (d) { d.classList.remove('active'); });
        dot.classList.add('active');
      });
    });
    if (agotado) {
      panel.querySelector('#qv-avisar').addEventListener('click', function (ev) {
        ev.preventDefault();
        window.open(linkWhatsApp('Hola JR Moda! ¿Me avisas cuando vuelva el stock de "' + producto.nombre + '"?'), '_blank', 'noopener');
      });
    } else {
      panel.querySelector('#qv-agregar').addEventListener('click', function () { agregarAlCarrito(producto); });
      panel.querySelector('#qv-pedir').href = linkWhatsApp('Hola JR Moda! Quiero pedir: ' + producto.nombre + ' - ' + formatearPrecio(producto.precio));
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    mostrarOverlay();
  }
  function cerrarVistaRapida() {
    var modal = document.getElementById('qv-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    ocultarOverlaySiNadaAbierto();
  }

  /* ============ Tarjeta de producto ============ */
  var ICONO_CORAZON =
    '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 21s-7.5-4.6-10-9.1C.3 8.7 1.7 5 5.3 4.2 7.6 3.7 9.8 4.7 12 7c2.2-2.3 4.4-3.3 6.7-2.8 3.6.8 5 4.5 3.3 7.7C19.5 16.4 12 21 12 21z"></path></svg>';
  var ICONO_CARRITO =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.5 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 8H6"></path></svg>';

  function construirBadgeStock(producto) {
    if (producto.agotado) return '';
    if (producto.stock === null || producto.stock === undefined) return '';
    if (producto.stock <= STOCK_URGENTE) {
      return '<div class="badge-stock urgente"><i class="dot"></i> ¡Últimas ' + producto.stock + ' unidades!</div>';
    }
    return '<div class="badge-stock">Disponible</div>';
  }

  function crearTarjetaProducto(producto, temaClase, etiquetaCategoria) {
    var tarjeta = crear('div', 'p-card' + (producto.agotado ? ' agotado' : ''));

    var media = crear('div', 'p-media ' + temaClase);

    if (producto.agotado) {
      var ribbon = crear('span', 'ribbon-agotado');
      ribbon.textContent = 'Agotado';
      media.appendChild(ribbon);
    } else if (producto.precioAntes) {
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
    botonFav.addEventListener('click', function (ev) {
      ev.stopPropagation();
      favoritos[producto.id] = !favoritos[producto.id];
      if (!favoritos[producto.id]) delete favoritos[producto.id];
      guardarAlmacen(CLAVE_FAVORITOS, favoritos);
      botonFav.classList.toggle('active', !!favoritos[producto.id]);
    });
    media.appendChild(botonFav);

    var imagenes = producto.imagenes && producto.imagenes.length ? producto.imagenes : [];
    var img = crear('img');
    img.loading = 'lazy';
    img.alt = producto.nombre;
    img.src = imagenes[0] || '';
    media.appendChild(img);
    media.style.cursor = 'zoom-in';
    media.addEventListener('click', function () { abrirVistaRapida(producto, temaClase, etiquetaCategoria); });

    if (imagenes.length > 1) {
      var dots = crear('div', 'p-dots');
      imagenes.forEach(function (src, indice) {
        var puntito = crear('button', indice === 0 ? 'p-dot active' : 'p-dot');
        puntito.type = 'button';
        puntito.setAttribute('aria-label', 'Ver foto ' + (indice + 1));
        puntito.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
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

    var stockHtml = construirBadgeStock(producto);
    if (stockHtml) info.insertAdjacentHTML('beforeend', stockHtml);

    var filaBotones = crear('div', 'p-add-row');
    if (producto.agotado) {
      var botonAviso = crear('a', 'p-order-btn aviso');
      botonAviso.href = linkWhatsApp('Hola JR Moda! ¿Me avisas cuando vuelva el stock de "' + producto.nombre + '"?');
      botonAviso.target = '_blank';
      botonAviso.rel = 'noopener';
      botonAviso.textContent = 'Avisarme cuando vuelva';
      filaBotones.appendChild(botonAviso);
    } else {
      var botonAgregar = crear('button', 'p-add-btn');
      botonAgregar.type = 'button';
      botonAgregar.innerHTML = ICONO_CARRITO + '<span>Agregar</span>';
      botonAgregar.addEventListener('click', function () { agregarAlCarrito(producto); });
      filaBotones.appendChild(botonAgregar);

      var botonPedir = crear('a', 'p-order-btn');
      botonPedir.href = linkWhatsApp('Hola JR Moda! Quiero pedir: ' + producto.nombre + ' - ' + formatearPrecio(producto.precio));
      botonPedir.target = '_blank';
      botonPedir.rel = 'noopener';
      botonPedir.textContent = 'Pedir ya';
      filaBotones.appendChild(botonPedir);
    }
    info.appendChild(filaBotones);

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

    categoriasOrdenadas.forEach(function (cat, indice) {
      MAPA_TEMAS[cat.id] = 'tema-' + ((indice % TEMAS_POR_CATEGORIA) + 1);
      MAPA_ETIQUETAS[cat.id] = cat.etiqueta;
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
    var destacados = PRODUCTOS.filter(function (p) { return p.destacado && !p.agotado; });
    if (destacados.length && seccionDestacados && gridDestacados) {
      seccionDestacados.style.display = '';
      destacados.forEach(function (producto) {
        var tarjeta = crearTarjetaProducto(producto, MAPA_TEMAS[producto.categoria] || 'tema-1', MAPA_ETIQUETAS[producto.categoria] || '');
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
          grid.appendChild(crearTarjetaProducto(producto, MAPA_TEMAS[cat.id], cat.etiqueta));
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
    iniciarOverlay();
    construirCatalogo();
    iniciarCarrito();
    iniciarScrollspy();
    iniciarRevelado();
  });
})();
