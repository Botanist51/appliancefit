export async function getSheetData() {
  const SHEET_ID = "1WRlYWIYwNsdguxVAKZX0-AKvsajmD2_yctRzN57w2hY";
  const SHEET_NAME = "Wall Ovens";

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));

  const headers = json.table.cols.map(c => c.label);
  return json.table.rows.map(r => {
    const obj = {};
    r.c.forEach((cell, i) => {
      obj[headers[i]] = cell ? cell.v : null;
    });
    return obj;
  });
}
