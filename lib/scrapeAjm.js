import * as cheerio from "cheerio";
function extractDimsFromSpecsTab($, sectionTitle) {
  const result = { width: null, height: null, depth: null };

  // Prefer the Specifications tab pane if present (matches your pasted HTML)
  // Example id: XOU15BCOFR-specs-tab-pane
  const root = $('div.tab-pane[id$="-specs-tab-pane"]').length
    ? $('div.tab-pane[id$="-specs-tab-pane"]')
    : $("body");

  const targetTitle = String(sectionTitle || "").trim().toLowerCase();

  // Section headers look like:
  // <div class="bold ... bg-gray-2 ...">Cut Out Dimensions</div>
  const header = root
    .find("div.bold")
    .filter((_, el) => $(el).text().replace(/\s+/g, " ").trim().toLowerCase() === targetTitle)
    .first();

  if (!header.length) return result;

  // Spec rows look like:
  // <div class="... spec-bar ...">
  //   <div class="col col-6 right-align bold">Width: &nbsp;</div>
  //   <div class="col col-6">15"</div>
  // </div>
  let node = header.next();

  while (node.length) {
    // Stop when we hit the next section header
    if (node.is("div.bold")) break;

    if (node.hasClass("spec-bar")) {
      const labelRaw = node.find("div.col-6").first().text();
      const valueRaw = node.find("div.col-6").last().text();

      const label = labelRaw
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .replace(":", "")
        .trim()
        .toLowerCase();

      const value = valueRaw
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (label === "width") result.width = value;
      else if (label === "height") result.height = value;
      else if (label === "depth") result.depth = value;
    }

    node = node.next();
  }

  return result;
}

function extractCutoutDimensions($) {
  return extractDimsFromSpecsTab($, "Cut Out Dimensions");
}

function extractOverallDimensions($) {
  return extractDimsFromSpecsTab($, "Dimensions");
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

    // Fallback: pull Cut Out Dimensions from the Specifications tab layout (div-based)
  if (!cutoutW || !cutoutH || !cutoutD) {
    const cutout = extractCutoutDimensions($);
    if (!cutoutW && cutout.width) cutoutW = cutout.width;
    if (!cutoutH && cutout.height) cutoutH = cutout.height;
    if (!cutoutD && cutout.depth) cutoutD = cutout.depth;
  }

    let overallW = pick(pageText, "Width") || pick(pageText, "Exterior Width");
  let overallH = pick(pageText, "Height") || pick(pageText, "Heigh");
  let overallD = pick(pageText, "Depth");

  // If the page-text approach is missing/ambiguous, use the Specifications tab "Dimensions" section
  if (!overallW || !overallH || !overallD) {
    const dims = extractOverallDimensions($);
    if (!overallW && dims.width) overallW = dims.width;
    if (!overallH && dims.height) overallH = dims.height;
    if (!overallD && dims.depth) overallD = dims.depth;
  }

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
