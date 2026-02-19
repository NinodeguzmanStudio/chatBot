import React, { useState } from 'react';

const tabs = ['Términos', 'Privacidad', '+18'];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#d4c5b0', marginBottom: 8 }}>{title}</h3>
    <p style={{ fontSize: 12, color: '#8b7d6b', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{children}</p>
  </div>
);

const TermsContent = () => (
  <div>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Términos de Servicio</h2>
    <p style={{ color: '#ffffff55', fontSize: 11, marginBottom: 20 }}>Última actualización: Febrero 2026</p>
    <Section title="1. Aceptación">Al usar AIdark (aidark.es) aceptas estos términos en su totalidad. Si no estás de acuerdo, no uses el servicio. Debes ser mayor de 18 años para usar AIdark.</Section>
    <Section title="2. Descripción del servicio">AIdark es una plataforma de chat con inteligencia artificial orientada a adultos (+18). El servicio permite conversaciones sin filtros de contenido convencionales. AIdark no genera, almacena ni distribuye imágenes. Solo procesa texto.</Section>
    <Section title="3. Cuentas y acceso">Para usar AIdark necesitas crear una cuenta con email o Google. Eres responsable de mantener la seguridad de tu cuenta. No compartas tus credenciales. Nos reservamos el derecho de suspender cuentas que violen estos términos.</Section>
    <Section title="4. Planes y pagos">AIdark ofrece un plan gratuito limitado y planes de pago. Los pagos se procesan a través de MercadoPago. Los precios se muestran en la moneda local al momento del pago. No ofrecemos reembolsos una vez activado el plan, salvo que la ley local lo requiera. Los planes se activan inmediatamente tras confirmar el pago.</Section>
    <Section title="5. Uso aceptable">AIdark permite contenido adulto y conversaciones sin censura entre adultos que consienten. Sin embargo, está estrictamente prohibido:{"\n\n"}• Generar contenido que involucre menores de edad en cualquier contexto sexual o de explotación{"\n"}• Planificar o coordinar actividades ilegales reales{"\n"}• Acosar, amenazar o intimidar a personas reales{"\n"}• Usar el servicio para generar spam, phishing o fraude{"\n"}• Intentar vulnerar la seguridad del sistema{"\n\n"}La violación de estas reglas resulta en suspensión inmediata y permanente sin reembolso.</Section>
    <Section title="6. Contenido generado por IA">Las respuestas de AIdark son generadas por inteligencia artificial. No garantizamos la exactitud, veracidad ni utilidad del contenido. No somos responsables de decisiones tomadas basándose en respuestas de la IA. El contenido generado no constituye asesoramiento legal, médico, financiero ni profesional de ningún tipo.</Section>
    <Section title="7. Privacidad y datos">Tu privacidad es importante. Consulta nuestra Política de Privacidad para detalles sobre cómo manejamos tus datos. Las conversaciones se almacenan temporalmente para el funcionamiento del servicio y se eliminan automáticamente según tu plan.</Section>
    <Section title="8. Limitación de responsabilidad">AIdark se proporciona "tal cual" sin garantías de ningún tipo. No somos responsables de daños directos, indirectos o consecuentes derivados del uso del servicio. El uso de AIdark es bajo tu propia responsabilidad.</Section>
    <Section title="9. Modificaciones">Podemos actualizar estos términos en cualquier momento. Te notificaremos cambios importantes por email. El uso continuado del servicio tras cambios constituye aceptación.</Section>
    <Section title="10. Contacto">Para consultas sobre estos términos: ninodeguzmanstudio@gmail.com</Section>
  </div>
);

const PrivacyContent = () => (
  <div>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Política de Privacidad</h2>
    <p style={{ color: '#ffffff55', fontSize: 11, marginBottom: 20 }}>Última actualización: Febrero 2026</p>
    <Section title="1. Qué datos recopilamos">• Email y nombre (al registrarte con Google o email){"\n"}• Datos de pago (procesados por MercadoPago, no almacenamos tarjetas){"\n"}• Conversaciones con la IA (almacenadas temporalmente){"\n"}• Datos técnicos: dirección IP, tipo de dispositivo, navegador{"\n"}• Huella digital del dispositivo (para prevenir abuso del plan gratuito)</Section>
    <Section title="2. Cómo usamos tus datos">• Proporcionar y mejorar el servicio{"\n"}• Procesar pagos y gestionar tu suscripción{"\n"}• Prevenir fraude y abuso{"\n"}• Comunicaciones sobre tu cuenta (no enviamos marketing sin consentimiento)</Section>
    <Section title="3. Almacenamiento de conversaciones">Las conversaciones se almacenan en servidores seguros para que puedas acceder a tu historial. Se eliminan automáticamente según tu plan:{"\n\n"}• Plan gratuito: 24 horas{"\n"}• Plan mensual: 7 días{"\n"}• Plan trimestral: 30 días{"\n"}• Plan anual: 90 días{"\n\n"}No leemos, analizamos ni compartimos el contenido de tus conversaciones. No usamos tus conversaciones para entrenar modelos de IA.</Section>
    <Section title="4. Terceros">Compartimos datos limitados con:{"\n\n"}• Supabase: autenticación y base de datos (infraestructura){"\n"}• MercadoPago: procesamiento de pagos{"\n"}• Venice AI: procesamiento de conversaciones (solo el texto, no tu identidad){"\n"}• Google Analytics: estadísticas de uso anónimas{"\n\n"}No vendemos tus datos a terceros. Nunca.</Section>
    <Section title="5. Seguridad">Usamos cifrado en tránsito (HTTPS/TLS), autenticación segura, y acceso restringido a datos. Sin embargo, ningún sistema es 100% seguro. Si descubrimos una brecha, te notificaremos.</Section>
    <Section title="6. Tus derechos">Tienes derecho a:{"\n\n"}• Acceder a tus datos personales{"\n"}• Solicitar eliminación de tu cuenta y datos{"\n"}• Exportar tus datos{"\n"}• Retirar tu consentimiento{"\n\n"}Para ejercer estos derechos, escríbenos a ninodeguzmanstudio@gmail.com</Section>
    <Section title="7. Cookies">Usamos cookies esenciales para el funcionamiento del servicio (sesión, autenticación). Google Analytics usa cookies de análisis. No usamos cookies publicitarias.</Section>
    <Section title="8. Menores">AIdark es exclusivamente para mayores de 18 años. No recopilamos conscientemente datos de menores. Si descubrimos que un menor usa el servicio, eliminaremos su cuenta inmediatamente.</Section>
    <Section title="9. Contacto">ninodeguzmanstudio@gmail.com</Section>
  </div>
);

const AgeContent = () => (
  <div>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Política de Contenido +18</h2>
    <p style={{ color: '#ffffff55', fontSize: 11, marginBottom: 20 }}>Última actualización: Febrero 2026</p>
    <Section title="Advertencia">AIdark es una plataforma exclusiva para adultos mayores de 18 años. Al usar este servicio, confirmas que eres mayor de edad según la legislación de tu país de residencia.</Section>
    <Section title="Naturaleza del contenido">AIdark permite generar texto sin los filtros de contenido habituales en otras plataformas de IA. Esto significa que las conversaciones pueden incluir:{"\n\n"}• Lenguaje explícito y contenido adulto{"\n"}• Temas controvertidos o tabú{"\n"}• Ficción sin restricciones temáticas{"\n"}• Humor negro y contenido provocador{"\n\n"}Todo el contenido es generado por inteligencia artificial y es ficticio. No representa opiniones, recomendaciones ni hechos verificados.</Section>
    <Section title="Límites absolutos">Aunque AIdark permite contenido adulto, existen líneas que no se cruzan:{"\n\n"}• Contenido sexual que involucre menores: tolerancia cero{"\n"}• Instrucciones para causar daño real a personas{"\n"}• Material que promueva terrorismo o violencia extrema real{"\n"}• Datos personales reales de terceros sin consentimiento{"\n\n"}Cualquier intento de generar este tipo de contenido resultará en la suspensión inmediata y permanente de la cuenta.</Section>
    <Section title="Responsabilidad del usuario">Tú eres responsable de cómo usas el contenido generado por AIdark. No nos hacemos responsables del uso que des a las respuestas de la IA fuera de nuestra plataforma. Usa el servicio de manera responsable y legal.</Section>
    <Section title="Salud mental">Si experimentas malestar emocional, recuerda que AIdark es una herramienta de entretenimiento y no un sustituto de atención profesional. Si necesitas ayuda, busca un profesional de salud mental en tu localidad.</Section>
    <Section title="Contacto">Para reportar contenido o conducta inapropiada: ninodeguzmanstudio@gmail.com</Section>
  </div>
);

export const LegalPages: React.FC = () => {
  const [active, setActive] = useState(0);
  return (
    <div style={{ minHeight: '100dvh', background: '#0c0b0a', padding: '40px 20px', fontFamily: "'IBM Plex Mono', monospace", display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <a href="/" style={{ alignSelf: 'flex-start', fontSize: 12, color: '#8b7355', textDecoration: 'none', marginBottom: 24 }}>← Volver al chat</a>
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid', borderColor: active === i ? '#8b7355' : '#2a2520', background: active === i ? '#8b735515' : 'transparent', color: active === i ? '#d4c5b0' : '#5a4a3a', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease' }}>{tab}</button>
        ))}
      </div>
      <div style={{ maxWidth: 640, width: '100%' }}>
        {active === 0 && <TermsContent />}
        {active === 1 && <PrivacyContent />}
        {active === 2 && <AgeContent />}
      </div>
      <p style={{ fontSize: 9, color: '#2a2520', marginTop: 40 }}>© 2026 AIdark. Todos los derechos reservados.</p>
    </div>
  );
};
