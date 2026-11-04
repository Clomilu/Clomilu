document.addEventListener("DOMContentLoaded", () => {
  const currentButton = document.querySelector(".lang-current");
  const menu = document.querySelector(".lang-menu");
  const languageButtons = document.querySelectorAll(".lang-menu button");
  const supported = ["fr", "de", "en", "es", "it", "ru", "sv"];

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
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
  const value = getValue(translations[lang], element.dataset.i18nAriaLabel);
  if (value !== undefined) element.setAttribute("aria-label", value);
});
    // Placeholder для textarea и input
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const value = getValue(translations[lang], element.dataset.i18nPlaceholder);
      if (value !== undefined) element.setAttribute("placeholder", value);
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

    document.dispatchEvent(new CustomEvent("clomilu-language-changed", {
    detail: { lang }
    }));
  }
        // Переключение языка в настройках приложения
  document.querySelectorAll(".settings-lang").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const newLang = button.dataset.lang;
      
      // 1. Сохраняем язык в память (чтобы он не сбросился при переходе)
      localStorage.setItem("clomilu-language", newLang);
      
      // 2. Применяем перевод на текущей странице
      setLanguage(newLang); 
    });
  });

    // Обработчики языкового переключателя
  if (currentButton && menu) {
    currentButton.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.toggle("open");
      currentButton.setAttribute("aria-expanded", menu.classList.contains("open") ? "true" : "false");
    });

    // Выбор языка
    languageButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        setLanguage(button.dataset.lang);
      });
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
