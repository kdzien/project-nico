import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@lib/i18n/server";
import { serverSupabase } from "@lib/supabase/server";
import { RegistrationForm } from "@app/register/form";

export default async function RegisterPage() {
	const db = await serverSupabase();
	const { data } = await db.auth.getUser();
	if (data.user) {
		redirect("/");
	}
	const { t } = await getI18n();

	return (
		<main className="shell login">
			<p className="eyebrow">NICO</p>
			<h1>{t("register.title")}</h1>
			<RegistrationForm />
			<p className="muted">
				{t("register.hasAccount")}{" "}
				<Link className="inline-link" href="/login">
					{t("login.submit")}
				</Link>
			</p>
		</main>
	);
}
