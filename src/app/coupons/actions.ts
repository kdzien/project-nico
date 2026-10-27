"use server";
import type { MessageKey } from "@/lib/i18n";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { couponInput } from "@/lib/coupons";

export interface SaveState {
	message: MessageKey | "";
	id: string | null;
	ok: boolean;
}
export async function saveCoupon(previous: SaveState, form: FormData): Promise<SaveState> {
	const { db } = await requireUser();
	let items: unknown;
	try {
		items = JSON.parse(String(form.get("items")));
	} catch {
		return { ...previous, ok: false, message: "coupon.invalidItems" };
	}
	const parsed = couponInput.safeParse({
		id: form.get("id") || null,
		name: form.get("name"),
		stake: form.get("stake") ? Number(form.get("stake")) : null,
		items,
		finalize: form.get("intent") === "finalize",
	});
	if (!parsed.success) {
		return { ...previous, ok: false, message: "coupon.invalidInput" };
	}
	const input = parsed.data;
	const { data, error } = await db.rpc("save_coupon", {
		p_id: input.id,
		p_name: input.name,
		p_stake: input.stake,
		p_items: input.items,
		p_finalize: input.finalize,
	});
	if (error) {
		return { ...previous, ok: false, message: "coupon.saveFailed" };
	}
	revalidatePath("/coupons");
	revalidatePath("/");
	if (input.finalize) {
		redirect("/coupons");
	}
	return { message: "coupon.saved", id: data as string, ok: true };
}

export async function deleteCoupon(
	_state: MessageKey | "",
	form: FormData,
): Promise<MessageKey | ""> {
	const { db } = await requireUser();
	const id = z.uuid().safeParse(form.get("id"));
	if (!id.success) {
		return "coupon.invalidId";
	}
	const { data, error } = await db.from("coupons").delete().eq("id", id.data).select("id");
	if (error || !data?.length) {
		return "coupon.deleteFailed";
	}
	revalidatePath("/coupons");
	return "coupon.deleted";
}
