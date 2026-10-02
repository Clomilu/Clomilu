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
    document.title = translations[lang].metaTitle;

    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", translations[lang].metaDescription);

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = getValue(translations[lang], element.dataset.i18n);
      if (value !== undefined) element.innerHTML = value;
    });

    currentButton.textContent = lang.toUpperCase();

    languageButtons.forEach((button) => {
      button.hidden = button.dataset.lang === lang;
    });

    localStorage.setItem("clomilu-language", lang);
    menu.classList.remove("open");
    currentButton.setAttribute("aria-expanded", "false");
  }

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

  const saved = localStorage.getItem("clomilu-language");
  const browser = navigator.language ? navigator.language.slice(0, 2).toLowerCase() : "";
  const initial = supported.includes(saved) ? saved : (supported.includes(browser) ? browser : "fr");
  setLanguage(initial);
});
