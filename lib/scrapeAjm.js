import * as cheerio from "cheerio";
// Extracts key/value pairs from AJ Madison specification tables
function extractSpecTable($) {
  const specs = {};

  $("table tr").each((_, row) => {
    const cells = $(row).find("td, th");
    if (cells.length < 2) return;

    const label = $(cells[0]).text().trim().toLowerCase();
    const value = $(cells[1]).text().trim();

    if (label && value) {
      specs[label] = value;
    }
  });

  return specs;
}

// Attempts to find a value in spec tables using alias keywords
function pickFromSpecs(specs, aliases) {
  for (const key of Object.keys(specs)) {
    for (const alias of aliases) {
      if (key.includes(alias)) {
        return specs[key];
      }
    }
  }
  return null;
}
function pickCutoutFromTable($) {
  const out = { width: null, height: null, depth: null };

  $("table").each((_, table) => {
    const tableText = $(table).text().toLowerCase();

    if (!tableText.includes("cut out dimensions")) return;

    $(table)
      .find("tr")
      .each((_, row) => {
        const cells = $(row).find("td, th");
        if (cells.length < 2) return;

        const label = $(cells[0]).text().trim().toLowerCase();
        const value = $(cells[1]).text().trim();

        if (label === "width") out.width = value;
        if (label === "height") out.height = value;
        if (label === "depth") out.depth = value;
      });
  });

  return out;
}

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

  const wholeFrac = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (wholeFrac) {
    const whole = Number(wholeFrac[1]);
    const num = Number(wholeFrac[2]);
    const den = Number(wholeFrac[3]);
    if (Number.isFinite(whole) && Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return whole + num / den;
    }
  }

  const fracOnly = s.match(/^(\d+)\/(\d+)$/);
  if (fracOnly) {
    const num = Number(fracOnly[1]);
    const den = Number(fracOnly[2]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den;
    }
  }

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
    .replace(/[^A-Z0-9]/g, "");
}

// Pulls "Label: value" from the page text, e.g. "Cutout Width: 28 5/8 Inch"
function pick(text, label) {
  const re = new RegExp(`${label}\\s*:\\s*([^\\n\\r]+)`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function pickNumber(text, label) {
  const raw = pick(text, label);
  if (!raw) return null;
  const m = raw.match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function fmtNum(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "N/A";
  const fixed = Number(n.toFixed(4));
  return String(fixed);
}

export function toTSVRow(obj) {
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

export async function scrapeAjmModel(rawModel) {
  const model = normalizeModel(rawModel);
  if (!model) return { ok: false, error: "Missing model" };

  const url = `https://www.ajmadison.com/cgi-bin/ajmadison/${model}.html`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (ApplianceFit Spec Importer)" },
    cache: "no-store"
  });

  if (!res.ok) {
    return { ok: false, error: `AJ Madison fetch failed (${res.status})`, url };
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const specTable = extractSpecTable($);

  const pageText = $("body").text().replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n");

  // AJ Madison labels you confirmed:
  const brand = pick(pageText, "Brand");
  const modelFound = pick(pageText, "Model") || model;

  const fuelType = pick(pageText, "Fuel Type");
  const amps = pickNumber(pageText, "Amps");
  const volts = pickNumber(pageText, "Voltage");

 let cutoutW = pick(pageText, "Cutout Width");
let cutoutH = pick(pageText, "Cutout Height");
let cutoutD = pick(pageText, "Cutout Depth");

// First fallback: spec tables with explicit cutout labels
if (!cutoutW) {
  cutoutW = pickFromSpecs(specTable, ["cutout width", "cut out width"]);
}
if (!cutoutH) {
  cutoutH = pickFromSpecs(specTable, ["cutout height", "cut out height"]);
}
if (!cutoutD) {
  cutoutD = pickFromSpecs(specTable, ["cutout depth", "cut out depth"]);
}

// Second fallback: Cut Out Dimensions table
if (!cutoutW || !cutoutH || !cutoutD) {
  const cutoutTable = pickCutoutFromTable($);
  if (!cutoutW) cutoutW = cutoutTable.width;
  if (!cutoutH) cutoutH = cutoutTable.height;
  if (!cutoutD) cutoutD = cutoutTable.depth;
}

  const overallW = pick(pageText, "Width") || pick(pageText, "Exterior Width");
  const overallH = pick(pageText, "Height") || pick(pageText, "Heigh");
  const overallD = pick(pageText, "Depth");

  const weightRaw = pick(pageText, "Weight") || pick(pageText, "Net Weight");
  const weight = weightRaw ? (weightRaw.match(/(\d+(\.\d+)?)/)?.[1] ?? null) : null;

  const cutoutWidthDec = parseInches(cutoutW);
  const cutoutHeightDec = parseInches(cutoutH);
  const cutoutDepthDec = parseInches(cutoutD);

  const overallWidthDec = parseInches(overallW);
  const overallHeightDec = parseInches(overallH);
  const overallDepthDec = parseInches(overallD);

  const out = {
    "Manufacturer": brand ? String(brand).split(" ")[0] : "N/A",
    "Brand Line": brand || "N/A",
    "Model Number": normalizeModel(modelFound),

    "Fuel Type": fuelType || "N/A",
    "Configuration": "N/A",
    "Appliance Type": "N/A",

    "Overall Width (in)": fmtNum(overallWidthDec),
    "Overall Height (in)": fmtNum(overallHeightDec),
    "Overall Depth (in)": fmtNum(overallDepthDec),

    "Cutout Width Min (in)": cutoutWidthDec !== null ? fmtNum(cutoutWidthDec) : "N/A",
    "Cutout Width Max (in)": cutoutWidthDec !== null ? fmtNum(cutoutWidthDec) : "N/A",
    "Cutout Height Min (in)": cutoutHeightDec !== null ? fmtNum(cutoutHeightDec) : "N/A",
    "Cutout Height Max (in)": cutoutHeightDec !== null ? fmtNum(cutoutHeightDec) : "N/A",
    "Cutout Depth Min (in)": cutoutDepthDec !== null ? fmtNum(cutoutDepthDec) : "N/A",

    "Voltage": volts !== null && Number.isFinite(volts) ? String(volts) : "N/A",
    "Amperage (A)": amps !== null && Number.isFinite(amps) ? String(amps) : "N/A",
    "Phase": "N/A",

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

  return { ok: true, url, data: out, tsvRow: toTSVRow(out) };
}
