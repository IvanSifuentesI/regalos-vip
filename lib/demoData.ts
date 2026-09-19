import { Modulo, ClassroomConfig } from './types';

export const DEFAULT_CONFIG: ClassroomConfig = {
  id: 1,
  nombre_classroom: "REGALOS EXCLUSIVOS",
  subtitulo: "Aprende, implementa y descarga las herramientas prácticas para acelerar tus resultados.",
  banner_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80",
  whatsapp_soporte: "+521234567890",
  whatsapp_comunidad_url: "https://chat.whatsapp.com/LpfNzr7ZWh8KXyWvlBklQl",
  whatsapp_comunidad_texto: "Comunidad VIP Gratis",
  anuncio_superior_texto: "🚀 Accede a la Comunidad VIP FREE (+2,400 miembros)",
  cta_oferta_texto: "🔥 Mentoría VIP (Skool)",
  cta_oferta_url: "https://www.skool.com/ia-automatiza-7412/about",
};

export const INITIAL_MODULOS: Modulo[] = [
  {
    id: "mod-1",
    titulo: "👉🏻 | Fábrica de Imágenes IA",
    descripcion: "Genera masivamente imágenes gratis",
    orden: 1,
    etiqueta_superior: "FÁBRICA DE IMÁGENES IA",
    color_etiqueta: "#FDE047",
    bloqueado: false, // Acceso libre inicial
    portada_url: "/uploads/modulo1_fabrica_portada.jpg",
    publicado: true,
    created_at: "2026-09-17T08:00:00Z",
    recursos: [
      {
        id: "rec-1-1",
        modulo_id: "mod-1",
        titulo: "Fábrica de Imágenes IA",
        descripcion: "Solo necesitas abrir el link de ARRIBA\n\nPuedes definir:\n\n👤 Personaje\n🎨 Estilo\n🌎 Ambiente\n📝 100 prompts\n⚡ Generación masiva",
        tipo: "enlace",
        enlace_url: "https://share.gemini.google/Yp17PI6xbuv7",
        orden: 1,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      },
      {
        id: "rec-1-2",
        modulo_id: "mod-1",
        titulo: "Prompt - Personaje",
        descripcion: "Pega este prompt junto con la imagen de referencia en CHATGPT\n\nSuperprompt:\nUsing the reference photographs as the exact source for identity, create a photorealistic character sheet in a 16:9 landscape format against a uniform light-gray background. Maintain the subject's facial features, proportions, skin tone, hair, and apparent age exactly as they are. Include full-body views—standing and facing the camera, three-quarter view, and profile—as well as close-ups and extreme close-ups showing both a neutral expression and a smile with teeth visible in a natural way. Use soft studio lighting, neutral clothing, and a clean layout free of text, frames, or decorative elements.\n\n\nComo resultado tendrás todos los ángulos de tu personaje",
        tipo: "enlace",
        archivo_url: "/uploads/leccion2_prompt_personaje.png",
        enlace_url: "/uploads/leccion2_prompt_personaje.png",
        orden: 2,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      }
    ]
  },
  {
    id: "mod-2",
    titulo: "Empieza aquí",
    descripcion: "Empieza aquí tu camino a la monetización gracias a las automatizaciones y flujos con inteligencia artificial.",
    orden: 2,
    etiqueta_superior: "EMPIEZA AQUI",
    color_etiqueta: "#FDE047",
    bloqueado: true,
    portada_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80",
    publicado: false, // Borrador (solo admin)
    created_at: "2026-09-17T08:00:00Z",
    recursos: [
      {
        id: "rec-2-1",
        modulo_id: "mod-2",
        titulo: "Configuración Inicial & Herramientas",
        descripcion: "Instalación y seteo de las herramientas clave para comenzar a automatizar tus redes sociales.",
        tipo: "video",
        video_url: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
        duracion: "08:15",
        orden: 1,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      },
      {
        id: "rec-2-2",
        modulo_id: "mod-2",
        titulo: "Mapa de Ruta hacia los primeros $1,000",
        descripcion: "La hoja de ruta paso a paso para conseguir clientes calificados y monetizar en menos de 30 días.",
        tipo: "descargable",
        archivo_url: "https://docs.google.com",
        enlace_url: "https://notion.so",
        duracion: "Plantilla",
        orden: 2,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      }
    ]
  },
  {
    id: "mod-3",
    titulo: "Monetiza tus Redes Sociales",
    descripcion: "Conoce los fundamentos, trucos y atajos en la monetización de tus redes sociales con IA.",
    orden: 3,
    etiqueta_superior: "MONETIZA TUS REDES SOCIALES",
    color_etiqueta: "#FDE047",
    bloqueado: true,
    portada_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
    publicado: false, // Borrador (solo visible para admin)
    created_at: "2026-09-17T08:00:00Z",
    recursos: [
      {
        id: "rec-3-1",
        modulo_id: "mod-3",
        titulo: "Estrategia de Viralidad en TikTok & Reels",
        descripcion: "Ganchos psicológicos y estructuras de guiones para retener a la audiencia y conseguir miles de visualizaciones.",
        tipo: "video",
        video_url: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
        duracion: "14:20",
        orden: 1,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      },
      {
        id: "rec-3-2",
        modulo_id: "mod-3",
        titulo: "Embudos Automatizados de Venta Directa",
        descripcion: "Cómo conectar tus videos virales con ManyChat o secuencias de WhatsApp para cerrar ventas en automático.",
        tipo: "descargable",
        archivo_url: "https://docs.google.com",
        duracion: "Guía PDF",
        orden: 2,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      }
    ]
  },
  {
    id: "mod-4",
    titulo: "Nichos NUEVOS Virales 🔥",
    descripcion: "Descubre NUEVOS NICHOS y tendencias virales y aprende a crear vídeos que atrapen a millones.",
    orden: 4,
    etiqueta_superior: "NICHOS ALTAMENTE VIRALES",
    color_etiqueta: "#FDE047",
    bloqueado: true,
    portada_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    publicado: false, // Borrador (solo visible para admin)
    created_at: "2026-09-17T08:00:00Z",
    recursos: [
      {
        id: "rec-4-1",
        modulo_id: "mod-4",
        titulo: "Lista de 25 Nichos Ocultos con Alta Monetización",
        descripcion: "Base de datos con los nichos menos competidos y con mayor CPM en YouTube Shorts, TikTok y Facebook Reels.",
        tipo: "descargable",
        archivo_url: "https://docs.google.com",
        enlace_url: "https://notion.so",
        duracion: "Base de Datos",
        orden: 1,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      },
      {
        id: "rec-4-2",
        modulo_id: "mod-4",
        titulo: "Cómo Investigar Tendencias con IA",
        descripcion: "Prompts exactos para analizar a la competencia y descubrir temas en tendencia antes de que se vuelvan virales.",
        tipo: "texto",
        orden: 2,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      }
    ]
  },
  {
    id: "mod-5",
    titulo: "TRUCOS Y MÉTODOS",
    descripcion: "Conoce los métodos y trucos para tener las herramientas gratuitas o muy baratas.",
    orden: 5,
    etiqueta_superior: "TRUCOS Y MÉTODOS",
    color_etiqueta: "#FDE047",
    bloqueado: true,
    portada_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
    publicado: false, // Borrador (solo visible para admin)
    created_at: "2026-09-17T08:00:00Z",
    recursos: [
      {
        id: "rec-5-1",
        modulo_id: "mod-5",
        titulo: "Cuentas y Créditos Ilimitados en Herramientas IA",
        descripcion: "Métodos legítimos para probar herramientas de IA sin pagar suscripciones costosas durante la fase de prueba.",
        tipo: "video",
        video_url: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
        duracion: "09:40",
        orden: 1,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      },
      {
        id: "rec-5-2",
        modulo_id: "mod-5",
        titulo: "Atajos de Automatización para Ahorrar Horas",
        descripcion: "Plantillas de scripts y webhooks para sincronizar tus herramientas en un solo clic.",
        tipo: "enlace",
        enlace_url: "https://github.com",
        duracion: "Código & Scripts",
        orden: 2,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      }
    ]
  },
  {
    id: "mod-6",
    titulo: "VIDEOS AUTOMÁTICOS GRATIS",
    descripcion: "Utiliza esta pagina web para entregarle tu guion y audio para que te de las imágenes de manera automática.",
    orden: 6,
    etiqueta_superior: "IVAN WHISK",
    color_etiqueta: "#FDE047",
    bloqueado: true,
    portada_url: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=600&q=80",
    publicado: false, // Borrador (solo visible para admin)
    created_at: "2026-09-17T08:00:00Z",
    recursos: [
      {
        id: "rec-6-1",
        modulo_id: "mod-6",
        titulo: "Creación de Videos Escena por Escena con Whisk",
        descripcion: "Paso a paso para conectar guion, voz en off e imágenes generadas por IA sin pagar costosas herramientas.",
        tipo: "video",
        video_url: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
        duracion: "11:55",
        orden: 1,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      },
      {
        id: "rec-6-2",
        modulo_id: "mod-6",
        titulo: "Prompting Avanzado para Animaciones",
        descripcion: "Diccionario de prompts para lograr consistencia de personajes y fondos cinemáticos en tus videos.",
        tipo: "descargable",
        archivo_url: "https://docs.google.com",
        duracion: "Plantilla Notion",
        orden: 2,
        publicado: true,
        created_at: "2026-09-17T08:00:00Z",
      }
    ]
  }
];
