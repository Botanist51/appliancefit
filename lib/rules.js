export function compareOvens(oldOven, newOven) {
  const mods = [];
  let verdict = "✅ Direct Replacement";

  if (newOven["Cutout Height Min (in)"] > oldOven["Cutout Height Max (in)"]) {
    verdict = "❌ Not Compatible";
    mods.push("Cabinet cut-out height must be increased.");
  }

  if (newOven["Cutout Depth Min (in)"] > oldOven["Cutout Depth Min (in)"]) {
    verdict = verdict === "❌ Not Compatible" ? verdict : "⚠️ Modifications Required";
    mods.push("Cabinet depth or rear clearance adjustment required.");
  }

  if (newOven["Amperage (A)"] > oldOven["Amperage (A)"]) {
    verdict = verdict === "❌ Not Compatible" ? verdict : "⚠️ Modifications Required";
    mods.push("Electrical circuit upgrade required.");
  }

  return {
    verdict,
    summary: "Comparison based on manufacturer installation specifications.",
    modifications: mods,
    sources: [
      oldOven["Spec Source URL"],
      newOven["Spec Source URL"]
    ]
  };
}
