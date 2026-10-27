"use client";
import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [message, action, pending] = useActionState(login, "");
  return <form action={action} className="stack">
    <label>E-mail<input type="email" name="email" autoComplete="username" required /></label>
    <label>Hasło<input type="password" name="password" autoComplete="current-password" required /></label>
    {message && <p role="alert">{message}</p>}
    <button disabled={pending}>{pending ? "Logowanie…" : "Zaloguj się"}</button>
  </form>;
}
