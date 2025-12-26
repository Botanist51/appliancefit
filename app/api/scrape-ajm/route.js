import { NextResponse } from "next/server";
import { scrapeAjmModel } from "../../../lib/scrapeAjm";

export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.model) {
      return NextResponse.json(
        { ok: false, error: "Missing model number" },
        { status: 400 }
      );
    }

    const r = await scrapeAjmModel(body.model);

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: r.error, url: r.url },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      source: "AJ Madison",
      url: r.url,
      appliance: r.data
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
