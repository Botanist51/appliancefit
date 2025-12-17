import { getSheetData } from "../../lib/sheets";
import { compareOvens } from "../../lib/rules";

export default async function handler(req, res) {
  const { oldModel, newModel } = req.body;

  const data = await getSheetData();

  const oldOven = data.find(r => r["Model Number"] === oldModel);
  const newOven = data.find(r => r["Model Number"] === newModel);

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
