import { z } from "zod";
import { selections } from "@lib/models";
export const couponInput = z.object({
	id: z.uuid().nullable(),
	name: z.string().trim().min(1).max(120),
	stake: z.number().finite().min(0).max(9999999999.99).nullable(),
	items: z
		.array(
			z.object({
				event_id: z.uuid(),
				selection: z.enum(selections),
				odds_at_add: z.number().finite().positive().max(99999999.99),
			}),
		)
		.max(100)
		.refine((items) => new Set(items.map((item) => item.event_id)).size === items.length),
});
export function combinedOdds(items: { odds_at_add: number; result?: string }[]): number {
	return items.reduce(
		(product, item) => product * (item.result === "void" ? 1 : item.odds_at_add),
		1,
	);
}
