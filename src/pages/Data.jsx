import React, { useEffect, useState } from "react";
import { base44, api } from "@/api/base44Client";
import { SCHEMAS, ENTITY_NAMES } from "@/data/schemas";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, Upload, LogOut, Database, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABELS = {
  OpenPosition: "Open positions",
  ClosedPosition: "Closed positions",
  PositionLog: "Position log",
  WatchListItem: "Watch list",
  PortfolioSnapshot: "Portfolio snapshots",
  DailyStockSnapshot: "Daily price snapshots",
  JournalEntry: "Journal entries",
  EEOpenPosition: "EE open positions",
  EEClosedPosition: "EE closed positions",
  TVRecommendation: "TV recommendations",
  StockAlert: "Stock alerts",
  AlertHistory: "Alert history",
  PrevCloseCache: "Prev-close cache",
  UserInvestmentProfile: "Investment profile",
};

// RFC-4180 CSV parser (handles quotes, commas and newlines inside quotes).
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

function coerce(entity, raw) {
  const schema = SCHEMAS[entity] || {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === "" || v === null || v === undefined) continue;
    const type = schema[k]?.type;
    if (typeof v !== "string") { out[k] = v; continue; }
    if (type === "number") {
      const n = Number(v.replace(/[$,]/g, ""));
      if (Number.isFinite(n)) out[k] = n;
    } else if (type === "boolean") {
      out[k] = /^(true|1|yes)$/i.test(v.trim());
    } else if (type === "array" || type === "object") {
      try { out[k] = JSON.parse(v); } catch { /* skip bad value */ }
    } else if (!type && /^\s*[[{]/.test(v)) {
      try { out[k] = JSON.parse(v); } catch { out[k] = v; }
    } else {
      out[k] = v;
    }
  }
  return out;
}

function guessEntity(filename) {
  const base = filename.replace(/\.(csv|json)$/i, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  // Longest names first so "EEOpenPosition" wins over "OpenPosition".
  const byLength = [...ENTITY_NAMES].sort((a, b) => b.length - a.length);
  const hit = byLength.find((n) => base.includes(n.toLowerCase()));
  if (hit) return hit;
  return /^users?$/.test(base) ? "User" : "";
}

export default function Data() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null); // { kind: 'table'|'backup', entity, rows, backup }
  const [entity, setEntity] = useState("");
  const [mode, setMode] = useState("append");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadCounts = async () => {
    setLoadingCounts(true);
    const next = {};
    await Promise.all(
      ENTITY_NAMES.map(async (n) => {
        try { next[n] = (await base44.entities[n].list()).length; } catch { next[n] = "?"; }
      })
    );
    setCounts(next);
    setLoadingCounts(false);
  };

  useEffect(() => { loadCounts(); }, []);

  const onFile = async (f) => {
    setStatus(null);
    setParsed(null);
    setFile(f);
    if (!f) return;
    try {
      const text = await f.text();
      if (/\.json$/i.test(f.name) || text.trim().startsWith("{") || text.trim().startsWith("[")) {
        const data = JSON.parse(text);
        if (data && data.entities && typeof data.entities === "object") {
          setParsed({ kind: "backup", backup: data });
          return;
        }
        const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : null;
        if (!rows) throw new Error("JSON file must be a list of rows or a full backup");
        const e = guessEntity(f.name);
        setEntity(e);
        setParsed({ kind: "table", rows });
      } else {
        const rows = parseCSV(text);
        const e = guessEntity(f.name);
        setEntity(e);
        setParsed({ kind: "table", rows });
      }
    } catch (err) {
      setStatus({ ok: false, msg: `Could not read file: ${err.message}` });
    }
  };

  const runImport = async () => {
    if (!parsed) return;
    if (mode === "replace" && !window.confirm("REPLACE mode deletes the existing rows in the target table(s) first. Continue?")) return;
    setBusy(true);
    setStatus(null);
    try {
      let body;
      if (parsed.kind === "backup") {
        body = { ...parsed.backup, mode };
      } else {
        if (!entity) throw new Error("Pick which table these rows belong to");
        if (entity === "User") {
          // Notes / change log / watch-list categories live on the user record.
          const SKIP = ["id", "email", "full_name", "role", "created_date", "updated_date", "created_by", "disabled", "is_verified", "app_id", "is_service", "_app_role"];
          const row = coerce("User", parsed.rows[0] || {});
          SKIP.forEach((k) => delete row[k]);
          body = { user: row, mode: "append" };
        } else {
          body = { entity, rows: parsed.rows.map((r) => coerce(entity, r)), mode };
        }
      }
      const res = await api.request("POST", "import", body);
      const summary = Object.entries(res.imported || {}).map(([k, v]) => `${LABELS[k] || k}: ${v}`).join(" · ");
      setStatus({ ok: true, msg: `Imported. ${summary}` });
      setParsed(null);
      setFile(null);
      queryClient.invalidateQueries();
      loadCounts();
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  const preview = parsed?.kind === "table" ? parsed.rows.slice(0, 3) : null;

  return (
    <div className="bg-white min-h-screen p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900">DATA</h1>
        <Button
          onClick={logout}
          className="bg-white text-gray-900 hover:bg-gray-100 text-xl font-black h-12 px-6 rounded-none border-4 border-gray-900"
        >
          <LogOut className="w-5 h-5 mr-2" /> LOG OUT
        </Button>
      </div>

      {/* Backup */}
      <section className="border-4 border-gray-900">
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-3">
          <Download className="w-6 h-6" />
          <span className="text-2xl font-black">BACKUP</span>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-lg text-gray-700">
            Download everything (all tables plus your notes) as one file. Keep a copy somewhere safe now and then.
          </p>
          <a
            href="/api/export"
            className="inline-flex items-center bg-gray-900 text-white hover:bg-gray-700 text-xl font-black h-12 px-6 border-4 border-gray-900"
          >
            <Download className="w-5 h-5 mr-2" /> DOWNLOAD BACKUP
          </a>
        </div>
      </section>

      {/* Import */}
      <section className="border-4 border-gray-900">
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-3">
          <Upload className="w-6 h-6" />
          <span className="text-2xl font-black">IMPORT</span>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-lg text-gray-700">
            Load a backup file from this app, or a CSV / JSON export of one table (for example from Base44).
            Files named after the table (e.g. <span className="font-bold">ClosedPosition.csv</span>) are matched automatically.
          </p>

          <input
            type="file"
            accept=".csv,.json,application/json,text/csv"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
            className="block text-lg font-bold file:mr-4 file:px-6 file:h-12 file:border-4 file:border-gray-900 file:bg-white file:font-black file:text-gray-900 file:rounded-none"
          />

          {parsed?.kind === "backup" && (
            <div className="bg-gray-100 border-4 border-gray-300 p-4 text-lg">
              <div className="font-black mb-2">FULL BACKUP FILE</div>
              {Object.entries(parsed.backup.entities).map(([k, v]) => (
                <div key={k}>{LABELS[k] || k}: <span className="font-bold">{Array.isArray(v) ? v.length : 0}</span> rows</div>
              ))}
            </div>
          )}

          {parsed?.kind === "table" && (
            <div className="space-y-4">
              <div className="text-lg font-bold">{parsed.rows.length} rows found in {file?.name}</div>
              <div>
                <label className="text-xl font-black text-gray-900 mb-2 block">TABLE</label>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger className="text-xl font-bold rounded-none border-2 border-gray-300 max-w-md">
                    <SelectValue placeholder="Choose table..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_NAMES.map((n) => (
                      <SelectItem key={n} value={n}>{LABELS[n] || n}</SelectItem>
                    ))}
                    <SelectItem value="User">Notes & settings (User)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {preview?.length > 0 && (
                <pre className="bg-gray-100 border-2 border-gray-300 p-3 text-sm overflow-auto max-h-48">
                  {JSON.stringify(entity ? preview.map((r) => coerce(entity, r)) : preview, null, 2)}
                </pre>
              )}
            </div>
          )}

          {parsed && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                {[
                  { key: "append", label: "ADD TO EXISTING" },
                  { key: "replace", label: "REPLACE EXISTING" },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`px-4 h-12 text-lg font-black border-4 ${
                      mode === m.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-900 border-gray-300"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <Button
                onClick={runImport}
                disabled={busy || (parsed.kind === "table" && !entity)}
                className="bg-green-600 text-white hover:bg-green-700 text-xl font-black h-12 px-6 rounded-none border-4 border-green-600"
              >
                {busy ? "IMPORTING..." : "IMPORT"}
              </Button>
            </div>
          )}

          {status && (
            <div className={`border-4 px-4 py-3 text-lg font-bold ${status.ok ? "border-green-600 bg-green-50 text-green-800" : "border-red-600 bg-red-50 text-red-700"}`}>
              {status.msg}
            </div>
          )}
        </div>
      </section>

      {/* Table counts */}
      <section className="border-4 border-gray-900">
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6" />
            <span className="text-2xl font-black">WHAT'S STORED</span>
          </div>
          <Button
            onClick={loadCounts}
            disabled={loadingCounts}
            className="bg-white text-gray-900 hover:bg-gray-200 font-black text-sm h-9 px-4 rounded-none border-2 border-white"
          >
            <RefreshCw className={`w-4 h-4 ${loadingCounts ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {ENTITY_NAMES.map((n) => (
            <div key={n} className="flex justify-between px-6 py-3 border-b-2 border-gray-200 text-lg">
              <span className="font-bold text-gray-700">{LABELS[n] || n}</span>
              <span className="font-black text-gray-900">{counts[n] ?? "…"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
