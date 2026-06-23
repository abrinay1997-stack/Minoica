(function () {
  var THEME_KEY = "minoica-theme";
  var POSITION_KEY = "minoica-position";
  var FONT_KEY = "minoica-font-scale";
  var MODE_KEY = "minoica-mode"; // "book" | "scroll"

  var book = null;
  var flatChapters = [];
  var pagesCache = {}; // chapterIndex -> [pageHtml, ...]
  var mode = "book";
  var state = { chapterIndex: 0, pageIndex: 0 };

  var el = {};

  function cacheEls() {
    el.app = document.getElementById("reader-app");
    el.viewport = document.getElementById("book-viewport");
    el.page = document.getElementById("book-page");
    el.measurer = document.getElementById("book-measurer");
    el.scroll = document.getElementById("book-scroll");
    el.zonePrev = document.getElementById("zone-prev");
    el.zoneNext = document.getElementById("zone-next");
    el.pagePrev = document.getElementById("page-prev");
    el.pageNext = document.getElementById("page-next");
    el.progress = document.getElementById("reader-progress");
    el.chapterTitle = document.getElementById("reader-chapter-title");
    el.partLabel = document.getElementById("reader-part-label");
    el.tocToggle = document.getElementById("toc-toggle");
    el.tocDrawer = document.getElementById("toc-drawer");
    el.tocOverlay = document.getElementById("toc-overlay");
    el.tocList = document.getElementById("toc-drawer-list");
    el.fontInc = document.getElementById("font-inc");
    el.fontDec = document.getElementById("font-dec");
    el.themeToggle = document.getElementById("reader-theme-toggle");
    el.modeToggle = document.getElementById("reader-mode-toggle");
  }

  function flatten() {
    flatChapters = [];
    book.parts.forEach(function (part) {
      part.chapters.forEach(function (ch) {
        flatChapters.push({
          slug: ch.slug,
          title: ch.title,
          epigraph: ch.epigraph,
          blocks: ch.blocks,
          partLabel: part.label
        });
      });
    });
  }

  function buildToc() {
    el.tocList.innerHTML = "";
    book.parts.forEach(function (part) {
      var divider = document.createElement("li");
      divider.className = "part-divider";
      divider.textContent = part.label;
      el.tocList.appendChild(divider);
      part.chapters.forEach(function (ch) {
        var li = document.createElement("li");
        var btn = document.createElement("button");
        btn.textContent = ch.title;
        btn.dataset.slug = ch.slug;
        btn.addEventListener("click", function () {
          goToChapter(indexOfSlug(ch.slug), 0);
          closeToc();
        });
        li.appendChild(btn);
        el.tocList.appendChild(li);
      });
    });
  }

  function indexOfSlug(slug) {
    for (var i = 0; i < flatChapters.length; i++) {
      if (flatChapters[i].slug === slug) return i;
    }
    return 0;
  }

  function openToc() {
    el.tocDrawer.classList.add("open");
    el.tocDrawer.setAttribute("aria-hidden", "false");
    el.tocOverlay.classList.add("open");
  }
  function closeToc() {
    el.tocDrawer.classList.remove("open");
    el.tocDrawer.setAttribute("aria-hidden", "true");
    el.tocOverlay.classList.remove("open");
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    if (el.themeToggle) el.themeToggle.textContent = theme === "night" ? "☀" : "☾";
  }

  function getFontScale() {
    return parseFloat(localStorage.getItem(FONT_KEY)) || 1;
  }

  function applyFontScale(scale) {
    document.documentElement.style.setProperty("--reader-font-scale", scale);
    el.page.style.fontSize = scale + "em";
    el.measurer.style.fontSize = scale + "em";
    el.scroll.style.fontSize = scale + "em";
    localStorage.setItem(FONT_KEY, String(scale));
  }

  // --- Bloques (cabecera del capítulo + párrafos) ---
  function headBlockHTML(ch) {
    return (
      '<div class="chapter-head"><div class="part-label">' + ch.partLabel + "</div><h1>" + ch.title + "</h1>" +
      (ch.epigraph ? '<p class="part-epigraph">' + ch.epigraph + "</p>" : "") +
      "</div>"
    );
  }

  function getAllBlocks(index) {
    var ch = flatChapters[index];
    if (!ch._allBlocks) {
      ch._allBlocks = [headBlockHTML(ch)].concat(ch.blocks);
    }
    return ch._allBlocks;
  }

  // Letra capital en el primer párrafo del HTML dado.
  function withDropCap(html) {
    return html.replace(/<p>/, '<p class="first-of-page">');
  }

  // --- Paginación manual: reparte bloques hasta que dejan de caber
  //     en la altura visible de la página. Mide con un nodo oculto. ---
  function paginateBlocks(blocks) {
    var pageHeight = el.page.clientHeight;
    // Si por cualquier motivo no hay altura medible, devolvemos todo junto;
    // el modo scroll sigue siendo legible y reflow lo corregirá.
    if (!pageHeight || pageHeight < 40) return [withDropCap(blocks.join(""))];

    el.measurer.style.width = el.page.clientWidth + "px";
    var pages = [];
    var current = [];

    for (var i = 0; i < blocks.length; i++) {
      current.push(blocks[i]);
      el.measurer.innerHTML = current.join("");
      if (el.measurer.scrollHeight > pageHeight) {
        if (current.length === 1) {
          pages.push(current.join(""));
          current = [];
        } else {
          var overflow = current.pop();
          pages.push(current.join(""));
          current = [overflow];
        }
      }
    }
    if (current.length) pages.push(current.join(""));
    if (!pages.length) pages = [""];
    // Letra capital al inicio de cada página.
    return pages.map(withDropCap);
  }

  function getPagesForChapter(index) {
    if (!pagesCache[index]) {
      pagesCache[index] = paginateBlocks(getAllBlocks(index));
    }
    return pagesCache[index];
  }

  function invalidatePagination() {
    pagesCache = {};
  }

  // --- Fracción de avance dentro del capítulo (0..1), compartida entre modos ---
  function currentFraction() {
    if (mode === "scroll") {
      var max = el.scroll.scrollHeight - el.scroll.clientHeight;
      return max > 0 ? el.scroll.scrollTop / max : 0;
    }
    var pages = getPagesForChapter(state.chapterIndex);
    return pages.length > 1 ? state.pageIndex / (pages.length - 1) : 0;
  }

  function setHeader(ch) {
    el.chapterTitle.textContent = ch.title;
    el.partLabel.textContent = ch.partLabel;
  }

  function showPageContent(html, skipAnimation) {
    if (skipAnimation) {
      el.page.innerHTML = html;
      return;
    }
    el.page.classList.add("is-turning");
    setTimeout(function () {
      el.page.innerHTML = html;
      requestAnimationFrame(function () {
        el.page.classList.remove("is-turning");
      });
    }, 140);
  }

  // --- Render según el modo ---
  function renderBook(skipAnimation) {
    var pages = getPagesForChapter(state.chapterIndex);
    state.pageIndex = Math.max(0, Math.min(state.pageIndex, pages.length - 1));
    setHeader(flatChapters[state.chapterIndex]);
    el.progress.textContent = "Página " + (state.pageIndex + 1) + " de " + pages.length;
    showPageContent(pages[state.pageIndex], skipAnimation);
  }

  function renderScroll() {
    var ch = flatChapters[state.chapterIndex];
    setHeader(ch);
    el.scroll.innerHTML = withDropCap(getAllBlocks(state.chapterIndex).join(""));
    el.scroll.scrollTop = 0;
    updateScrollProgress();
  }

  function updateScrollProgress() {
    var max = el.scroll.scrollHeight - el.scroll.clientHeight;
    var pct = max > 0 ? Math.round((el.scroll.scrollTop / max) * 100) : 0;
    el.progress.textContent = "Lectura " + pct + "%";
  }

  // Coloca la lectura en una fracción 0..1 del capítulo actual.
  function applyFraction(fraction) {
    if (mode === "scroll") {
      var max = el.scroll.scrollHeight - el.scroll.clientHeight;
      el.scroll.scrollTop = Math.round(fraction * max);
      updateScrollProgress();
    } else {
      var pages = getPagesForChapter(state.chapterIndex);
      state.pageIndex = Math.round(fraction * (pages.length - 1)) || 0;
      renderBook(true);
    }
    savePosition();
  }

  function savePosition() {
    var payload = {
      slug: flatChapters[state.chapterIndex].slug,
      fraction: currentFraction(),
      mode: mode
    };
    localStorage.setItem(POSITION_KEY, JSON.stringify(payload));
    history.replaceState(null, "", "#" + payload.slug);
  }

  function goToChapter(index, fraction) {
    if (index < 0 || index >= flatChapters.length) return;
    state.chapterIndex = index;
    if (mode === "scroll") {
      renderScroll();
      if (fraction) applyFraction(fraction);
    } else {
      var pages = getPagesForChapter(index);
      state.pageIndex = fraction === "last" ? pages.length - 1 : Math.round((fraction || 0) * (pages.length - 1)) || 0;
      renderBook(false);
    }
    savePosition();
  }

  function goNext() {
    if (mode === "scroll") {
      if (state.chapterIndex + 1 < flatChapters.length) goToChapter(state.chapterIndex + 1, 0);
      return;
    }
    var pages = getPagesForChapter(state.chapterIndex);
    if (state.pageIndex + 1 < pages.length) {
      state.pageIndex++;
      renderBook(false);
      savePosition();
    } else if (state.chapterIndex + 1 < flatChapters.length) {
      goToChapter(state.chapterIndex + 1, 0);
    }
  }

  function goPrev() {
    if (mode === "scroll") {
      if (state.chapterIndex > 0) goToChapter(state.chapterIndex - 1, 0);
      return;
    }
    if (state.pageIndex > 0) {
      state.pageIndex--;
      renderBook(false);
      savePosition();
    } else if (state.chapterIndex > 0) {
      goToChapter(state.chapterIndex - 1, "last");
    }
  }

  // --- Cambio de modo conservando la posición de lectura ---
  function applyMode(next, preserve) {
    var fraction = preserve ? currentFraction() : 0;
    mode = next;
    el.app.setAttribute("data-mode", mode);
    localStorage.setItem(MODE_KEY, mode);
    if (el.modeToggle) {
      el.modeToggle.textContent = mode === "book" ? "▤" : "▭";
      el.modeToggle.setAttribute("aria-label", mode === "book" ? "Modo continuo" : "Modo libro");
      el.modeToggle.title = mode === "book" ? "Cambiar a lectura continua" : "Cambiar a paso de páginas";
    }
    if (mode === "scroll") {
      renderScroll();
    } else {
      // recalcula páginas con las dimensiones reales del modo libro
      invalidatePagination();
      var pages = getPagesForChapter(state.chapterIndex);
      state.pageIndex = Math.round(fraction * (pages.length - 1)) || 0;
      renderBook(true);
    }
    if (preserve && mode === "scroll") applyFraction(fraction);
    savePosition();
  }

  function initSwipe() {
    var startX = null, startY = null;
    el.viewport.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    el.viewport.addEventListener("touchend", function (e) {
      if (startX === null || mode !== "book") { startX = null; return; }
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goNext();
        else goPrev();
      }
      startX = null;
      startY = null;
    }, { passive: true });
  }

  function reflow() {
    if (mode === "scroll") {
      updateScrollProgress();
      return;
    }
    var fraction = currentFraction();
    invalidatePagination();
    var pages = getPagesForChapter(state.chapterIndex);
    state.pageIndex = Math.round(fraction * (pages.length - 1)) || 0;
    renderBook(true);
  }

  function initEvents() {
    el.zoneNext.addEventListener("click", goNext);
    el.zonePrev.addEventListener("click", goPrev);
    el.pageNext.addEventListener("click", goNext);
    el.pagePrev.addEventListener("click", goPrev);

    el.scroll.addEventListener("scroll", function () {
      if (mode === "scroll") {
        updateScrollProgress();
        clearTimeout(el.scroll._t);
        el.scroll._t = setTimeout(savePosition, 250);
      }
    }, { passive: true });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeToc(); return; }
      if (mode === "book") {
        if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
        if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      }
    });

    el.tocToggle.addEventListener("click", function () {
      el.tocDrawer.classList.contains("open") ? closeToc() : openToc();
    });
    el.tocOverlay.addEventListener("click", closeToc);

    el.themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "night" ? "day" : "night");
    });

    el.modeToggle.addEventListener("click", function () {
      applyMode(mode === "book" ? "scroll" : "book", true);
    });

    el.fontInc.addEventListener("click", function () {
      applyFontScale(Math.min(1.6, getFontScale() + 0.1));
      reflow();
    });
    el.fontDec.addEventListener("click", function () {
      applyFontScale(Math.max(0.75, getFontScale() - 0.1));
      reflow();
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(reflow, 200);
    });
    window.addEventListener("orientationchange", function () {
      setTimeout(reflow, 300);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(reflow);
    }
  }

  function initialPosition() {
    var hash = location.hash.replace("#", "");
    if (hash) return { index: indexOfSlug(hash), fraction: 0 };
    var saved = localStorage.getItem(POSITION_KEY);
    if (saved) {
      try {
        var pos = JSON.parse(saved);
        return { index: indexOfSlug(pos.slug), fraction: pos.fraction || 0 };
      } catch (e) {}
    }
    return { index: 0, fraction: 0 };
  }

  function showError(message) {
    if (el.page) {
      el.page.innerHTML = '<div class="reader-error"><p>' + message + "</p>" +
        '<p><a href="index.html">Volver al índice</a></p></div>';
      el.page.classList.remove("is-turning");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    cacheEls();
    applyTheme(localStorage.getItem(THEME_KEY) || "day");
    applyFontScale(getFontScale());
    mode = localStorage.getItem(MODE_KEY) === "scroll" ? "scroll" : "book";
    el.app.setAttribute("data-mode", mode);

    fetch("data/book.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        book = data;
        flatten();
        if (!flatChapters.length) throw new Error("Sin capítulos");
        buildToc();
        initEvents();
        initSwipe();
        applyMode(mode, false); // fija etiqueta y data-mode
        var start = initialPosition();
        goToChapter(start.index, start.fraction);
      })
      .catch(function (err) {
        showError("No se pudo cargar el libro (" + err.message + "). Recarga la página o vuelve al índice.");
      });
  });
})();
