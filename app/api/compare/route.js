import { NextResponse } from "next/server";
import { getSheetData } from "../../../lib/sheets";
import { scrapeAjmModel } from "../../../lib/scrapeAjm";

export async function POST(req) {
  const { oldModel, newModel, importedAppliance } = await req.json();

  const data = await getSheetData();

  const normalize = v => String(v || "").trim().toUpperCase();
const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const fmt = n => {
  if (n === null) return "";
  return String(Number(n.toFixed(4)));
};
const safe = v => (v === undefined || v === null || v === "" ? "N/A" : v);

  let oldOven = null;
let newOven = null;

// 1. If AJ Madison import exists, use it as the NEW appliance
if (importedAppliance) {
  newOven = importedAppliance;
}

// 2. Always try to resolve the OLD appliance from the sheet
if (oldModel) {
  oldOven = data.find(
    r => normalize(r["Model Number"]) === normalize(oldModel)
  );
}

// 3. If no import was used, resolve NEW appliance from sheet
if (!newOven && newModel) {
  newOven = data.find(
    r => normalize(r["Model Number"]) === normalize(newModel)
  );
}

  // If not found in sheet, fall back to AJ Madison scrape (Option A)
let sources = [];
let scrapeSourceNote = "";

if (!oldOven) {
  const r = await scrapeAjmModel(oldModel);
  if (r.ok) {
    oldOven = r.data;
    sources.push(r.url);
    scrapeSourceNote = " (AJ Madison fallback)";
  }
}

if (!newOven) {
  const r = await scrapeAjmModel(newModel);
  if (r.ok) {
    newOven = r.data;
    sources.push(r.url);
    scrapeSourceNote = " (AJ Madison fallback)";
  }
}

if (!oldOven || !newOven) {
  return NextResponse.json({
    verdict: "Insufficient Data",
    summary: "One or both model numbers were not found in the verified dataset or AJ Madison.",
    installImpact: [],
    charts: [],
    modifications: [],
    sources: sources
  });
}

  const mods = [];
  let verdict = "Direct Replacement";

 if (newOven["Cutout Height Min (in)"] > oldOven["Cutout Height Max (in)"]) {
  verdict = "Not Compatible";
  mods.push("Cabinet cut-out height must be increased.");

}

  if (newOven["Cutout Depth Min (in)"] > oldOven["Cutout Depth Min (in)"]) {
    if (verdict !== "Not Compatible") verdict = "Modifications Required";
   mods.push("Cabinet depth or rear clearance adjustment required.");

  }

  if (newOven["Amperage (A)"] > oldOven["Amperage (A)"]) {
    if (verdict !== "Not Compatible") verdict = "Modifications Required";
   mods.push("Electrical circuit upgrade required.");

  }
const installImpact = [];

// --- Cut-out impacts ---
const heightDelta =
  num(newOven["Cutout Height Min (in)"]) -
  num(oldOven["Cutout Height Max (in)"]);

if (heightDelta > 0) {
  installImpact.push(
    `Cabinet opening height must be increased by ${fmt(heightDelta)} in.`
  );
}

const depthDelta =
  num(newOven["Cutout Depth Min (in)"]) -
  num(oldOven["Cutout Depth Min (in)"]);

if (depthDelta > 0) {
  installImpact.push(
    `Cabinet depth or rear clearance must be increased by ${fmt(depthDelta)} in.`
  );
}

// --- Electrical impacts ---
const ampDelta =
  num(newOven["Amperage (A)"]) -
  num(oldOven["Amperage (A)"]);

if (ampDelta > 0) {
  installImpact.push(
    `Electrical service must be upgraded from ${oldOven["Amperage (A)"]}A to ${newOven["Amperage (A)"]}A.`
  );
}

// --- Fallback ---
if (installImpact.length === 0) {
  installImpact.push("No installation modifications are required.");
}

return NextResponse.json({
  verdict,
  summary: "Comparison based on manufacturer installation specifications.",
  installImpact,

  charts: [
    {
      id: "cutout",
      title: "Cut-Out Dimensions",
      rows: [
        {
          label: "Width (in)",
          old: `${fmt(oldOven["Cutout Width Min (in)"])} to ${fmt(oldOven["Cutout Width Max (in)"])}`,
          new: `${fmt(newOven["Cutout Width Min (in)"])} to ${fmt(newOven["Cutout Width Max (in)"])}`,
          diff: fmt(
            num(newOven["Cutout Width Min (in)"]) -
            num(oldOven["Cutout Width Max (in)"])
          )
        },
        {
          label: "Height (in)",
          old: fmt(oldOven["Cutout Height Max (in)"]),
          new: fmt(newOven["Cutout Height Min (in)"]),
          diff: fmt(
            num(newOven["Cutout Height Min (in)"]) -
            num(oldOven["Cutout Height Max (in)"])
          )
        },
        {
          label: "Depth (in)",
          old: fmt(oldOven["Cutout Depth Min (in)"]),
          new: fmt(newOven["Cutout Depth Min (in)"]),
          diff: fmt(
            num(newOven["Cutout Depth Min (in)"]) -
            num(oldOven["Cutout Depth Min (in)"])
          )
        }
      ]
    },

    {
      id: "electrical",
      title: "Electrical",
      rows: [
        {
          label: "Voltage",
          old: safe(oldOven["Voltage"]),
          new: safe(newOven["Voltage"]),
          diff: "N/A"
        },
        {
          label: "Amperage (A)",
          old: safe(oldOven["Amperage (A)"]),
          new: safe(newOven["Amperage (A)"]),
          diff:
            oldOven["Amperage (A)"] && newOven["Amperage (A)"]
              ? fmt(
                  num(newOven["Amperage (A)"]) -
                  num(oldOven["Amperage (A)"])
                )
              : "N/A"
        }
      ]
    },
        {
      id: "ventilation",
      title: "Ventilation",
      rows: [
        {
          label: "Ventilation Type",
          old: safe(oldOven["Ventilation Type"]),
          new: safe(newOven["Ventilation Type"]),
          diff: "N/A"
        },
        {
          label: "Minimum CFM",
          old: safe(oldOven["Ventilation Min CFM"]),
          new: safe(newOven["Ventilation Min CFM"]),
          diff:
            oldOven["Ventilation Min CFM"] && newOven["Ventilation Min CFM"]
              ? fmt(
                  num(newOven["Ventilation Min CFM"]) -
                  num(oldOven["Ventilation Min CFM"])
                )
              : "N/A"
        },
        {
          label: "Recommended CFM",
          old: safe(oldOven["Ventilation Recommended CFM"]),
          new: safe(newOven["Ventilation Recommended CFM"]),
          diff:
            oldOven["Ventilation Recommended CFM"] &&
            newOven["Ventilation Recommended CFM"]
              ? fmt(
                  num(newOven["Ventilation Recommended CFM"]) -
                  num(oldOven["Ventilation Recommended CFM"])
                )
              : "N/A"
        },
        {
          label: "Duct Diameter (in)",
          old: safe(oldOven["Ventilation Duct Diameter (in)"]),
          new: safe(newOven["Ventilation Duct Diameter (in)"]),
          diff:
            oldOven["Ventilation Duct Diameter (in)"] &&
            newOven["Ventilation Duct Diameter (in)"]
              ? fmt(
                  num(newOven["Ventilation Duct Diameter (in)"]) -
                  num(oldOven["Ventilation Duct Diameter (in)"])
                )
              : "N/A"
        },
        {
          label: "Recirculating Allowed",
          old: safe(oldOven["Ventilation Recirculating Allowed"]),
          new: safe(newOven["Ventilation Recirculating Allowed"]),
          diff: "N/A"
        }
      ]
    },
        {
      id: "gas",
      title: "Gas",
      rows: [
        {
          label: "Gas Type",
          old: safe(oldOven["Gas Type"]),
          new: safe(newOven["Gas Type"]),
          diff: "N/A"
        },
        {
          label: "Gas Supply Pressure",
          old: safe(oldOven["Gas Supply Pressure"]),
          new: safe(newOven["Gas Supply Pressure"]),
          diff: "N/A"
        },
        {
          label: "Gas Connection Size",
          old: safe(oldOven["Gas Connection Size"]),
          new: safe(newOven["Gas Connection Size"]),
          diff: "N/A"
        }
      ]
    },
        {
      id: "plumbing",
      title: "Plumbing",
      rows: [
        {
          label: "Water Supply Required",
          old: safe(oldOven["Water Supply Required"]),
          new: safe(newOven["Water Supply Required"]),
          diff: "N/A"
        },
        {
          label: "Water Line Size",
          old: safe(oldOven["Water Line Size"]),
          new: safe(newOven["Water Line Size"]),
          diff: "N/A"
        },
        {
          label: "Drain Required",
          old: safe(oldOven["Drain Required"]),
          new: safe(newOven["Drain Required"]),
          diff: "N/A"
        }
      ]
    }
  ],

 modifications: mods,
sources: [
  safe(oldOven["Spec Source URL"]),
  safe(newOven["Spec Source URL"]),
  ...sources
].filter(s => s && s !== "N/A")
});
}
