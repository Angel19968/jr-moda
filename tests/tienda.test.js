const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../assets/js/tienda.js');

function catalogo() {
  return T.crearIndice([
    {
      id: 'vestidos::halter', nombre: 'Vestido halter', precio: 29.9, precioAntes: null, stock: null, agotado: false,
      imagenes: ['a.webp'],
      colores: [
        { id: 'negro', nombre: 'Negro', agotado: false, imagenes: ['negro.webp'] },
        { id: 'fucsia', nombre: 'Fucsia', agotado: true, imagenes: ['fucsia.webp'] }
      ]
    },
    { id: 'blusas::nudo', nombre: 'Blusa nudo', precio: 18, precioAntes: 25, stock: 3, agotado: false, imagenes: ['b.webp'], colores: [] },
    { id: 'casacas::u', nombre: 'Casaca', precio: 35, stock: null, agotado: true, imagenes: ['c.webp'], colores: [] },
    { id: 'pijamas::sin-precio', nombre: 'Pijama', precio: null, stock: null, agotado: false, imagenes: [], colores: [] },
    {
      id: 'conjuntos::limitado', nombre: 'Conjunto', precio: 35, stock: 2, agotado: false, imagenes: [],
      colores: [
        { id: 'rosa', nombre: 'Rosa', agotado: false, imagenes: ['r.webp'] },
        { id: 'verde', nombre: 'Verde', agotado: false, imagenes: ['v.webp'] }
      ]
    }
  ]);
}

test('formatearPrecio redondea a 2 decimales', () => {
  assert.equal(T.formatearPrecio(29.9), 'S/ 29.90');
  assert.equal(T.formatearPrecio(18), 'S/ 18.00');
  assert.equal(T.formatearPrecio(0.1 + 0.2), 'S/ 0.30');
});

test('escaparHtml neutraliza caracteres especiales', () => {
  assert.equal(T.escaparHtml('<b>"Tom & Jerry\'s"</b>'), '&lt;b&gt;&quot;Tom &amp; Jerry&#39;s&quot;&lt;/b&gt;');
  assert.equal(T.escaparHtml(null), '');
});

test('tienePrecio solo acepta números positivos', () => {
  assert.equal(T.tienePrecio({ precio: 18 }), true);
  assert.equal(T.tienePrecio({ precio: null }), false);
  assert.equal(T.tienePrecio({ precio: 0 }), false);
  assert.equal(T.tienePrecio({ precio: NaN }), false);
});

test('porcentajeDescuento solo si el precio anterior es mayor', () => {
  assert.equal(T.porcentajeDescuento({ precio: 18, precioAntes: 25 }), 28);
  assert.equal(T.porcentajeDescuento({ precio: 30, precioAntes: 25 }), null);
  assert.equal(T.porcentajeDescuento({ precio: 30, precioAntes: 30 }), null);
  assert.equal(T.porcentajeDescuento({ precio: null, precioAntes: 30 }), null);
});

test('textoStock usa singular con 1 unidad', () => {
  assert.equal(T.textoStock({ stock: 1, agotado: false }), '¡Última unidad!');
  assert.equal(T.textoStock({ stock: 3, agotado: false }), '¡Últimas 3 unidades!');
  assert.equal(T.textoStock({ stock: 10, agotado: false }), 'Disponible');
  assert.equal(T.textoStock({ stock: null, agotado: false }), null);
  assert.equal(T.textoStock({ stock: 0, agotado: true }), null);
});

test('leerLinea valida producto y color', () => {
  const mapa = catalogo();
  assert.equal(T.leerLinea(mapa, 'vestidos::halter|negro').color.nombre, 'Negro');
  assert.equal(T.leerLinea(mapa, 'blusas::nudo|').color, null);
  assert.equal(T.leerLinea(mapa, 'blusas::nudo').producto.nombre, 'Blusa nudo'); // formato antiguo
  assert.equal(T.leerLinea(mapa, 'vestidos::halter|azul'), null); // color que no existe
  assert.equal(T.leerLinea(mapa, 'vestidos::halter|'), null); // falta color en prenda con colores
  assert.equal(T.leerLinea(mapa, 'no-existe|'), null);
});

test('sanearCarrito tolera datos dañados', () => {
  const mapa = catalogo();
  assert.deepEqual(T.sanearCarrito(null, mapa), {});
  assert.deepEqual(T.sanearCarrito('texto', mapa), {});
  assert.deepEqual(T.sanearCarrito([1, 2], mapa), {});
  assert.deepEqual(T.sanearCarrito({
    'vestidos::halter|negro': '2',        // texto -> número
    'pijamas::sin-precio|': -3,           // negativo -> fuera
    'blusas::nudo|': 'abc',               // no numérico -> fuera
    'vestidos::halter|fucsia': 1,         // color agotado -> fuera
    'casacas::u|': 1,                     // producto agotado -> fuera
    'no-existe|': 4                       // ya no existe -> fuera
  }, mapa), { 'vestidos::halter|negro': 2 });
});

test('sanearCarrito recorta al stock total del modelo (sumando colores)', () => {
  const mapa = catalogo();
  assert.deepEqual(
    T.sanearCarrito({ 'conjuntos::limitado|rosa': 2, 'conjuntos::limitado|verde': 5 }, mapa),
    { 'conjuntos::limitado|rosa': 2 }
  );
  assert.deepEqual(T.sanearCarrito({ 'blusas::nudo|': 9 }, mapa), { 'blusas::nudo|': 3 });
});

test('puedeAgregar respeta agotado y stock compartido entre colores', () => {
  const mapa = catalogo();
  const conjunto = mapa['conjuntos::limitado'];
  const [rosa, verde] = conjunto.colores;
  assert.deepEqual(T.puedeAgregar({}, mapa, conjunto, rosa), { ok: true });
  assert.deepEqual(T.puedeAgregar({ 'conjuntos::limitado|rosa': 1 }, mapa, conjunto, verde), { ok: true });
  assert.deepEqual(
    T.puedeAgregar({ 'conjuntos::limitado|rosa': 1, 'conjuntos::limitado|verde': 1 }, mapa, conjunto, verde),
    { ok: false, motivo: 'stock' }
  );
  const halter = mapa['vestidos::halter'];
  assert.deepEqual(T.puedeAgregar({}, mapa, halter, halter.colores[1]), { ok: false, motivo: 'agotado' });
  assert.deepEqual(T.puedeAgregar({}, mapa, mapa['casacas::u'], null), { ok: false, motivo: 'agotado' });
});

test('totales en céntimos exactos', () => {
  const mapa = catalogo();
  const carrito = { 'vestidos::halter|negro': 3, 'blusas::nudo|': 1 };
  assert.equal(T.cantidadTotal(carrito, mapa), 4);
  assert.equal(T.totalPrecio(carrito, mapa), 107.7);
  assert.equal(T.textoTotal(carrito, mapa), 'S/ 107.70');
  assert.equal(T.hayPrecioPorConfirmar(carrito, mapa), false);
});

test('textoTotal con prendas sin precio', () => {
  const mapa = catalogo();
  assert.equal(T.textoTotal({ 'pijamas::sin-precio|': 1 }, mapa), 'Por confirmar');
  assert.equal(T.textoTotal({ 'pijamas::sin-precio|': 1, 'blusas::nudo|': 1 }, mapa), 'S/ 18.00 + por cotizar');
  assert.equal(T.textoTotal({}, mapa), 'S/ 0.00');
});

test('mensajeCarrito arma el pedido con color, cantidades y total', () => {
  const mapa = catalogo();
  const carrito = { 'vestidos::halter|negro': 2, 'blusas::nudo|': 1 };
  assert.equal(T.mensajeCarrito(carrito, mapa, false),
    '¡Hola JR Moda! Quiero pedir:\n' +
    '• Vestido halter (Negro) x2 — S/ 59.80\n' +
    '• Blusa nudo x1 — S/ 18.00\n' +
    '\nTotal: S/ 77.80');
  const yape = T.mensajeCarrito(carrito, mapa, true);
  assert.match(yape, /^¡Hola JR Moda! Ya pagué con Yape mi pedido:/);
  assert.match(yape, /Te adjunto la captura del Yape\.$/);
});

test('los mensajes de WhatsApp no llevan emojis (WhatsApp los rompe)', () => {
  const mapa = catalogo();
  const emoji = /[\u{1F000}-\u{1FFFF}]/u;
  assert.doesNotMatch(T.mensajeCarrito({ 'vestidos::halter|negro': 1 }, mapa, true), emoji);
  assert.doesNotMatch(T.mensajePedido(mapa['vestidos::halter'], mapa['vestidos::halter'].colores[0]), emoji);
  assert.doesNotMatch(T.mensajeAviso(mapa['casacas::u'], null), emoji);
});

test('mensajePedido pide cotización si no hay precio', () => {
  const mapa = catalogo();
  assert.equal(T.mensajePedido(mapa['blusas::nudo'], null), 'Hola JR Moda! Quiero pedir: Blusa nudo - S/ 18.00');
  assert.match(T.mensajePedido(mapa['pijamas::sin-precio'], null), /¿Me confirmas el precio/);
});

test('linkWhatsApp codifica el mensaje completo', () => {
  const url = T.linkWhatsApp('51950757578', 'Hola & chau\nTotal: S/ 10.00');
  assert.equal(url, 'https://api.whatsapp.com/send?phone=51950757578&text=Hola%20%26%20chau%0ATotal%3A%20S%2F%2010.00');
});

test('primerColorDisponible salta los agotados e imagenesDe cae al producto', () => {
  const mapa = catalogo();
  const halter = mapa['vestidos::halter'];
  halter.colores.reverse(); // fucsia (agotado) primero
  assert.equal(T.primerColorDisponible(halter).id, 'negro');
  assert.deepEqual(T.imagenesDe(halter, null), ['a.webp']);
  assert.deepEqual(T.imagenesDe(mapa['pijamas::sin-precio'], null), []);
});
