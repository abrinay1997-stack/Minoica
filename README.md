# El Laberinto de Sangre

Novela de **Abrinay** ambientada en la civilización minoica de Creta. Crónica de Lisandro, llamado *Máximo*, y Roxana, frente a la sombra del pontífice Krato, bajo un mar que cuenta los días que le quedan a la isla.

Estructura en cinco movimientos, sin etiquetas mecánicas, con título lírico por capítulo:

1. **Sal y Aceite**
2. **La Marca**
3. **El Filo que Mira**
4. **El Cielo Equivocado**
5. **Lo que el Mar Recuerda**

Contenido para lectores adultos: temas intensos, violencia bélica y escenas sensuales explícitas.

## Lectura en línea

El sitio se publica automáticamente con GitHub Actions en GitHub Pages cada vez que se actualiza la rama de publicación. La experiencia principal de lectura es `reader.html`, optimizado para móvil y escritorio, con:

- **Dos modos de lectura intercambiables** sin perder la posición: *modo libro* (paso de páginas real, medido a la altura de la pantalla) y *modo continuo* (scroll vertical clásico). El botón ▤/▭ alterna entre ambos.
- Índice desplegable, modo día/noche, control de tamaño de letra y continuación automática donde quedaste (se guarda como fracción del capítulo, así que se conserva al cambiar de modo, de tamaño de letra o de dispositivo).

Para habilitarlo en GitHub:

1. En el repositorio, ir a **Settings → Pages**.
2. En **Build and deployment → Source**, seleccionar **GitHub Actions**.
3. El workflow `.github/workflows/deploy-pages.yml` construye el sitio (`node scripts/build.mjs`) y lo despliega.

La URL publicada queda disponible en **Settings → Pages** y en la pestaña **Actions** tras cada despliegue.

## Arquitectura

El repositorio separa **contenido** (lo que escriben los autores) de **presentación** (HTML/CSS/JS, generados):

```
content/              # Markdown + JSON — lo único que editan los escritores
  book.json           # título, autor, subtítulo
  01-sal-y-aceite/
    part.json          # { "label": "Sal y Aceite", "roman": "I" }
    01-el-nombre-que-pesa.md
    02-el-camino-de-los-olivos.md
    03-los-cuernos-de-consagracion.md
  02-la-marca/ ...
  03-el-filo-que-mira/ ...
  04-el-cielo-equivocado/ ...
  05-lo-que-el-mar-recuerda/ ...

assets/               # CSS/JS del sitio (no generado)
  css/style.css       # tipografía y estilo "libro" (portada, índice, capítulos)
  css/reader-app.css  # el lector (modo libro + modo continuo)
  js/reader.js        # tema día/noche + barra de progreso (páginas estáticas)
  js/book-reader.js   # motor del lector: paginación medida + scroll, con posición compartida

scripts/build.mjs     # generador estático: content/ + assets/ -> dist/

dist/                 # generado, no se versiona (.gitignore)

.github/workflows/
  deploy-pages.yml     # construye y publica en GitHub Pages
  validate.yml         # construye en cada PR para detectar errores temprano
```

Ningún archivo HTML se edita a mano: la portada, el índice y cada capítulo se generan desde `content/` cada vez que corre `scripts/build.mjs`. Esto evita los "monolitos" de texto y permite que el libro crezca sin que el código se vuelva inmantenible.

## Trabajar con varios escritores

Cada capítulo vive en su propio archivo (o carpeta, si se divide en escenas), nombrado con un prefijo numérico que define el orden de lectura. No hay un índice central que todos tengan que tocar, así que distintos escritores pueden trabajar en ramas independientes con conflictos mínimos.

Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md) para el flujo completo: convención de nombres, formato de los capítulos, y cómo previsualizar localmente antes de abrir un Pull Request.

## Vista previa local

```bash
npm run build   # genera dist/
npm run serve   # genera y sirve dist/ en http://localhost:3000
```

Abre `/reader.html` para el lector (modo libro o continuo), o `/index.html` para el "objeto libro" completo: portada, epígrafe y dedicatoria, sinopsis, *dramatis personae*, nota de contenido, índice, nota histórica, glosario y colofón. Todo ese aparato se edita desde `content/book.json`, sin tocar HTML.
