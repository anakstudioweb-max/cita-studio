# Lash & Brow Studio — Sitio de citas

Web de reservas propia para un estudio de pestañas y cejas. **Sin embeds de Booksy, Cal.com u otros SaaS**: el código es 100 % tuyo y editable.

Stack: **Next.js (App Router) + TypeScript + Tailwind CSS**. Datos de marca en un solo archivo. Citas en JSON local (listo para migrar a Supabase más adelante). Pensado para desplegar en **Vercel**.

## Cómo correr en local

```bash
cd cita-studio
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Otros comandos:

```bash
npm run build   # compilar para producción
npm run start   # servir el build
```

## Qué archivo editar (nombre, precios, colores)

| Qué cambiar | Dónde |
|-------------|--------|
| Nombre del negocio, eslogan, texto “sobre nosotros”, teléfono, WhatsApp, Instagram, email | `src/data/site.ts` → `siteConfig` |
| Servicios, precios (USD), duración | `src/data/site.ts` → `services` |
| Horario semanal (días abierto / cerrado) | `src/data/site.ts` → `weeklyAvailability` |
| Colores (crema, blush, rose, etc.) | `src/app/globals.css` (variables `:root`) y referencia en `siteConfig.colors` |
| Contraseña del panel admin | `.env.local` → `ADMIN_PASSWORD` (copia desde `.env.example`) |

**Un solo archivo de contenido:** `src/data/site.ts` es la fuente de verdad de marca y servicios. Cámbialo y listo.

## Páginas

- `/` — Inicio (hero, sobre el estudio, servicios destacados)
- `/servicios` — Lista de precios completa
- `/agendar` — Flujo de reserva (servicio → fecha → hora → datos → confirmación)
- `/contacto` — WhatsApp, teléfono, Instagram
- `/admin` — Lista de citas próximas (protegida con contraseña)

## Citas (almacenamiento)

Las reservas se guardan en `data/bookings.json` mediante rutas API (`/api/bookings`, `/api/slots`). Validación con **Zod**.

Más adelante puedes sustituir `src/lib/bookings.ts` por Supabase **sin reescribir la UI**, porque el tipo `Booking` y las funciones (`getAvailableSlots`, etc.) están aisladas.

## Admin

1. Copia `.env.example` a `.env.local`
2. Define `ADMIN_PASSWORD` (por defecto local: `demo123`)
3. Entra a `/admin` e introduce la contraseña

## Dominio y Vercel (sin comprar dominio aún)

El **dominio personalizado viene después**. Mientras tanto:

1. Sube el proyecto a GitHub
2. En [vercel.com](https://vercel.com) importa el repositorio
3. Vercel te da una URL gratis tipo `https://cita-studio-xxxx.vercel.app`
4. Configura `ADMIN_PASSWORD` en *Project → Settings → Environment Variables*
5. Cuando quieras un dominio propio (ej. `lashbrowstudio.com`), lo conectas en Vercel → Domains

**Nota:** en Vercel el sistema de archivos es efímero. El JSON local sirve para desarrollo y demos; en producción conviene migrar a Supabase (u otra base) usando la misma forma de datos.

## Personalización rápida del nombre

En `src/data/site.ts`:

```ts
export const siteConfig = {
  name: "Lash & Brow Studio",  // ← cámbialo aquí una sola vez
  ...
}
```

El nombre se propaga al header, footer, títulos y textos.

## Licencia / propiedad

Código propio del negocio: puedes modificarlo, redesplegarlo y extenderlo libremente.
