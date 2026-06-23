#!/usr/bin/env node
// Generador estático del libro. Sin dependencias externas.
// Lee /content (markdown + json) y produce /dist (HTML + JSON listos para Pages).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = path.join(ROOT, "content");
const ASSETS_DIR = path.join(ROOT, "assets");
const DIST_DIR = path.join(ROOT, "dist");

const NUMBERED = /^(\d+)-(.+)$/;

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listNumbered(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => NUMBERED.test(e.name))
    .sort((a, b) => {
      const na = parseInt(a.name.match(NUMBERED)[1], 10);
      const nb = parseInt(b.name.match(NUMBERED)[1], 10);
      return na - nb;
    });
}

// --- Frontmatter (subconjunto YAML: solo pares clave: valor en una línea) ---
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const [, fmBlock, body] = match;
  const meta = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return { meta, body };
}

// --- Markdown mínimo: párrafos, *cursiva*, *** como corte de escena ---
// Devuelve un arreglo de bloques HTML (uno por párrafo o corte de escena),
// para que el lector paginado pueda medirlos y repartirlos en páginas.
function renderMarkdownBlocks(body) {
  return body
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => {
      const trimmed = block.trim();
      if (trimmed === "***") return '<div class="scene-break">⁘</div>';
      const escaped = trimmed
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
      return `<p>${escaped}</p>`;
    });
}

function readChapterFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  return { meta, blocks: renderMarkdownBlocks(body) };
}

function readChapterDir(dirPath) {
  const meta = readJSON(path.join(dirPath, "meta.json"));
  const scenes = listNumbered(dirPath).filter((e) => e.name.endsWith(".md"));
  let blocks = [];
  scenes.forEach((scene, i) => {
    const raw = fs.readFileSync(path.join(dirPath, scene.name), "utf8");
    const { body } = parseFrontmatter(raw);
    if (i > 0) blocks.push('<div class="scene-break">⁘</div>');
    blocks = blocks.concat(renderMarkdownBlocks(body));
  });
  return { meta, blocks };
}

function slugify(name) {
  return name.replace(NUMBERED, "$2").replace(/\.md$/, "");
}

// --- 1. Cargar contenido ---
const book = readJSON(path.join(CONTENT_DIR, "book.json"));
const parts = [];

for (const partEntry of listNumbered(CONTENT_DIR)) {
  if (!partEntry.isDirectory()) continue;
  const partDir = path.join(CONTENT_DIR, partEntry.name);
  const partMeta = readJSON(path.join(partDir, "part.json"));
  const chapters = [];

  for (const chEntry of listNumbered(partDir)) {
    if (chEntry.name === "part.json") continue;
    const fullPath = path.join(partDir, chEntry.name);
    const slug = slugify(chEntry.name);
    let meta, blocks;
    if (chEntry.isDirectory()) {
      ({ meta, blocks } = readChapterDir(fullPath));
    } else if (chEntry.name.endsWith(".md")) {
      ({ meta, blocks } = readChapterFile(fullPath));
    } else {
      continue;
    }
    chapters.push({ slug, title: meta.title, epigraph: meta.epigraph || null, author: meta.author || book.author, blocks });
  }

  parts.push({ id: partEntry.name.replace(NUMBERED, "$2"), label: partMeta.label, roman: partMeta.roman, chapters });
}

// Lista plana de capítulos para navegación prev/next y conteo global
const flatChapters = [];
parts.forEach((part) => part.chapters.forEach((ch) => flatChapters.push({ ...ch, partLabel: part.label, partRoman: part.roman })));
flatChapters.forEach((ch, i) => {
  ch.prev = flatChapters[i - 1]?.slug || null;
  ch.next = flatChapters[i + 1]?.slug || null;
  ch.number = i + 1;
});

// --- 2. Preparar /dist ---
fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST_DIR, "data"), { recursive: true });
fs.cpSync(ASSETS_DIR, path.join(DIST_DIR, "assets"), { recursive: true });

// --- 3. data/book.json para el lector paginado ---
fs.writeFileSync(
  path.join(DIST_DIR, "data", "book.json"),
  JSON.stringify({ ...book, parts }, null, 2)
);

// --- 4. Plantillas HTML ---
function pageShell({ title, body, activeNav = "" }) {
  return `<!doctype html>
<html lang="es" data-theme="day">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Cormorant+Garamond:wght@500;600;700&display=swap">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<div class="progress-bar" id="progress-bar"></div>
<header class="site-header">
  <a class="brand" href="index.html">${book.title}</a>
  <div class="header-actions">
    ${activeNav}
    <button id="theme-toggle">Noche</button>
  </div>
</header>
${body}
<footer class="site-footer">Cnosos, antes de la ceniza</footer>
<script src="assets/js/reader.js"></script>
</body>
</html>
`;
}

const ORNAMENT = `<div class="ornament">𐀒 𐀐 𐀒</div>`;

function coverHTML() {
  return `<section class="cover">
    <div class="kicker">${book.kicker}</div>
    <h1>${book.title}</h1>
    <p class="subtitle">${book.subtitle}</p>
    <p class="byline">Una novela de ${book.author}</p>
    <a class="cta-read" href="reader.html">Leer como libro →</a>
    <nav class="cover-nav">
      <a href="#sinopsis">Sinopsis</a>
      <a href="#personajes">Personajes</a>
      <a href="#indice">Índice</a>
      <a href="#nota-historica">Nota histórica</a>
    </nav>
  </section>`;
}

function frontispieceHTML() {
  if (!book.epigraph && !book.dedication) return "";
  return `<section class="frontispiece">
    ${book.epigraph ? `<blockquote class="book-epigraph">${book.epigraph}</blockquote>` : ""}
    ${book.dedication ? `<p class="dedication">${book.dedication}</p>` : ""}
  </section>`;
}

function synopsisHTML() {
  if (!book.synopsis || !book.synopsis.length) return "";
  const paras = book.synopsis.map((p) => `    <p>${p}</p>`).join("\n");
  return `<section class="matter synopsis" id="sinopsis">
    <h2>Sinopsis</h2>
${paras}
    ${book.contentWarning ? `<p class="content-note">${book.contentWarning}</p>` : ""}
  </section>`;
}

function dramatisHTML() {
  if (!book.dramatisPersonae || !book.dramatisPersonae.length) return "";
  const items = book.dramatisPersonae
    .map((c) => `      <li><span class="dp-name">${c.name}</span><span class="dp-role">${c.role}</span></li>`)
    .join("\n");
  return `<section class="matter dramatis" id="personajes">
    <h2>Dramatis Personae</h2>
    <ul>
${items}
    </ul>
  </section>`;
}

function tocHTML() {
  const items = flatChapters
    .map(
      (ch) => `      <li>
        <a href="${ch.slug}.html">
          <span class="toc-num">${ch.number}</span>
          <span class="toc-title">${ch.title}</span>
          <span class="toc-sub">${ch.partLabel}</span>
        </a>
      </li>`
    )
    .join("\n");
  return `<section class="toc" id="indice">
    <h2>Índice</h2>
    <ol>
${items}
    </ol>
  </section>`;
}

function historicalHTML() {
  if (!book.historicalNote || !book.historicalNote.length) return "";
  const paras = book.historicalNote.map((p) => `    <p>${p}</p>`).join("\n");
  return `<section class="matter historical" id="nota-historica">
    <h2>Nota histórica</h2>
${paras}
  </section>`;
}

function glossaryHTML() {
  if (!book.glossary || !book.glossary.length) return "";
  const items = book.glossary
    .map((g) => `      <div class="glossary-item"><dt>${g.term}</dt><dd>${g.def}</dd></div>`)
    .join("\n");
  return `<section class="matter glossary" id="glosario">
    <h2>Glosario</h2>
    <dl>
${items}
    </dl>
  </section>`;
}

function colophonHTML() {
  return `<section class="matter colophon">
    ${ORNAMENT}
    <p class="colophon-title">${book.title}</p>
    <p>© ${book.year || ""} ${book.author}. Obra de ficción.</p>
    <p class="colophon-note">Inspirada libremente en la Creta minoica. Cualquier parecido entre la corte de Cnosos y cualquier corte viva queda a cuenta del lector.</p>
  </section>`;
}

function homeHTML() {
  return `<main class="page home">
  ${coverHTML()}
  ${frontispieceHTML()}
  ${ORNAMENT}
  ${synopsisHTML()}
  ${dramatisHTML()}
  ${ORNAMENT}
  ${tocHTML()}
  ${ORNAMENT}
  ${historicalHTML()}
  ${glossaryHTML()}
  ${colophonHTML()}
</main>`;
}

fs.writeFileSync(path.join(DIST_DIR, "index.html"), pageShell({ title: `${book.title} — ${book.author}`, body: homeHTML() }));

function chapterHTML(ch) {
  const navPrev = ch.prev ? `<a class="prev" href="${ch.prev}.html"><span class="label">Anterior</span>${flatChapters.find((c) => c.slug === ch.prev).title}</a>` : `<a class="prev" href="index.html"><span class="label">Índice</span>Volver al índice</a>`;
  const navNext = ch.next ? `<a class="next" href="${ch.next}.html"><span class="label">Siguiente</span>${flatChapters.find((c) => c.slug === ch.next).title}</a>` : `<a class="next" href="index.html"><span class="label">Fin</span>Volver al índice</a>`;
  return `<main class="page">
  <div class="chapter-head">
    <div class="part-label">${ch.partLabel}</div>
    <h1>${ch.title}</h1>
    ${ch.epigraph ? `<p class="part-epigraph">${ch.epigraph}</p>` : ""}
  </div>

  <article>
${ch.blocks.join("\n")}
  </article>

  <p class="reader-link"><a href="reader.html#${ch.slug}">Leer este capítulo en modo libro →</a></p>

  <div class="chapter-nav">
    ${navPrev}
    ${navNext}
  </div>
</main>`;
}

for (const ch of flatChapters) {
  fs.writeFileSync(path.join(DIST_DIR, `${ch.slug}.html`), pageShell({ title: `${ch.title} — ${book.title}`, body: chapterHTML(ch) }));
}

// --- 5. reader.html: app del lector paginado ---
const readerBody = `<div class="reader-app" id="reader-app" data-mode="book">
  <header class="reader-bar">
    <button id="toc-toggle" class="icon-btn" aria-label="Índice">☰</button>
    <div class="reader-bar-title">
      <span id="reader-chapter-title">${book.title}</span>
      <span id="reader-part-label"></span>
    </div>
    <div class="reader-bar-actions">
      <button id="font-dec" class="icon-btn" aria-label="Reducir letra">A−</button>
      <button id="font-inc" class="icon-btn" aria-label="Aumentar letra">A+</button>
      <button id="reader-mode-toggle" class="icon-btn" aria-label="Modo continuo" title="Cambiar a lectura continua">▤</button>
      <button id="reader-theme-toggle" class="icon-btn" aria-label="Modo noche">☾</button>
    </div>
  </header>

  <nav class="toc-drawer" id="toc-drawer" aria-hidden="true">
    <h2>Índice</h2>
    <a class="toc-home-link" href="index.html">⌂ Volver a portada</a>
    <ol id="toc-drawer-list"></ol>
  </nav>
  <div class="toc-overlay" id="toc-overlay"></div>

  <main class="book-viewport" id="book-viewport">
    <div class="zone zone-prev" id="zone-prev" aria-label="Página anterior"></div>
    <div class="book-page" id="book-page"></div>
    <div class="zone zone-next" id="zone-next" aria-label="Página siguiente"></div>
    <div class="book-scroll" id="book-scroll"></div>
    <div class="book-page" id="book-measurer" aria-hidden="true"></div>
  </main>

  <footer class="reader-footer">
    <button id="page-prev" class="icon-btn">‹</button>
    <span id="reader-progress">Página 1 de 1</span>
    <button id="page-next" class="icon-btn">›</button>
  </footer>
</div>`;

fs.writeFileSync(
  path.join(DIST_DIR, "reader.html"),
  `<!doctype html>
<html lang="es" data-theme="day">
<head>
<meta charset="utf-8">
<title>Leer — ${book.title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Cormorant+Garamond:wght@500;600;700&display=swap">
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/reader-app.css">
</head>
<body>
${readerBody}
<script src="assets/js/book-reader.js"></script>
</body>
</html>
`
);

console.log(`Construido: ${flatChapters.length} capítulos en ${parts.length} partes -> dist/`);
