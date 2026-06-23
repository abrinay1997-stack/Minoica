# Cómo contribuir a "El Laberinto de Sangre"

Este repositorio está diseñado para que varios escritores trabajen en paralelo, cada uno en su propia rama, sin pisarse el trabajo. La clave es que **cada capítulo vive en su propio archivo**, y el orden de lectura lo define el nombre del archivo, no un índice central que todos tengan que editar.

## Estructura de contenido

```
content/
  book.json                 # título, autor, subtítulo de la novela (rara vez cambia)
  01-sal-y-aceite/          # una carpeta por movimiento, numerada
    part.json                # { "label": "Sal y Aceite", "roman": "I" }
    01-el-nombre-que-pesa.md
    02-el-camino-de-los-olivos.md
  02-la-marca/
    part.json
    01-....md
```

- Los **movimientos** son carpetas con prefijo numérico (`01-`, `02-`...). El número decide el orden. La etiqueta (`label`) es lírica, no mecánica: evita nombres como "Inicio" o "Desenlace".
- Los **capítulos** son archivos `.md` con prefijo numérico dentro de su movimiento, cada uno con su propio título lírico.
- Si un capítulo crece demasiado y varias personas quieren escribir escenas distintas dentro de él, conviértanlo en **carpeta**:

```
03-el-filo-que-mira/
  02-el-asedio/
    meta.json              # { "title": "...", "epigraph": "...", "author": "..." }
    01-la-llegada.md
    02-la-emboscada.md
    03-la-retirada.md
```

  Cada escena (`.md`) dentro de esa carpeta es solo el texto (sin frontmatter de título), y se concatenan en orden numérico con un corte de escena automático entre ellas.

## Formato de un capítulo (`.md`)

```markdown
---
title: Título del capítulo
epigraph: «Frase breve que aparece bajo el título»
author: Tu nombre
---

Primer párrafo...

Segundo párrafo, con *cursiva* si hace falta.

***

Párrafo después de un corte de escena (la línea `***` sola es el separador).
```

El campo `author` te permite firmar el capítulo que escribiste; el lector mostrará igualmente "Abrinay" como autor de la novela en la portada.

## Flujo de trabajo con ramas

1. Antes de empezar, mira `content/` para ver el número más alto usado en la parte donde vas a escribir, y elige el siguiente libre (deja huecos de 10 en 10 si quieres dejar espacio para insertar capítulos después: `10-`, `20-`, `30-`...).
2. Crea tu rama: `git checkout -b escritor/<tu-nombre>/<parte>-<capitulo>`.
3. Añade tu archivo `.md` (o carpeta de escenas) siguiendo la convención anterior. No edites archivos de otros capítulos.
4. Verifica que todo construye sin errores:
   ```bash
   npm run build
   npx serve dist   # o: python3 -m http.server -d dist
   ```
   Abre `http://localhost:3000/reader.html` (o el puerto que indique) para leer tu capítulo con paso de páginas real.
5. Sube tu rama y abre un Pull Request. El workflow `validate.yml` construirá el libro automáticamente para detectar errores de formato.
6. Al fusionar a la rama principal de publicación, `deploy-pages.yml` reconstruye y publica el sitio entero.

Como cada escritor toca únicamente sus propios archivos nuevos, los conflictos de fusión deberían ser prácticamente inexistentes.

## Qué NO editar a mano

- `dist/` — se genera automáticamente, no se versiona (está en `.gitignore`).
- Las páginas HTML por capítulo y la portada — se generan desde `content/` por `scripts/build.mjs`. Si necesitas cambiar el diseño, edita las plantillas en `scripts/build.mjs` o los estilos en `assets/css/`.

## Vista previa local

```bash
npm run build    # genera dist/
npm run serve    # genera y sirve dist/ en un servidor local
```
