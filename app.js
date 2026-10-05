document.addEventListener("DOMContentLoaded", async () => {
  const sb = initSupabase();
  if (!sb) {
    console.error("Supabase не инициализирован");
    return;
  }

  // ==== Route guard ====
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  // ==== Показ email на /settings ====
  const emailEl = document.getElementById("settings-email");
  if (emailEl && session.user) {
    emailEl.textContent = session.user.email || "—";
  }

  // ==== SignOut — на любой странице ====
  const signoutBtn = document.getElementById("app-signout") || document.getElementById("settings-signout");
  if (signoutBtn) {
    signoutBtn.addEventListener("click", async () => {
      await sb.auth.signOut();
      window.location.href = "index.html";
    });
  }

  // ==== Мобильный sidebar ====
  const menuBtn = document.querySelector(".app-menu-btn");
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("app-overlay");

  function openSidebar() {
    sidebar.classList.add("is-open");
    overlay.hidden = false;
  }
  function closeSidebar() {
    sidebar.classList.remove("is-open");
    overlay.hidden = true;
  }

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", openSidebar);
    overlay.addEventListener("click", closeSidebar);
  }
  if (sidebar) {
    sidebar.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeSidebar);
    });
  }

  // ==== Поле ввода (только на /app) ====
  const inputForm = document.getElementById("app-input");
  if (inputForm) {
    const textarea = inputForm.querySelector("textarea");
    const sendBtn = inputForm.querySelector(".app-send");

    function autoResize() {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
      sendBtn.disabled = textarea.value.trim().length === 0;
    }

    textarea.addEventListener("input", autoResize);
    autoResize();

    inputForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;
      // TODO: отправка сообщения
      console.log("Send:", text);
      textarea.value = "";
      autoResize();
    });
  }

  // ==== Переключатель языка на /settings ====
  const langButtons = document.querySelectorAll(".settings-lang");
  if (langButtons.length) {
    const currentLang = document.documentElement.lang || "fr";
    langButtons.forEach((btn) => {
      if (btn.dataset.lang === currentLang) {
        btn.classList.add("is-active");
      }
      btn.addEventListener("click", () => {
        // Триггерим setLanguage — она доступна из main.js
        // Но main.js — отдельный scope. Проще — перезагрузить через localStorage.
        localStorage.setItem("clomilu-language", btn.dataset.lang);
        window.location.reload();
      });
    });
  }
});
  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", openSidebar);
    overlay.addEventListener("click", closeSidebar);
  }

  // Закрытие sidebar при клике на ссылку внутри (на мобильном)
  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  // ==== Поле ввода: авторазмер + активная кнопка ====
  const inputForm = document.getElementById("app-input");
  const textarea = inputForm.querySelector("textarea");
  const sendBtn = inputForm.querySelector(".app-send");

  function autoResize() {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    sendBtn.disabled = textarea.value.trim().length === 0;
  }

  textarea.addEventListener("input", autoResize);
  autoResize();

  // ==== Отправка (пока заглушка) ====
  inputForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;
    // TODO: подключить реальную отправку сообщения через Supabase
    console.log("Send:", text);
    textarea.value = "";
    autoResize();
  });

