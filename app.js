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
  const signoutBtn =
    document.getElementById("app-signout") ||
    document.getElementById("settings-signout");
  if (signoutBtn) {
    signoutBtn.addEventListener("click", async () => {
      await sb.auth.signOut();
      window.location.href = "index.html";
    });
  }

      // ==== Загрузка списка чатов ====
  const chatsContainer = document.querySelector(".sidebar-chats");
  if (chatsContainer) {
    await reloadChats();
  }

  async function reloadChats() {
    // Очищаем контейнер от старого списка
    chatsContainer.querySelectorAll(".sidebar-chat-list, .sidebar-empty").forEach((el) => el.remove());

    // Читаем чаты текущего пользователя
    const { data: chats, error } = await sb
      .from("chats")
      .select("id, title, status, created_at, updated_at, completed_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки чатов:", error);
      return;
    }

    // Если чатов нет — показываем заглушку
    if (!chats || chats.length === 0) {
      const empty = document.createElement("p");
      empty.className = "sidebar-empty";
      empty.setAttribute("data-i18n", "app.noChats");
      empty.textContent = "Aucune conversation pour l'instant.";
      chatsContainer.appendChild(empty);
      return;
    }

    // Создаём список
    const list = document.createElement("div");
    list.className = "sidebar-chat-list";

    chats.forEach((chat) => {
      const item = document.createElement("a");
      item.href = "#";
      item.className = "sidebar-chat-item";
      item.dataset.chatId = chat.id;
      if (chat.status === "completed") item.classList.add("is-completed");
      item.textContent = chat.title || "Sans titre";

      item.addEventListener("click", (e) => {
        e.preventDefault();
        openChat(chat.id);
      });

      list.appendChild(item);
    });

    chatsContainer.appendChild(list);
  }  // ==== Загрузка списка чатов ====
  const chatsContainer = document.querySelector(".sidebar-chats");
  if (chatsContainer) {
    await reloadChats();
  }

  async function reloadChats() {
    // Очищаем контейнер от старого списка
    chatsContainer.querySelectorAll(".sidebar-chat-list, .sidebar-empty").forEach((el) => el.remove());

    // Читаем чаты текущего пользователя
    const { data: chats, error } = await sb
      .from("chats")
      .select("id, title, status, created_at, updated_at, completed_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки чатов:", error);
      return;
    }

    // Если чатов нет — показываем заглушку
    if (!chats || chats.length === 0) {
      const empty = document.createElement("p");
      empty.className = "sidebar-empty";
      empty.setAttribute("data-i18n", "app.noChats");
      empty.textContent = "Aucune conversation pour l'instant.";
      chatsContainer.appendChild(empty);
      return;
    }

    // Создаём список
    const list = document.createElement("div");
    list.className = "sidebar-chat-list";

    chats.forEach((chat) => {
      const item = document.createElement("a");
      item.href = "#";
      item.className = "sidebar-chat-item";
      item.dataset.chatId = chat.id;
      if (chat.status === "completed") item.classList.add("is-completed");
      item.textContent = chat.title || "Sans titre";

      item.addEventListener("click", (e) => {
        e.preventDefault();
        openChat(chat.id);
      });

      list.appendChild(item);
    });

    chatsContainer.appendChild(list);
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
      // TODO: отправка сообщения через Supabase
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
        localStorage.setItem("clomilu-language", btn.dataset.lang);
        window.location.reload();
      });
    });
  }

    // ==== Открытие чата (пока — минимально) ====
  async function openChat(chatId) {
    const conversation = document.getElementById("app-conversation");
    if (!conversation) return;

    // Пока — просто очистим и оставим уведомление о приватности
    // (В будущем: загрузим сообщения из БД)

    const { data: messages, error } = await sb
      .from("messages")
      .select("role, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки сообщений:", error);
      return;
    }

    // Очищаем контейнер
    conversation.innerHTML = "";

    // Рендерим каждое сообщение
    messages.forEach((msg) => {
      const article = document.createElement("article");
      article.className = msg.role === "user" ? "msg msg-user" : "msg msg-clomilu";

      const body = document.createElement("div");
      body.className = "msg-body";

      // Простейший рендер markdown-подобного текста (**жирный**)
      let html = msg.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");

      body.innerHTML = "<p>" + html + "</p>";
      article.appendChild(body);
      conversation.appendChild(article);
    });
  }

    // ==== Создание нового чата ====
  const newChatBtns = document.querySelectorAll(".sidebar-new, .app-new-btn");
  newChatBtns.forEach((btn) => {
    btn.addEventListener("click", createChat);
  });

  async function createChat() {
    // 1. Создаём чат в БД
    const { data: newChat, error } = await sb
      .from("chats")
      .insert({
        user_id: session.user.id,
        title: null,          // название появится позже — из первого сообщения
        status: "active"
      })
      .select()
      .single();

    if (error) {
      console.error("Ошибка создания чата:", error);
      return;
    }

    // 2. Записываем уведомление о приватности как первое сообщение
    const noticeText = `**Avant de commencer**\n\nPour protéger votre vie privée, veuillez ne pas mentionner de noms, coordonnées, numéros d'enregistrement ou autres identifiants — ils ne sont pas nécessaires à votre demande.\n\nClomilu vous aide à réfléchir à la **situation**, pas aux personnes qui y figurent. Les détails identifiants sont rarement nécessaires.\n\nEn continuant, vous reconnaissez ces consignes.`;

    const { error: msgError } = await sb
      .from("messages")
      .insert({
        chat_id: newChat.id,
        role: "clomilu",
        content: noticeText
      });

    if (msgError) {
      console.error("Ошибка записи уведомления:", msgError);
      // не останавливаемся — чат уже создан
    }

    // 3. Обновляем список чатов в sidebar
    await reloadChats();

    // 4. Открываем новый чат в основной области
    openChat(newChat.id);
  }
});
