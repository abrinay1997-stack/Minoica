(function () {
  var THEME_KEY = "minoica-theme";
  var POSITION_KEY = "minoica-position";
  var FONT_KEY = "minoica-font-scale";

  var book = null;
  var flatChapters = [];
  var state = { chapterIndex: 0, page: 0, totalPages: 1, pageStep: 0, viewportWidth: 0, gap: 64 };

  var el = {};

  function cacheEls() {
    el.viewport = document.getElementById("book-viewport");
    el.content = document.getElementById("book-content");
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
        flatChapters.push({ slug: ch.slug, title: ch.title, epigraph: ch.epigraph, html: ch.html, partLabel: part.label });
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
    el.tocOverlay.classList.add("open");
  }
  function closeToc() {
    el.tocDrawer.classList.remove("open");
    el.tocOverlay.classList.remove("open");
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    if (el.themeToggle) el.themeToggle.textContent = theme === "night" ? "☀" : "☾";
  }

  function applyFontScale(scale) {
    el.content.style.fontSize = scale + "em";
    localStorage.setItem(FONT_KEY, String(scale));
  }

  function getFontScale() {
    return parseFloat(el.content.style.fontSize) || parseFloat(localStorage.getItem(FONT_KEY)) || 1;
  }

  function renderChapter(index) {
    var ch = flatChapters[index];
    el.content.innerHTML =
      '<div class="chapter-head"><div class="part-label">' + ch.partLabel + '</div><h1>' + ch.title + "</h1>" +
      (ch.epigraph ? '<p class="part-epigraph">' + ch.epigraph + "</p>" : "") +
      "</div><article>" + ch.html + "</article>";
    el.chapterTitle.textContent = ch.title;
    el.partLabel.textContent = ch.partLabel;
  }

  function measurePagination() {
    var rect = el.viewport.getBoundingClientRect();
    state.viewportWidth = rect.width;
    state.gap = parseFloat(getComputedStyle(el.content).columnGap) || 64;
    el.content.style.columnWidth = state.viewportWidth + "px";
    state.pageStep = state.viewportWidth + state.gap;
    // Forzar reflow antes de medir
    var scrollWidth = el.content.scrollWidth;
    state.totalPages = Math.max(1, Math.round((scrollWidth + state.gap) / state.pageStep));
  }

  function updateTransform() {
    el.content.style.transform = "translateX(-" + state.page * state.pageStep + "px)";
    el.progress.textContent = "Página " + (state.page + 1) + " de " + state.totalPages;
  }

  function savePosition() {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ slug: flatChapters[state.chapterIndex].slug, page: state.page }));
    history.replaceState(null, "", "#" + flatChapters[state.chapterIndex].slug);
  }

  function goToChapter(index, page) {
    if (index < 0 || index >= flatChapters.length) return;
    state.chapterIndex = index;
    renderChapter(index);
    requestAnimationFrame(function () {
      measurePagination();
      state.page = page === "last" ? state.totalPages - 1 : Math.min(page, state.totalPages - 1);
      updateTransform();
      savePosition();
    });
  }

  function goNext() {
    if (state.page + 1 < state.totalPages) {
      state.page++;
      updateTransform();
      savePosition();
    } else if (state.chapterIndex + 1 < flatChapters.length) {
      goToChapter(state.chapterIndex + 1, 0);
    }
  }

  function goPrev() {
    if (state.page > 0) {
      state.page--;
      updateTransform();
      savePosition();
    } else if (state.chapterIndex > 0) {
      goToChapter(state.chapterIndex - 1, "last");
    }
  }

  function initSwipe() {
    var startX = null, startY = null;
    el.viewport.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });
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
    });
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
      var scale = Math.min(1.6, getFontScale() + 0.1);
      applyFontScale(scale);
      goToChapter(state.chapterIndex, state.page);
    });
    el.fontDec.addEventListener("click", function () {
      var scale = Math.max(0.7, getFontScale() - 0.1);
      applyFontScale(scale);
      goToChapter(state.chapterIndex, state.page);
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var fraction = state.totalPages > 1 ? state.page / (state.totalPages - 1) : 0;
        measurePagination();
        state.page = Math.round(fraction * (state.totalPages - 1)) || 0;
        updateTransform();
      }, 150);
    });
  }

  function initialChapterAndPage() {
    var hash = location.hash.replace("#", "");
    if (hash) {
      var idx = indexOfSlug(hash);
      return { index: idx, page: 0 };
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
    var savedScale = localStorage.getItem(FONT_KEY);
    if (savedScale) el.content.style.fontSize = savedScale + "em";

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
