"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverSupabase } from "@/lib/supabase/server";

export async function login(_previous: string, form: FormData): Promise<string> {
  const input = z.object({ email: z.email(), password: z.string().min(1) }).safeParse({
    email: form.get("email"), password: form.get("password"),
  });
  if (!input.success) return "Podaj poprawny e-mail i hasło.";
  const db = await serverSupabase();
  const { error } = await db.auth.signInWithPassword(input.data);
  if (error) return "Nie udało się zalogować. Sprawdź dane i dostępność lokalnej bazy.";
  redirect("/");
}

export async function logout() {
  const db = await serverSupabase();
  const { error } = await db.auth.signOut();
  if (error) throw new Error("Nie udało się wylogować. Spróbuj ponownie.");
  redirect("/login");
}
