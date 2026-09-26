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
const ARCHIVO_SALIDA = path.join(RAIZ, 'assets', 'js', 'data', 'productos.js');
const EXTENSIONES_VALIDAS = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
// ids que ya usa index.html: una categoría no puede llamarse igual (rompería los enlaces del menú)
const IDS_RESERVADOS = ['top', 'catalogo', 'categorias', 'lives', 'envios', 'overlay', 'cat-pills'];

let CARPETA_PRODUCTOS = path.join(RAIZ, 'productos');
let advertencias = [];

function advertir(mensaje) {
  advertencias.push(mensaje);
  if (!module.exports.silencioso) {
    // En GitHub Actions el aviso aparece también en el resumen de la ejecución.
    console.warn((process.env.GITHUB_ACTIONS ? '::warning::' : '⚠ ') + mensaje.replace(/\n/g, ' '));
  }
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

// "Nombre del producto DESTACADO - 149.90 - antes 199.90 - stock 3"
// -> { nombre, precio, precioAntes, destacado, stock, agotado }
// Los segmentos "antes ..." y "stock ..." pueden ir en cualquier orden.
// Sirve tanto para nombres de archivo (sin extensión) como de carpetas de modelo.
// Devuelve null si el texto no tiene el formato esperado.
function parsearTexto(texto, rutaParaAvisos, precioObligatorio) {
  const partes = texto.split(' - ').map(limpiarTexto).filter(Boolean);
  if (!partes.length) return null;

  let nombreCrudo = partes[0];
  let destacado = false;
  if (/\bdestacado\b/i.test(nombreCrudo)) {
    destacado = true;
    nombreCrudo = limpiarTexto(nombreCrudo.replace(/\bdestacado\b/i, ''));
  }
  let agotado = false;
  if (/\bagotado\b/i.test(nombreCrudo)) {
    agotado = true;
    nombreCrudo = limpiarTexto(nombreCrudo.replace(/\bagotado\b/i, ''));
  }

  if (!nombreCrudo) {
    advertir(`Falta el nombre de la prenda en "${rutaParaAvisos}". Se omite.`);
    return null;
  }

  let precio = null;
  let resto = partes.slice(1);
  if (resto.length && !/^(antes|stock)\s+/i.test(resto[0])) {
    precio = parseFloat(resto[0].replace(',', '.'));
    if (isNaN(precio) || precio <= 0) {
      advertir(`Precio inválido en "${rutaParaAvisos}" (leí "${resto[0]}"). Se omite.`);
      return null;
    }
    resto = resto.slice(1);
  }
  if (precio === null && precioObligatorio) {
    advertir(
      `Archivo con formato incorrecto, se omite: "${rutaParaAvisos}"\n` +
      `   Formato esperado: "Nombre del producto - PRECIO.jpg" (ej: "Blazer Negro - 149.90.jpg")`
    );
    return null;
  }

  let precioAntes = null;
  let stock = null;
  resto.forEach((seg) => {
    if (/^antes\s+/i.test(seg)) {
      const numero = parseFloat(seg.replace(/^antes\s+/i, '').replace(',', '.'));
      if (!isNaN(numero)) precioAntes = numero;
    } else if (/^stock\s+/i.test(seg)) {
      const numero = parseInt(seg.replace(/^stock\s+/i, '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numero)) stock = numero;
    } else {
      advertir(`No entendí la parte "${seg}" de "${rutaParaAvisos}" (la ignoro). Usa "antes PRECIO" o "stock N".`);
    }
  });

  if (stock !== null && stock <= 0) agotado = true;

  return {
    grupo: aSlug(nombreCrudo),
    nombre: nombreCrudo,
    precio: precio,
    precioAntes: precioAntes,
    destacado: destacado,
    stock: agotado ? 0 : stock,
    agotado: agotado
  };
}

function esImagen(nombreArchivo) {
  return EXTENSIONES_VALIDAS.indexOf(path.extname(nombreArchivo).toLowerCase()) !== -1;
}

// Quita la extensión y el sufijo que Windows agrega solo al copiar/pegar
// un archivo repetido: " (2)", " - copia", " - copia (2)", " - Copy"...
function baseSinDuplicado(nombreArchivo) {
  let base = path.basename(nombreArchivo, path.extname(nombreArchivo));
  let anterior;
  do {
    anterior = base;
    base = base
      .replace(/\s*\(\d+\)\s*$/, '')
      .replace(/\s+-\s+(copia|copy)\s*$/i, '');
  } while (base !== anterior);
  return base.trim();
}

function rutaPublica(...segmentos) {
  return 'productos/' + segmentos.map(encodeURIComponent).join('/');
}

// Carpeta de un modelo con varios colores:
//   productos/01-Vestidos/Vestido halter - 89.90/Negro.webp
//   productos/01-Vestidos/Vestido halter - 89.90/Negro (2).webp   (otra foto del mismo color)
//   productos/01-Vestidos/Vestido halter - 89.90/Fucsia AGOTADO.webp
// El precio en el nombre de la carpeta es opcional ("Consultar precio").
function leerCarpetaModelo(carpetaCategoria, carpetaModelo, idCategoria) {
  const rutaAvisos = carpetaCategoria + '/' + carpetaModelo;
  const datos = parsearTexto(carpetaModelo, rutaAvisos, false);
  if (!datos) return null;

  const rutaModelo = path.join(CARPETA_PRODUCTOS, carpetaCategoria, carpetaModelo);
  const archivos = fs.readdirSync(rutaModelo)
    .filter((archivo) => fs.statSync(path.join(rutaModelo, archivo)).isFile() && esImagen(archivo))
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  const colores = [];
  const porColor = {};
  archivos.forEach((archivo) => {
    let nombreColor = baseSinDuplicado(archivo);
    let agotado = false;
    if (/\bagotado\b/i.test(nombreColor)) {
      agotado = true;
      nombreColor = limpiarTexto(nombreColor.replace(/\bagotado\b/i, ''));
    }
    const slug = aSlug(nombreColor);
    if (!porColor[slug]) {
      porColor[slug] = { id: slug, nombre: nombreColor, agotado: false, imagenes: [] };
      colores.push(porColor[slug]);
    }
    porColor[slug].imagenes.push(rutaPublica(carpetaCategoria, carpetaModelo, archivo));
    if (agotado) porColor[slug].agotado = true;
  });

  if (!colores.length) {
    advertir(`La carpeta "${rutaAvisos}" no tiene fotos, se omite.`);
    return null;
  }

  const todosAgotados = colores.every((c) => c.agotado);
  const agotado = datos.agotado || todosAgotados;

  return {
    id: idCategoria + '::' + datos.grupo,
    categoria: idCategoria,
    nombre: datos.nombre,
    precio: datos.precio,
    precioAntes: datos.precioAntes,
    destacado: datos.destacado,
    stock: agotado ? 0 : datos.stock,
    agotado: agotado,
    imagenes: colores[0].imagenes.slice(),
    colores: colores
  };
}

function leerDescripcion(rutaCarpeta) {
  const rutaTxt = path.join(rutaCarpeta, 'descripcion.txt');
  if (fs.existsSync(rutaTxt)) {
    return limpiarTexto(fs.readFileSync(rutaTxt, 'utf8'));
  }
  return '';
}

// Lee la carpeta de productos y devuelve { categorias, productos, advertencias }.
function construirCatalogo(carpetaProductos) {
  CARPETA_PRODUCTOS = carpetaProductos || path.join(RAIZ, 'productos');
  advertencias = [];
  const carpetasCategoria = leerCarpetasDeCategoria();
  const categorias = [];
  const productos = [];

  carpetasCategoria.forEach((nombreCarpeta) => {
    // Prefijo numérico opcional para ordenar: "01-Formal" -> orden 1, etiqueta "Formal"
    const match = nombreCarpeta.match(/^(\d+)[-_ ]+(.*)$/);
    const orden = match ? parseInt(match[1], 10) : 99;
    const etiqueta = limpiarTexto((match ? match[2] : nombreCarpeta).replace(/[-_]+/g, ' '));
    let idCategoria = aSlug(etiqueta);
    if (IDS_RESERVADOS.indexOf(idCategoria) !== -1) idCategoria = 'cat-' + idCategoria;
    if (categorias.some((c) => c.id === idCategoria)) {
      advertir(`Hay dos categorías llamadas "${etiqueta}". Cambia el nombre de "${nombreCarpeta}".`);
      let n = 2;
      while (categorias.some((c) => c.id === idCategoria + '-' + n)) n++;
      idCategoria = idCategoria + '-' + n;
    }

    const rutaCarpeta = path.join(CARPETA_PRODUCTOS, nombreCarpeta);
    const descripcion = leerDescripcion(rutaCarpeta);

    categorias.push({ id: idCategoria, etiqueta: etiqueta, orden: orden, descripcion: descripcion });

    const entradas = fs.readdirSync(rutaCarpeta, { withFileTypes: true })
      .filter((entrada) => !entrada.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));

    const grupos = {};

    // 1) Subcarpetas = un modelo con varios colores
    entradas.filter((e) => e.isDirectory()).forEach((e) => {
      const producto = leerCarpetaModelo(nombreCarpeta, e.name, idCategoria);
      if (producto) grupos[producto.id] = producto;
    });

    // 2) Fotos sueltas = formato simple "Nombre - PRECIO.jpg"
    entradas.filter((e) => e.isFile() && esImagen(e.name)).forEach((e) => {
      const archivo = e.name;
      const datos = parsearTexto(baseSinDuplicado(archivo), nombreCarpeta + '/' + archivo, true);
      if (!datos) return;

      const clave = idCategoria + '::' + datos.grupo;
      if (grupos[clave] && grupos[clave].colores.length) {
        advertir(`"${nombreCarpeta}/${archivo}" se llama igual que la carpeta del modelo "${grupos[clave].nombre}". Muévela dentro de esa carpeta como un color. Se omite.`);
        return;
      }
      if (!grupos[clave]) {
        grupos[clave] = {
          id: clave,
          categoria: idCategoria,
          nombre: datos.nombre,
          precio: datos.precio,
          precioAntes: datos.precioAntes,
          destacado: datos.destacado,
          stock: datos.stock,
          agotado: datos.agotado,
          imagenes: [],
          colores: []
        };
      }
      grupos[clave].imagenes.push(rutaPublica(nombreCarpeta, archivo));
      if (datos.destacado) grupos[clave].destacado = true;
      if (datos.agotado) { grupos[clave].agotado = true; grupos[clave].stock = 0; }
      else if (datos.stock !== null) { grupos[clave].stock = datos.stock; }
    });

    Object.keys(grupos).forEach((clave) => productos.push(grupos[clave]));
  });

  categorias.sort((a, b) => a.orden - b.orden || a.etiqueta.localeCompare(b.etiqueta, 'es'));
  return { categorias: categorias, productos: productos, advertencias: advertencias.slice() };
}

function generar() {
  const { categorias, productos } = construirCatalogo();

  const salida =
    '// Archivo generado automáticamente por scripts/generar-catalogo.js\n' +
    '// No lo edites a mano: tus cambios se perderán en la próxima subida.\n' +
    'window.JR_CATEGORIAS = ' + JSON.stringify(categorias, null, 2) + ';\n' +
    'window.JR_PRODUCTOS = ' + JSON.stringify(productos, null, 2) + ';\n';

  fs.mkdirSync(path.dirname(ARCHIVO_SALIDA), { recursive: true });
  fs.writeFileSync(ARCHIVO_SALIDA, salida, 'utf8');

  console.log(`✔ Catálogo generado: ${productos.length} producto(s) en ${categorias.length} categoría(s) -> ${path.relative(RAIZ, ARCHIVO_SALIDA)}`);
  if (advertencias.length) {
    console.log(`  (revisa las ${advertencias.length} advertencia(s) de arriba: esos archivos no se publicaron o se corrigieron)`);
  }
}

module.exports = { construirCatalogo, parsearTexto, baseSinDuplicado, aSlug, silencioso: false };

if (require.main === module) generar();
