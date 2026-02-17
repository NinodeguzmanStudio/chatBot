import React from 'react';
import { X } from 'lucide-react';
import { getLang } from '@/lib/i18n';

const content = {
  es: {
    title: 'Términos de Servicio',
    sections: [
      { h: '1. Aceptación', p: 'Al usar AIdark aceptas estos términos. Si no estás de acuerdo, no uses el servicio.' },
      { h: '2. Requisito de edad', p: 'Debes ser mayor de 18 años para usar AIdark. Al registrarte confirmas ser mayor de edad en tu jurisdicción.' },
      { h: '3. Uso del servicio', p: 'AIdark es una herramienta de inteligencia artificial sin censura. Eres responsable del uso que le des. Prohibido usar para actividades ilegales, generar contenido de explotación infantil, amenazas reales, o spam masivo.' },
      { h: '4. Contenido generado', p: 'Las respuestas son generadas por IA y pueden contener errores o información inexacta. No nos hacemos responsables por decisiones tomadas basándose en respuestas de la IA.' },
      { h: '5. Cuentas', p: 'Eres responsable de mantener seguras tus credenciales. Nos reservamos el derecho de suspender cuentas que violen estos términos.' },
      { h: '6. Planes y pagos', p: 'Los planes gratuitos tienen límite de mensajes diarios. Los planes premium se facturan según el periodo elegido. Puedes cancelar en cualquier momento.' },
      { h: '7. Privacidad', p: 'Los chats se eliminan automáticamente después de 7 días. Consulta nuestra Política de Privacidad para más detalles.' },
      { h: '8. Cambios', p: 'Podemos modificar estos términos. Te notificaremos de cambios significativos.' },
      { h: '9. Contacto', p: 'contacto@aidark.app' },
    ],
  },
  pt: {
    title: 'Termos de Serviço',
    sections: [
      { h: '1. Aceitação', p: 'Ao usar o AIdark você aceita estes termos. Se não concordar, não use o serviço.' },
      { h: '2. Requisito de idade', p: 'Você deve ter mais de 18 anos para usar o AIdark. Ao se registrar, confirma ser maior de idade em sua jurisdição.' },
      { h: '3. Uso do serviço', p: 'AIdark é uma ferramenta de inteligência artificial sem censura. Você é responsável pelo uso que fizer. Proibido usar para atividades ilegais, gerar conteúdo de exploração infantil, ameaças reais ou spam em massa.' },
      { h: '4. Conteúdo gerado', p: 'As respostas são geradas por IA e podem conter erros ou informações imprecisas. Não nos responsabilizamos por decisões tomadas com base nas respostas da IA.' },
      { h: '5. Contas', p: 'Você é responsável por manter suas credenciais seguras. Reservamo-nos o direito de suspender contas que violem estes termos.' },
      { h: '6. Planos e pagamentos', p: 'Planos gratuitos têm limite de mensagens diárias. Planos premium são cobrados conforme o período escolhido. Você pode cancelar a qualquer momento.' },
      { h: '7. Privacidade', p: 'Os chats são excluídos automaticamente após 7 dias. Consulte nossa Política de Privacidade para mais detalhes.' },
      { h: '8. Alterações', p: 'Podemos modificar estes termos. Notificaremos sobre mudanças significativas.' },
      { h: '9. Contato', p: 'contacto@aidark.app' },
    ],
  },
  en: {
    title: 'Terms of Service',
    sections: [
      { h: '1. Acceptance', p: 'By using AIdark you accept these terms. If you disagree, do not use the service.' },
      { h: '2. Age requirement', p: 'You must be over 18 years old to use AIdark. By registering you confirm you are of legal age in your jurisdiction.' },
      { h: '3. Use of service', p: 'AIdark is an uncensored artificial intelligence tool. You are responsible for how you use it. Prohibited: illegal activities, child exploitation content, real threats, or mass spam.' },
      { h: '4. Generated content', p: 'Responses are AI-generated and may contain errors or inaccurate information. We are not responsible for decisions made based on AI responses.' },
      { h: '5. Accounts', p: 'You are responsible for keeping your credentials secure. We reserve the right to suspend accounts that violate these terms.' },
      { h: '6. Plans and payments', p: 'Free plans have daily message limits. Premium plans are billed per chosen period. You can cancel anytime.' },
      { h: '7. Privacy', p: 'Chats are automatically deleted after 7 days. See our Privacy Policy for details.' },
      { h: '8. Changes', p: 'We may modify these terms. We will notify you of significant changes.' },
      { h: '9. Contact', p: 'contacto@aidark.app' },
    ],
  },
};

export const TermsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
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
