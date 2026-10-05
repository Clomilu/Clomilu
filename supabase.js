// ==== Clomilu — Supabase client ====
// Публичный ключ Supabase. Безопасен для клиента.
// Доступ ограничен Row Level Security (RLS) на стороне сервера.

const SUPABASE_URL = "https://fbysfmodfzxdemfobmol.supabase.co";
const SUPABASE_KEY = "sb_publishable_fuo-4imzV9dQRw8DRfTEqw_oX92-B1U";

// Глобальный клиент
let supabaseClient = null;

// Инициализация — вызывается после загрузки SDK
function initSupabase() {
  if (typeof supabase === "undefined") {
    console.warn("Supabase SDK не загружен");
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}