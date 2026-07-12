"use client";

import { useEffect, useRef, useState } from "react";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/storage";
import { exportAll, importAll, downloadBlob } from "@/lib/backup";
import { getDaysOverview } from "@/lib/vocab";

function mask(key) {
  if (!key) return "";
  const k = key.trim();
  if (k.length <= 8) return "••••";
  return k.slice(0, 4) + "••••••" + k.slice(-4);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [vDays, setVDays] = useState([]);

  useEffect(() => {
    setSettings(getSettings());
    setVDays(getDaysOverview());
    setLoaded(true);
  }, []);

  // Vocab Rush day filter: [] = all days.
  const rushDays = settings.vocabRushDays || [];
  const toggleRushDay = (day) => {
    const set = new Set(rushDays);
    if (set.has(day)) set.delete(day); else set.add(day);
    update("vocabRushDays", [...set].sort((a, b) => a - b));
  };

  // Auto-save: har change turant localStorage mein chala jaata hai.
  const update = (field, value) => {
    setSettings((prev) => {
      const next = { ...prev, [field]: value };
      saveSettings(next);
      return next;
    });
    setTestResult(null);
  };

  const updateShortcutPrompt = (subj, value) => {
    setSettings((prev) => {
      const next = { ...prev, shortcutPrompts: { ...(prev.shortcutPrompts || {}), [subj]: value } };
      saveSettings(next);
      return next;
    });
  };

  const savedKey = loaded ? getSettings().apiKey : "";
  const sp = settings.shortcutPrompts || {};

  // ---- Backup / Restore ----
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const importRef = useRef(null);

  const doExport = async () => {
    setBackupBusy(true); setBackupMsg("Preparing backup (bundling PDFs & images)…");
    try {
      const blob = await exportAll((done, total) => setBackupMsg(`Bundling files… ${done}/${total}`));
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `ssc-cgl-backup-${date}.json`);
      setBackupMsg(`Backup downloaded (${(blob.size / 1024 / 1024).toFixed(1)} MB). Save it to Google Drive.`);
    } catch (e) { setBackupMsg("Export failed: " + e.message); }
    finally { setBackupBusy(false); }
  };

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    if (importRef.current) importRef.current.value = "";
    if (!file) return;
    if (!confirm("Importing will overwrite existing data on this device with the backup. Continue?")) return;
    setBackupBusy(true); setBackupMsg("Reading backup…");
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      await importAll(obj, (done, total) => setBackupMsg(`Restoring files… ${done}/${total}`));
      setBackupMsg("Restored! Reloading…");
      setTimeout(() => window.location.reload(), 800);
    } catch (e) { setBackupMsg("Import failed: " + e.message); setBackupBusy(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          model: settings.model,
          baseUrl: settings.baseUrl,
        }),
      });
      const data = await res.json();
      setTestResult(
        res.ok
          ? { ok: true, msg: "Connection successful ✔ — DeepSeek ne jawab diya." }
          : { ok: false, msg: data.error || "Connection failed" }
      );
    } catch (e) {
      setTestResult({ ok: false, msg: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">⚙️ Configuration</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
          <span className="grad">Settings</span>
        </h1>
        <p className="hero__sub">
          Enter your DeepSeek API key here — it saves automatically in your browser
          (no need to press a Save button).
        </p>
      </section>

      <section className="section" style={{ marginTop: 16, maxWidth: 640 }}>
        <div className="glass-card">
          <div className="field">
            <label>DeepSeek API Key</label>
            <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
              <input
                className="input"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={settings.apiKey}
                onChange={(e) => update("apiKey", e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button className="btn btn--ghost btn--sm" onClick={() => setShowKey((v) => !v)}>
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            {savedKey ? (
              <p className="hint" style={{ color: "var(--success)" }}>
                ✔ Saved: {mask(savedKey)} — stored in your browser.
              </p>
            ) : (
              <p className="hint">Generate a key at platform.deepseek.com and paste it here.</p>
            )}
          </div>

          <div className="field">
            <label>Model</label>
            <select
              className="select"
              value={settings.model}
              onChange={(e) => update("model", e.target.value)}
            >
              <option value="deepseek-chat">deepseek-chat (V3) — recommended</option>
              <option value="deepseek-reasoner">deepseek-reasoner (R1)</option>
            </select>
          </div>

          <div className="field">
            <label>Base URL</label>
            <input
              className="input"
              type="text"
              value={settings.baseUrl}
              onChange={(e) => update("baseUrl", e.target.value)}
            />
            <p className="hint">Default: https://api.deepseek.com (usually leave this as is).</p>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <button
              className="btn btn--primary"
              onClick={handleTest}
              disabled={testing || !settings.apiKey}
            >
              {testing ? "Testing…" : "Test connection"}
            </button>
            <span className="muted" style={{ fontSize: "0.82rem" }}>
              Key auto-saved · press the button only to test
            </span>
          </div>

          {testResult && (
            <p
              className="mt-16"
              style={{
                color: testResult.ok ? "var(--success)" : "var(--danger)",
                fontSize: "0.9rem",
              }}
            >
              {testResult.msg}
            </p>
          )}
        </div>
      </section>

      {/* Gemini — shortcut trick only */}
      <section className="section" style={{ maxWidth: 640 }}>
        <div className="glass-card">
          <h3>⚡ Gemini — for Shortcut Trick only</h3>
          <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
            If you set a Gemini key, the <strong>Shortcut trick</strong> button uses Gemini. Everything else keeps using DeepSeek.
          </p>
          <div className="field mt-16">
            <label>Gemini API Key</label>
            <input className="input" type={showKey ? "text" : "password"} placeholder="AIza..." value={settings.geminiApiKey || ""}
              onChange={(e) => update("geminiApiKey", e.target.value)} autoComplete="off" spellCheck={false} />
            <p className="hint">Get a free key at aistudio.google.com/apikey.</p>
          </div>
          <div className="field">
            <label>Gemini Model</label>
            <input className="input" type="text" value={settings.geminiModel || ""} onChange={(e) => update("geminiModel", e.target.value)} placeholder="gemini-3-pro" />
            <p className="hint">Default: gemini-3-pro. If it errors, try the exact model id from Google AI Studio.</p>
          </div>
        </div>
      </section>

      {/* Custom shortcut prompts per subject */}
      <section className="section" style={{ maxWidth: 720 }}>
        <div className="glass-card">
          <h3>✍️ Custom Shortcut Prompts</h3>
          <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
            Write your own instructions for the shortcut trick, per subject. Leave blank to use the built-in default. (Answers stay in Hinglish.)
          </p>
          {[
            { k: "math", label: "🧮 Math", ph: "e.g. Give the fastest Vedic/approx trick in Hinglish, plain arithmetic (no heavy LaTeX), end with **Answer:**" },
            { k: "reasoning", label: "🧠 Reasoning", ph: "e.g. Build the chain/relation quickly and read off the answer, Hinglish, 1-2 lines" },
            { k: "english", label: "📚 English", ph: "e.g. State the exact grammar rule in one line, why the answer is right, Hinglish" },
            { k: "gs", label: "🌍 GS", ph: "e.g. Give the key fact + a quick memory hook, Hinglish" },
          ].map((s) => (
            <div className="field mt-16" key={s.k}>
              <label>{s.label}</label>
              <textarea className="textarea" style={{ minHeight: 80 }} value={sp[s.k] || ""} placeholder={s.ph}
                onChange={(e) => updateShortcutPrompt(s.k, e.target.value)} />
            </div>
          ))}
          <p className="hint">Auto-saved. Used when you press ⚡ Shortcut trick on a question of that subject.</p>
        </div>
      </section>

      {/* Vocab Rush — which days */}
      <section className="section" style={{ maxWidth: 640 }}>
        <div className="glass-card">
          <h3>⚡ Vocab Rush — days</h3>
          <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
            Choose which vocab days the ⚡ Vocab Rush pop-up should test you on. Tick specific days,
            or keep <strong>All days</strong> to mix everything.
          </p>
          {vDays.length === 0 ? (
            <p className="hint" style={{ marginTop: 12 }}>No vocab yet — add words on the Vocab page first.</p>
          ) : (
            <>
              <label className="row" style={{ gap: 8, alignItems: "center", cursor: "pointer", marginTop: 14 }}>
                <input type="checkbox" checked={rushDays.length === 0} onChange={() => update("vocabRushDays", [])} />
                <span style={{ fontWeight: 600 }}>All days ({vDays.length})</span>
              </label>
              <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
                {vDays.map((d) => {
                  const on = rushDays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      className={`chip chip--btn ${on ? "is-active" : ""}`}
                      onClick={() => toggleRushDay(d.day)}
                      title={`${d.count} words`}
                    >
                      {on ? "✓ " : ""}Day {d.day}
                    </button>
                  );
                })}
              </div>
              <p className="hint" style={{ marginTop: 12 }}>
                {rushDays.length === 0
                  ? "Currently mixing words from all days."
                  : `Rush will only use Day ${rushDays.join(", ")}.`}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Backup & Restore */}
      <section className="section" style={{ maxWidth: 640 }}>
        <div className="glass-card">
          <h3>💾 Backup &amp; Restore</h3>
          <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
            All your data (quizzes, vocab, chapters, targets, PDFs &amp; images) lives in this browser.
            Export a full backup file, save it to Google Drive, and import it on your phone/tablet to move everything over.
          </p>
          <div className="row mt-16" style={{ gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn--primary" onClick={doExport} disabled={backupBusy}>⬇️ Export backup</button>
            <label className="btn btn--ghost" style={{ opacity: backupBusy ? 0.6 : 1, pointerEvents: backupBusy ? "none" : "auto" }}>
              ⬆️ Import backup
              <input ref={importRef} type="file" accept="application/json" hidden onChange={doImport} />
            </label>
          </div>
          {backupMsg && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.88rem" }}>{backupMsg}</p>}
          <p className="hint" style={{ marginTop: 10 }}>💡 The backup includes big PDFs/images, so the file can be large — that's normal.</p>
        </div>
      </section>
    </>
  );
}
