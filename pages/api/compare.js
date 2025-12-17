import { getSheetData } from "../../lib/sheets";
import { compareOvens } from "../../lib/rules";

export default async function handler(req, res) {
  const { oldModel, newModel } = req.body;

  const data = await getSheetData();

const normalize = v => String(v || "").trim().toUpperCase();

const oldOven = data.find(
  r => normalize(r["Model Number"]) === normalize(oldModel)
);

const newOven = data.find(
  r => normalize(r["Model Number"]) === normalize(newModel)
);


  if (!oldOven || !newOven) {
    return res.json({
      verdict: "❌ Insufficient Data",
      summary: "One or both model numbers were not found in the verified dataset.",
      modifications: [],
      sources: []
    });
  }

  const result = compareOvens(oldOven, newOven);
  res.json(result);
}
