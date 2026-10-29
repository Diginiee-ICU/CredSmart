import { supabase } from "./client";

// In pure client-side SPA (Capacitor/Vite), supabaseAdmin falls back safely to the isolated client
export const supabaseAdmin = supabase;
