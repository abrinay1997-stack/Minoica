# El Laberinto de Sangre

Novela de **Abrinay** ambientada en la civilización minoica de Creta. Crónica de Lisandro, llamado *Máximo*, y Roxana, frente a la sombra del pontífice Krato.

Estructura en cinco partes:

1. **Inicio** — Los Cuernos de Consagración
2. **Problema** — La Sombra del Pontífice
3. **Desarrollo** — El Año del Toro
4. **Desenlace** — El Hacha Doble
5. **Regreso al inicio** — Cuando el Mar Recuerde

Contenido para lectores adultos: temas intensos, violencia y escenas sensuales.

## Lectura en línea

El sitio se publica automáticamente con GitHub Actions en GitHub Pages cada vez que se actualiza la rama de publicación. La experiencia principal de lectura es `reader.html`: un lector con **paso de páginas real** (no scroll infinito), con índice desplegable, modo día/noche, control de tamaño de letra y continuación automática donde quedaste.

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
  01-inicio/
    part.json
    01-los-cuernos-de-consagracion.md
  02-problema/ ...
  03-desarrollo/ ...
  04-desenlace/ ...
  05-regreso/ ...

assets/               # CSS/JS del sitio (no generado)
  css/style.css       # tipografía y estilo "libro" (portada, índice, capítulos)
  css/reader-app.css  # el lector paginado
  js/reader.js        # tema día/noche + barra de progreso (páginas estáticas)
  js/book-reader.js   # motor de paginación tipo libro (columnas CSS + animación)

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

Abre `/reader.html` para el modo libro con paso de páginas, o `/index.html` para la portada y el índice clásico.
