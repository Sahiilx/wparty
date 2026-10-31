import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let host =
    process.env.PARTYKIT_HOST ||
    process.env.NEXT_PUBLIC_PARTYKIT_HOST ||
    "";

  if (host.includes("partykit.dev")) {
    host = "";
  }

  return NextResponse.json({ host });
}

