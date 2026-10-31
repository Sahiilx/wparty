import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const host =
    process.env.PARTYKIT_HOST ||
    process.env.NEXT_PUBLIC_PARTYKIT_HOST ||
    "";

  return NextResponse.json({ host });
}

