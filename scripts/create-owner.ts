import { adminClient } from "./admin.js";

const email = "dzieniu@gmail.com";
const password = "apteka13";
if (!email || !password) {
	throw new Error("Podaj OWNER_EMAIL i OWNER_PASSWORD (min. 10 znaków).");
}
const { error } = await adminClient().auth.admin.createUser({
	email,
	password,
	email_confirm: true,
});
if (error) {
	throw error;
}
console.log("Utworzono konto właściciela.");
