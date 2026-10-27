import pl from "./messages/pl.json";
import en from "./messages/en.json";

export type Locale = "pl" | "en";
export type Theme = "light" | "dark";
export type MessageKey = keyof typeof pl;
export interface Preferences {
	locale: Locale;
	theme: Theme;
}

const dictionaries: Record<Locale, Record<MessageKey, string>> = { pl, en };
const intlLocales: Record<Locale, string> = { pl: "pl-PL", en: "en-GB" };
const statusKeys: Record<string, MessageKey> = {
	scheduled: "status.scheduled",
	live: "status.live",
	finished: "status.finished",
	cancelled: "status.cancelled",
	postponed: "status.postponed",
	unknown: "status.unknown",
	draft: "status.draft",
	placed: "status.placed",
	pending: "status.pending",
	won: "status.won",
	lost: "status.lost",
	void: "status.void",
	partially_won: "status.partially_won",
};

export function createI18n(locale: Locale) {
	function t(key: MessageKey, values: Record<string, string | number> = {}) {
		return dictionaries[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
			values[name] === undefined ? placeholder : String(values[name]),
		);
	}

	return {
		locale,
		t,
		statusLabel: (status: string) => t(statusKeys[status] ?? "status.unknown"),
		formatDate: (value: string, options: Intl.DateTimeFormatOptions) =>
			new Intl.DateTimeFormat(intlLocales[locale], {
				timeZone: "Europe/Warsaw",
				...options,
			}).format(new Date(value)),
		formatNumber: (value: number) =>
			new Intl.NumberFormat(intlLocales[locale], {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}).format(value),
		formatCurrency: (value: number) =>
			new Intl.NumberFormat(intlLocales[locale], {
				style: "currency",
				currency: "PLN",
			}).format(value),
	};
}
