import { NextResponse } from "next/server";
import { refreshFromGitHub, getDrawingWords, getFortunePhrases, getImposterPairs } from "../../../../../party/words/word-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await refreshFromGitHub();
  return NextResponse.json({
    status: "ok",
    message: "Dynamic word bank refreshed successfully",
    syncedAt: new Date().toISOString(),
    nextAutoSyncInHours: 12,
    totals: {
      drawingWords: getDrawingWords().length,
      fortunePhrasesAndDialogues: getFortunePhrases().length,
      imposterPairs: getImposterPairs().length,
    },
    ...result,
  });
}
