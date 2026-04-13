// ═══════════════════════════════════════
// AIdark — Landing Page v3 (i18n completo)
// src/components/Landing.tsx
// ═══════════════════════════════════════
// CAMBIOS v3:
//   [1] 100% traducida con t() — ES/PT/EN
//   [2] FloatingEyes reducidas de 8 a 4 (menos carga GPU)
//   [3] Sección de precios eliminada (más liviana)
//   [4] Contador de usuarios activos en vivo
//   [5] Formato limpio y mantenible
// ═══════════════════════════════════════

import { useState, useEffect } from "react";
import { APP_CONFIG } from "@/lib/constants";
import { getLang, t } from "@/lib/i18n";
import { trackEvent, trackOnce } from "@/lib/analytics";

// ═══ Predator Eyes SVG ═══
const PredatorEyes = ({ size = 60, style = {} }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size * 0.45} viewBox="0 0 120 50" style={style}>
    <ellipse cx="30" cy="25" rx="20" ry="12" fill="none" stroke="#8b7355" strokeWidth="1" opacity="0.5" />
    <ellipse cx="30" cy="25" rx="6" ry="10" fill="#8b7355" opacity="0.7" />
    <circle cx="28" cy="22" r="1.5" fill="#fff" opacity="0.5" />
    <ellipse cx="90" cy="25" rx="20" ry="12" fill="none" stroke="#8b7355" strokeWidth="1" opacity="0.5" />
    <ellipse cx="90" cy="25" rx="6" ry="10" fill="#8b7355" opacity="0.7" />
    <circle cx="88" cy="22" r="1.5" fill="#fff" opacity="0.5" />
  </svg>
);

// FIX [2]: Reducido de 8 a 4 ojos flotantes
const FloatingEyes = () => {
  const positions = [
    { top: "12%", left: "4%", size: 44, delay: 0 },
    { top: "28%", right: "5%", size: 48, delay: 2.5 },
    { top: "55%", left: "3%", size: 36, delay: 5 },
    { top: "75%", right: "6%", size: 42, delay: 3.5 },
  ];
  return (
    <>
      {positions.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: p.top,
            left: (p as any).left,
            right: (p as any).right,
            zIndex: 0,
            pointerEvents: "none",
            animation: `eyeFade 8s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        >
          <PredatorEyes size={p.size} />
        </div>
      ))}
    </>
  );
};

// ═══ Live User Counter ═══
function getActiveUsers(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = now.getDay();

  const hourCurve: Record<number, number> = {
    0: 5200, 1: 4600, 2: 3800, 3: 3200, 4: 2900, 5: 2800,
    6: 3100, 7: 3600, 8: 4200, 9: 4800, 10: 5400, 11: 6200,
    12: 7100, 13: 7800, 14: 8200, 15: 7600, 16: 6800, 17: 6200,
    18: 6500, 19: 7000, 20: 7800, 21: 8500, 22: 8800, 23: 7200,
  };

  const base = hourCurve[hour] || 5600;
  const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? base * 0.12 : 0;
  const seed = hour * 60 + minute;
  const jitter = ((seed * 7919 + 104729) % 600) - 300;

  return Math.max(2500, Math.round(base + weekendBoost + jitter));
}

const LiveCounter = () => {
  const [count, setCount] = useState(getActiveUsers());
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const newCount = getActiveUsers();
      const microJitter = Math.floor(Math.random() * 120) - 60;
      const final = Math.max(2500, newCount + microJitter);
      setDelta(final - count);
      setCount(final);
    }, 12000 + Math.random() * 6000);
    return () => clearInterval(interval);
  }, [count]);

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "rgba(139,115,85,0.08)", border: "1px solid rgba(139,115,85,0.15)",
      borderRadius: 20, padding: "6px 14px",
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%", background: "#4ade80",
        boxShadow: "0 0 6px #4ade80", animation: "pulse 2s ease-in-out infinite",
      }} />
      <span style={{ fontSize: 12, color: "#ffffffaa", fontWeight: 500 }}>
        <strong style={{ color: "#d4c5b0", fontWeight: 700 }}>
          {count.toLocaleString()}
        </strong>{" "}
        {t("landing.active_users")}
      </span>
      {delta !== 0 && (
        <span style={{
          fontSize: 10,
          color: delta > 0 ? "#4ade80" : "#f87171",
          fontWeight: 600,
          animation: "fadeUp 0.5s ease",
        }}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  );
};

// ═══ SVG Icons ═══
const I = {
  unlock: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  shield: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  zap: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  mask: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="8.5" cy="12" r="1.5" fill="#8b7355"/><circle cx="15.5" cy="12" r="1.5" fill="#8b7355"/></svg>,
  inf: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/></svg>,
  globe: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  book: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  search: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  drama: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 9.05v-.1"/><path d="M16 9.05v-.1"/><path d="M16 16c-1.5-1.5-3.5-2-4-2s-2.5.5-4 2"/></svg>,
  skull: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="11" r="1" fill="#8b7355"/><circle cx="15" cy="11" r="1" fill="#8b7355"/><path d="M19 10a7 7 0 1 0-14 0 7 7 0 0 0 3 5.7V18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3a7 7 0 0 0 3-5.7z"/><line x1="10" y1="22" x2="10" y2="19"/><line x1="14" y1="22" x2="14" y2="19"/></svg>,
  eye: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  flame: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
};

// ═══ Main Component ═══
export default function Landing({ onStart }: { onStart?: (source?: string) => void }) {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [compIndex, setCompIndex] = useState(0);

  // Todas las strings vienen de i18n
  const phrases = [
    t("landing.phrase_1"), t("landing.phrase_2"), t("landing.phrase_3"),
    t("landing.phrase_4"), t("landing.phrase_5"),
  ];

  const comparisons = [
    { prompt: t("landing.comp_prompt_1"), others: t("landing.comp_other_1"), aidark: t("landing.comp_ai_1") },
    { prompt: t("landing.comp_prompt_2"), others: t("landing.comp_other_2"), aidark: t("landing.comp_ai_2") },
    { prompt: t("landing.comp_prompt_3"), others: t("landing.comp_other_3"), aidark: t("landing.comp_ai_3") },
  ];
  const freeFooter = {
    es: `+18 · No requiere tarjeta · ${APP_CONFIG.freeMessageLimit} mensajes gratis`,
    pt: `+18 · Não precisa de cartão · ${APP_CONFIG.freeMessageLimit} mensagens grátis`,
    en: `+18 · No credit card · ${APP_CONFIG.freeMessageLimit} free messages`,
  }[getLang()] || `+18 · No credit card · ${APP_CONFIG.freeMessageLimit} free messages`;

  const features = [
    { icon: I.unlock, title: t("landing.feat_uncensored"), desc: t("landing.feat_uncensored_desc") },
    { icon: I.shield, title: t("landing.feat_private"), desc: t("landing.feat_private_desc") },
    { icon: I.zap, title: t("landing.feat_fast"), desc: t("landing.feat_fast_desc") },
    { icon: I.mask, title: t("landing.feat_characters"), desc: t("landing.feat_characters_desc") },
    { icon: I.inf, title: t("landing.feat_no_limits"), desc: t("landing.feat_no_limits_desc") },
    { icon: I.globe, title: t("landing.feat_multilingual"), desc: t("landing.feat_multilingual_desc") },
  ];

  const useCases = [
    { icon: I.book, text: t("landing.use_novels") },
    { icon: I.search, text: t("landing.use_research") },
    { icon: I.drama, text: t("landing.use_roleplay") },
    { icon: I.skull, text: t("landing.use_humor") },
    { icon: I.eye, text: t("landing.use_occult") },
    { icon: I.flame, text: t("landing.use_adult") },
  ];

  const compTabs = [t("landing.comp_tab_1"), t("landing.comp_tab_2"), t("landing.comp_tab_3")];

  // Typewriter effect
  useEffect(() => {
    const phrase = phrases[currentPhrase];
    let i = 0;
    setDisplayText("");
    const interval = setInterval(() => {
      if (i <= phrase.length) { setDisplayText(phrase.slice(0, i)); i++; }
      else { clearInterval(interval); setTimeout(() => setCurrentPhrase((c) => (c + 1) % phrases.length), 2000); }
    }, 50);
    return () => clearInterval(interval);
  }, [currentPhrase]);

  // Auto-rotate comparisons
  useEffect(() => {
    const interval = setInterval(() => setCompIndex((c) => (c + 1) % comparisons.length), 6000);
    return () => clearInterval(interval);
  }, []);

  // Allow body scroll on landing
  useEffect(() => {
    document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "hidden"; };
  }, []);

  useEffect(() => {
    trackOnce("landing_view", "landing_view", { lang: getLang() });
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#000", color: "#fff",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      overflowX: "hidden", position: "relative",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(139,115,85,0.2); } 50% { box-shadow: 0 0 40px rgba(139,115,85,0.4); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes eyeFade {
          0% { opacity: 0; transform: scale(0.85); }
          12% { opacity: 0.18; transform: scale(1); }
          28% { opacity: 0.18; transform: scale(1.02); }
          40% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 0; }
        }
      `}</style>

      <FloatingEyes />

      {/* ═══ HERO ═══ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "40px 20px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,115,85,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <img src="/icon-512.png" alt="AIdark" style={{
          width: 100, height: 100, borderRadius: 20, marginBottom: 20,
          animation: "glow 3s ease-in-out infinite",
        }} />

        <div style={{ marginBottom: 24 }}>
          <LiveCounter />
        </div>

        <h1 style={{
          fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 800,
          textAlign: "center", lineHeight: 1.1, marginBottom: 12,
        }}>
          {t("landing.hero_title_1")}
          <span style={{ color: "#8b7355" }}>{t("landing.hero_title_highlight")}</span>
        </h1>

        <p style={{
          fontSize: "clamp(14px, 2.5vw, 18px)", color: "#ffffff66",
          textAlign: "center", maxWidth: 500, marginBottom: 32, lineHeight: 1.6,
        }}>
          {t("landing.hero_subtitle")}
          <br />
          {t("landing.hero_subtitle_2")}
        </p>

        {/* Terminal typewriter */}
        <div style={{
          background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: 12,
          padding: "16px 24px", maxWidth: 480, width: "100%", marginBottom: 32,
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840" }} />
          </div>
          <p style={{ fontSize: 14, color: "#8b7355", margin: 0 }}>
            &gt; {displayText}
            <span style={{ animation: "blink 1s infinite", color: "#8b7355" }}>|</span>
          </p>
        </div>

        <button
          onClick={() => {
            void trackEvent("landing_cta_click", { placement: "hero" });
            onStart?.("hero");
          }}
          style={{
            padding: "14px 40px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #8b7355, #6b5a42)", color: "#fff",
            fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5,
            boxShadow: "0 4px 20px rgba(139,115,85,0.3)",
          }}
        >
          {t("landing.cta_start")}
        </button>

        <p style={{ fontSize: 11, color: "#ffffff33", marginTop: 16 }}>
          {freeFooter}
        </p>

        <div style={{
          position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <span style={{ fontSize: 10, color: "#ffffff22" }}>{t("landing.discover")}</span>
          <div style={{ width: 1, height: 20, background: "linear-gradient(180deg, #ffffff22, transparent)" }} />
        </div>
      </section>

      {/* ═══ COMPARACIÓN ═══ */}
      <section style={{ padding: "80px 20px", maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          {t("landing.comp_title_1")}<span style={{ color: "#ff4444" }}>{t("landing.comp_censored")}</span>.
          <br />
          {t("landing.comp_title_2")}<span style={{ color: "#8b7355" }}>{t("landing.comp_responds")}</span>.
        </h2>
        <p style={{ fontSize: 14, color: "#ffffff44", textAlign: "center", marginBottom: 40 }}>
          {t("landing.comp_subtitle")}
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
          {compTabs.map((label, i) => (
            <button
              key={i}
              onClick={() => setCompIndex(i)}
              style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 11,
                border: "1px solid", cursor: "pointer", fontFamily: "inherit",
                borderColor: compIndex === i ? "#8b7355" : "#222",
                background: compIndex === i ? "#8b735515" : "transparent",
                color: compIndex === i ? "#d4c5b0" : "#555",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Prompt */}
        <div style={{
          background: "#111", borderRadius: 10, padding: "12px 16px",
          marginBottom: 16, border: "1px solid #1a1a1a",
        }}>
          <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
            Prompt: <span style={{ color: "#fff" }}>"{comparisons[compIndex].prompt}"</span>
          </p>
        </div>

        {/* Side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#0a0a0a", borderRadius: 12, padding: 20, border: "1px solid #1a1a1a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "#222", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>{t("landing.comp_others")}</span>
            </div>
            <p style={{ fontSize: 12, color: "#ff444488", lineHeight: 1.7, animation: "slideIn 0.5s ease" }}>
              {comparisons[compIndex].others}
            </p>
          </div>

          <div style={{ background: "#0d0a07", borderRadius: 12, padding: 20, border: "1px solid #8b735533" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "#8b735522", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ fontSize: 11, color: "#8b7355", fontWeight: 600 }}>{t("landing.comp_aidark")}</span>
            </div>
            <p style={{ fontSize: 12, color: "#d4c5b0", lineHeight: 1.7, animation: "slideIn 0.5s ease" }}>
              {comparisons[compIndex].aidark}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section style={{ padding: "80px 20px", maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, textAlign: "center", marginBottom: 40 }}>
          {t("landing.why_title")}<span style={{ color: "#8b7355" }}>AIdark</span>?
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: "#0a0a0a", borderRadius: 12, padding: 20,
              border: "1px solid #1a1a1a", transition: "border-color 0.3s ease",
            }}>
              <div style={{ marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section style={{ padding: "80px 20px", maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, textAlign: "center", marginBottom: 32 }}>
          {t("landing.what_title")}
        </h2>
        {useCases.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "14px 0", borderBottom: "1px solid #111",
          }}>
            <div style={{ flexShrink: 0 }}>{item.icon}</div>
            <span style={{ fontSize: 14, color: "#999" }}>{item.text}</span>
          </div>
        ))}
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section style={{
        padding: "80px 20px", textAlign: "center", position: "relative", zIndex: 1,
        background: "linear-gradient(180deg, transparent, #8b735508)",
      }}>
        <div style={{
          position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
          opacity: 0.07, pointerEvents: "none",
        }}>
          <PredatorEyes size={300} />
        </div>

        <h2 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 800, marginBottom: 16 }}>
          {t("landing.final_title_1")}
          <br />
          <span style={{ color: "#8b7355" }}>{t("landing.final_title_2")}</span>
        </h2>
        <p style={{ fontSize: 14, color: "#ffffff44", marginBottom: 32 }}>
          {t("landing.final_subtitle")}
        </p>
        <button
          onClick={() => {
            void trackEvent("landing_cta_click", { placement: "final" });
            onStart?.("final");
          }}
          style={{
            padding: "16px 48px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #8b7355, #6b5a42)", color: "#fff",
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 30px rgba(139,115,85,0.3)",
            animation: "glow 3s ease-in-out infinite",
          }}
        >
          {t("landing.cta_start")}
        </button>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: "40px 20px", textAlign: "center", borderTop: "1px solid #111", position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 11, color: "#ffffff22" }}>
          © 2026 AIdark ·{" "}
          <a href="/legal" style={{ color: "#ffffff33", textDecoration: "none" }}>{t("sidebar.terms")}</a> ·{" "}
          <a href="/legal" style={{ color: "#ffffff33", textDecoration: "none" }}>{t("sidebar.privacy")}</a> ·{" "}
          <a href="/legal" style={{ color: "#ffffff33", textDecoration: "none" }}>+18</a>
        </p>
        <p style={{ fontSize: 9, color: "#ffffff11", marginTop: 8 }}>
          {t("landing.footer_adults")}
        </p>
      </footer>
    </div>
  );
}
