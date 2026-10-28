import { type NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@lib/supabase/server";

export async function GET(request: NextRequest) {
	const code = request.nextUrl.searchParams.get("code");
	if (code) {
		const db = await serverSupabase();
		const { error } = await db.auth.exchangeCodeForSession(code);
		if (!error) {
			const response = NextResponse.redirect(new URL("/", request.url));
			response.headers.set("Cache-Control", "private, no-store");
			return response;
		}
	}

	const response = NextResponse.redirect(new URL("/login?confirmation=failed", request.url));
	response.headers.set("Cache-Control", "private, no-store");
	return response;
}
