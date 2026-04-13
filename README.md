# AIdark — IA Sin Censura

Plataforma de chat con inteligencia artificial sin filtros ni restricciones. Contenido para adultos (+18): novelas, investigación, temas profundos y exploración creativa sin límites.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend:** Vercel Serverless Edge Functions
- **IA:** Venice AI (modelos open-source sin censura)
- **Auth/DB:** Supabase (PostgreSQL + Auth)
- **Pagos:** MercadoPago
- **Deploy:** Vercel (auto-deploy desde GitHub)

## Estructura del Proyecto

```
aidark/
├── api/                    # Vercel Serverless Functions
│   ├── chat.ts             # Proxy Venice AI (protege API key)
│   ├── create-payment.ts   # Crea preferencias MercadoPago
│   └── webhook-mercadopago.ts  # Confirma pagos
├── src/
│   ├── components/
│   │   ├── chat/           # ChatArea, MessageBubble, ModelSelector
│   │   ├── layout/         # Sidebar, Header
│   │   └── modals/         # AgeGate, Pricing, Settings, Privacy, Intro
│   ├── lib/
│   │   ├── constants.ts    # Modelos, precios, config
│   │   ├── store.ts        # Estado global (Zustand)
│   │   ├── supabase.ts     # Cliente Supabase
│   │   └── utils.ts        # Helpers
│   ├── services/
│   │   └── venice.ts       # Servicio Venice AI (normal + streaming)
│   ├── styles/globals.css  # Temas dark/light + animaciones
│   └── types/index.ts      # TypeScript definitions
├── supabase/schema.sql     # Esquema completo de base de datos
└── vercel.json             # Configuración de deploy
```

## Setup Local

```bash
git clone https://github.com/NinodeguzmanStudio/chatBot.git
cd chatBot
npm install
cp .env.example .env.local
# Llena las variables en .env.local
npm run dev
```

## Variables de Entorno

| Variable | Dónde obtenerla |
|----------|----------------|
| `VENICE_API_KEY` | venice.ai/settings/api |
| `VITE_SUPABASE_URL` | supabase.com → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | supabase.com → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase.com → Settings → API |
| `MP_ACCESS_TOKEN` | mercadopago.com/developers |
| `MERCADOPAGO_ACCESS_TOKEN` | mercadopago.com/developers |
| `VITE_ADMIN_EMAILS` | Lista de emails admin separados por coma |
| `VITE_FREE_MESSAGE_LIMIT` | Número (default: 12) |

## Modelos Disponibles

| Modelo | ID | Descripción |
|--------|-----|-------------|
| AIdark sincensura | `venice-uncensored` | Dolphin Mistral 24B · Sin filtros |
| DARK-GROK | `venice-uncensored` | Humor negro y rebeldía |
| VOID-X | `qwen3-235b` | Respuestas ultra rápidas |

## Planes de Monetización

| Plan | Precio | Límite |
|------|--------|--------|
| Free | $0 | 12 mensajes |
| Mensual | $15/mes | Ilimitado |
| Trimestral | $40/3 meses | Ilimitado |
| Anual | $108/año | Ilimitado (primeros 1000) |

## Licencia

Privado — Todos los derechos reservados © NinodeguzmanStudio 2025
