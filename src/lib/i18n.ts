// ═══════════════════════════════════════
// AIdark — i18n Multi-language System
// ═══════════════════════════════════════

export type Lang = 'es' | 'pt' | 'en';

const translations: Record<Lang, Record<string, string>> = {
  es: {
    // General
    'app.tagline': 'sin censura',
    'app.privacy': 'Tus chats son privados y se eliminan automáticamente después de 7 días.',
    'app.chats_private': 'Chats privados · +18',
    'app.msgs_remaining': 'msgs restantes hoy',
    'app.unlimited': '∞',
    'app.today': 'hoy',

    // Auth
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Crear cuenta',
    'auth.forgot': 'Recuperar contraseña',
    'auth.email': 'Email',
    'auth.password': 'Contraseña',
    'auth.confirm_password': 'Confirmar contraseña',
    'auth.email_placeholder': 'tu@email.com',
    'auth.password_placeholder': 'Mínimo 6 caracteres',
    'auth.confirm_placeholder': 'Repite la contraseña',
    'auth.forgot_link': '¿Olvidaste tu contraseña?',
    'auth.enter': 'Entrar',
    'auth.create': 'Crear cuenta',
    'auth.send_email': 'Enviar email',
    'auth.no_account': '¿No tienes cuenta?',
    'auth.has_account': '¿Ya tienes cuenta?',
    'auth.register_link': 'Regístrate',
    'auth.login_link': 'Inicia sesión',
    'auth.back_login': 'Volver al login',
    'auth.skip': 'Probar sin cuenta (5 mensajes gratis)',
    'auth.fill_all': 'Completa todos los campos',
    'auth.passwords_mismatch': 'Las contraseñas no coinciden',
    'auth.password_min': 'La contraseña debe tener al menos 6 caracteres',
    'auth.wrong_credentials': 'Email o contraseña incorrectos',
    'auth.account_created': 'Cuenta creada. Revisa tu email para confirmar.',
    'auth.reset_sent': 'Email de recuperación enviado. Revisa tu bandeja.',
    'auth.enter_email': 'Ingresa tu email',
    'auth.verify_email': 'Verifica tu email antes de iniciar sesión. Revisa tu bandeja.',
    'auth.temp_email': 'No se permiten emails temporales.',
    'auth.google_login': 'Continuar con Google',
    'auth.google_register': 'Registrarse con Google',

    // Sidebar
    'sidebar.no_chats': 'Sin chats aún',
    'sidebar.projects': 'Proyectos',
    'sidebar.settings': 'Ajustes',
    'sidebar.privacy': 'Privacidad',
    'sidebar.upgrade': 'Upgrade a Premium',
    'sidebar.rename': 'Renombrar',
    'sidebar.delete': 'Eliminar',
    'sidebar.new_name': 'Nuevo nombre:',

    // Chat
    'chat.write_to': 'Escribe a',
    'chat.typing': 'escribiendo...',
    'chat.copied': 'Copiado',
    'chat.copy': 'Copiar',
    'chat.you': 'Tú',
    'chat.error': '⚠️ Error de conexión. Intenta de nuevo.',
    'chat.new': 'Nuevo chat',
    'chat.writer': 'Escritor',
    'chat.normal': 'Normal',

    // Settings
    'settings.title': 'Ajustes',
    'settings.version': 'Versión',
    'settings.active_chats': 'Chats activos',
    'settings.plan': 'Plan',
    'settings.language': 'Idioma',
    'settings.delete_all': 'Eliminar todos los chats',
    'settings.delete_confirm': '¿Eliminar todos los chats? Esta acción no se puede deshacer.',

    // Pricing
    'pricing.title': 'Planes AIdark',
    'pricing.subtitle': 'Desbloquea todo el potencial sin censura',
    'pricing.popular': 'POPULAR',
    'pricing.current': 'Plan actual',
    'pricing.free': 'Gratis',
    'pricing.activate': 'Activar',
    'pricing.secure': 'Pago seguro · Cancela cuando quieras',
    'pricing.need_account': 'Necesitas una cuenta para suscribirte. Regístrate primero.',
    'pricing.error': 'Error al crear el pago',
    'pricing.connection_error': 'Error de conexión. Intenta de nuevo.',

    // Age gate
    'age.title': 'Verificación de edad',
    'age.subtitle': 'Esta plataforma contiene contenido sin censura exclusivamente para mayores de 18 años.',
    'age.confirm': 'Confirmo que soy mayor de 18 años',
    'age.warning': 'Si eres menor de edad, cierra esta página.',

    // Header
    'header.premium': 'Premium',
    'header.pro': 'Pro',
    'header.logout': 'Cerrar sesión',
  },

  pt: {
    'app.tagline': 'sem censura',
    'app.privacy': 'Seus chats são privados e excluídos automaticamente após 7 dias.',
    'app.chats_private': 'Chats privados · +18',
    'app.msgs_remaining': 'msgs restantes hoje',
    'app.unlimited': '∞',
    'app.today': 'hoje',

    'auth.login': 'Entrar',
    'auth.register': 'Criar conta',
    'auth.forgot': 'Recuperar senha',
    'auth.email': 'Email',
    'auth.password': 'Senha',
    'auth.confirm_password': 'Confirmar senha',
    'auth.email_placeholder': 'seu@email.com',
    'auth.password_placeholder': 'Mínimo 6 caracteres',
    'auth.confirm_placeholder': 'Repita a senha',
    'auth.forgot_link': 'Esqueceu sua senha?',
    'auth.enter': 'Entrar',
    'auth.create': 'Criar conta',
    'auth.send_email': 'Enviar email',
    'auth.no_account': 'Não tem conta?',
    'auth.has_account': 'Já tem conta?',
    'auth.register_link': 'Registre-se',
    'auth.login_link': 'Faça login',
    'auth.back_login': 'Voltar ao login',
    'auth.skip': 'Testar sem conta (5 mensagens grátis)',
    'auth.fill_all': 'Preencha todos os campos',
    'auth.passwords_mismatch': 'As senhas não coincidem',
    'auth.password_min': 'A senha deve ter pelo menos 6 caracteres',
    'auth.wrong_credentials': 'Email ou senha incorretos',
    'auth.account_created': 'Conta criada. Verifique seu email para confirmar.',
    'auth.reset_sent': 'Email de recuperação enviado. Verifique sua caixa de entrada.',
    'auth.enter_email': 'Digite seu email',
    'auth.verify_email': 'Verifique seu email antes de fazer login. Confira sua caixa de entrada.',
    'auth.temp_email': 'Emails temporários não são permitidos.',
    'auth.google_login': 'Continuar com Google',
    'auth.google_register': 'Registrar com Google',

    'sidebar.no_chats': 'Sem chats ainda',
    'sidebar.projects': 'Projetos',
    'sidebar.settings': 'Configurações',
    'sidebar.privacy': 'Privacidade',
    'sidebar.upgrade': 'Upgrade para Premium',
    'sidebar.rename': 'Renomear',
    'sidebar.delete': 'Excluir',
    'sidebar.new_name': 'Novo nome:',

    'chat.write_to': 'Escreva para',
    'chat.typing': 'digitando...',
    'chat.copied': 'Copiado',
    'chat.copy': 'Copiar',
    'chat.you': 'Você',
    'chat.error': '⚠️ Erro de conexão. Tente novamente.',
    'chat.new': 'Novo chat',
    'chat.writer': 'Escritor',
    'chat.normal': 'Normal',

    'settings.title': 'Configurações',
    'settings.version': 'Versão',
    'settings.active_chats': 'Chats ativos',
    'settings.plan': 'Plano',
    'settings.language': 'Idioma',
    'settings.delete_all': 'Excluir todos os chats',
    'settings.delete_confirm': 'Excluir todos os chats? Esta ação não pode ser desfeita.',

    'pricing.title': 'Planos AIdark',
    'pricing.subtitle': 'Desbloqueie todo o potencial sem censura',
    'pricing.popular': 'POPULAR',
    'pricing.current': 'Plano atual',
    'pricing.free': 'Grátis',
    'pricing.activate': 'Ativar',
    'pricing.secure': 'Pagamento seguro · Cancele quando quiser',
    'pricing.need_account': 'Você precisa de uma conta para assinar. Registre-se primeiro.',
    'pricing.error': 'Erro ao criar o pagamento',
    'pricing.connection_error': 'Erro de conexão. Tente novamente.',

    'age.title': 'Verificação de idade',
    'age.subtitle': 'Esta plataforma contém conteúdo sem censura exclusivamente para maiores de 18 anos.',
    'age.confirm': 'Confirmo que sou maior de 18 anos',
    'age.warning': 'Se você é menor de idade, feche esta página.',

    'header.premium': 'Premium',
    'header.pro': 'Pro',
    'header.logout': 'Sair',
  },

  en: {
    'app.tagline': 'uncensored',
    'app.privacy': 'Your chats are private and auto-deleted after 7 days.',
    'app.chats_private': 'Private chats · +18',
    'app.msgs_remaining': 'msgs remaining today',
    'app.unlimited': '∞',
    'app.today': 'today',

    'auth.login': 'Log in',
    'auth.register': 'Create account',
    'auth.forgot': 'Reset password',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirm_password': 'Confirm password',
    'auth.email_placeholder': 'you@email.com',
    'auth.password_placeholder': 'At least 6 characters',
    'auth.confirm_placeholder': 'Repeat password',
    'auth.forgot_link': 'Forgot your password?',
    'auth.enter': 'Log in',
    'auth.create': 'Create account',
    'auth.send_email': 'Send email',
    'auth.no_account': "Don't have an account?",
    'auth.has_account': 'Already have an account?',
    'auth.register_link': 'Sign up',
    'auth.login_link': 'Log in',
    'auth.back_login': 'Back to login',
    'auth.skip': 'Try without account (5 free messages)',
    'auth.fill_all': 'Fill in all fields',
    'auth.passwords_mismatch': 'Passwords do not match',
    'auth.password_min': 'Password must be at least 6 characters',
    'auth.wrong_credentials': 'Wrong email or password',
    'auth.account_created': 'Account created. Check your email to confirm.',
    'auth.reset_sent': 'Recovery email sent. Check your inbox.',
    'auth.enter_email': 'Enter your email',
    'auth.verify_email': 'Verify your email before logging in. Check your inbox.',
    'auth.temp_email': 'Temporary emails are not allowed.',
    'auth.google_login': 'Continue with Google',
    'auth.google_register': 'Sign up with Google',

    'sidebar.no_chats': 'No chats yet',
    'sidebar.projects': 'Projects',
    'sidebar.settings': 'Settings',
    'sidebar.privacy': 'Privacy',
    'sidebar.upgrade': 'Upgrade to Premium',
    'sidebar.rename': 'Rename',
    'sidebar.delete': 'Delete',
    'sidebar.new_name': 'New name:',

    'chat.write_to': 'Write to',
    'chat.typing': 'typing...',
    'chat.copied': 'Copied',
    'chat.copy': 'Copy',
    'chat.you': 'You',
    'chat.error': '⚠️ Connection error. Try again.',
    'chat.new': 'New chat',
    'chat.writer': 'Writer',
    'chat.normal': 'Normal',

    'settings.title': 'Settings',
    'settings.version': 'Version',
    'settings.active_chats': 'Active chats',
    'settings.plan': 'Plan',
    'settings.language': 'Language',
    'settings.delete_all': 'Delete all chats',
    'settings.delete_confirm': 'Delete all chats? This cannot be undone.',

    'pricing.title': 'AIdark Plans',
    'pricing.subtitle': 'Unlock the full uncensored potential',
    'pricing.popular': 'POPULAR',
    'pricing.current': 'Current plan',
    'pricing.free': 'Free',
    'pricing.activate': 'Activate',
    'pricing.secure': 'Secure payment · Cancel anytime',
    'pricing.need_account': 'You need an account to subscribe. Sign up first.',
    'pricing.error': 'Error creating payment',
    'pricing.connection_error': 'Connection error. Try again.',

    'age.title': 'Age verification',
    'age.subtitle': 'This platform contains uncensored content exclusively for users over 18 years old.',
    'age.confirm': 'I confirm I am over 18 years old',
    'age.warning': 'If you are underage, please close this page.',

    'header.premium': 'Premium',
    'header.pro': 'Pro',
    'header.logout': 'Log out',
  },
};

// Detect browser language
function detectLang(): Lang {
  const saved = localStorage.getItem('aidark_lang') as Lang;
  if (saved && translations[saved]) return saved;

  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('en')) return 'en';
  return 'es';
}

let currentLang: Lang = detectLang();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  currentLang = lang;
  localStorage.setItem('aidark_lang', lang);
  window.dispatchEvent(new Event('langchange'));
}

export function t(key: string): string {
  return translations[currentLang]?.[key] || translations['es']?.[key] || key;
}

export const LANG_OPTIONS: { id: Lang; label: string; flag: string }[] = [
  { id: 'es', label: 'Español', flag: '🇪🇸' },
  { id: 'pt', label: 'Português', flag: '🇧🇷' },
  { id: 'en', label: 'English', flag: '🇺🇸' },
];
