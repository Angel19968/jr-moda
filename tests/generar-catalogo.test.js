const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const gen = require('../scripts/generar-catalogo.js');

gen.silencioso = true; // no ensuciar la salida de los tests con avisos

// Crea una carpeta "productos" temporal con los archivos indicados (rutas relativas).
function armarProductos(archivos) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'jr-moda-test-'));
  archivos.forEach((rel) => {
    const destino = path.join(raiz, rel);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, rel.endsWith('.txt') ? 'Texto de la categoría' : 'x');
  });
  return raiz;
}

test('parsearTexto entiende precio, antes, stock, DESTACADO y AGOTADO', () => {
  assert.deepEqual(gen.parsearTexto('Blazer Negro DESTACADO - 149.90 - antes 199.90 - stock 3', 'x', true), {
    grupo: 'blazer-negro', nombre: 'Blazer Negro', precio: 149.9, precioAntes: 199.9,
    destacado: true, stock: 3, agotado: false
  });
  const agotado = gen.parsearTexto('Polo AGOTADO - 69,90', 'x', true);
  assert.equal(agotado.precio, 69.9);
  assert.equal(agotado.agotado, true);
  assert.equal(agotado.stock, 0);
  assert.equal(gen.parsearTexto('Polo - 50 - stock 0', 'x', true).agotado, true);
});

test('parsearTexto: precio obligatorio en fotos sueltas, opcional en carpetas', () => {
  assert.equal(gen.parsearTexto('Blazer sin precio', 'x', true), null);
  assert.equal(gen.parsearTexto('Vestido halter', 'x', false).precio, null);
  assert.equal(gen.parsearTexto('Vestido - stock 2', 'x', false).stock, 2);
});

test('parsearTexto rechaza precios inválidos o en cero y nombres vacíos', () => {
  assert.equal(gen.parsearTexto('Blazer - S/149.90', 'x', true), null);
  assert.equal(gen.parsearTexto('Blazer - 0', 'x', true), null);
  assert.equal(gen.parsearTexto('Blazer - -5', 'x', false), null);
  assert.equal(gen.parsearTexto('DESTACADO - 20', 'x', true), null);
});

test('baseSinDuplicado quita las marcas de copia de Windows', () => {
  assert.equal(gen.baseSinDuplicado('Negro.webp'), 'Negro');
  assert.equal(gen.baseSinDuplicado('Negro (2).webp'), 'Negro');
  assert.equal(gen.baseSinDuplicado('Negro - copia.webp'), 'Negro');
  assert.equal(gen.baseSinDuplicado('Negro - copia (3).webp'), 'Negro');
  assert.equal(gen.baseSinDuplicado('Negro - Copy.webp'), 'Negro');
  assert.equal(gen.baseSinDuplicado('Blazer - 149.90 - copia.jpg'), 'Blazer - 149.90');
});

test('aSlug quita tildes y símbolos', () => {
  assert.equal(gen.aSlug('Pantalón jogger'), 'pantalon-jogger');
  assert.equal(gen.aSlug('Mostaza marrón'), 'mostaza-marron');
  assert.equal(gen.aSlug('***'), 'item');
});

test('construirCatalogo arma modelos con colores y fotos sueltas', () => {
  const raiz = armarProductos([
    '01-Vestidos y Enterizos/descripcion.txt',
    '01-Vestidos y Enterizos/LEEME.txt',
    '01-Vestidos y Enterizos/Vestido halter - 29.90/Negro.webp',
    '01-Vestidos y Enterizos/Vestido halter - 29.90/Negro (2).webp',
    '01-Vestidos y Enterizos/Vestido halter - 29.90/Negro - copia.webp',
    '01-Vestidos y Enterizos/Vestido halter - 29.90/Fucsia AGOTADO.webp',
    '01-Vestidos y Enterizos/Vestido halter - 29.90/notas.txt',
    '02-Blusas/Blusa Lila DESTACADO - 18 - stock 2.jpg',
    '02-Blusas/Blusa Lila DESTACADO - 18 - stock 2 (2).jpg',
    '02-Blusas/mal nombre.jpg',
    '03-Pijamas/Pijama sin precio/Rosa.png'
  ]);
  const { categorias, productos, advertencias } = gen.construirCatalogo(raiz);

  assert.deepEqual(categorias.map((c) => [c.id, c.etiqueta, c.orden]), [
    ['vestidos-y-enterizos', 'Vestidos y Enterizos', 1],
    ['blusas', 'Blusas', 2],
    ['pijamas', 'Pijamas', 3]
  ]);
  assert.equal(categorias[0].descripcion, 'Texto de la categoría');

  const halter = productos.find((p) => p.nombre === 'Vestido halter');
  assert.equal(halter.precio, 29.9);
  assert.deepEqual(halter.colores.map((c) => [c.id, c.agotado, c.imagenes.length]), [
    ['fucsia', true, 1],
    ['negro', false, 3] // "(2)" y "- copia" son fotos extra del mismo color
  ]);
  assert.equal(halter.agotado, false);
  assert.match(halter.colores[1].imagenes[0], /^productos\/01-Vestidos%20y%20Enterizos\/Vestido%20halter%20-%2029\.90\//);

  const blusa = productos.find((p) => p.nombre === 'Blusa Lila');
  assert.equal(blusa.destacado, true);
  assert.equal(blusa.stock, 2);
  assert.equal(blusa.imagenes.length, 2);
  assert.deepEqual(blusa.colores, []);

  assert.equal(productos.find((p) => p.nombre === 'Pijama sin precio').precio, null);
  assert.equal(productos.length, 3);
  assert.equal(advertencias.length, 1); // "mal nombre.jpg"
  assert.match(advertencias[0], /mal nombre\.jpg/);
});

test('construirCatalogo: modelo con todos los colores agotados queda agotado', () => {
  const raiz = armarProductos(['01-Casacas/Casaca - 35/Negro AGOTADO.webp', '01-Casacas/Casaca - 35/Gris AGOTADO.webp']);
  const [casaca] = gen.construirCatalogo(raiz).productos;
  assert.equal(casaca.agotado, true);
  assert.equal(casaca.stock, 0);
});

test('construirCatalogo omite carpetas de modelo vacías y fotos que chocan con un modelo', () => {
  const raiz = armarProductos([
    '01-Blusas/Vacia - 18/notas.txt',
    '01-Blusas/Blusa nudo - 18/Azul.webp',
    '01-Blusas/Blusa nudo - 20.jpg'
  ]);
  const { productos, advertencias } = gen.construirCatalogo(raiz);
  assert.equal(productos.length, 1);
  assert.equal(productos[0].precio, 18);
  assert.equal(productos[0].imagenes.length, 1);
  assert.equal(advertencias.length, 2);
});

test('construirCatalogo evita ids de categoría reservados o repetidos', () => {
  const raiz = armarProductos(['01-Envios/Polo - 10.jpg', '02-Blusas/A - 1.jpg', '03-Blusas/B - 2.jpg']);
  const { categorias } = gen.construirCatalogo(raiz);
  assert.deepEqual(categorias.map((c) => c.id), ['cat-envios', 'blusas', 'blusas-2']);
});

test('construirCatalogo sin carpeta productos no revienta', () => {
  const { productos, advertencias } = gen.construirCatalogo(path.join(os.tmpdir(), 'no-existe-jr-moda'));
  assert.equal(productos.length, 0);
  assert.equal(advertencias.length, 1);
});

test('el catálogo real del repositorio se genera sin advertencias', () => {
  const { categorias, productos, advertencias } = gen.construirCatalogo(path.join(__dirname, '..', 'productos'));
  assert.deepEqual(advertencias, []);
  assert.ok(categorias.length > 0);
  productos.forEach((p) => {
    assert.ok(p.nombre, 'cada producto tiene nombre');
    assert.ok(p.precio === null || p.precio > 0, `precio válido en ${p.nombre}`);
    (p.colores.length ? p.colores.flatMap((c) => c.imagenes) : p.imagenes).forEach((ruta) => {
      assert.ok(fs.existsSync(path.join(__dirname, '..', decodeURIComponent(ruta))), `existe ${ruta}`);
    });
  });
});
