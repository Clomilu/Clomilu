document.addEventListener("DOMContentLoaded", () => {

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

  // ==== 2. Route guard: если уже авторизован — сразу в app ====
  if (checkSession()) {
    window.location.href = "app.html";
    return;
  }

  // ==== 3. Читаем выбранный тариф из URL ====
  const urlParams = new URLSearchParams(window.location.search);
  const planFromUrl = urlParams.get("plan");
  if (planFromUrl) {
    localStorage.setItem("clomilu-plan", planFromUrl);
  }

  // ==== 4. Обработчик формы входа ====
  const loginForm = document.querySelector('[data-panel="login"]');
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      setSession();
      const savedPlan = localStorage.getItem("clomilu-plan");
      if (savedPlan) {
        localStorage.removeItem("clomilu-plan");
        window.location.href = `checkout.html?plan=${savedPlan}`;
      } else {
        window.location.href = "app.html";
      }
    });
  }

  // ==== 5. Обработчик формы регистрации ====
  const signupForm = document.querySelector('[data-panel="signup"]');
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      setSession();
      const savedPlan = localStorage.getItem("clomilu-plan");
      const target = savedPlan ? `checkout.html?plan=${savedPlan}` : "checkout.html";
      window.location.href = target;
    });
  }

  // ==== 6. Форма сброса пароля ====
  const resetForm = document.querySelector('[data-panel="reset"]');
  if (resetForm) {
    resetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const message = resetForm.querySelector(".auth-message");
      if (message) {
        message.hidden = false;
      }
      const emailInput = resetForm.querySelector('input[type="email"]');
      if (emailInput) {
        emailInput.value = "";
      }
    });
  }

  // ==== 7. Checkout: выбор тарифа + оплата ====
  const checkoutForm = document.querySelector('[data-panel="checkout"]');
  const submitBtn = document.getElementById("checkout-submit");
  const planRadios = document.querySelectorAll('.checkout-plan input[type="radio"]');

  if (checkoutForm && submitBtn && planRadios.length) {

    // Предвыбор тарифа
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

    // Обновление кнопки при выборе
    function updateSubmitState() {
      const selected = document.querySelector('.checkout-plan input[type="radio"]:checked');
      const lang = document.documentElement.lang || "fr";

      if (!selected) {
        submitBtn.disabled = true;
        submitBtn.textContent = getValue(translations[lang], "checkout.submit") || "Payer";
        return;
      }

      submitBtn.disabled = false;
      const plan = selected.value;
      const priceKey = plan === "one-time" ? "checkout.one.price" : "checkout.sub.price";
      const priceText = getValue(translations[lang], priceKey);
      const tpl = getValue(translations[lang], "checkout.submitWithPrice") || "Payer {price}";

      submitBtn.textContent = priceText
        ? tpl.replace("{price}", priceText)
        : getValue(translations[lang], "checkout.submit") || "Payer";
    }

    planRadios.forEach((radio) => {
      radio.addEventListener("change", updateSubmitState);
    });

    updateSubmitState();

    // Отправка (заглушка)
    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const selected = document.querySelector('.checkout-plan input[type="radio"]:checked');
      if (!selected) return;
      setSession();
      window.location.href = "app.html";
    });
  }

});

// ==== Утилиты (снаружи DOMContentLoaded) ====

function checkSession() {
  return localStorage.getItem("clomilu-auth") === "true";
}
function setSession() {
  localStorage.setItem("clomilu-auth", "true");
}
function clearSession() {
  localStorage.removeItem("clomilu-auth");
}

// Утилита для получения значения по пути "a.b.c" из объекта
function getValue(obj, path) {
  return path.split(".").reduce((value, key) => value && value[key], obj);
}
