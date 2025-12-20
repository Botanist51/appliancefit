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
  "Cut-Out Width (in)": (() => {
    const oldMax = num(oldOven["Cutout Width Max (in)"]);
    const newMin = num(newOven["Cutout Width Min (in)"]);
    const diff = oldMax !== null && newMin !== null ? newMin - oldMax : null;

    return {
      old: `${fmt(oldOven["Cutout Width Min (in)"])} to ${fmt(oldOven["Cutout Width Max (in)"])}`,
      new: `${fmt(newOven["Cutout Width Min (in)"])} to ${fmt(newOven["Cutout Width Max (in)"])}`,
      diff: diff === null ? "" : fmt(diff)
    };
  })(),

  "Cut-Out Height (in)": (() => {
    const oldMax = num(oldOven["Cutout Height Max (in)"]);
    const newMin = num(newOven["Cutout Height Min (in)"]);
    const diff = oldMax !== null && newMin !== null ? newMin - oldMax : null;

    return {
      old: fmt(oldOven["Cutout Height Min (in)"]),
      new: fmt(newOven["Cutout Height Min (in)"]),
      diff: diff === null ? "" : fmt(diff)
    };
  })(),

  "Cut-Out Depth (in)": (() => {
    const oldMin = num(oldOven["Cutout Depth Min (in)"]);
    const newMin = num(newOven["Cutout Depth Min (in)"]);
    const diff = oldMin !== null && newMin !== null ? newMin - oldMin : null;

    return {
      old: fmt(oldOven["Cutout Depth Min (in)"]),
      new: fmt(newOven["Cutout Depth Min (in)"]),
      diff: diff === null ? "" : fmt(diff)
    };
  })()
},

  modifications: mods,
  sources: [
    oldOven["Spec Source URL"],
    newOven["Spec Source URL"]
  ]
});
}
