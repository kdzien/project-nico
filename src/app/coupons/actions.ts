"use server";
import type { MessageKey } from "@lib/i18n";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@lib/supabase/server";
import { couponInput } from "@lib/coupons";

export async function saveCoupon(value: unknown): Promise<{
	message: MessageKey | "";
	id: string | null;
}> {
	const { db } = await requireUser();
	const parsed = couponInput.safeParse(value);
	if (!parsed.success) {
		return { id: null, message: "coupon.invalidInput" };
	}
	const input = parsed.data;
	const { data, error } = await db.rpc("save_coupon", {
		p_id: input.id,
		p_name: input.name,
		p_stake: input.stake,
		p_items: input.items,
	});
	if (error) {
		return { id: null, message: "coupon.saveFailed" };
	}
	return { id: data as string, message: "" };
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

export async function clearCoupon(value: string): Promise<MessageKey | ""> {
	const { db } = await requireUser();
	const id = z.uuid().safeParse(value);
	if (!id.success) {
		return "coupon.invalidId";
	}
	const { error } = await db.rpc("clear_coupon", { p_id: id.data });
	return error ? "coupon.clearFailed" : "";
}
