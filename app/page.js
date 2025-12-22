"use client";

import { useState } from "react";

export default function Home() {
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
      body: JSON.stringify({
        oldModel,
        newModel
      })
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }
  const pageStyle = {
    padding: 40,
    maxWidth: 1100,
    margin: "0 auto",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    color: "#111827"
  };

  const sectionTitle = {
    marginTop: 48,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: 600
  };

  const mutedText = {
    color: "#6b7280",
    fontSize: 14
  };

  return (
    <main style={pageStyle}>

     <h1
  style={{
    fontSize: 36,
    fontWeight: 700,
    marginBottom: 4,
    letterSpacing: "-0.02em"
  }}
>
  ApplianceFit
</h1>

<p style={mutedText}>
  Built-In Wall Oven Compatibility Check
</p>

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
{result.installImpact && (
  <>
    <h3 style={{ marginTop: 30 }}>Install Impact Summary</h3>
    <ul>
      {result.installImpact.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  </>
)}
{result.costEstimate && (
  <>
    <h3 style={{ marginTop: 30 }}>Estimated Installation Cost</h3>

    <div
      style={{
        padding: 15,
        border: "1px solid #ccc",
        borderRadius: 6,
        background: "#f9f9f9",
        maxWidth: 500
      }}
    >
      <p>
        <strong>Most installs fall between:</strong>{" "}
        {result.costEstimate.mostLikelyRange}
      </p>

      <p>
        <strong>Full estimated range:</strong>{" "}
        {result.costEstimate.fullRange}
      </p>

      <p>
        <strong>Installation risk level:</strong>{" "}
        {result.costEstimate.riskLevel}
      </p>

      {result.costEstimate.drivers?.length > 0 && (
        <>
          <p>
            <strong>Primary cost drivers:</strong>
          </p>
          <ul>
            {result.costEstimate.drivers.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  </>
)}

      {result.charts?.map(chart => (
  <div key={chart.id} style={{ marginTop: 30 }}>
    <h3>{chart.title}</h3>

    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: 10
      }}
    >
      <thead>
        <tr>
          <th style={th}>Parameter</th>
          <th style={th}>Existing</th>
          <th style={th}>Replacement</th>
          <th style={th}>Difference</th>
        </tr>
      </thead>
      <tbody>
        {chart.rows.map(row => (
          <tr key={row.label}>
            <td style={td}>{row.label}</td>
            <td style={td}>{row.old}</td>
            <td style={td}>{row.new}</td>
            <td style={td}>
              {row.diff !== "" ? `${row.diff}` : "N/A"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
))}

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

          {result.sources?.length > 0 && (
            <>
              <h3>Sources</h3>
              <ul>
                {result.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s} target="_blank" rel="noreferrer">
                      {s}
                    </a>
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
const th = {
  border: "1px solid #ccc",
  padding: "8px",
  background: "#f4f4f4",
  textAlign: "left"
};

const td = {
  border: "1px solid #ccc",
  padding: "8px"
};

export const dynamic = "force-dynamic";
