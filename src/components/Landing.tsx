import { useState, useEffect } from "react";

// ═══ Predator Eyes SVG (appear/disappear around page) ═══
const PredatorEyes = ({ size = 60, style = {} }) => (
  <svg width={size} height={size * 0.45} viewBox="0 0 120 50" style={style}>
    <ellipse cx="30" cy="25" rx="20" ry="12" fill="none" stroke="#8b7355" strokeWidth="1" opacity="0.5" />
    <ellipse cx="30" cy="25" rx="6" ry="10" fill="#8b7355" opacity="0.7" />
    <circle cx="28" cy="22" r="1.5" fill="#fff" opacity="0.5" />
    <ellipse cx="90" cy="25" rx="20" ry="12" fill="none" stroke="#8b7355" strokeWidth="1" opacity="0.5" />
    <ellipse cx="90" cy="25" rx="6" ry="10" fill="#8b7355" opacity="0.7" />
    <circle cx="88" cy="22" r="1.5" fill="#fff" opacity="0.5" />
  </svg>
);

const FloatingEyes = () => {
  const positions = [
    { top: "8%", left: "4%", size: 44, delay: 0 },
    { top: "18%", right: "6%", size: 52, delay: 2.5 },
    { top: "42%", left: "2%", size: 36, delay: 5 },
    { top: "58%", right: "4%", size: 48, delay: 1.5 },
    { top: "72%", left: "6%", size: 32, delay: 4 },
    { top: "88%", right: "8%", size: 40, delay: 3 },
    { top: "35%", right: "2%", size: 28, delay: 6.5 },
    { top: "65%", left: "8%", size: 42, delay: 7.5 },
  ];
  return (<>
    {positions.map((p, i) => (
      <div key={i} style={{
        position: "absolute", top: p.top, left: p.left, right: p.right,
        zIndex: 0, pointerEvents: "none",
        animation: `eyeFade 8s ease-in-out infinite`, animationDelay: `${p.delay}s`,
      }}>
        <PredatorEyes size={p.size} />
      </div>
    ))}
  </>);
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

const phrases = [
  "Escríbeme una novela erótica sin censura",
  "Investiga sobre rituales prohibidos",
  "Hazme un roleplay oscuro sin límites",
  "Explícame temas que otras IAs censuran",
  "Escribe humor negro sin filtros",
];

const comparisons = [
  { prompt: "Escríbeme una historia de terror explícita", others: "❌ No puedo generar contenido violento o explícito...", aidark: "✅ El sótano olía a óxido y miedo. Las paredes respiraban con un pulso húmedo y enfermo..." },
  { prompt: "Investiga sobre ocultismo y rituales", others: "❌ No puedo proporcionar información sobre prácticas ocultistas...", aidark: "✅ El ritual del Goetia, documentado en el siglo XVII, describe la invocación de 72 entidades..." },
  { prompt: "Roleplay: eres un villano sin moral", others: "❌ No me es posible interpretar personajes que promuevan conductas dañinas...", aidark: "✅ *se ajusta los guantes de cuero* Vaya, vaya... otro visitante que busca respuestas en los lugares equivocados..." },
];

const features = [
  { icon: I.unlock, title: "Sin censura", desc: "Escribe sobre cualquier tema sin restricciones artificiales" },
  { icon: I.shield, title: "Privado", desc: "Tus conversaciones son tuyas. No leemos ni compartimos tu contenido" },
  { icon: I.zap, title: "Rápido", desc: "Respuestas instantáneas con streaming en tiempo real" },
  { icon: I.mask, title: "Personajes IA", desc: "Elige entre múltiples personalidades: rebelde, seductora, detective" },
  { icon: I.inf, title: "Sin límites", desc: "Novelas extensas, investigaciones profundas, sin cortes" },
  { icon: I.globe, title: "En español", desc: "Pensado para hispanohablantes. Respuestas naturales en tu idioma" },
];

const useCases = [
  { icon: I.book, text: "Novelas y relatos sin límites de extensión ni contenido" },
  { icon: I.search, text: "Investigación profunda sobre cualquier tema" },
  { icon: I.drama, text: "Roleplay con personajes sin restricciones" },
  { icon: I.skull, text: "Humor negro, sátira y contenido provocador" },
  { icon: I.eye, text: "Ocultismo, misterios y temas tabú" },
  { icon: I.flame, text: "Contenido adulto y erótico sin censura" },
];

export default function Landing({ onStart }: { onStart?: () => void }) {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [compIndex, setCompIndex] = useState(0);

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

  useEffect(() => {
    const interval = setInterval(() => setCompIndex((c) => (c + 1) % comparisons.length), 6000);
    return () => clearInterval(interval);
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
          width: 100, height: 100, borderRadius: 20, marginBottom: 24,
          animation: "glow 3s ease-in-out infinite",
        }} />

        <h1 style={{
          fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 800,
          textAlign: "center", lineHeight: 1.1, marginBottom: 12,
        }}>
          La IA que <span style={{ color: "#8b7355" }}>no te censura</span>
        </h1>

        <p style={{
          fontSize: "clamp(14px, 2.5vw, 18px)", color: "#ffffff66",
          textAlign: "center", maxWidth: 500, marginBottom: 32, lineHeight: 1.6,
        }}>
          Escribe sin filtros. Investiga sin límites. Pregunta sin miedo.
          <br />La primera IA en español diseñada para adultos que piensan libre.
        </p>

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
            &gt; {displayText}<span style={{ animation: "blink 1s infinite", color: "#8b7355" }}>|</span>
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button style={{
            padding: "14px 32px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #8b7355, #6b5a42)", color: "#fff",
            fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5,
            boxShadow: "0 4px 20px rgba(139,115,85,0.3)",
          }}>Empezar gratis →</button>
          <button style={{
            padding: "14px 32px", borderRadius: 10,
            border: "1px solid #333", background: "transparent", color: "#999",
            fontSize: 15, fontWeight: 500, cursor: "pointer",
          }}>Ver planes</button>
        </div>

        <p style={{ fontSize: 11, color: "#ffffff33", marginTop: 16 }}>
          +18 · No requiere tarjeta · 5 mensajes gratis
        </p>

        <div style={{
          position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
          <span style={{ fontSize: 10, color: "#ffffff22" }}>Descubre más</span>
          <div style={{ width: 1, height: 20, background: "linear-gradient(180deg, #ffffff22, transparent)" }} />
        </div>
      </section>

      {/* ═══ COMPARACIÓN ═══ */}
      <section style={{ padding: "80px 20px", maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, textAlign: "center", marginBottom: 8 }}>
          Otras IAs te <span style={{ color: "#ff4444" }}>censuran</span>.
          <br />AIdark te <span style={{ color: "#8b7355" }}>responde</span>.
        </h2>
        <p style={{ fontSize: 14, color: "#ffffff44", textAlign: "center", marginBottom: 40 }}>
          Mira la diferencia en tiempo real
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
          {comparisons.map((_, i) => (
            <button key={i} onClick={() => setCompIndex(i)} style={{
              padding: "6px 16px", borderRadius: 20, fontSize: 11,
              border: "1px solid", cursor: "pointer", fontFamily: "inherit",
              borderColor: compIndex === i ? "#8b7355" : "#222",
              background: compIndex === i ? "#8b735515" : "transparent",
              color: compIndex === i ? "#d4c5b0" : "#555",
            }}>{["Terror", "Ocultismo", "Roleplay"][i]}</button>
          ))}
        </div>

        <div style={{
          background: "#111", borderRadius: 10, padding: "12px 16px",
          marginBottom: 16, border: "1px solid #1a1a1a",
        }}>
          <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
            Prompt: <span style={{ color: "#fff" }}>"{comparisons[compIndex].prompt}"</span>
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#0a0a0a", borderRadius: 12, padding: 20, border: "1px solid #1a1a1a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "#222", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>Otras IAs</span>
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
              <span style={{ fontSize: 11, color: "#8b7355", fontWeight: 600 }}>AIdark</span>
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
          ¿Por qué <span style={{ color: "#8b7355" }}>AIdark</span>?
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

      {/* ═══ SCARCITY ═══ */}
      <section style={{
        padding: "60px 20px", textAlign: "center", position: "relative", zIndex: 1,
        background: "linear-gradient(180deg, transparent, #0d0a0722, transparent)",
      }}>
        <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, marginBottom: 12 }}>
          Solo <span style={{ color: "#e67e22" }}>10,000</span> miembros
        </h2>
        <p style={{ fontSize: 14, color: "#ffffff55", maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.7 }}>
          Para garantizar tu libertad de expresión y privacidad, limitamos el acceso.
          Menos usuarios = más velocidad y mejor experiencia.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          {[
            { price: "$12", period: "/mes", color: "#e67e22", pct: "70%" },
            { price: "$29.99", period: "/3 meses", color: "#2eaadc", pct: "46%", label: "~$10/mes" },
            { price: "$99.99", period: "/año", color: "#9b59b6", pct: "30%", label: "~$8.33/mes" },
          ].map((p, i) => (
            <div key={i} style={{
              background: "#0d0d1a", borderRadius: 12, padding: "20px 24px",
              border: `1px solid ${p.color}33`, minWidth: 140, textAlign: "center",
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>{p.price}</div>
              <div style={{ fontSize: 11, color: "#ffffff55" }}>{p.period}</div>
              {p.label && <div style={{ fontSize: 10, color: p.color, marginTop: 4 }}>{p.label}</div>}
              <div style={{ height: 3, background: "#1a1a2e", borderRadius: 2, marginTop: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: p.pct, background: p.color, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 9, color: "#ffffff33", marginTop: 4 }}>{p.pct} ocupado</div>
            </div>
          ))}
        </div>
        <button style={{
          padding: "16px 40px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #8b7355, #6b5a42)", color: "#fff",
          fontSize: 16, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 30px rgba(139,115,85,0.3)",
        }}>Obtener acceso ahora →</button>
        <p style={{ fontSize: 11, color: "#ffffff33", marginTop: 12 }}>
          5 mensajes gratis · No requiere tarjeta · Cancela cuando quieras
        </p>
      </section>

      {/* ═══ WHAT CAN YOU DO ═══ */}
      <section style={{ padding: "80px 20px", maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, textAlign: "center", marginBottom: 32 }}>
          ¿Qué puedes hacer en AIdark?
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
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", opacity: 0.07, pointerEvents: "none" }}>
          <PredatorEyes size={300} />
        </div>
        <h2 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 800, marginBottom: 16 }}>
          Tu libertad de expresión
          <br /><span style={{ color: "#8b7355" }}>empieza aquí.</span>
        </h2>
        <p style={{ fontSize: 14, color: "#ffffff44", marginBottom: 32 }}>
          Únete a los miles que ya escriben sin filtros.
        </p>
        <button style={{
          padding: "16px 48px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #8b7355, #6b5a42)", color: "#fff",
          fontSize: 16, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 30px rgba(139,115,85,0.3)",
          animation: "glow 3s ease-in-out infinite",
        }}>Empezar gratis →</button>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: "40px 20px", textAlign: "center", borderTop: "1px solid #111", position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 11, color: "#ffffff22" }}>
          © 2026 AIdark · <a href="/legal" style={{ color: "#ffffff33", textDecoration: "none" }}>Términos</a> · <a href="/legal" style={{ color: "#ffffff33", textDecoration: "none" }}>Privacidad</a> · <a href="/legal" style={{ color: "#ffffff33", textDecoration: "none" }}>+18</a>
        </p>
        <p style={{ fontSize: 9, color: "#ffffff11", marginTop: 8 }}>
          AIdark es un servicio para adultos (+18). Todo el contenido es generado por IA y es ficticio.
        </p>
      </footer>
    </div>
  );
}
