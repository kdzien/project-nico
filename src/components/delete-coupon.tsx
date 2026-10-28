"use client";
import { useI18n } from "@lib/i18n/provider";
import { useActionState, useState } from "react";
import { deleteCoupon } from "@app/coupons/actions";
export function DeleteCoupon({ id }: { id: string }) {
	const { t } = useI18n();
	const [state, action, pending] = useActionState(deleteCoupon, "");
	const [confirming, setConfirming] = useState(false);
	return (
		<div>
			{confirming ? (
				<form action={action} className="delete-form">
					<input type="hidden" name="id" value={id} />
					<span>{t("coupon.confirmDelete")}</span>
					<button className="secondary" disabled={pending}>
						{t("coupon.yesDelete")}
					</button>
					<button
						type="button"
						className="text-button"
						onClick={() => setConfirming(false)}
					>
						{t("common.cancel")}
					</button>
				</form>
			) : (
				<button type="button" className="text-button" onClick={() => setConfirming(true)}>
					{t("coupon.delete")}
				</button>
			)}
			{state && <p role="status">{t(state)}</p>}
		</div>
	);
}
