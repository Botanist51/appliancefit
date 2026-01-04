"use client";

import { useState } from "react";

export default function Home() {
  const [oldModel, setOldModel] = useState("");
  const [newModel, setNewModel] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importRow, setImportRow] = useState("");
  const [importedAppliance, setImportedAppliance] = useState(null);

  async function compare() {
    if (!oldModel && !newModel && !importedAppliance) {
  alert("Enter or import at least one appliance.");
  return;
}
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldModel,
        newModel,
        importedAppliance
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
  marginBottom: 14,
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#374151"
};

  const mutedText = {
    color: "#6b7280",
    fontSize: 14
  };

  return (
    <main style={pageStyle}>

    <h1
  style={{
    fontSize: 42,
    fontWeight: 900,
    marginBottom: 2,
    letterSpacing: "-0.04em",
    color: "#0f172a"
  }}
>
  ApplianceFit
</h1>

<p
  style={{
    fontSize: 15,
    fontWeight: 500,
    marginTop: 4,
    marginBottom: 28,
  color: "#4b5563"
  }}
>
  Appliance Installation Compatibility Check
</p>

      <div
  style={{
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 24
  }}
>
  <input
    placeholder="Existing model number"
    value={oldModel}
    onChange={e => setOldModel(e.target.value)}
    style={{
      flex: 1,
      padding: "12px 14px",
      borderRadius: 6,
      border: "1px solid #d1d5db",
      fontSize: 14
    }}
  />

  <input
    placeholder="Replacement model number"
    value={newModel}
    onChange={e => setNewModel(e.target.value)}
    style={{
      flex: 1,
      padding: "12px 14px",
      borderRadius: 6,
      border: "1px solid #d1d5db",
      fontSize: 14
    }}
  />

  <button
    onClick={compare}
    style={{
      padding: "12px 20px",
      borderRadius: 6,
      border: "none",
      background: "#111827",
      color: "white",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer"
    }}
  >
    Compare
  </button>

      <button
  onClick={async () => {
  setLoading(true);
  setResult(null);

  const r = await fetch("/api/scrape-ajm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: newModel || oldModel
    })
  });

  const j = await r.json();
  setLoading(false);

  if (!j.ok) {
    alert(j.error || "Import failed");
    return;
  }

  // 🔒 For now, imported appliance is ALWAYS the replacement
  setImportedAppliance(j.appliance);
}}

  style={{
    padding: "12px 20px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer"
  }}
>
  Import (AJ Madison)
</button>
</div>

      {loading && <p>Comparing…</p>}

      {result && (
        <>
          <div
  style={{
    marginTop: 32,
    padding: 20,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#f9fafb"
  }}
>
  <div
    style={{
      fontSize: 12,
      fontWeight: 600,
      color: "#6b7280",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: 6
    }}
  >
    Compatibility Status
  </div>

  <div
    style={{
      fontSize: 24,
      fontWeight: 700,
      marginBottom: 4
    }}
  >
    {result.verdict}
  </div>

  <div style={{ fontSize: 14, color: "#374151" }}>
    {result.summary}
  </div>
</div>

{result.installImpact && (
  <div
    style={{
      marginTop: 40,
      padding: 20,
      borderRadius: 8,
      border: "1px solid #e5e7eb",
      background: "#ffffff"
    }}
  >
    <h3 style={{ ...sectionTitle, marginTop: 0 }}>
      Install Impact Summary
    </h3>

    <ul style={{ marginTop: 8, paddingLeft: 18 }}>
      {result.installImpact.map((item, i) => (
        <li
          key={i}
          style={{
            marginBottom: 6,
            fontSize: 14,
            color: "#111827"
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  </div>
)}

      {result.charts?.map(chart => (
  <div key={chart.id} style={{ marginTop: 30 }}>
    <h3 style={sectionTitle}>{chart.title}</h3>

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

{result.installDoc && (
  <div
    style={{
      marginTop: 40,
      padding: 20,
      borderRadius: 8,
      border: "1px solid #e5e7eb",
      background: "#ffffff"
    }}
  >
    <h3 style={{ ...sectionTitle, marginTop: 0 }}>
      Installation Diagram
    </h3>

    <p style={{ fontSize: 14, color: "#374151", marginBottom: 10 }}>
      {result.installDoc.title}
    </p>

    <a
      href={result.installDoc.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-block",
        padding: "10px 14px",
        borderRadius: 6,
        background: "#111827",
        color: "white",
        fontSize: 14,
        fontWeight: 600,
        textDecoration: "none"
      }}
    >
      Open Diagram PDF
    </a>
  </div>
)}

          {result.sources?.length > 0 && (
  <div
    style={{
      marginTop: 40,
      padding: 20,
      borderRadius: 8,
      border: "1px solid #e5e7eb",
      background: "#ffffff"
    }}
  >
    <h3 style={{ ...sectionTitle, marginTop: 0 }}>
      Sources
    </h3>

    <ul style={{ marginTop: 8, paddingLeft: 18 }}>
      {result.sources.map((s, i) => (
        <li
          key={i}
          style={{
            marginBottom: 6,
            fontSize: 14
          }}
        >
          <a
            href={s}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#2563eb",
              textDecoration: "underline"
            }}
          >
            {s}
          </a>
        </li>
      ))}
    </ul>
  </div>
)}

        </>
      )}
    </main>
  );
}
const th = {
  padding: "10px 12px",
  background: "#f1f5f9",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#374151",
  textAlign: "left"
};

const td = {
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 14,
  color: "#111827"
};

export const dynamic = "force-dynamic";
