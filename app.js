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

  // Проверяем, есть ли в URL параметр ?chat=...
  const urlParams = new URLSearchParams(window.location.search);
  const chatIdFromUrl = urlParams.get('chat');
  
  if (chatIdFromUrl) {
    // Открываем этот чат
    setTimeout(() => {
      openChat(chatIdFromUrl);
    }, 500); // Небольшая пауза, чтобы sidebar успел загрузиться
  }

  // ==== Текущий активный чат ====
  let activeChatId = null;

  // ==== Шаблон уведомления о приватности (только UI) ====
  const NOTICE_TEXT = `**Avant de commencer**

Pour protéger votre vie privée, veuillez ne pas mentionner de noms, coordonnées, numéros d'enregistrement ou autres identifiants — ils ne sont pas nécessaires à votre demande.

Clomilu vous aide à réfléchir à la **situation**, pas aux personnes qui y figurent. Les détails identifiants sont rarement nécessaires.

En continuant, vous reconnaissez ces consignes.`;

  // ==== Показ email на /settings ====
  const emailEl = document.getElementById("settings-email");
  if (emailEl && session.user) {
    emailEl.textContent = session.user.email || "—";
  }

  // ==== SignOut ====
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
    if (!chatsContainer) return;

    // Очищаем контейнер
    chatsContainer
      .querySelectorAll(".sidebar-chat-list, .sidebar-empty")
      .forEach((el) => el.remove());

    const { data: chats, error } = await sb
      .from("chats")
      .select("id, title, status, created_at, updated_at, completed_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки чатов:", error);
      return;
    }

    if (!chats || chats.length === 0) {
      const empty = document.createElement("p");
      empty.className = "sidebar-empty";
      empty.setAttribute("data-i18n", "app.noChats");
      empty.textContent = "Aucune conversation pour l'instant.";
      chatsContainer.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "sidebar-chat-list";

    chats.forEach((chat) => {
      const item = document.createElement("a");
      item.href = "app.html?chat=" + chat.id;
      item.className = "sidebar-chat-item";
      item.dataset.chatId = chat.id;
      if (chat.status === "completed") item.classList.add("is-completed");
      if (chat.id === activeChatId) item.classList.add("is-active");
      item.textContent = chat.title || "Sans titre";

      item.addEventListener("click", (e) => {
        // Проверяем, есть ли на странице контейнер для чата.
        // Если он есть (мы в app.html) — перехватываем клик и открываем чат без перезагрузки.
        // Если его нет (мы в settings.html) — отпускаем клик, и браузер сам перейдет по ссылке.
        const conversationEl = document.getElementById("app-conversation");
        
        if (conversationEl) {
          e.preventDefault();
          openChat(chat.id);
        }
      });
      
      list.appendChild(item);
    });

    chatsContainer.appendChild(list);
  }

  // ==== Рендер одного сообщения ====
  function renderMessage(role, content) {
    const article = document.createElement("article");
    article.className = role === "user" ? "msg msg-user" : "msg msg-clomilu";

    const body = document.createElement("div");
    body.className = "msg-body";

    let html = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    body.innerHTML = "<p>" + html + "</p>";
    article.appendChild(body);
    setTimeout(() => {
      const conversation = document.getElementById("app-conversation");
      if (conversation) conversation.scrollTop = conversation.scrollHeight;
    }, 50);
    return article;
  }

  // ==== Рендер уведомления ====
  function renderNotice() {
    const article = document.createElement("article");
    article.className = "msg msg-clomilu msg-notice";

    const body = document.createElement("div");
    body.className = "msg-body";

    let html = NOTICE_TEXT
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    body.innerHTML = "<p>" + html + "</p>";
    article.appendChild(body);
    return article;
  }

  // ==== Открыть чат ====
  async function openChat(chatId) {
    const conversation = document.getElementById("app-conversation");
    if (!conversation) return;

    activeChatId = chatId;

// Проверяем статус чата
    const { data: chatData } = await sb.from("chats").select("status").eq("id", chatId).single();
    const isCompleted = chatData?.status === "completed";

// Блокируем или разблокируем поле ввода
    const inputForm = document.getElementById("app-input");
    const textarea = inputForm.querySelector("textarea");
    if (isCompleted) {
      textarea.disabled = true;
      textarea.placeholder = "Диалог завершен. Начните новый.";
      inputForm.querySelector(".app-send").disabled = true;
    } else {
      textarea.disabled = false;
      textarea.placeholder = "Décrivez votre situation…"; // или ваш дефолтный текст
      inputForm.querySelector(".app-send").disabled = textarea.value.trim().length === 0;
    }

    const { data: messages, error } = await sb
      .from("messages")
      .select("role, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки сообщений:", error);
      return;
    }

    conversation.innerHTML = "";

    // Уведомление — всегда первым
    conversation.appendChild(renderNotice());

    // Сообщения из БД
    (messages || []).forEach((msg) => {
      conversation.appendChild(renderMessage(msg.role, msg.content));
    });
    setTimeout(() => {
      conversation.scrollTop = conversation.scrollHeight;
    }, 100);

    // Обновить активный класс в sidebar
    if (chatsContainer) {
      chatsContainer.querySelectorAll(".sidebar-chat-item").forEach((el) => {
        el.classList.toggle("is-active", el.dataset.chatId === chatId);
      });
    }
    if (isCompleted) {
      const endNotice = document.createElement("div");
      endNotice.style.textAlign = "center";
      endNotice.style.color = "#888";
      endNotice.style.marginTop = "20px";
      endNotice.innerText = "— Диалог завершен —";
      conversation.appendChild(endNotice);
    }
  }

  // ==== Новый чат — просто сброс состояния ====
  function startNewChat() {
    activeChatId = null;

    const conversation = document.getElementById("app-conversation");
    if (conversation) {
      conversation.innerHTML = "";
      conversation.appendChild(renderNotice());
    }

    // Снять выделение в sidebar
    if (chatsContainer) {
      chatsContainer.querySelectorAll(".sidebar-chat-item").forEach((el) => {
        el.classList.remove("is-active");
      });
    }

    // Фокус в поле ввода
    const textarea = document.querySelector("#app-input textarea");
    if (textarea) textarea.focus();
  }

  const newChatBtns = document.querySelectorAll(".sidebar-new, .app-new-btn");
  newChatBtns.forEach((btn) => {
    btn.addEventListener("click", startNewChat);
  });

  // ==== Создание чата с первым сообщением ====
  async function createChatWithMessage(text) {
    // 1. Создать чат
    const { data: newChat, error } = await sb
      .from("chats")
      .insert({
        user_id: session.user.id,
        title: null,
        status: "active"
      })
      .select()
      .single();

    if (error) {
      console.error("Ошибка создания чата:", error);
      return null;
    }

    // 2. Записать сообщение пользователя
    const { error: msgError } = await sb
      .from("messages")
      .insert({
        chat_id: newChat.id,
        role: "user",
        content: text
      });

    if (msgError) {
      console.error("Ошибка записи сообщения:", msgError);
      return null;
    }

    // 3. Обновить title чата из первого сообщения
    let title = text.slice(0, 40);
    if (text.length > 40) {
      const lastSpace = title.lastIndexOf(" ");
      if (lastSpace > 20) title = title.slice(0, lastSpace);
      title += "…";
    }

    const { error: titleError } = await sb
      .from("chats")
      .update({ title })
      .eq("id", newChat.id);

    if (titleError) {
      console.error("Ошибка обновления title:", titleError);
    }

    activeChatId = newChat.id;
    return newChat.id;
  }

  // ==== Отправка сообщения ====
  async function sendMessage(text) {
    // 0. ПРОВЕРКА НА ЗАВЕРШЕННЫЙ ЧАТ
    const textareaCheck = document.querySelector("#app-input textarea");
    if (textareaCheck && textareaCheck.disabled) {
      alert("Этот диалог завершен. Пожалуйста, начните новый.");
      return;
    }
    // 1. СНАЧАЛА показываем сообщение пользователя на экране (мгновенно)
    const conversation = document.getElementById("app-conversation");
    if (conversation) {
      // Добавляем сообщение в интерфейс
      conversation.appendChild(renderMessage("user", text));
      // Прокручиваем вниз
      conversation.scrollTop = conversation.scrollHeight;
    }
    // 2. ТЕПЕРЬ сохраняем в базу и на сервер
    if (activeChatId === null) {
      const newId = await createChatWithMessage(text);
      if (!newId) return false;
    } else {
      const { error } = await sb
        .from("messages")
        .insert({ chat_id: activeChatId, role: "user", content: text });

      if (error) {
        console.error("Ошибка записи сообщения:", error);
        return false;
      }
    }
        // --- ОТПРАВЛЯЕМ ЗАПРОС НА СЕРВЕР FLY.IO ---
    try {
      const response = await fetch("https://elenazernova-jaunty-lake-8315.fly.dev/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: activeChatId,
          user_message: text
        })
      });
      
      if (!response.ok) {
        console.error("Ошибка сервера:", await response.text());
      }
    } catch (error) {
      console.error("Не удалось связаться с сервером:", error);
    }

    // Загружаем только новые сообщения (без перерисовки sidebar)
    const { data: newMessages, error: fetchErr } = await sb
      .from("messages")
      .select("role, content")
      .eq("chat_id", activeChatId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!fetchErr && newMessages && newMessages.length > 0) {
      const lastMsg = newMessages[0];
      if (lastMsg.role === "assistant") {
        conversation.appendChild(renderMessage("assistant", lastMsg.content));
        conversation.scrollTop = conversation.scrollHeight;
      }
    }
    return true;
  }

  // ==== Поле ввода ====
  const inputForm = document.getElementById("app-input");
  if (inputForm) {
    const textarea = inputForm.querySelector("textarea");
    const sendBtn = inputForm.querySelector(".app-send");

        function autoResize() {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
      sendBtn.disabled = textarea.value.trim().length === 0;

      // 👇 ДОБАВЛЕНА СТРОКА ДЛЯ АВТОСКРОЛЛА 👇
      const conversation = document.getElementById("app-conversation");
      if (conversation) {
        conversation.scrollTop = conversation.scrollHeight;
      }
      // 👆 КОНЕЦ ДОБАВЛЕННОЙ СТРОКИ 👆
    }

    textarea.addEventListener("input", autoResize);
    autoResize();

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Останавливаем перенос строки
        inputForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    });

    inputForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;

      textarea.value = "";
      autoResize();

      await sendMessage(text);
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

  // ==== Инициализация: состояние A ====
  startNewChat();

     // ==== Переключатель языка на /settings ====
  const settingsLangButtons = document.querySelectorAll(".settings-lang");
  if (settingsLangButtons.length > 0) {
    const currentLang = localStorage.getItem("clomilu-language") || document.documentElement.lang || "fr";
    
    settingsLangButtons.forEach((btn) => {
      // Подсветка активного
      if (btn.dataset.lang === currentLang) {
        btn.classList.add("is-active");
      } else {
        btn.classList.remove("is-active");
      }

      btn.addEventListener("click", (e) => {
        e.preventDefault(); // Останавливаем другие скрипты
        e.stopPropagation(); // Не даем main.js перехватить клик

        const newLang = btn.dataset.lang;
        localStorage.setItem("clomilu-language", newLang);
        
        // Принудительно переводим DOM перед перезагрузкой (чтобы визуально не было моргания)
        if (typeof setLanguage === "function") {
          setLanguage(newLang);
        }
        
        // Перезагружаем страницу, чтобы применить переводы ко всему
        window.location.reload();
      });
    });
  }
});
