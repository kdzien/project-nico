import pl from "@lib/i18n/messages/pl.json";
import en from "@lib/i18n/messages/en.json";

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

const numberFormatters = new Map<Locale, Intl.NumberFormat>();
const currencyFormatters = new Map<Locale, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function createI18n(locale: Locale) {
	let numberFormatter = numberFormatters.get(locale);
	if (!numberFormatter) {
		numberFormatter = new Intl.NumberFormat(intlLocales[locale], {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		numberFormatters.set(locale, numberFormatter);
	}
	let currencyFormatter = currencyFormatters.get(locale);
	if (!currencyFormatter) {
		currencyFormatter = new Intl.NumberFormat(intlLocales[locale], {
			style: "currency",
			currency: "PLN",
		});
		currencyFormatters.set(locale, currencyFormatter);
	}
	function t(key: MessageKey, values: Record<string, string | number> = {}) {
		return dictionaries[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
			values[name] === undefined ? placeholder : String(values[name]),
		);
	}

	return {
		locale,
		t,
		statusLabel: (status: string) => t(statusKeys[status] ?? "status.unknown"),
		formatDate: (value: string, options: Intl.DateTimeFormatOptions) => {
			const key = `${locale}:${JSON.stringify(options)}`;
			let formatter = dateFormatters.get(key);
			if (!formatter) {
				formatter = new Intl.DateTimeFormat(intlLocales[locale], {
					timeZone: "Europe/Warsaw",
					...options,
				});
				dateFormatters.set(key, formatter);
			}
			return formatter.format(new Date(value));
		},
		formatNumber: numberFormatter.format,
		formatCurrency: currencyFormatter.format,
	};
}
