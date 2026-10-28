"use client";

import { useActionState } from "react";
import { useI18n } from "@lib/i18n/provider";
import { login } from "@app/login/actions";

export function LoginForm() {
	const { t } = useI18n();
	const [message, action, pending] = useActionState(login, "");

	return (
		<form action={action} className="stack">
			<label>
				{t("login.email")}
				<input type="email" name="email" autoComplete="username" required />
			</label>
			<label>
				{t("login.password")}
				<input type="password" name="password" autoComplete="current-password" required />
			</label>
			{message && <p role="alert">{t(message)}</p>}
			<button disabled={pending}>{t(pending ? "login.pending" : "login.submit")}</button>
		</form>
	);
}
