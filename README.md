# El Laberinto de Sangre

Novela ambientada en la civilización minoica de Creta. Crónica de Lisandro, llamado *Máximo*, y Roxana, frente a la sombra del pontífice Krato.

Estructura en cinco partes:

1. **Inicio** — Los Cuernos de Consagración
2. **Problema** — La Sombra del Pontífice
3. **Desarrollo** — El Año del Toro
4. **Desenlace** — El Hacha Doble
5. **Regreso al inicio** — Cuando el Mar Recuerde

Contenido para lectores adultos: temas intensos, violencia y escenas sensuales.

## Lectura en línea

El sitio se publica automáticamente con GitHub Actions en GitHub Pages cada vez que se actualiza la rama. Para habilitarlo:

1. En el repositorio, ir a **Settings → Pages**.
2. En **Build and deployment → Source**, seleccionar **GitHub Actions**.
3. El workflow `.github/workflows/deploy-pages.yml` se encarga del resto.

La URL publicada quedará disponible en **Settings → Pages** y en la pestaña **Actions** tras cada despliegue.

## Estructura del repositorio

```
site/             # Sitio estático (el libro)
  index.html      # Portada e índice
  cap-1-inicio.html
  cap-2-problema.html
  cap-3-desarrollo.html
  cap-4-desenlace.html
  cap-5-regreso.html
  css/style.css   # Estilo de lectura tipo libro
  js/reader.js    # Modo noche/día y barra de progreso
.github/workflows/deploy-pages.yml
```
