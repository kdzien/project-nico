"use client";

import Image from "next/image";
import { useState } from "react";

export function TeamLogo({ teamId, hash }: { teamId: string | null; hash: string | null }) {
	const [failedSource, setFailedSource] = useState<string | null>(null);
	if (!teamId || !hash) {
		return null;
	}
	const source = `/api/teams/${teamId}/logo?v=${hash}`;
	if (failedSource === source) {
		return null;
	}
	return (
		<Image
			className="team-logo"
			src={source}
			alt=""
			width={24}
			height={24}
			unoptimized
			onError={() => setFailedSource(source)}
		/>
	);
}
