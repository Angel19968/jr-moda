# Guía: cómo subir o actualizar una prenda

No necesitas saber programación. Son 2 partes: **1)** nombrar la foto
correctamente y **2)** subirla a GitHub. Tarda un par de minutos.

---

## Parte 1 — Nombrar y guardar la foto

### Paso 1: elige la carpeta de categoría

Dentro de la carpeta `productos/` hay una carpeta por categoría:

- `productos/01-Formal`
- `productos/02-Casual`
- `productos/03-Pijama`

Copia la foto de la prenda dentro de la carpeta que le corresponda.

### Paso 2: cambia el nombre del archivo

Este es el único paso importante. El nombre del archivo le dice al
sitio web el **nombre de la prenda** y su **precio**. El formato es:

```
Nombre de la prenda - PRECIO.jpg
```

**Ejemplos correctos:**

```
Blazer Ejecutivo Negro - 149.90.jpg
Vestido Saten Elegante - 169.90.jpg
Polo Oversize Talla M - 69.90.png
```

Fíjate que siempre hay un **espacio, un guion y un espacio** ( `` - `` )
entre el nombre y el precio.

Formatos de imagen permitidos: `.jpg` `.jpeg` `.png` `.webp`

---

## Trucos útiles

### 💸 Quiero poner un descuento (precio tachado)

Agrega `- antes PRECIO_ANTERIOR` al final:

```
Vestido Saten Elegante - 169.90 - antes 199.90.jpg
```

En el sitio se va a ver el precio anterior tachado, el precio nuevo, y
un porcentaje de descuento automático.

### ⭐ Quiero que salga en "Los más pedidos" (arriba de todo)

Agrega la palabra `DESTACADO` en cualquier parte del nombre, antes del
precio:

```
Blazer Ejecutivo Negro DESTACADO - 149.90.jpg
```

La palabra "DESTACADO" no se muestra en el sitio, solo activa esa
sección.

### 📸 Quiero subir varias fotos de la misma prenda

Usa exactamente el mismo nombre y precio para cada foto. Cuando copies
y pegues la segunda foto en la misma carpeta, Windows le va a agregar
automáticamente `(2)` al final — eso está bien, no lo edites:

```
Pijama Saten 2 Piezas - 79.90.jpg
Pijama Saten 2 Piezas - 79.90 (2).jpg
Pijama Saten 2 Piezas - 79.90 (3).jpg
```

El sitio las va a mostrar como una sola prenda con varias fotos, con
puntitos para pasar de una a otra.

### 📝 Quiero cambiar el texto de presentación de una categoría

Edita (con el Bloc de notas) el archivo `descripcion.txt` que está
dentro de esa carpeta de categoría, por ejemplo
`productos/01-Formal/descripcion.txt`, y escribe la frase que quieras.
Si el archivo no existe, créalo con ese mismo nombre.

### 📦 Quiero mostrar cuántas unidades quedan

Agrega `- stock N` al final del nombre (puede ir antes o después de
"antes PRECIO_ANTERIOR"):

```
Blazer Ejecutivo Negro - 149.90 - stock 3.jpg
```

Si quedan **4 unidades o menos**, en el sitio aparece en rojo "¡Últimas
3 unidades!" para generar urgencia de compra. Si no escribes "stock",
no se muestra ningún contador (el producto se puede pedir siempre) —
es opcional.

### 🚫 La prenda ya no tiene stock

Agrega la palabra `AGOTADO` en el nombre (o pon `- stock 0`). El
sitio la muestra en gris con una cinta de "Agotado", no deja
agregarla al carrito, y en su lugar aparece un botón para que la
clienta pida que le avisen por WhatsApp cuando vuelva:

```
Blazer Ejecutivo Negro AGOTADO - 149.90.jpg
```

### 🗂️ Quiero agregar una categoría nueva (ej. "Accesorios")

Crea una carpeta nueva dentro de `productos/`, con un número al
inicio para elegir en qué orden aparece:

```
productos/04-Accesorios
```

Aparece sola en el menú y como sección nueva, sin tocar nada más.

### ❌ Quiero quitar una prenda

Borra su(s) foto(s) de la carpeta. Listo.

### 💲 Quiero cambiar el precio de una prenda que ya subiste

Cambia el número en el nombre del archivo (o bórrala y vuelve a
subirla con el nombre correcto).

---

## Errores comunes (evítalos)

| ❌ Mal | ✅ Bien |
|---|---|
| `Blazer Negro149.90.jpg` (sin guion) | `Blazer Negro - 149.90.jpg` |
| `Blazer Negro - S/149.90.jpg` (con "S/") | `Blazer Negro - 149.90.jpg` |
| `blazer_negro_149.90.jpg` (con guiones bajos) | `Blazer Negro - 149.90.jpg` |
| Foto sin ningún precio en el nombre | Siempre debe llevar `- PRECIO` |
| `Blazer Negro - 149.90 - 3 unidades.jpg` | `Blazer Negro - 149.90 - stock 3.jpg` |

Si un archivo no sigue el formato, esa foto simplemente no aparece en
el sitio (no rompe nada) y queda avisado en el reporte de GitHub
Actions por si alguien quiere revisarlo.

---

## Parte 2 — Subir los cambios a internet (con GitHub Desktop)

1. Abre **GitHub Desktop**.
2. Vas a ver la lista de archivos que agregaste o cambiaste (tus fotos
   nuevas).
3. Abajo a la izquierda, escribe un resumen corto, por ejemplo:
   *"Nuevo blazer negro"*.
4. Haz clic en **Commit to main**.
5. Haz clic en **Push origin** (arriba a la derecha).
6. Espera 1-2 minutos. El sitio se actualiza solo.

Puedes revisar que todo salió bien entrando a la pestaña **Actions**
de tu repositorio en GitHub.com: si aparece un ✅ verde, tu prenda ya
está publicada. Si aparece una ❌ roja, entra a ver el detalle — casi
siempre es un archivo con el nombre mal escrito (revisa la tabla de
errores comunes de arriba).
