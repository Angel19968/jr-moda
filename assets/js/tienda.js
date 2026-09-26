/**
 * Lógica de la tienda sin nada de pantalla (carrito, precios, mensajes).
 * La usa assets/js/app.js en el navegador y los tests en /tests con Node.
 */
(function (raiz, fabrica) {
  var modulo = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  else raiz.JRTienda = modulo;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STOCK_URGENTE = 4; // con esta cantidad o menos se muestra la alerta de urgencia

  function formatearPrecio(numero) {
    return 'S/ ' + (Math.round(Number(numero) * 100) / 100).toFixed(2);
  }

  function escaparHtml(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function tienePrecio(producto) {
    return typeof producto.precio === 'number' && isFinite(producto.precio) && producto.precio > 0;
  }

  function tieneStockLimitado(producto) {
    return typeof producto.stock === 'number' && isFinite(producto.stock);
  }

  // Descuento en % solo si "antes" es mayor que el precio actual; si no, null.
  function porcentajeDescuento(producto) {
    if (!tienePrecio(producto) || typeof producto.precioAntes !== 'number') return null;
    if (!(producto.precioAntes > producto.precio)) return null;
    return Math.round((1 - producto.precio / producto.precioAntes) * 100);
  }

  function textoStock(producto) {
    if (producto.agotado || !tieneStockLimitado(producto)) return null;
    if (producto.stock <= STOCK_URGENTE) {
      return producto.stock === 1 ? '¡Última unidad!' : '¡Últimas ' + producto.stock + ' unidades!';
    }
    return 'Disponible';
  }

  function crearIndice(productos) {
    var mapa = {};
    (Array.isArray(productos) ? productos : []).forEach(function (p) {
      if (!p || !p.id) return;
      if (!Array.isArray(p.colores)) p.colores = [];
      mapa[p.id] = p;
    });
    return mapa;
  }

  function primerColorDisponible(producto) {
    var disponibles = producto.colores.filter(function (c) { return !c.agotado; });
    return disponibles[0] || producto.colores[0] || null;
  }

  function imagenesDe(producto, color) {
    if (color && color.imagenes && color.imagenes.length) return color.imagenes;
    return producto.imagenes && producto.imagenes.length ? producto.imagenes : [];
  }

  function nombreConColor(producto, color) {
    return producto.nombre + (color ? ' (' + color.nombre + ')' : '');
  }

  // En el carrito cada línea es "idProducto|idColor" (idColor vacío si la prenda no tiene colores).
  function claveLinea(producto, color) {
    return producto.id + '|' + (color ? color.id : '');
  }

  function leerLinea(mapa, clave) {
    var corte = clave.lastIndexOf('|');
    var idProducto = corte === -1 ? clave : clave.slice(0, corte);
    var idColor = corte === -1 ? '' : clave.slice(corte + 1);
    var producto = mapa[idProducto];
    if (!producto) return null;
    var color = null;
    if (idColor) {
      color = producto.colores.filter(function (c) { return c.id === idColor; })[0];
      if (!color) return null;
    } else if (producto.colores.length) {
      return null;
    }
    return { producto: producto, color: color };
  }

  function esObjetoPlano(valor) {
    return !!valor && typeof valor === 'object' && !Array.isArray(valor);
  }

  function unidadesDeProducto(carrito, mapa, idProducto) {
    var total = 0;
    Object.keys(carrito).forEach(function (clave) {
      var linea = leerLinea(mapa, clave);
      if (linea && linea.producto.id === idProducto) total += carrito[clave];
    });
    return total;
  }

  // Deja el carrito guardado en un estado válido: quita prendas que ya no
  // existen o se agotaron, cantidades inválidas, y recorta al stock disponible.
  function sanearCarrito(guardado, mapa) {
    var limpio = {};
    if (!esObjetoPlano(guardado)) return limpio;
    Object.keys(guardado).forEach(function (clave) {
      var cantidad = Math.floor(Number(guardado[clave]));
      if (!isFinite(cantidad) || cantidad <= 0) return;
      var linea = leerLinea(mapa, clave);
      if (!linea || linea.producto.agotado || (linea.color && linea.color.agotado)) return;
      if (tieneStockLimitado(linea.producto)) {
        var restante = linea.producto.stock - unidadesDeProducto(limpio, mapa, linea.producto.id);
        cantidad = Math.min(cantidad, restante);
        if (cantidad <= 0) return;
      }
      limpio[clave] = cantidad;
    });
    return limpio;
  }

  // ¿Se puede sumar una unidad más de esta prenda/color? Devuelve
  // { ok: true } o { ok: false, motivo: 'agotado' | 'stock' }.
  function puedeAgregar(carrito, mapa, producto, color) {
    if (producto.agotado || (color && color.agotado)) return { ok: false, motivo: 'agotado' };
    if (tieneStockLimitado(producto) && unidadesDeProducto(carrito, mapa, producto.id) >= producto.stock) {
      return { ok: false, motivo: 'stock' };
    }
    return { ok: true };
  }

  function lineasCarrito(carrito, mapa) {
    return Object.keys(carrito).map(function (clave) {
      var linea = leerLinea(mapa, clave);
      if (!linea) return null;
      linea.clave = clave;
      linea.cantidad = carrito[clave];
      return linea;
    }).filter(Boolean);
  }

  function cantidadTotal(carrito, mapa) {
    return lineasCarrito(carrito, mapa).reduce(function (suma, l) { return suma + l.cantidad; }, 0);
  }

  // Total en soles, calculado en céntimos para no arrastrar decimales raros.
  function totalPrecio(carrito, mapa) {
    var centimos = lineasCarrito(carrito, mapa).reduce(function (suma, l) {
      return tienePrecio(l.producto) ? suma + Math.round(l.producto.precio * 100) * l.cantidad : suma;
    }, 0);
    return centimos / 100;
  }

  function hayPrecioPorConfirmar(carrito, mapa) {
    return lineasCarrito(carrito, mapa).some(function (l) { return !tienePrecio(l.producto); });
  }

  function textoTotal(carrito, mapa) {
    var total = totalPrecio(carrito, mapa);
    if (!hayPrecioPorConfirmar(carrito, mapa)) return formatearPrecio(total);
    return total > 0 ? formatearPrecio(total) + ' + por cotizar' : 'Por confirmar';
  }

  // Los mensajes de WhatsApp van sin emojis: el enlace de WhatsApp a veces
  // los rompe (llegan como "�").
  function mensajeCarrito(carrito, mapa, pagoYape) {
    var lineas = [pagoYape ? '¡Hola JR Moda! Ya pagué con Yape mi pedido:' : '¡Hola JR Moda! Quiero pedir:'];
    lineasCarrito(carrito, mapa).forEach(function (l) {
      lineas.push('• ' + nombreConColor(l.producto, l.color) + ' x' + l.cantidad + ' — ' +
        (tienePrecio(l.producto) ? formatearPrecio(Math.round(l.producto.precio * 100) * l.cantidad / 100) : 'precio por confirmar'));
    });
    lineas.push('');
    lineas.push('Total: ' + textoTotal(carrito, mapa));
    if (pagoYape) {
      lineas.push('');
      lineas.push('Te adjunto la captura del Yape.');
    }
    return lineas.join('\n');
  }

  function mensajePedido(producto, color) {
    return 'Hola JR Moda! Quiero pedir: ' + nombreConColor(producto, color) +
      (tienePrecio(producto) ? ' - ' + formatearPrecio(producto.precio) : '. ¿Me confirmas el precio y las tallas?');
  }

  function mensajeAviso(producto, color) {
    return 'Hola JR Moda! ¿Me avisas cuando vuelva el stock de "' + nombreConColor(producto, color) + '"?';
  }

  function linkWhatsApp(numero, mensaje) {
    return 'https://api.whatsapp.com/send?phone=' + numero + '&text=' + encodeURIComponent(mensaje);
  }

  return {
    STOCK_URGENTE: STOCK_URGENTE,
    formatearPrecio: formatearPrecio,
    escaparHtml: escaparHtml,
    tienePrecio: tienePrecio,
    porcentajeDescuento: porcentajeDescuento,
    textoStock: textoStock,
    crearIndice: crearIndice,
    primerColorDisponible: primerColorDisponible,
    imagenesDe: imagenesDe,
    nombreConColor: nombreConColor,
    claveLinea: claveLinea,
    leerLinea: leerLinea,
    sanearCarrito: sanearCarrito,
    puedeAgregar: puedeAgregar,
    unidadesDeProducto: unidadesDeProducto,
    lineasCarrito: lineasCarrito,
    cantidadTotal: cantidadTotal,
    totalPrecio: totalPrecio,
    hayPrecioPorConfirmar: hayPrecioPorConfirmar,
    textoTotal: textoTotal,
    mensajeCarrito: mensajeCarrito,
    mensajePedido: mensajePedido,
    mensajeAviso: mensajeAviso,
    linkWhatsApp: linkWhatsApp
  };
});
