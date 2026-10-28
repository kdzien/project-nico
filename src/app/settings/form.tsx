"use client";

import { useActionState } from "react";
import { useI18n } from "@lib/i18n/provider";
import { savePreferences } from "@app/settings/actions";

export function SettingsForm() {
	const { t, locale, theme } = useI18n();
	const [message, action, pending] = useActionState(savePreferences, "");

	return (
		<form action={action} className="settings-form stack">
			<section className="settings-card">
				<label>
					{t("settings.language")}
					<select name="locale" key={locale} defaultValue={locale} disabled={pending}>
						<option value="pl" lang="pl">
							Polski
						</option>
						<option value="en" lang="en">
							English
						</option>
					</select>
				</label>
			</section>

			<section className="settings-card">
				<fieldset className="theme-options" key={theme} disabled={pending}>
					<legend>{t("settings.theme")}</legend>
					{(["light", "dark"] as const).map((value) => (
						<label className="theme-option" key={value}>
							<input
								type="radio"
								name="theme"
								value={value}
								defaultChecked={theme === value}
							/>
							<span
								className={`theme-preview theme-preview-${value}`}
								aria-hidden="true"
							>
								<span />
								<span />
								<span />
							</span>
							<span>{t(value === "light" ? "settings.light" : "settings.dark")}</span>
						</label>
					))}
				</fieldset>
			</section>

			{message && (
				<p role="status" className={message === "settings.saved" ? "success" : "notice"}>
					{t(message)}
				</p>
			)}
			<button disabled={pending}>{t(pending ? "common.saving" : "common.save")}</button>
		</form>
	);
}
