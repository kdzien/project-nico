import { z } from "zod";
import { serverSupabase } from "@lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = z.uuid().safeParse((await params).id);
	if (!id.success) {
		return new Response(null, { status: 404 });
	}
	// The session cookie and RLS authorize this read; no secret key or external request.
	const db = await serverSupabase();
	const { data, error } = await db
		.from("teams")
		.select("logo_data,logo_hash")
		.eq("id", id.data)
		.maybeSingle();
	if (error) {
		return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
	}
	if (!data?.logo_data || !data.logo_hash) {
		return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
	}
	const headers = {
		"Content-Type": "image/webp",
		"Cache-Control": "private, max-age=86400",
		ETag: `"${data.logo_hash}"`,
		"X-Content-Type-Options": "nosniff",
	};
	if (request.headers.get("if-none-match") === headers.ETag) {
		return new Response(null, { status: 304, headers });
	}
	const bytes = Uint8Array.from(Buffer.from(String(data.logo_data).replace(/^\\x/, ""), "hex"));
	return new Response(bytes, { headers });
}
