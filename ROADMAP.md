# AIdark — Roadmap to Beta & Monetización

> Versión actual: **0.2.0-alpha**
> Objetivo: **Beta pública monetizable para marzo 2025**

---

## Estado Actual ✅

| Componente | Estado |
|------------|--------|
| UI completa (Claude.ai layout) | ✅ Listo |
| Tema oscuro/claro | ✅ Listo |
| Sidebar con proyectos | ✅ Listo |
| Age Gate (+18) | ✅ Listo |
| Venice AI conectado | ✅ Listo |
| API proxy (key protegida) | ✅ Listo |
| Model selector | ✅ Listo |
| Intro animation | ✅ Listo |
| Deploy en Vercel | ✅ Listo |
| Repo privado GitHub | ✅ Listo |

---

## FASE 1 — Funcional (1-2 semanas)
> Objetivo: que el chat funcione bien y se pueda usar

### 1.1 Supabase Setup
- [ ] Crear proyecto en Supabase
- [ ] Ejecutar `supabase/schema.sql` en SQL Editor
- [ ] Copiar URL + anon key + service role key
- [ ] Agregar variables a Vercel

### 1.2 Autenticación
- [ ] Login/Register con email + password (Supabase Auth)
- [ ] Pantalla de login/registro integrada en la UI
- [ ] Auto-crear perfil al registrarse (trigger SQL ya existe)
- [ ] Sesión persistente (token refresh automático)
- [ ] Botón cerrar sesión

### 1.3 Límite de Mensajes Real
- [ ] Conectar contador de mensajes a Supabase (no solo localStorage)
- [ ] Decrementar en cada mensaje enviado
- [ ] Mostrar paywall al llegar a 5 mensajes free
- [ ] Reset mensual para usuarios free

### 1.4 Persistencia de Chats
- [ ] Guardar sesiones en Supabase (tabla `chat_sessions`)
- [ ] Guardar mensajes en Supabase (tabla `messages`)
- [ ] Cargar historial al iniciar sesión
- [ ] Sincronizar sidebar con chats reales de la DB

### 1.5 Streaming
- [ ] Activar streaming en Venice API (ya soportado en código)
- [ ] Mostrar respuesta token por token (efecto typing real)
- [ ] Indicador de progreso mientras genera

### 1.6 Markdown en Respuestas
- [ ] Integrar `react-markdown` (ya instalado)
- [ ] Renderizar bold, italic, code blocks, listas
- [ ] Syntax highlighting para código

**Entregable:** App funcional con login, chat real con streaming, historial persistente.

---

## FASE 2 — Monetización (1-2 semanas)
> Objetivo: cobrar y recibir pagos reales

### 2.1 MercadoPago
- [ ] Crear cuenta de desarrollador en MercadoPago
- [ ] Obtener access token + public key
- [ ] Agregar variables a Vercel
- [ ] Testear en modo sandbox primero

### 2.2 Flujo de Pago
- [ ] Botón "Activar" en PricingModal llama a `/api/create-payment`
- [ ] Redirige a checkout de MercadoPago
- [ ] Usuario paga y vuelve a la app
- [ ] Webhook confirma pago y actualiza plan en Supabase

### 2.3 Control de Acceso
- [ ] Verificar plan activo antes de cada mensaje
- [ ] Free: 5 mensajes, 1 modelo
- [ ] Premium: ilimitado, todos los modelos
- [ ] Mostrar badge "Premium" en la UI
- [ ] Bloquear modelos premium para usuarios free

### 2.4 Expiración de Planes
- [ ] Verificar `plan_expires_at` en cada sesión
- [ ] Downgrade automático a free cuando expire
- [ ] Notificación "Tu plan vence en X días"
- [ ] Email recordatorio (opcional, con Supabase Edge Functions)

**Entregable:** App que cobra, recibe pagos, y diferencia free vs premium.

---

## FASE 3 — Beta Pública (1 semana)
> Objetivo: lanzar y conseguir los primeros usuarios

### 3.1 Landing Page
- [ ] Página de inicio atractiva (antes del login)
- [ ] Explicar qué es AIdark en 3 puntos
- [ ] CTA "Probar gratis" y "Ver planes"
- [ ] SEO básico (meta tags, OG images)

### 3.2 Dominio
- [ ] Comprar dominio (ej: aidark.app o aidark.io)
- [ ] Configurar en Vercel (Settings → Domains)
- [ ] SSL automático

### 3.3 Pulir UX
- [ ] Loading states en todas las acciones
- [ ] Mensajes de error claros y amigables
- [ ] Empty states informativos
- [ ] Responsive final testeado en móvil real
- [ ] Favicon y meta tags completos

### 3.4 Analytics
- [ ] Google Analytics o Plausible
- [ ] Eventos: registro, primer mensaje, hit paywall, pago
- [ ] Dashboard básico de métricas

### 3.5 Legal
- [ ] Términos de servicio
- [ ] Política de privacidad completa
- [ ] Disclaimer de contenido +18
- [ ] Política de uso aceptable

**Entregable:** Beta pública lista para recibir usuarios y pagos.

---

## FASE 4 — Crecimiento (ongoing)
> Objetivo: retener usuarios y escalar

### 4.1 Features Premium
- [ ] Novelas extensas (context window grande)
- [ ] Proyectos organizados con carpetas
- [ ] Exportar chats a PDF/TXT
- [ ] Personalización de personajes IA
- [ ] Modo "escritor" con formato largo

### 4.2 Performance
- [ ] Caché de respuestas frecuentes
- [ ] Optimizar bundle size (lazy loading)
- [ ] CDN para assets estáticos
- [ ] Rate limiting por usuario

### 4.3 Comunidad
- [ ] Programa de referidos
- [ ] Badge "fundador" para primeros 1000
- [ ] Discord o Telegram de la comunidad
- [ ] Blog con casos de uso y tutoriales

### 4.4 Modelos Adicionales
- [ ] Evaluar nuevos modelos en Venice
- [ ] Modelo especializado en ficción erótica
- [ ] Modelo especializado en investigación
- [ ] Modelo de generación de imágenes (Venice Image API)

---

## Prioridad Inmediata (esta semana)

```
1. Crear proyecto Supabase → ejecutar schema.sql
2. Agregar keys a Vercel
3. Implementar login/registro
4. Conectar límite de mensajes a DB
5. Activar streaming
```

## Versiones

| Versión | Descripción | Estado |
|---------|-------------|--------|
| 0.1.0 | Prototipo inicial (Gemini, sin auth) | ❌ Descartado |
| 0.2.0 | UI v3 + Venice AI + Vercel | ✅ Actual |
| 0.3.0 | Auth + Supabase + límites reales | 🔜 Próximo |
| 0.4.0 | MercadoPago + planes premium | 📋 Planeado |
| 1.0.0 | Beta pública + dominio + landing | 📋 Planeado |
