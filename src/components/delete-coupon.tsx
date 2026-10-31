"use client";

import { useActionState, useState } from "react";
import { deleteCoupon } from "@app/coupons/actions";
import { TrashIcon } from "@components/result-icon";
import { useI18n } from "@lib/i18n/provider";

export function DeleteCoupon({ id }: { id: string }) {
	const { t } = useI18n();
	const [state, action, pending] = useActionState(deleteCoupon, "");
	const [confirming, setConfirming] = useState(false);
	return (
		<div
			className="delete-coupon-control"
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					setConfirming(false);
				}
			}}
		>
			<button
				type="button"
				className="coupon-icon-button coupon-icon-danger"
				aria-label={t("coupon.delete")}
				title={t("coupon.delete")}
				aria-expanded={confirming}
				onClick={() => setConfirming((value) => !value)}
			>
				<TrashIcon />
			</button>
			{confirming && (
				<form
					action={action}
					className="delete-coupon-popover"
					role="dialog"
					aria-label={t("coupon.confirmDelete")}
				>
					<input type="hidden" name="id" value={id} />
					<span>{t("coupon.confirmDelete")}</span>
					<div>
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
					</div>
					{state && <p role="status">{t(state)}</p>}
				</form>
			)}
		</div>
	);
}
