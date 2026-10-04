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
  const urlParams = new URLSearchParams(window.location.search);
  const planFromUrl = urlParams.get("plan");
  if (planFromUrl) {
    localStorage.setItem("clomilu-plan", planFromUrl);
  }
  
  // ==== 3. Обработка форм (пока заглушка) ====
  const loginForm = document.querySelector('[data-panel="login"]');
  const signupForm = document.querySelector('[data-panel="signup"]');


  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      setSession();
      const savedPlan = localStorage.getItem("clomilu-plan");
      if (savedPlan) {
        localStorage.removeItem("clomilu-plan");   // использовали — очищаем
        window.location.href = `checkout.html?plan=${savedPlan}`;
      } else {
        window.location.href = "app.html";
      }
    });
  }

if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      setSession();
      const savedPlan = localStorage.getItem("clomilu-plan");
      const target = savedPlan ? `checkout.html?plan=${savedPlan}` : "checkout.html";
      window.location.href = target;
    });
  }
});

// ==== Простая сессия через localStorage (для прототипа) ====
function checkSession() {
  return localStorage.getItem("clomilu-auth") === "true";
}
function setSession() {
  localStorage.setItem("clomilu-auth", "true");
}
function clearSession() {
  localStorage.removeItem("clomilu-auth");
}
