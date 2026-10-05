document.addEventListener("DOMContentLoaded", async () => {

  // ==== Инициализация Supabase ====
  const sb = initSupabase();
  if (!sb) {
    console.error("Supabase не инициализирован");
    return;
  }

  // ==== 1. Переключение табов ====
  const tabs = document.querySelectorAll(".auth-tab");
  const panels = document.querySelectorAll(".auth-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => {
        const isActive = t.dataset.tab === target;
        t.classList.toggle("is-active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      panels.forEach((p) => {
        p.hidden = p.dataset.panel !== target;
      });
    });
  });

  // ==== 2. Читаем выбранный тариф из URL ====
  const urlParams = new URLSearchParams(window.location.search);
  const planFromUrl = urlParams.get("plan");
  if (planFromUrl) {
    localStorage.setItem("clomilu-plan", planFromUrl);
  }

  // ==== 3. Route guard: если есть сессия ====
  const { data: { session } } = await sb.auth.getSession();

  if (session && document.body.classList.contains("auth-page")) {
    // На /login, /reset — авторизован, идём в /app
    // НО на /checkout — оставляем, чтобы выбрать тариф
    const isCheckout = document.querySelector('[data-panel="checkout"]');
    if (!isCheckout) {
      window.location.href = "app.html";
      return;
    }
  }

  // ==== 4. Форма входа ====
  const loginForm = document.querySelector('[data-panel="login"]');
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('input[name="email"]').value.trim();
      const password = loginForm.querySelector('input[name="password"]').value;

      showFormError(loginForm, ""); // очистить
      setFormLoading(loginForm, true);

      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      setFormLoading(loginForm, false);

      if (error) {
        showFormError(loginForm, translateAuthError(error.message));
        return;
      }

      // Успешный вход — редирект
      const savedPlan = localStorage.getItem("clomilu-plan");
      if (savedPlan) {
        localStorage.removeItem("clomilu-plan");
        window.location.href = `checkout.html?plan=${savedPlan}`;
      } else {
        window.location.href = "app.html";
      }
    });
  }

  // ==== 5. Форма регистрации ====
  const signupForm = document.querySelector('[data-panel="signup"]');
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = signupForm.querySelector('input[name="email"]').value.trim();
      const password = signupForm.querySelector('input[name="password"]').value;

      showFormError(signupForm, "");
      setFormLoading(signupForm, true);

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "https://clomilu.github.io/Clomilu/login.html"
        }
      });

      setFormLoading(signupForm, false);

      if (error) {
        showFormError(signupForm, translateAuthError(error.message));
        return;
      }

      // Аккаунт создан — письмо отправлено
      showFormSuccess(signupForm, getTranslation("auth.confirmEmailSent"));
      // Не редиректим — ждём подтверждения email
    });
  }

  // ==== 6. Форма сброса пароля ====
  const resetForm = document.querySelector('[data-panel="reset"]');
  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = resetForm.querySelector('input[name="email"]').value.trim();

      showFormError(resetForm, "");
      setFormLoading(resetForm, true);

      const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: "https://clomilu.github.io/Clomilu/update-password.html"
      });

      setFormLoading(resetForm, false);

      // Показываем сообщение об успехе вне зависимости от ошибки —
      // чтобы не раскрывать, существует ли аккаунт (security best practice)
      const message = resetForm.querySelector(".auth-message");
      if (message) {
        message.hidden = false;
      }
      const emailInput = resetForm.querySelector('input[type="email"]');
      if (emailInput) emailInput.value = "";
    });
  }

    // ==== Форма установки нового пароля ====
  const updatePwForm = document.querySelector('[data-panel="update-password"]');

  if (updatePwForm) {

    // Проверяем сессию — Supabase её ставит после клика по ссылке в письме
    const { data: { session } } = await sb.auth.getSession();

    if (!session) {
      // Ссылка недействительна, истекла или уже использована
      const errorMsg = getTranslation("updatePassword.invalidLink")
        || "This link is no longer valid. Please request a new one.";
      showFormError(updatePwForm, errorMsg);
      updatePwForm.querySelector("button[type='submit']").disabled = true;
      return;
    }

    updatePwForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = updatePwForm.querySelector('input[name="password"]').value;

      showFormError(updatePwForm, "");

      if (password.length < 6) {
        const hint = getTranslation("updatePassword.passwordHint") || "At least 6 characters.";
        showFormError(updatePwForm, hint);
        return;
      }

      setFormLoading(updatePwForm, true);

      const { error } = await sb.auth.updateUser({ password });

      setFormLoading(updatePwForm, false);

      if (error) {
        showFormError(updatePwForm, translateAuthError(error.message));
        return;
      }

      // Успех — показываем сообщение и редиректим на login
      const message = updatePwForm.querySelector(".auth-message");
      if (message) message.hidden = false;

      const hint = updatePwForm.querySelector(".auth-hint");
      if (hint) hint.hidden = true;

      // Редирект на login через 2 секунды
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    });
  }
  
  // ==== 7. Checkout — оставляем как было ====
  // ... код checkout из предыдущей версии
  const checkoutForm = document.querySelector('[data-panel="checkout"]');
  const submitBtn = document.getElementById("checkout-submit");
  const planRadios = document.querySelectorAll('.checkout-plan input[type="radio"]');

  if (checkoutForm && submitBtn && planRadios.length) {
    const preselected = planFromUrl || localStorage.getItem("clomilu-plan");
    if (preselected) {
      const radio = document.querySelector(`.checkout-plan input[value="${preselected}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (localStorage.getItem("clomilu-plan")) {
        localStorage.removeItem("clomilu-plan");
      }
    }

    function updateSubmitState() {
      const selected = document.querySelector('.checkout-plan input[type="radio"]:checked');
      const lang = document.documentElement.lang || "fr";

      if (!selected) {
        submitBtn.disabled = true;
        submitBtn.textContent = getTranslation("checkout.submit") || "Payer";
        return;
      }
      submitBtn.disabled = false;
      const plan = selected.value;
      const priceKey = plan === "one-time" ? "checkout.one.price" : "checkout.sub.price";
      const priceText = getTranslation(priceKey);
      const tpl = getTranslation("checkout.submitWithPrice") || "Payer {price}";
      submitBtn.textContent = priceText
        ? tpl.replace("{price}", priceText)
        : getTranslation("checkout.submit") || "Payer";
    }

    planRadios.forEach((r) => r.addEventListener("change", updateSubmitState));
    updateSubmitState();

    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const selected = document.querySelector('.checkout-plan input[type="radio"]:checked');
      if (!selected) return;
      // TODO: реальный Stripe
      window.location.href = "app.html";
    });
  }

});

// ==== Утилиты ====

function getTranslation(path) {
  const lang = document.documentElement.lang || "fr";
  if (typeof translations === "undefined" || !translations[lang]) return null;
  return path.split(".").reduce((v, k) => v && v[k], translations[lang]);
}

function showFormError(form, message) {
  let box = form.querySelector(".auth-error");
  if (!box) {
    box = document.createElement("p");
    box.className = "auth-error";
    box.style.color = "#b00020";
    box.style.fontSize = "14px";
    box.style.marginTop = "8px";
    form.querySelector(".auth-submit").insertAdjacentElement("beforebegin", box);
  }
  box.textContent = message;
  box.hidden = !message;
}

function showFormSuccess(form, message) {
  let box = form.querySelector(".auth-success");
  if (!box) {
    box = document.createElement("p");
    box.className = "auth-success";
    box.style.color = "#173F32";
    box.style.fontSize = "14px";
    box.style.marginTop = "8px";
    form.querySelector(".auth-submit").insertAdjacentElement("beforebegin", box);
  }
  box.textContent = message;
  box.hidden = !message;
}

function setFormLoading(form, loading) {
  const btn = form.querySelector(".auth-submit");
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = "…";
  } else if (btn.dataset.originalText) {
    btn.textContent = btn.dataset.originalText;
  }
}

function translateAuthError(message) {
  // Supabase возвращает ошибки на английском
  // Простая карта переводов
  const map = {
    "Invalid login credentials": "Email ou mot de passe incorrect.",
    "Email not confirmed": "Veuillez confirmer votre email avant de vous connecter.",
    "User already registered": "Un compte existe déjà avec cet email.",
    "Password should be at least 6 characters": "Le mot de passe doit contenir au moins 6 caractères.",
    "Unable to validate email address: invalid format": "Format d'email invalide."
  };
  return map[message] || message;
}
