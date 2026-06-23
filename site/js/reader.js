(function () {
  var THEME_KEY = "minoica-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "night" ? "Día" : "Noche";
  }

  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY) || "day";
    applyTheme(saved);
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        applyTheme(current === "night" ? "day" : "night");
      });
    }
  }

  function initProgress() {
    var bar = document.getElementById("progress-bar");
    if (!bar) return;
    window.addEventListener("scroll", function () {
      var doc = document.documentElement;
      var scrolled = doc.scrollTop;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? (scrolled / max) * 100 : 0;
      bar.style.width = pct + "%";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initProgress();
  });
})();
