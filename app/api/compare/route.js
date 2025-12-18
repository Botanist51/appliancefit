import { NextResponse } from "next/server";
import { getSheetData } from "../../../lib/sheets";

export async function POST(req) {
  const { oldModel, newModel } = await req.json();

  const data = await getSheetData();

  const normalize = v => String(v || "").trim().toUpperCase();

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

  comparison: {
    "Cut-Out Width (in)": {
      old: `${oldOven["Cutout Width Min (in)"]} to ${oldOven["Cutout Width Max (in)"]}`,
      new: `${newOven["Cutout Width Min (in)"]} to ${newOven["Cutout Width Max (in)"]}`
    },
    "Cut-Out Height (in)": {
      old: oldOven["Cutout Height Min (in)"],
      new: newOven["Cutout Height Min (in)"]
    },
    "Cut-Out Depth (in)": {
      old: oldOven["Cutout Depth Min (in)"],
      new: newOven["Cutout Depth Min (in)"]
    }
  },

  modifications: mods,
  sources: [
    oldOven["Spec Source URL"],
    newOven["Spec Source URL"]
  ]
});
}
