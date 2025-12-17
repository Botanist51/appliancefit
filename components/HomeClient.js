import { useState } from "react";

export default function HomeClient() {
  const [oldModel, setOldModel] = useState("");
  const [newModel, setNewModel] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function compare() {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldModel, newModel })
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main style={{ padding: 30, maxWidth: 900, margin: "auto", fontFamily: "Arial" }}>
      <h1>ApplianceFit</h1>
      <p>Built-In Wall Oven Compatibility Check</p>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          placeholder="Old model number"
          value={oldModel}
          onChange={e => setOldModel(e.target.value)}
        />
        <input
          placeholder="New model number"
          value={newModel}
          onChange={e => setNewModel(e.target.value)}
        />
        <button onClick={compare}>Compare</button>
      </div>

      {loading && <p>Comparing…</p>}

      {result && (
        <>
          <div
            style={{
              padding: 15,
              marginTop: 20,
              borderRadius: 6,
              background:
                result.verdict === "Not Compatible"
                  ? "#ffe5e5"
                  : result.verdict === "Modifications Required"
                  ? "#fff6db"
                  : "#e6ffed",
              border: "1px solid #ccc"
            }}
          >
            <h2>{result.verdict}</h2>
            <p>{result.summary}</p>
          </div>

          {result.comparison && (
            <>
              <h3>Cut-Out Dimension Comparison</h3>
              <table border="1" cellPadding="8">
                <thead>
                  <tr>
                    <th>Dimension</th>
                    <th>Existing</th>
                    <th>Replacement</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.comparison).map(([key, val]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{val.old}</td>
                      <td>{val.new}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {result.modifications?.length > 0 && (
            <>
              <h3>Required Modifications</h3>
              <ul>
                {result.modifications.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </>
          )}

          {result.sources && (
            <>
              <h3>Sources</h3>
              <ul>
                {result.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s} target="_blank" rel="noreferrer">{s}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}
