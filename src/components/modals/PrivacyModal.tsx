import React from 'react';
import { X } from 'lucide-react';
import { getLang } from '@/lib/i18n';

const content = {
  es: {
    title: 'Política de Privacidad',
    sections: [
      { h: '1. Datos que recopilamos', p: 'Email y contraseña para tu cuenta. Mensajes de chat que se eliminan automáticamente después de 7 días. No vendemos ni compartimos tus datos con terceros.' },
      { h: '2. Uso de datos', p: 'Tus mensajes se procesan mediante servicios de inteligencia artificial para generar respuestas. No almacenamos el contenido de las conversaciones más de 7 días. Los datos de cuenta se usan exclusivamente para autenticación.' },
      { h: '3. Seguridad', p: 'Utilizamos servidores con encriptación en tránsito y en reposo. Las contraseñas se protegen con algoritmos de hash seguros. Todas las conexiones se realizan mediante protocolos HTTPS. Empleamos almacenamiento local (localStorage) únicamente para preferencias de idioma y verificación de edad. No usamos cookies de rastreo ni publicidad.' },
      { h: '4. Protección de menores', p: 'AIdark mantiene una política de TOLERANCIA CERO hacia cualquier contenido que involucre explotación, abuso o cualquier forma de violencia contra menores de edad. Está estrictamente prohibido utilizar la plataforma para generar, solicitar o distribuir contenido de pedofilia, abuso infantil o cualquier material que atente contra la integridad de menores. Si bien ofrecemos un servicio sin censura, respetamos el derecho a la vida y la protección integral de los menores de edad. Cualquier cuenta que viole esta política será suspendida de inmediato y reportada a las autoridades competentes.' },
      { h: '5. Tus derechos', p: 'Puedes eliminar tu cuenta y todos tus datos en cualquier momento desde Ajustes. Puedes solicitar una copia de tus datos contactándonos. Tienes derecho a la portabilidad, rectificación y eliminación de tus datos personales conforme a las leyes de protección de datos aplicables.' },
      { h: '6. Requisito de edad', p: 'AIdark es una plataforma exclusiva para mayores de 18 años. Al usar el servicio confirmas ser mayor de edad en tu jurisdicción.' },
      { h: '7. Contacto', p: 'Para consultas de privacidad: ninodeguzmanstudio@gmail.com' },
    ],
  },
  pt: {
    title: 'Política de Privacidade',
    sections: [
      { h: '1. Dados que coletamos', p: 'Email e senha para sua conta. Mensagens de chat que são excluídas automaticamente após 7 dias. Não vendemos nem compartilhamos seus dados com terceiros.' },
      { h: '2. Uso de dados', p: 'Suas mensagens são processadas por serviços de inteligência artificial para gerar respostas. Não armazenamos o conteúdo das conversas por mais de 7 dias. Os dados da conta são usados exclusivamente para autenticação.' },
      { h: '3. Segurança', p: 'Utilizamos servidores com criptografia em trânsito e em repouso. Senhas são protegidas com algoritmos de hash seguros. Todas as conexões são realizadas via protocolos HTTPS. Utilizamos armazenamento local (localStorage) apenas para preferências de idioma e verificação de idade. Não usamos cookies de rastreamento ou publicidade.' },
      { h: '4. Proteção de menores', p: 'AIdark mantém uma política de TOLERÂNCIA ZERO em relação a qualquer conteúdo que envolva exploração, abuso ou qualquer forma de violência contra menores de idade. É estritamente proibido usar a plataforma para gerar, solicitar ou distribuir conteúdo de pedofilia, abuso infantil ou qualquer material que atente contra a integridade de menores. Embora ofereçamos um serviço sem censura, respeitamos o direito à vida e a proteção integral dos menores de idade. Qualquer conta que viole esta política será suspensa imediatamente e reportada às autoridades competentes.' },
      { h: '5. Seus direitos', p: 'Você pode excluir sua conta e todos os seus dados a qualquer momento nas Configurações. Pode solicitar uma cópia dos seus dados entrando em contato conosco. Você tem direito à portabilidade, retificação e eliminação dos seus dados pessoais conforme as leis de proteção de dados aplicáveis.' },
      { h: '6. Requisito de idade', p: 'AIdark é uma plataforma exclusiva para maiores de 18 anos. Ao usar o serviço, você confirma ser maior de idade em sua jurisdição.' },
      { h: '7. Contato', p: 'Para consultas de privacidade: ninodeguzmanstudio@gmail.com' },
    ],
  },
  en: {
    title: 'Privacy Policy',
    sections: [
      { h: '1. Data we collect', p: 'Email and password for your account. Chat messages that are automatically deleted after 7 days. We do not sell or share your data with third parties.' },
      { h: '2. Data usage', p: 'Your messages are processed through artificial intelligence services to generate responses. We do not store conversation content for more than 7 days. Account data is used exclusively for authentication.' },
      { h: '3. Security', p: 'We use servers with encryption in transit and at rest. Passwords are protected with secure hashing algorithms. All connections are made via HTTPS protocols. We use local storage (localStorage) only for language preferences and age verification. We do not use tracking or advertising cookies.' },
      { h: '4. Child protection', p: 'AIdark maintains a ZERO TOLERANCE policy towards any content involving exploitation, abuse, or any form of violence against minors. It is strictly prohibited to use the platform to generate, request, or distribute pedophilia content, child abuse material, or any content that threatens the integrity of minors. While we offer an uncensored service, we respect the right to life and the comprehensive protection of minors. Any account violating this policy will be immediately suspended and reported to the relevant authorities.' },
      { h: '5. Your rights', p: 'You can delete your account and all your data at any time from Settings. You can request a copy of your data by contacting us. You have the right to portability, rectification, and deletion of your personal data in accordance with applicable data protection laws.' },
      { h: '6. Age requirement', p: 'AIdark is a platform exclusively for users over 18 years old. By using the service you confirm you are of legal age in your jurisdiction.' },
      { h: '7. Contact', p: 'For privacy inquiries: ninodeguzmanstudio@gmail.com' },
    ],
  },
};

export const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const lang = getLang();
  const c = content[lang];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border-def)', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--txt-pri)' }}>{c.title}</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        {c.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-sec)', marginBottom: 6 }}>{s.h}</h3>
            <p style={{ fontSize: 12, color: 'var(--txt-mut)', lineHeight: 1.7 }}>{s.p}</p>
          </div>
        ))}
        <p style={{ fontSize: 10, color: 'var(--txt-ghost)', marginTop: 20, textAlign: 'center' }}>AIdark © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};
