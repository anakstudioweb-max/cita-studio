/**
 * ============================================================
 *  ARCHIVO ÚNICO DE CONFIGURACIÓN DEL NEGOCIO
 *  Edita aquí: nombre, contacto, servicios, horarios y colores.
 * ============================================================
 */

export const siteConfig = {
  /** Nombre del negocio (aparece en toda la web) */
  name: "Lash & Brow Studio",

  /** Eslogan corto */
  tagline: "Belleza natural en pestañas y cejas",

  /** Texto "sobre nosotros" (página de inicio) */
  about:
    "Especialistas en extensiones de pestañas y diseño de cejas. Cuidamos cada detalle para realzar tu mirada con un resultado natural, elegante y duradero. Agenda tu cita y sal con la confianza que mereces.",

  /** Contacto — reemplaza con tus datos reales */
  contact: {
    phone: "+1 (555) 123-4567",
    /** Solo dígitos con código de país, para el enlace de WhatsApp */
    whatsapp: "15551234567",
    email: "hola@lashbrowstudio.com",
    instagram: "@lashbrowstudio",
    /** URL completa de Instagram */
    instagramUrl: "https://instagram.com/lashbrowstudio",
    address: "Tu ciudad, tu dirección",
  },

  /**
   * Colores de la marca (CSS / Tailwind).
   * Cambia también las variables en src/app/globals.css.
   */
  colors: {
    blush: "#E8A0A0",
    blushDark: "#D47878",
    rose: "#C97B84",
    cream: "#FBF7F4",
    sand: "#F5EDE6",
    charcoal: "#3D3330",
    muted: "#8A7A74",
  },
} as const;

/** Categorías de servicio */
export type ServiceCategory = "pestañas" | "cejas" | "combos";

export type Service = {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  /** Precio en USD */
  price: number;
  /** Duración en minutos */
  durationMinutes: number;
  featured?: boolean;
};

/**
 * Lista de servicios — edita precios, duración o agrega nuevos.
 * El campo `id` debe ser único (se usa en el sistema de citas).
 */
export const services: Service[] = [
  {
    id: "extensiones-clasicas",
    name: "Extensiones clásicas",
    description: "Look natural y definido. Ideal para el día a día.",
    category: "pestañas",
    price: 45,
    durationMinutes: 90,
    featured: true,
  },
  {
    id: "extensiones-volumen",
    name: "Extensiones volumen",
    description: "Más densidad y dramatismo con un acabado suave.",
    category: "pestañas",
    price: 65,
    durationMinutes: 120,
    featured: true,
  },
  {
    id: "retoque-pestanas",
    name: "Retoque de pestañas",
    description: "Mantenimiento para conservar el look impecable.",
    category: "pestañas",
    price: 35,
    durationMinutes: 60,
  },
  {
    id: "laminado-cejas",
    name: "Laminado de cejas",
    description: "Cejas peinadas, elevadas y con efecto peinado.",
    category: "cejas",
    price: 40,
    durationMinutes: 45,
    featured: true,
  },
  {
    id: "diseno-depilacion-cejas",
    name: "Diseño y depilación de cejas",
    description: "Forma personalizada según tu rostro.",
    category: "cejas",
    price: 25,
    durationMinutes: 30,
  },
  {
    id: "combo-pestanas-cejas",
    name: "Combo pestañas + cejas",
    description: "Extensiones clásicas + diseño de cejas. Ahorra tiempo.",
    category: "combos",
    price: 85,
    durationMinutes: 150,
    featured: true,
  },
];

/**
 * Disponibilidad semanal.
 * day: 0 = domingo … 6 = sábado (igual que Date.getDay())
 * open/close en formato 24h "HH:MM"
 */
export type DayAvailability = {
  day: number;
  open: string;
  close: string;
};

export const weeklyAvailability: DayAvailability[] = [
  // Martes a sábado 10:00–18:00
  { day: 2, open: "10:00", close: "18:00" },
  { day: 3, open: "10:00", close: "18:00" },
  { day: 4, open: "10:00", close: "18:00" },
  { day: 5, open: "10:00", close: "18:00" },
  { day: 6, open: "10:00", close: "18:00" },
];

/** Nombres de días en español (índice = getDay()) */
export const dayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export function getServiceById(id: string): Service | undefined {
  return services.find((s) => s.id === id);
}

export function formatPrice(price: number): string {
  return `$${price}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? "1 h" : `${h} h`;
  return `${h} h ${m} min`;
}
