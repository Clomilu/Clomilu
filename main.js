document.addEventListener("DOMContentLoaded", () => {
  const currentButton = document.querySelector(".lang-current");
  const menu = document.querySelector(".lang-menu");
  const languageButtons = document.querySelectorAll(".lang-menu button");
  const supported = ["fr", "en", "ru", "es"];

  function getValue(obj, path) {
    return path.split(".").reduce((value, key) => value && value[key], obj);
  }

  function setLanguage(lang) {
    if (!supported.includes(lang) || !translations[lang]) return;

    document.documentElement.lang = lang;

    // Title меняем только на страницах, где он не задан статически
    // (legal- и auth-страницы имеют свой title в HTML — не трогаем)
    const hasStaticTitle =
      document.body.classList.contains("legal-page") ||
      document.body.classList.contains("auth-page");
    if (!hasStaticTitle) {
      document.title = translations[lang].metaTitle;
    }

    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", translations[lang].metaDescription);

    // Обычные текстовые элементы
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = getValue(translations[lang], element.dataset.i18n);
      if (value !== undefined) element.innerHTML = value;
    });

    // Placeholder у input-ов
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const value = getValue(translations[lang], element.dataset.i18nPlaceholder);
      if (value !== undefined) element.placeholder = value;
    });

    // Переключатель языка — только если он есть на странице
    if (currentButton) {
      currentButton.textContent = lang.toUpperCase();
      currentButton.setAttribute("aria-expanded", "false");
    }
    if (menu) {
      menu.classList.remove("open");
    }
    if (languageButtons.length) {
      languageButtons.forEach((button) => {
        button.hidden = button.dataset.lang === lang;
      });
    }

    localStorage.setItem("clomilu-language", lang);
  }

  // Обработчики языкового переключателя (если он есть на странице)
  if (currentButton && menu) {
    currentButton.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.toggle("open");
      currentButton.setAttribute("aria-expanded", menu.classList.contains("open") ? "true" : "false");
    });

    languageButtons.forEach((button) => {
      button.addEventListener("click", () => setLanguage(button.dataset.lang));
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".language-switcher")) {
        menu.classList.remove("open");
        currentButton.setAttribute("aria-expanded", "false");
      }
    });
  }
  document.querySelectorAll("[data-auth-cta]").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (localStorage.getItem("clomilu-auth") === "true") {
        e.preventDefault();
        window.location.href = "app.html";
      }
    });
  });
  
  // Определяем язык и запускаем
  const saved = localStorage.getItem("clomilu-language");
  const browser = navigator.language ? navigator.language.slice(0, 2).toLowerCase() : "";
  const initial = supported.includes(saved) ? saved : (supported.includes(browser) ? browser : "fr");
  setLanguage(initial);
});
