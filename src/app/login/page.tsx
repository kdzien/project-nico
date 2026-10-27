import { redirect } from "next/navigation";
import { serverSupabase } from "@/lib/supabase/server";
import { LoginForm } from "./form";

export default async function LoginPage() {
  const db = await serverSupabase();
  const { data } = await db.auth.getUser();
  if (data.user) redirect("/");
  return <main className="shell login"><p className="eyebrow">PROJECT NICO</p>
    <h1>Witaj w Nico.</h1><p className="lead">Zaloguj się do swojego piłkarskiego warsztatu.</p>
    <LoginForm /><p className="muted">Dostęp wyłącznie dla właściciela. Konto tworzy administrator.</p>
  </main>;
}
