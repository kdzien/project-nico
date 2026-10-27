"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createI18n, type Preferences } from "./index";

const PreferencesContext = createContext<Preferences>({ locale: "pl", theme: "dark" });

export function PreferencesProvider({
	preferences,
	children,
}: {
	preferences: Preferences;
	children: ReactNode;
}) {
	return (
		<PreferencesContext.Provider value={preferences}>{children}</PreferencesContext.Provider>
	);
}

export function useI18n() {
	const preferences = useContext(PreferencesContext);
	return { ...createI18n(preferences.locale), theme: preferences.theme };
}
