# JR Moda — sitio web

Sitio web de JR Moda (Julissa Robles Moda). Es un sitio **estático**
(HTML + CSS + JavaScript, sin base de datos ni backend) cuyo catálogo se
arma automáticamente a partir de fotos guardadas en la carpeta
[`/productos`](productos).

👉 **¿Solo quieres subir o actualizar una prenda?** No necesitas leer este
archivo: ve directo a [`GUIA-SUBIR-PRODUCTOS.md`](GUIA-SUBIR-PRODUCTOS.md).

## Cómo funciona (arquitectura)

```
jr-moda/
├── index.html                    # la página (estructura fija: header, hero, secciones...)
├── assets/
│   ├── css/styles.css            # todos los estilos y animaciones
│   ├── js/app.js                 # arma el catálogo en pantalla y la interacción (menú, WhatsApp, favoritos...)
│   ├── js/data/productos.js      # ⚙️ GENERADO AUTOMÁTICAMENTE — no editar a mano
│   └── img/logo.png              # logo de la marca
├── productos/                    # 👉 AQUÍ se agregan las fotos de cada prenda
│   ├── 01-Formal/
│   ├── 02-Casual/
│   └── 03-Pijama/
├── scripts/
│   └── generar-catalogo.js       # lee /productos y escribe productos.js
└── .github/workflows/deploy.yml  # arma el catálogo y publica el sitio automáticamente
```

**Idea central:** nadie edita código para agregar un producto. Solo se
copia una foto dentro de `productos/<categoría>/` con un nombre de
archivo que ya incluye el nombre y el precio de la prenda. Un script
(`scripts/generar-catalogo.js`) lee esa carpeta y arma la lista de
productos automáticamente.

Ese script se ejecuta solo, en la nube, cada vez que subes cambios a
GitHub — **no hace falta instalar nada en la PC** (ni Node.js, ni
ninguna herramienta). Así se pensó a propósito, para que lo pueda
operar alguien sin conocimientos de programación.

### Escalable por diseño

- **Nuevas prendas:** una foto nueva en la carpeta correcta.
- **Nueva categoría:** una carpeta nueva dentro de `productos/` (ej.
  `04-Accesorios`). Aparece sola en el menú, en los filtros y como
  nueva sección — sin tocar código. El número al inicio del nombre
  (`01-`, `02-`...) controla el orden en que aparecen.
- **Texto de cada categoría:** un archivo `descripcion.txt` opcional
  dentro de su carpeta.
- **Varias fotos de una misma prenda:** repetir el mismo nombre de
  archivo (Windows le agrega automáticamente "(2)", "(3)"...).
- **Producto destacado** (sale en "Los más pedidos"): agregar la
  palabra `DESTACADO` en el nombre del archivo.
- **Cuántas unidades quedan:** agregar `- stock N` al nombre. Con 4 o
  menos, se muestra una alerta roja de urgencia ("¡Últimas 3
  unidades!"). Es opcional.
- **Sin stock:** agregar la palabra `AGOTADO` (o `- stock 0`). La
  prenda se muestra en gris, no se puede agregar al carrito, y en su
  lugar se ofrece un botón para pedir que avisen cuando vuelva.

Todo esto está documentado con ejemplos en
[`GUIA-SUBIR-PRODUCTOS.md`](GUIA-SUBIR-PRODUCTOS.md) y en el archivo
`LEEME.txt` que hay dentro de cada carpeta de `productos/`.

## Ver el sitio en tu PC (opcional)

No es obligatorio: puedes simplemente abrir `index.html` haciendo doble
clic y el sitio va a funcionar (el catálogo se carga desde
`assets/js/data/productos.js`, que ya viene generado).

Si vas a **probar productos nuevos antes de subirlos**, y tienes
Node.js instalado, puedes regenerar el catálogo a mano:

```bash
node scripts/generar-catalogo.js
```

Esto vuelve a leer `/productos` y actualiza
`assets/js/data/productos.js`. Si no tienes Node.js instalado, no pasa
nada: al subir los cambios a GitHub, el catálogo se genera solo (ver
abajo).

## Publicarlo en internet con GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser público o privado) y
   sube esta carpeta completa (por ejemplo con **GitHub Desktop**:
   "Add local repository" → selecciona esta carpeta → "Publish
   repository").
2. En GitHub, entra a **Settings → Pages** del repositorio.
3. En "Build and deployment" → "Source", elige **GitHub Actions**.
4. Listo. Cada vez que subas un cambio a la rama `main`, el flujo en
   `.github/workflows/deploy.yml` va a:
   1. Leer `/productos` y generar el catálogo actualizado.
   2. Guardar ese catálogo en el repositorio.
   3. Publicar el sitio completo en tu enlace de GitHub Pages
      (`https://<tu-usuario>.github.io/<nombre-del-repositorio>/`).

El proceso completo tarda 1-2 minutos después de cada `push`. Puedes
ver el progreso en la pestaña **Actions** del repositorio en GitHub.

## Convención de nombres de archivo (resumen)

```
Nombre de la prenda - PRECIO.jpg
Nombre de la prenda - PRECIO - antes PRECIO_ANTERIOR.jpg     (con descuento)
Nombre de la prenda DESTACADO - PRECIO.jpg                    (para "Los más pedidos")
Nombre de la prenda - PRECIO - stock N.jpg                    (contador de unidades)
Nombre de la prenda AGOTADO - PRECIO.jpg                      (sin stock)
```

## Funciones del sitio

- **Carrito de compra:** cada tarjeta tiene un botón "Agregar". El
  carrito se abre como panel lateral, permite cambiar cantidades y
  arma un solo mensaje de WhatsApp con todos los productos y el total
  (no hay pagos en línea: el pedido se cierra por WhatsApp). Se guarda
  en el navegador de cada visitante (`localStorage`), así que si
  cierran la página y vuelven, su carrito sigue ahí.
- **Vista rápida:** al hacer clic en la foto de un producto se abre un
  panel con la imagen más grande, sin salir de la página.
- **Favoritos, stock y urgencia, menú y "volver arriba"** con
  animaciones — ver detalle en `assets/css/styles.css` y
  `assets/js/app.js`.

Guía completa, con ejemplos y errores comunes:
[`GUIA-SUBIR-PRODUCTOS.md`](GUIA-SUBIR-PRODUCTOS.md).

## Personalización

- **WhatsApp / TikTok:** el número y el usuario están definidos una
  sola vez, arriba de `assets/js/app.js` (`WHATSAPP_NUMERO`,
  `TIKTOK_URL`) y también aparecen escritos en `index.html` (enlaces
  de TikTok y teléfono).
- **Colores:** todos los colores están centralizados como variables al
  inicio de `assets/css/styles.css` (bloque `:root`).
- **Logo:** reemplaza `assets/img/logo.png` por otro archivo con el
  mismo nombre.
