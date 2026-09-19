#!/usr/bin/env node
/**
 * Genera assets/js/data/productos.js leyendo la carpeta /productos.
 * No necesita ninguna librería externa (solo Node.js).
 *
 * Se ejecuta automáticamente en GitHub Actions cada vez que se sube
 * un cambio. También se puede ejecutar a mano en una PC con Node.js
 * instalado con:
 *
 *   node scripts/generar-catalogo.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const CARPETA_PRODUCTOS = path.join(RAIZ, 'productos');
const ARCHIVO_SALIDA = path.join(RAIZ, 'assets', 'js', 'data', 'productos.js');
const EXTENSIONES_VALIDAS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];

let huboAdvertencias = false;

function advertir(mensaje) {
  huboAdvertencias = true;
  console.warn('⚠ ' + mensaje);
}

function limpiarTexto(texto) {
  return texto.replace(/\s+/g, ' ').trim();
}

function aSlug(texto) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '') || 'item';
}

function leerCarpetasDeCategoria() {
  if (!fs.existsSync(CARPETA_PRODUCTOS)) {
    advertir('No existe la carpeta "productos/". Créala junto a index.html y agrega ahí tus categorías.');
    return [];
  }
  return fs.readdirSync(CARPETA_PRODUCTOS, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory() && !entrada.name.startsWith('.'))
    .map((entrada) => entrada.name)
    .sort();
}

// "Nombre del producto - 149.90 - antes 199.90.jpg" -> { nombre, precio, precioAntes, destacado }
function parsearNombreArchivo(nombreArchivo, categoriaCarpeta) {
  const ext = path.extname(nombreArchivo).toLowerCase();
  if (EXTENSIONES_VALIDAS.indexOf(ext) === -1) {
    return null; // no es una imagen (puede ser LEEME.txt, descripcion.txt, .DS_Store, etc.)
  }

  const base = path.basename(nombreArchivo, ext);

  // Quita el sufijo que Windows agrega solo al copiar/pegar un archivo repetido: " (2)", " (3)"...
  const sinDuplicado = base.replace(/\s*\(\d+\)\s*$/, '');

  const partes = sinDuplicado.split(' - ').map(limpiarTexto).filter(Boolean);

  if (partes.length < 2) {
    advertir(
      `Archivo con formato incorrecto, se omite: "${categoriaCarpeta}/${nombreArchivo}"\n` +
      `   Formato esperado: "Nombre del producto - PRECIO.jpg" (ej: "Blazer Negro - 149.90.jpg")`
    );
    return null;
  }

  let nombreCrudo = partes[0];
  let destacado = false;
  if (/\bdestacado\b/i.test(nombreCrudo)) {
    destacado = true;
    nombreCrudo = limpiarTexto(nombreCrudo.replace(/\bdestacado\b/i, ''));
  }

  const precio = parseFloat(partes[1].replace(',', '.'));
  if (isNaN(precio)) {
    advertir(`Precio inválido en "${categoriaCarpeta}/${nombreArchivo}" (leí "${partes[1]}"). Se omite este archivo.`);
    return null;
  }

  let precioAntes = null;
  if (partes[2] && /^antes\s+/i.test(partes[2])) {
    const numero = parseFloat(partes[2].replace(/^antes\s+/i, '').replace(',', '.'));
    if (!isNaN(numero)) precioAntes = numero;
  }

  return {
    grupo: aSlug(nombreCrudo),
    nombre: nombreCrudo,
    precio: precio,
    precioAntes: precioAntes,
    destacado: destacado
  };
}

function leerDescripcion(rutaCarpeta) {
  const rutaTxt = path.join(rutaCarpeta, 'descripcion.txt');
  if (fs.existsSync(rutaTxt)) {
    return limpiarTexto(fs.readFileSync(rutaTxt, 'utf8'));
  }
  return '';
}

function generar() {
  const carpetasCategoria = leerCarpetasDeCategoria();
  const categorias = [];
  const productos = [];

  carpetasCategoria.forEach((nombreCarpeta) => {
    // Prefijo numérico opcional para ordenar: "01-Formal" -> orden 1, etiqueta "Formal"
    const match = nombreCarpeta.match(/^(\d+)[-_ ]+(.*)$/);
    const orden = match ? parseInt(match[1], 10) : 99;
    const etiqueta = limpiarTexto((match ? match[2] : nombreCarpeta).replace(/[-_]+/g, ' '));
    const idCategoria = aSlug(etiqueta);

    const rutaCarpeta = path.join(CARPETA_PRODUCTOS, nombreCarpeta);
    const descripcion = leerDescripcion(rutaCarpeta);

    categorias.push({ id: idCategoria, etiqueta: etiqueta, orden: orden, descripcion: descripcion });

    const archivos = fs.readdirSync(rutaCarpeta)
      .filter((archivo) => fs.statSync(path.join(rutaCarpeta, archivo)).isFile())
      .sort();

    const grupos = {};
    archivos.forEach((archivo) => {
      const datos = parsearNombreArchivo(archivo, nombreCarpeta);
      if (!datos) return;

      const clave = idCategoria + '::' + datos.grupo;
      if (!grupos[clave]) {
        grupos[clave] = {
          id: clave,
          categoria: idCategoria,
          nombre: datos.nombre,
          precio: datos.precio,
          precioAntes: datos.precioAntes,
          destacado: datos.destacado,
          imagenes: []
        };
      }
      grupos[clave].imagenes.push(
        'productos/' + encodeURIComponent(nombreCarpeta) + '/' + encodeURIComponent(archivo)
      );
      if (datos.destacado) grupos[clave].destacado = true;
    });

    Object.keys(grupos).forEach((clave) => productos.push(grupos[clave]));
  });

  categorias.sort((a, b) => a.orden - b.orden || a.etiqueta.localeCompare(b.etiqueta, 'es'));

  const salida =
    '// Archivo generado automáticamente por scripts/generar-catalogo.js\n' +
    '// No lo edites a mano: tus cambios se perderán en la próxima subida.\n' +
    'window.JR_CATEGORIAS = ' + JSON.stringify(categorias, null, 2) + ';\n' +
    'window.JR_PRODUCTOS = ' + JSON.stringify(productos, null, 2) + ';\n';

  fs.mkdirSync(path.dirname(ARCHIVO_SALIDA), { recursive: true });
  fs.writeFileSync(ARCHIVO_SALIDA, salida, 'utf8');

  console.log(`✔ Catálogo generado: ${productos.length} producto(s) en ${categorias.length} categoría(s) -> ${path.relative(RAIZ, ARCHIVO_SALIDA)}`);
  if (huboAdvertencias) {
    console.log('  (revisa las advertencias ⚠ de arriba: esos archivos no se publicaron)');
  }
}

generar();
