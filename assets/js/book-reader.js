(function () {
  var THEME_KEY = "minoica-theme";
  var POSITION_KEY = "minoica-position";
  var FONT_KEY = "minoica-font-scale";

  var book = null;
  var flatChapters = [];
  var pagesCache = {}; // chapterIndex -> [pageHtml, ...]
  var state = { chapterIndex: 0, pageIndex: 0 };

  var el = {};

  function cacheEls() {
    el.viewport = document.getElementById("book-viewport");
    el.page = document.getElementById("book-page");
    el.measurer = document.getElementById("book-measurer");
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
  }

  function flatten() {
    flatChapters = [];
    book.parts.forEach(function (part) {
      part.chapters.forEach(function (ch) {
        flatChapters.push({ slug: ch.slug, title: ch.title, epigraph: ch.epigraph, blocks: ch.blocks, partLabel: part.label });
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
    localStorage.setItem(FONT_KEY, String(scale));
  }

  // --- Construcción de bloques (cabecera del capítulo + párrafos) ---
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
      var blocks = [headBlockHTML(ch)];
      ch.blocks.forEach(function (block, i) {
        if (i === 0 && block.indexOf("<p>") === 0) {
          block = block.replace("<p>", '<p class="first-of-page">');
        }
        blocks.push(block);
      });
      ch._allBlocks = blocks;
    }
    return ch._allBlocks;
  }

  // --- Paginación manual: reparte bloques de bloque en bloque hasta que
  //     dejan de caber en la altura visible de la página. ---
  function paginateBlocks(blocks) {
    el.measurer.style.width = el.page.clientWidth + "px";
    var pageHeight = el.page.clientHeight;
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
    return pages.length ? pages : [""];
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

  function showPageContent(html) {
    el.page.classList.add("is-turning");
    setTimeout(function () {
      el.page.innerHTML = html;
      requestAnimationFrame(function () {
        el.page.classList.remove("is-turning");
      });
    }, 140);
  }

  function savePosition() {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ slug: flatChapters[state.chapterIndex].slug, page: state.pageIndex }));
    history.replaceState(null, "", "#" + flatChapters[state.chapterIndex].slug);
  }

  function renderCurrentPage(skipAnimation) {
    var pages = getPagesForChapter(state.chapterIndex);
    state.pageIndex = Math.max(0, Math.min(state.pageIndex, pages.length - 1));
    var ch = flatChapters[state.chapterIndex];
    el.chapterTitle.textContent = ch.title;
    el.partLabel.textContent = ch.partLabel;
    el.progress.textContent = "Página " + (state.pageIndex + 1) + " de " + pages.length;
    if (skipAnimation) {
      el.page.innerHTML = pages[state.pageIndex];
    } else {
      showPageContent(pages[state.pageIndex]);
    }
    savePosition();
  }

  function goToChapter(index, page) {
    if (index < 0 || index >= flatChapters.length) return;
    state.chapterIndex = index;
    var pages = getPagesForChapter(index);
    state.pageIndex = page === "last" ? pages.length - 1 : page || 0;
    renderCurrentPage(false);
  }

  function goNext() {
    var pages = getPagesForChapter(state.chapterIndex);
    if (state.pageIndex + 1 < pages.length) {
      state.pageIndex++;
      renderCurrentPage(false);
    } else if (state.chapterIndex + 1 < flatChapters.length) {
      goToChapter(state.chapterIndex + 1, 0);
    }
  }

  function goPrev() {
    if (state.pageIndex > 0) {
      state.pageIndex--;
      renderCurrentPage(false);
    } else if (state.chapterIndex > 0) {
      goToChapter(state.chapterIndex - 1, "last");
    }
  }

  function initSwipe() {
    var startX = null, startY = null;
    el.viewport.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    el.viewport.addEventListener("touchend", function (e) {
      if (startX === null) return;
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

  function reflow(preserveFraction) {
    var pagesBefore = getPagesForChapter(state.chapterIndex);
    var fraction = pagesBefore.length > 1 ? state.pageIndex / (pagesBefore.length - 1) : 0;
    invalidatePagination();
    var pagesAfter = getPagesForChapter(state.chapterIndex);
    state.pageIndex = preserveFraction ? Math.round(fraction * (pagesAfter.length - 1)) : 0;
    renderCurrentPage(true);
  }

  function initEvents() {
    el.zoneNext.addEventListener("click", goNext);
    el.zonePrev.addEventListener("click", goPrev);
    el.pageNext.addEventListener("click", goNext);
    el.pagePrev.addEventListener("click", goPrev);

    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") closeToc();
    });

    el.tocToggle.addEventListener("click", function () {
      el.tocDrawer.classList.contains("open") ? closeToc() : openToc();
    });
    el.tocOverlay.addEventListener("click", closeToc);

    el.themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "night" ? "day" : "night");
    });

    el.fontInc.addEventListener("click", function () {
      applyFontScale(Math.min(1.5, getFontScale() + 0.1));
      reflow(true);
    });
    el.fontDec.addEventListener("click", function () {
      applyFontScale(Math.max(0.75, getFontScale() - 0.1));
      reflow(true);
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        reflow(true);
      }, 200);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        reflow(true);
      });
    }
  }

  function initialChapterAndPage() {
    var hash = location.hash.replace("#", "");
    if (hash) {
      return { index: indexOfSlug(hash), page: 0 };
    }
    var saved = localStorage.getItem(POSITION_KEY);
    if (saved) {
      try {
        var pos = JSON.parse(saved);
        return { index: indexOfSlug(pos.slug), page: pos.page || 0 };
      } catch (e) {}
    }
    return { index: 0, page: 0 };
  }

  document.addEventListener("DOMContentLoaded", function () {
    cacheEls();
    applyTheme(localStorage.getItem(THEME_KEY) || "day");
    applyFontScale(getFontScale());

    fetch("data/book.json")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        book = data;
        flatten();
        buildToc();
        initEvents();
        initSwipe();
        var start = initialChapterAndPage();
        goToChapter(start.index, start.page);
      });
  });
})();
