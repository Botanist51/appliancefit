export const runtime = "nodejs";

import { NextResponse } from "next/server";
const cheerio = require("cheerio");

/**
 * Converts AJ Madison inch strings like:
 * "28 5/8 Inch", '27 5/16"', "30 Inch", "23 1/2"
 * into a decimal number (e.g., 28.625).
 * Returns null if it can't parse.
 */
function parseInches(value) {
  if (!value) return null;

  const s = String(value)
    .replace(/Inch|Inches|"/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Match: whole + fraction (e.g., "28 5/8")
  const wholeFrac = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (wholeFrac) {
    const whole = Number(wholeFrac[1]);
    const num = Number(wholeFrac[2]);
    const den = Number(wholeFrac[3]);
    if (Number.isFinite(whole) && Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return whole + num / den;
    }
  }

  // Match: just fraction (e.g., "5/8")
  const fracOnly = s.match(/^(\d+)\/(\d+)$/);
  if (fracOnly) {
    const num = Number(fracOnly[1]);
    const den = Number(fracOnly[2]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den;
    }
  }

  // Match: decimal or integer (e.g., "29.75" or "30")
  const numOnly = s.match(/^(\d+(\.\d+)?)$/);
  if (numOnly) {
    const n = Number(numOnly[1]);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function safe(v) {
  return v === undefined || v === null || v === "" ? "N/A" : v;
}

function normalizeModel(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ""); // remove spaces, hyphens, etc.
}

// Pulls "Label: value" from the page text, e.g. "Cutout Width: 28 5/8 Inch"
function pick(text, label) {
  const re = new RegExp(`${label}\\s*:\\s*([^\\n\\r]+)`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

// Pulls first number in a string, e.g. "240 Volts" -> 240
function pickNumber(text, label) {
  const raw = pick(text, label);
  if (!raw) return null;
  const m = raw.match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function fmtNum(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "N/A";
  // keep 4 decimals max but trim trailing zeros
  const fixed = Number(n.toFixed(4));
  return String(fixed);
}

// Build a tab-separated row in your EXACT column order
function toTSVRow(obj) {
  const cols = [
    "Manufacturer",
    "Brand Line",
    "Model Number",
    "Fuel Type",
    "Configuration",
    "Appliance Type",
    "Overall Width (in)",
    "Overall Height (in)",
    "Overall Depth (in)",
    "Cutout Width Min (in)",
    "Cutout Width Max (in)",
    "Cutout Height Min (in)",
    "Cutout Height Max (in)",
    "Cutout Depth Min (in)",
    "Voltage",
    "Amperage (A)",
    "Phase",
    "Connection Type",
    "Dedicated Circuit Required",
    "Front Venting",
    "Rear Clearance Required",
    "Bottom Clearance Required (in)",
    "Top Clearance Required (in)",
    "External Vent Required",
    "Cooling Fan Required",
    "Unit Weight (lbs)",
    "Cabinet Material Restrictions",
    "Support Platform Required",
    "Spec Source URL",
    "Ventilation Required",
    "Ventilation Type",
    "Ventilation Min CFM",
    "Ventilation Recommended CFM",
    "Ventilation Duct Diameter",
    "Ventilation Recirculating Allowed",
    "Water Supply Required",
    "Water Line Size",
    "Drain Required",
    "Drain Size",
    "Gas Required",
    "Gas Type",
    "Gas Supply Pressure",
    "Gas Connection Size"
  ];

  return cols.map(c => safe(obj[c])).join("\t");
}

export async function POST(req) {
  try {
    const body = await req.json();
    const model = normalizeModel(body.model);

    if (!model) {
      return NextResponse.json({ error: "Missing model" }, { status: 400 });
    }

    const url = `https://www.ajmadison.com/cgi-bin/ajmadison/${model}.html`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (ApplianceFit Spec Importer)"
      },
      cache: "no-store"
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `AJ Madison fetch failed`, status: res.status, url },
        { status: 502 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Get visible text from the page; AJM is mostly text labels so this works well.
    const pageText = $("body").text().replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n");

    // AJ Madison labels you confirmed:
    const brand = pick(pageText, "Brand");
    const modelFound = pick(pageText, "Model") || model;

    const fuelType = pick(pageText, "Fuel Type");
    const amps = pickNumber(pageText, "Amps");
    const volts = pickNumber(pageText, "Voltage");

    const cutoutW = pick(pageText, "Cutout Width");
    const cutoutH = pick(pageText, "Cutout Height");
    const cutoutD = pick(pageText, "Cutout Depth");

    // AJM often has Width/Height/Depth in specs ("Width:", "Heigh:", "Depth:")
    const overallW = pick(pageText, "Width") || pick(pageText, "Exterior Width");
    const overallH = pick(pageText, "Heigh") || pick(pageText, "Height");
    const overallD = pick(pageText, "Depth");

    const weightRaw = pick(pageText, "Weight") || pick(pageText, "Net Weight");
    const weight = weightRaw ? (weightRaw.match(/(\d+(\.\d+)?)/)?.[1] ?? null) : null;

    // Convert inch strings to decimals where applicable
    const cutoutWidthDec = parseInches(cutoutW);
    const cutoutHeightDec = parseInches(cutoutH);
    const cutoutDepthDec = parseInches(cutoutD);

    const overallWidthDec = parseInches(overallW);
    const overallHeightDec = parseInches(overallH);
    const overallDepthDec = parseInches(overallD);

    // Build object in your schema (fill missing with N/A later)
    const out = {
      "Manufacturer": brand ? String(brand).split(" ")[0] : "N/A",
      "Brand Line": brand || "N/A",
      "Model Number": normalizeModel(modelFound),

      "Fuel Type": fuelType || "N/A",
      "Configuration": "N/A",          // AJM varies; we’ll map later per category
      "Appliance Type": "N/A",         // you can set after import if needed

      "Overall Width (in)": fmtNum(overallWidthDec),
      "Overall Height (in)": fmtNum(overallHeightDec),
      "Overall Depth (in)": fmtNum(overallDepthDec),

      // For AJM cutout is usually a single value; set min=max
      "Cutout Width Min (in)": cutoutWidthDec !== null ? fmtNum(cutoutWidthDec) : "N/A",
      "Cutout Width Max (in)": cutoutWidthDec !== null ? fmtNum(cutoutWidthDec) : "N/A",
      "Cutout Height Min (in)": cutoutHeightDec !== null ? fmtNum(cutoutHeightDec) : "N/A",
      "Cutout Height Max (in)": cutoutHeightDec !== null ? fmtNum(cutoutHeightDec) : "N/A",
      "Cutout Depth Min (in)": cutoutDepthDec !== null ? fmtNum(cutoutDepthDec) : "N/A",

      "Voltage": volts !== null && Number.isFinite(volts) ? String(volts) : "N/A",
      "Amperage (A)": amps !== null && Number.isFinite(amps) ? String(amps) : "N/A",
      "Phase": "N/A",

      // Default connection assumptions (we can refine per appliance type)
      "Connection Type": "Plug-In",
      "Dedicated Circuit Required": "N/A",

      "Front Venting": "N/A",
      "Rear Clearance Required": "N/A",
      "Bottom Clearance Required (in)": "N/A",
      "Top Clearance Required (in)": "N/A",
      "External Vent Required": "N/A",
      "Cooling Fan Required": "N/A",

      "Unit Weight (lbs)": weight ? String(weight) : "N/A",
      "Cabinet Material Restrictions": "N/A",
      "Support Platform Required": "N/A",

      "Spec Source URL": url,

      "Ventilation Required": "N/A",
      "Ventilation Type": "N/A",
      "Ventilation Min CFM": "N/A",
      "Ventilation Recommended CFM": "N/A",
      "Ventilation Duct Diameter": "N/A",
      "Ventilation Recirculating Allowed": "N/A",

      "Water Supply Required": "N/A",
      "Water Line Size": "N/A",
      "Drain Required": "N/A",
      "Drain Size": "N/A",

      "Gas Required": "N/A",
      "Gas Type": "N/A",
      "Gas Supply Pressure": "N/A",
      "Gas Connection Size": "N/A"
    };

    return NextResponse.json({
      ok: true,
      source: "AJ Madison",
      url,
      data: out,
      tsvRow: toTSVRow(out)
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
