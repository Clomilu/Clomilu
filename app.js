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

  // ==== Текущий активный чат ====
  let activeChatId = null;

  // ==== Показ email на /settings ====
  const emailEl = document.getElementById("settings-email");
  if (emailEl && session.user && session.user.email) {
    emailEl.textContent = session.user.email;
  } else if (emailEl) {
    emailEl.textContent = "—";
  }

  // ==== Подсветка активного языка (только визуал) ====
  const settingsLangButtons = document.querySelectorAll(".settings-lang");

  function updateActiveLanguage(lang) {
    settingsLangButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.lang === lang);
    });
  }

  // Начальная подсветка
  const currentLang = localStorage.getItem("clomilu-language") || document.documentElement.lang || "fr";
  updateActiveLanguage(currentLang);

  // Обновление подсветки при переключении языка
  document.addEventListener("clomilu-language-changed", (event) => {
    updateActiveLanguage(event.detail.lang);
  });

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

  // ==== Индикатор ожидания ответа ====
  function showTypingIndicator(container) {
    const el = document.createElement("div");
    el.className = "typing-indicator";
    el.innerHTML = `
      <span class="typing-dots">
        <span></span><span></span><span></span>
      </span>
    `;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  // ==== Индикатор завершения диалога ====
  function showChatCompletedNotice(container) {
  // не дублируем плашку, если она уже есть
    if (container.querySelector(".chat-completed-notice")) return;

    const el = document.createElement("div");
    el.className = "chat-completed-notice";
    el.setAttribute("data-i18n", "chatcompleted");
    el.textContent = "Этот диалог завершён. Для новой ситуации начните новый.";
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
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

      showChatCompletedNotice(conversation);
    } else {
      textarea.disabled = false;
      textarea.placeholder = "Décrivez votre situation…";
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

    // Очищаем все, КРОМЕ статического уведомления
    conversation.querySelectorAll(".msg:not(.msg-notice)").forEach(el => {
      el.remove();
    });

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
      // Очищаем все, КРОМЕ статического уведомления
      conversation.querySelectorAll(".msg:not(.msg-notice)").forEach(el => {
        el.remove();
      });
    }

    if (chatsContainer) {
      chatsContainer.querySelectorAll(".sidebar-chat-item").forEach((el) => {
        el.classList.remove("is-active");
      });
    }

    const textarea = document.querySelector("#app-input textarea");
    if (textarea) textarea.focus();
  }

  const newChatBtns = document.querySelectorAll(".sidebar-new, .app-new-btn");
  newChatBtns.forEach((btn) => {
    btn.addEventListener("click", startNewChat);
  });

  // ==== Создание чата с первым сообщением ====
  async function createChatWithMessage(text) {
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

    let title = text.slice(0, 40);
    if (text.length > 40) {
      const lastSpace = title.lastIndexOf(" ");
      if (lastSpace > 20) title = title.slice(0, lastSpace);
      title += "…";
    }

    await sb
      .from("chats")
      .update({ title })
      .eq("id", newChat.id);

    activeChatId = newChat.id;
    return newChat.id;
  }

  // ==== Отправка сообщения ====
  async function sendMessage(text) {
    const textareaCheck = document.querySelector("#app-input textarea");
    if (textareaCheck && textareaCheck.disabled) {
      alert("Этот диалог завершен. Пожалуйста, начните новый.");
      return;
    }

    const conversation = document.getElementById("app-conversation");
    if (conversation) {
      conversation.appendChild(renderMessage("user", text));
      conversation.scrollTop = conversation.scrollHeight;
    }

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

    // 1. Показать индикатор ДО запроса
  const typingEl = showTypingIndicator(conversation);

  try {
  const response = await fetch("https://elenazernova-jaunty-lake-8315.fly.dev/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: activeChatId,
      user_message: text,
      user_id: session.user.id
    })
  });

    if (!response.ok) {
      console.error("Ошибка сервера:", await response.text());
  }

    // 2. После ответа сервера читаем последнее сообщение из базы
    const { data: newMessages, error: fetchErr } = await sb
      .from("messages")
      .select("role, content")
      .eq("chat_id", activeChatId)
      .order("created_at", { ascending: false })
      .limit(1);

    // 3. Убираем индикатор ПЕРЕД отрисовкой — иначе он останется под сообщением
    typingEl.remove();

    if (!fetchErr && newMessages && newMessages.length > 0) {
      const lastMsg = newMessages[0];
      if (lastMsg.role === "assistant") {
        conversation.appendChild(renderMessage("assistant", lastMsg.content));
        conversation.scrollTop = conversation.scrollHeight;
      }
    }
  } catch (error) {
    typingEl.remove();
    console.error("Не удалось связаться с сервером:", error);
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

      const conversation = document.getElementById("app-conversation");
      if (conversation) {
        conversation.scrollTop = conversation.scrollHeight;
      }
    }

    textarea.addEventListener("input", autoResize);
    
    textarea.addEventListener("input", () => {
      localStorage.setItem("clomilu-draft", textarea.value);
    });
    
    const savedDraft = localStorage.getItem("clomilu-draft");
    if (savedDraft) {
      textarea.value = savedDraft;
    }
    
    autoResize();

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        inputForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    });

    inputForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return;

      textarea.value = "";
      localStorage.removeItem("clomilu-draft");
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

  // ==== Инициализация ====
  startNewChat();

  // ==== Удаление аккаунта ====
  const deleteAccountBtn = document.getElementById("delete-account-btn");
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", async () => {
      const lang = localStorage.getItem("clomilu-language") || "fr";
      const dict = translations[lang]?.settings || translations["fr"].settings;

      const isConfirmed = confirm(dict.dangerConfirm);
      if (!isConfirmed) return;

      deleteAccountBtn.disabled = true;
      const originalText = deleteAccountBtn.innerHTML;
      deleteAccountBtn.innerHTML = `<span>${dict.dangerDeleting}</span>`;

      try {
        const response = await fetch("https://elenazernova-jaunty-lake-8315.fly.dev/api/delete-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: session.user.id })
        });

        if (response.ok) {
          await sb.auth.signOut();
          window.location.href = "index.html";
        } else {
          alert(dict.dangerError);
          deleteAccountBtn.disabled = false;
          deleteAccountBtn.innerHTML = originalText;
        }
      } catch (err) {
        console.error(err);
        alert(dict.dangerNetworkError);
        deleteAccountBtn.disabled = false;
        deleteAccountBtn.innerHTML = originalText;
      }
    });
  }

  // ==== Обновление пароля (на странице update-password.html) ====
  const updatePasswordForm = document.getElementById("update-password-form");
  if (updatePasswordForm) {
    updatePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const newPassword = document.getElementById("new-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;
      
      const lang = localStorage.getItem("clomilu-language") || "fr";
      const dict = translations[lang]?.updatePassword || translations["fr"].updatePassword;

      if (newPassword !== confirmPassword) {
        alert(dict.passwordMismatch || "Пароли не совпадают");
        return;
      }

      const { error } = await sb.auth.updateUser({ password: newPassword });

      if (error) {
        alert(dict.error || error.message);
      } else {
        alert(dict.success);
        window.location.href = "settings.html";
      }
    });
  } 
});
