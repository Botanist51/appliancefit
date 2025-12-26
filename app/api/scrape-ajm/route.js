import { NextResponse } from "next/server";
import { scrapeAjmModel } from "../../../lib/scrapeAjm";

export async function POST(req) {
  const body = await req.json();
  const r = await scrapeAjmModel(body.model);

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error, url: r.url }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    source: "AJ Madison",
    url: r.url,
    data: r.data,
    tsvRow: r.tsvRow
  });
}
