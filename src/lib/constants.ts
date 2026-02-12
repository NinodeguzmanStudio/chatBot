// ═══════════════════════════════════════
// AIdark — Constants & Configuration
// ═══════════════════════════════════════

import type { Model, PricingPlan, Project } from '@/types';

// ── Models ──
export const MODELS: Model[] = [
  { id: 'venice', name: 'AIdark sincensura', description: 'Sin filtros · Venice AI', primary: true },
  { id: 'dark-grok', name: 'DARK-GROK', description: 'Humor negro y rebeldía', primary: false },
  { id: 'void-x', name: 'VOID-X', description: 'Respuestas ultra rápidas', primary: false },
];

// ── Pricing ──
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    features: ['5 consultas profundas', '1 modelo', 'Chat básico'],
  },
  {
    id: 'premium_monthly',
    name: 'Mensual',
    price: '$15',
    period: '/mes',
    features: ['Consultas ilimitadas', 'Todos los modelos', 'Historial persistente', 'Novelas extensas', 'Prioridad'],
    highlight: true,
  },
  {
    id: 'premium_quarterly',
    name: 'Trimestral',
    price: '$40',
    period: '/3 meses',
    features: ['Todo Premium', 'Ahorra 11%', '~$13.3/mes', 'Soporte prioritario'],
  },
  {
    id: 'premium_annual',
    name: 'Anual',
    price: '$108',
    period: '/año',
    features: ['Todo Premium', 'Ahorra 40%', '~$9/mes', 'Badge fundador', 'Primeros 1000'],
  },
];

// ── Default Projects ──
export const DEFAULT_PROJECTS: Project[] = [
  { id: 'p1', name: 'Historias sin censura', icon: 'book', description: 'Novelas y relatos sin filtro', chat_count: 0 },
  { id: 'p2', name: 'Investigación detallada', icon: 'flask', description: 'Temas profundos y censurados', chat_count: 0 },
  { id: 'p3', name: 'Recetas de conjuros', icon: 'skull', description: 'Ocultismo y rituales', chat_count: 0 },
];

// ── App Config ──
export const APP_CONFIG = {
  name: 'AIdark',
  tagline: 'IA Sin Censura',
  version: '0.2.0-beta',
  freeMessageLimit: Number(import.meta.env.VITE_FREE_MESSAGE_LIMIT) || 5,
  appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:3000',
};
