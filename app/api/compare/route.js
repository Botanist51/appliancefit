import { NextResponse } from "next/server";
import { getSheetData } from "../../../lib/sheets";

export async function POST(req) {
  const { oldModel, newModel } = await req.json();

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

  const oldOven = data.find(
    r => normalize(r["Model Number"]) === normalize(oldModel)
  );
  const newOven = data.find(
    r => normalize(r["Model Number"]) === normalize(newModel)
  );

  if (!oldOven || !newOven) {
    return NextResponse.json({
      verdict: "Insufficient Data",
      summary: "One or both model numbers were not found in the verified dataset.",
      modifications: [],
      sources: []
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

return NextResponse.json({
  verdict,
  summary: "Comparison based on manufacturer installation specifications.",

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
    }
  ],

  modifications: mods,
  sources: [
    safe(oldOven["Spec Source URL"]),
    safe(newOven["Spec Source URL"])
  ]
});
}
