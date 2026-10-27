import { getI18n } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { serverSupabase } from "@/lib/supabase/server";
import { LoginForm } from "./form";

export default async function LoginPage() {
	const { t } = await getI18n();
	const db = await serverSupabase();
	const { data } = await db.auth.getUser();
	if (data.user) {
		redirect("/");
	}
	return (
		<main className="shell login">
			<p className="eyebrow">PROJECT NICO</p>
			<h1>{t("login.title")}</h1>
			<p className="lead">{t("login.description")}</p>
			<LoginForm />
			<p className="muted">{t("login.private")}</p>
		</main>
	);
}
