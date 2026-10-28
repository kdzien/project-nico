"use client";

import { useActionState } from "react";
import { useI18n } from "@lib/i18n/provider";
import { register } from "@app/register/actions";

export function RegistrationForm() {
	const { t } = useI18n();
	const [message, action, pending] = useActionState(register, "");

	return (
		<form action={action} className="stack">
			<label>
				{t("login.email")}
				<input type="email" name="email" autoComplete="username" required />
			</label>
			<label>
				{t("login.password")}
				<input
					type="password"
					name="password"
					autoComplete="new-password"
					minLength={8}
					maxLength={128}
					aria-describedby="password-hint"
					required
				/>
				<span className="small" id="password-hint">
					{t("register.passwordHint")}
				</span>
			</label>
			<label>
				{t("register.passwordConfirmation")}
				<input
					type="password"
					name="passwordConfirmation"
					autoComplete="new-password"
					minLength={8}
					maxLength={128}
					required
				/>
			</label>
			{message && (
				<p
					role="status"
					className={message === "register.confirmEmail" ? "success" : "notice"}
				>
					{t(message)}
				</p>
			)}
			<button disabled={pending}>
				{t(pending ? "register.pending" : "register.submit")}
			</button>
		</form>
	);
}
