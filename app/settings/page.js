"use client";

import { useEffect, useRef, useState } from "react";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/storage";
import { exportAll, exportDataOnly, importAll, downloadBlob } from "@/lib/backup";
import { getDaysOverview } from "@/lib/vocab";
import { pushSync, pullSync } from "@/lib/sync";

const SYNC_SQL = `create table if not exists syncs (
  code text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table syncs enable row level security;
create policy "anon all" on syncs for all to anon using (true) with check (true);`;

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

  // ---- Cloud sync ----
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [showSql, setShowSql] = useState(false);
  const doPush = async () => {
    setSyncBusy(true); setSyncMsg("Cloud pe push ho raha hai…");
    try {
      const t = await pushSync();
      const s = { ...getSettings(), syncAuto: true }; // first push -> auto ON from now on
      saveSettings(s); setSettings(s);
      setSyncMsg(`✓ Push ho gaya · ${new Date(t).toLocaleString("en-IN")} — ab AUTO ON, dobara button dabane ki zaroorat nahi.`);
    } catch (e) { setSyncMsg("❌ " + e.message); }
    finally { setSyncBusy(false); }
  };
  const doPull = async () => {
    if (!confirm("Cloud se data laa ke is device ka data overwrite kar du?")) return;
    setSyncBusy(true); setSyncMsg("Cloud se pull ho raha hai…");
    try {
      const t = await pullSync();
      if (!t) { setSyncMsg("Cloud pe abhi kuch nahi — pehle kisi device se ⬆️ Push karo."); setSyncBusy(false); return; }
      saveSettings({ ...getSettings(), syncAuto: true }); // auto ON from now on
      setSyncMsg("✓ Pull ho gaya — reload ho raha hai…");
      setTimeout(() => window.location.reload(), 700);
    } catch (e) { setSyncMsg("❌ " + e.message); setSyncBusy(false); }
  };

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

  const doExportData = async () => {
    setBackupBusy(true); setBackupMsg("Preparing data-only backup…");
    try {
      const blob = exportDataOnly();
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `ssc-cgl-data-${date}.json`);
      setBackupMsg(`Data backup downloaded (${(blob.size / 1024 / 1024).toFixed(2)} MB). Questions, quizzes, mistakes & progress included — original PDFs/images not.`);
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
            <input
              className="input"
              type="text"
              list="deepseek-models"
              value={settings.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="deepseek-chat"
            />
            <datalist id="deepseek-models">
              <option value="deepseek-chat" />
              <option value="deepseek-reasoner" />
            </datalist>
            <p className="hint">
              Koi bhi model id likh sakte ho — list sirf suggestion hai. <code>deepseek-chat</code> khud-ba-khud
              DeepSeek ke latest non-thinking model pe point karta hai, <code>deepseek-reasoner</code> thinking model pe.
              Naya/alag id platform.deepseek.com ke docs se copy karke yahin paste kar do.
            </p>
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
          <div className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
            <h3>⚡ Gemini — for Shortcut Trick only</h3>
            <button
              type="button"
              className={`toggle ${settings.geminiEnabled !== false ? "is-on" : ""}`}
              role="switch"
              aria-checked={settings.geminiEnabled !== false}
              onClick={() => update("geminiEnabled", settings.geminiEnabled === false)}
              title="Gemini on/off"
            >
              <span className="toggle__knob" />
              <span className="toggle__txt">{settings.geminiEnabled !== false ? "ON" : "OFF"}</span>
            </button>
          </div>
          <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
            {settings.geminiEnabled !== false ? (
              <>If you set a Gemini key, the <strong>Shortcut trick</strong> (and one-liner image reading) use Gemini. Everything else keeps using DeepSeek.</>
            ) : (
              <><strong>Gemini OFF</strong> — har query DeepSeek pe jaayegi. Shortcut trick aur image one-liner tab tak DeepSeek-only rahenge jab tak wapas ON na karo. Key delete karne ki zaroorat nahi.</>
            )}
          </p>
          <div className="field mt-16" style={{ opacity: settings.geminiEnabled === false ? 0.5 : 1 }}>
            <label>Gemini API Key</label>
            <input className="input" type={showKey ? "text" : "password"} placeholder="AIza..." value={settings.geminiApiKey || ""}
              onChange={(e) => update("geminiApiKey", e.target.value)} autoComplete="off" spellCheck={false} disabled={settings.geminiEnabled === false} />
            <p className="hint">Get a free key at aistudio.google.com/apikey. Yehi key <strong>🧠 AI Roadmap</strong> coach ko bhi chalati hai.</p>
          </div>
          <div className="field" style={{ opacity: settings.geminiEnabled === false ? 0.5 : 1 }}>
            <label>Gemini Model</label>
            <input className="input" type="text" value={settings.geminiModel || ""} onChange={(e) => update("geminiModel", e.target.value)} placeholder="gemini-3-pro" disabled={settings.geminiEnabled === false} />
            <p className="hint">Default: gemini-3-pro. If it errors, try the exact model id from Google AI Studio.</p>
          </div>
        </div>
      </section>

      {/* Copy & Ask — external ask-site */}
      <section className="section" style={{ maxWidth: 640 }}>
        <div className="glass-card">
          <h3>📋 Copy &amp; Ask — external site</h3>
          <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
            Har question pe ek <strong>📋 Copy &amp; Ask</strong> button hai. Dabate hi question (options ke saath)
            copy ho jaata hai aur ye site khul jaati hai — taaki kisi aur website (ChatGPT/Google/etc.) pe manually pooch sako.
            URL mein <code>%s</code> likho jahan question inject karna ho; blank chhodo to sirf copy hoga (khud paste karo).
          </p>
          <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Google", url: "https://www.google.com/search?q=%s" },
              { label: "ChatGPT", url: "https://chatgpt.com/?q=%s" },
              { label: "Perplexity", url: "https://www.perplexity.ai/search?q=%s" },
              { label: "Gemini", url: "https://gemini.google.com/app" },
            ].map((p) => (
              <button key={p.label} type="button"
                className={`chip chip--btn ${settings.askExternalUrl === p.url ? "is-active" : ""}`}
                onClick={() => update("askExternalUrl", p.url)}>{p.label}</button>
            ))}
          </div>
          <div className="field mt-16">
            <label>Ask-site URL (use %s for the question)</label>
            <input className="input" type="text" value={settings.askExternalUrl || ""}
              onChange={(e) => update("askExternalUrl", e.target.value)}
              placeholder="https://www.google.com/search?q=%s" spellCheck={false} />
            <p className="hint">
              Auto-saved. ChatGPT/Perplexity/Google URL mein <code>%s</code> question ko pre-fill kar deta hai.
              Gemini prefill support nahi karta — wahan question clipboard se paste karo.
            </p>
          </div>
          <div className="field mt-16">
            <label>✨ Gemini prompt (question se pehle copy hoga)</label>
            <textarea className="textarea" style={{ minHeight: 70 }} value={settings.geminiPrompt || ""}
              onChange={(e) => update("geminiPrompt", e.target.value)}
              placeholder="e.g. Is MCQ ka correct answer batao aur short Hinglish explanation do:" />
            <p className="hint">
              ✨ Gemini button dabate hi ye prompt <strong>+ question</strong> (dono) copy honge, phir Gemini khulega —
              wahan paste kar do. Blank chhodo to sirf question copy hoga.
            </p>
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

      {/* Strict Focus Mode + day boundary */}
      <section className="section" style={{ maxWidth: 640 }}>
        <div className="glass-card">
          <div className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
            <h3>🎯 Strict Focus Mode</h3>
            <button type="button" className={`toggle ${settings.strictMode ? "is-on" : ""}`} role="switch"
              aria-checked={settings.strictMode} onClick={() => update("strictMode", !settings.strictMode)}>
              <span className="toggle__knob" /><span className="toggle__txt">{settings.strictMode ? "ON" : "OFF"}</span>
            </button>
          </div>
          <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
            ON hone par Today ka <strong>#1 target</strong> har {settings.strictIntervalMin || 2} min baad ek
            <strong> force popup</strong> banke aayega jab tak use Start na karo — ho jaye to apne aap next #1 pe.
            Sirf neeche wale active hours mein chalega.
          </p>
          <div className="field mt-16">
            <label>Har kitni der baad force kare</label>
            <select className="select" style={{ width: "auto" }} value={settings.strictIntervalMin}
              onChange={(e) => update("strictIntervalMin", parseInt(e.target.value))}>
              <option value={2}>2 min</option><option value={5}>5 min</option><option value={10}>10 min</option><option value={15}>15 min</option>
            </select>
          </div>
          <div className="row mt-16" style={{ gap: 16, flexWrap: "wrap" }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Day start (uthne ka time)</label>
              <input className="input" type="time" style={{ width: "auto" }} value={settings.dayStartTime || "08:00"}
                onChange={(e) => update("dayStartTime", e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Day end (sone ka time)</label>
              <input className="input" type="time" style={{ width: "auto" }} value={settings.dayEndTime || "02:00"}
                onChange={(e) => update("dayEndTime", e.target.value)} />
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Din <strong>{settings.dayEndTime || "02:00"}</strong> pe khatam maana jaata hai (late sleeper) — daily checklist bhi
            tabhi reset hoti hai, midnight pe nahi. Force popup sirf {settings.dayStartTime || "08:00"}–{settings.dayEndTime || "02:00"} ke beech.
          </p>
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
            <button className="btn btn--primary" onClick={doExport} disabled={backupBusy}>⬇️ Full backup (with PDFs)</button>
            <button className="btn btn--ghost" onClick={doExportData} disabled={backupBusy}>📄 Data only (light)</button>
            <label className="btn btn--ghost" style={{ opacity: backupBusy ? 0.6 : 1, pointerEvents: backupBusy ? "none" : "auto" }}>
              ⬆️ Import backup
              <input ref={importRef} type="file" accept="application/json" hidden onChange={doImport} />
            </label>
          </div>
          {backupMsg && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.88rem" }}>{backupMsg}</p>}
          <p className="hint" style={{ marginTop: 10 }}>
            💡 <strong>Full backup</strong> includes PDFs/images (large file). If it fails with “out of memory” — common on phones with many PDFs — use <strong>📄 Data only</strong>: it saves all your questions, quizzes, mistakes &amp; progress (just not the original PDF/image files) and never runs out of memory.
          </p>
        </div>
      </section>

      {/* Cloud Sync (Supabase) */}
      <section className="section" style={{ maxWidth: 640 }}>
        <div className="glass-card">
          <div className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
            <h3>☁️ Cloud Sync (Supabase)</h3>
            <button type="button" className={`toggle ${settings.syncAuto ? "is-on" : ""}`} role="switch"
              aria-checked={settings.syncAuto} onClick={() => update("syncAuto", !settings.syncAuto)}>
              <span className="toggle__knob" /><span className="toggle__txt">{settings.syncAuto ? "AUTO" : "OFF"}</span>
            </button>
          </div>
          <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
            Targets, checklist, progress, mistakes, vocab, quizzes — sab devices pe <strong>apne aap sync</strong>. (PDF/image files sync nahi hote — unke liye upar wala backup.) Koi login nahi — bas ek secret <strong>sync code</strong>. Same code = same data.
          </p>
          <p className="hint" style={{ marginTop: 6 }}>
            🔁 Har device pe <strong>pehli baar</strong> URL + key + wahi sync code daal ke ek baar <strong>Push/Pull</strong> karo — uske baad <strong>bina kuch dabaye</strong> apne aap sync hota rahega (change karte hi, aur app kholte hi).
          </p>
          <div className="field mt-16">
            <label>Supabase Project URL</label>
            <input className="input" type="text" placeholder="https://xxxx.supabase.co" value={settings.supabaseUrl || ""}
              onChange={(e) => update("supabaseUrl", e.target.value)} spellCheck={false} />
          </div>
          <div className="field">
            <label>Supabase anon key</label>
            <input className="input" type={showKey ? "text" : "password"} placeholder="eyJ..." value={settings.supabaseAnonKey || ""}
              onChange={(e) => update("supabaseAnonKey", e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
          <div className="field">
            <label>Sync code (secret — lamba &amp; random rakho)</label>
            <input className="input" type="text" placeholder="e.g. aman-9x7k2p-secret-2026" value={settings.syncCode || ""}
              onChange={(e) => update("syncCode", e.target.value)} spellCheck={false} />
          </div>
          <div className="row mt-16" style={{ gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn--primary" onClick={doPush} disabled={syncBusy || !(settings.supabaseUrl && settings.supabaseAnonKey && settings.syncCode)}>⬆️ Push now</button>
            <button className="btn btn--ghost" onClick={doPull} disabled={syncBusy || !(settings.supabaseUrl && settings.supabaseAnonKey && settings.syncCode)}>⬇️ Pull now</button>
            {settings.syncLastAt && <span className="muted" style={{ fontSize: "0.8rem", alignSelf: "center" }}>Last sync: {new Date(settings.syncLastAt).toLocaleString("en-IN")}</span>}
          </div>
          {syncMsg && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.88rem" }}>{syncMsg}</p>}
          <button className="btn btn--ghost btn--sm mt-16" onClick={() => setShowSql((v) => !v)}>{showSql ? "✕ Hide setup" : "🛠️ Supabase setup (one-time SQL)"}</button>
          {showSql && (
            <>
              <p className="hint" style={{ marginTop: 10 }}>
                Supabase pe free project banao → <strong>SQL Editor</strong> mein ye ek baar chalao, phir
                <strong> Project Settings → API</strong> se Project URL + anon key upar daalo:
              </p>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.76rem", background: "var(--bg)", padding: 12, borderRadius: 8, overflowX: "auto" }}>{SYNC_SQL}</pre>
              <p className="hint" style={{ color: "var(--warning)" }}>
                ⚠️ Sync-code mode mein table anon key se accessible hota hai — <strong>sync code hi tumhari privacy hai</strong>. Isliye lamba, random code rakho aur kisi ko mat batao.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
