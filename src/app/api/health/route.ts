import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const startTime = Date.now();

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  return NextResponse.json({
    status: "ok",
    online: true,
    uptime: uptimeSeconds,
    timestamp: Date.now(),
    host:
      process.env.PARTYKIT_HOST ||
      process.env.NEXT_PUBLIC_PARTYKIT_HOST ||
      "auto",
    server: "PartyHub Standalone Engine",
  });
}

