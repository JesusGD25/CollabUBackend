/**
 * Empresas del seed "showcase". Todas son FICTICIAS (nombres, NIT y dominios
 * `.example` inventados) y de perfil completo. Cada una cubre una carrera distinta
 * para que el catálogo de proyectos sea creíble en Sistemas, Electrónica y Civil.
 *
 * Cuentas (contraseña CollabU2026!):
 *   empresa.andestech@collabu.dev   AndesTech Soluciones      (Sistemas / software)
 *   empresa.agronarino@collabu.dev  AgroNariño Innovación     (Agroindustria + IoT)
 *   empresa.cimientos@collabu.dev   Cimientos del Sur         (Ingeniería civil)
 *   empresa.volcan@collabu.dev      Volcán Energía y Automat. (Automatización / energía)
 */
export const companies = [
  {
    key: 'C1',
    email: 'empresa.andestech@collabu.dev',
    name: 'AndesTech Soluciones SAS',
    legal: 'AndesTech Soluciones S.A.S.',
    nit: '901482315-7',
    industry: 'Tecnología y Desarrollo de Software',
    size: 'medium',
    founded: 2013,
    employees: 140,
    city: 'Pasto',
    state: 'Nariño',
    website: 'https://www.andestech.example',
    createdAt: '2025-06-10 09:00:00-05',
    description:
      'AndesTech Soluciones es una empresa nariñense de desarrollo de software a la medida, con más de diez años acompañando la transformación digital de cooperativas, clínicas, comercios y entidades públicas del sur de Colombia. Nuestros equipos multidisciplinarios diseñan, construyen y operan plataformas web y móviles con prácticas ágiles, integración continua y un fuerte énfasis en la calidad.\n\n' +
      'Creemos en la formación de talento local: cada semestre incorporamos estudiantes de últimas etapas de Ingeniería de Sistemas a proyectos reales, con acompañamiento semanal de un mentor técnico, revisiones de código y participación en las ceremonias del equipo. Muchos de nuestros desarrolladores actuales empezaron como practicantes.',
    contact: { first: 'Camilo', last: 'Enríquez', position: 'Director de Talento y Cultura', email: 'talento@andestech.example' },
    contact2: { first: 'Sofía', last: 'Quintero', position: 'Líder de Ingeniería', email: 'ingenieria@andestech.example' },
    locations: [
      { name: 'Sede principal', address: 'Carrera 27 # 18-45, Centro Empresarial Galeras, Oficina 502', city: 'Pasto', state: 'Nariño', hq: true },
      { name: 'Oficina comercial Bogotá', address: 'Calle 93 # 14-20, Piso 7', city: 'Bogotá', state: 'Cundinamarca', hq: false },
    ],
    areas: [
      ['Desarrollo de Software', 'Aplicaciones web y móviles, APIs y arquitectura de microservicios.'],
      ['Inteligencia Artificial y Datos', 'Analítica avanzada, modelos predictivos y asistentes conversacionales.'],
      ['Experiencia de Usuario', 'Investigación, diseño de interfaces y sistemas de diseño.'],
    ],
  },
  {
    key: 'C2',
    email: 'empresa.agronarino@collabu.dev',
    name: 'AgroNariño Innovación SAS',
    legal: 'AgroNariño Innovación S.A.S.',
    nit: '901233874-1',
    industry: 'Agroindustria y AgroTech',
    size: 'small',
    founded: 2018,
    employees: 48,
    city: 'Pasto',
    state: 'Nariño',
    website: 'https://www.agronarino.example',
    createdAt: '2025-06-12 10:30:00-05',
    description:
      'AgroNariño Innovación desarrolla soluciones tecnológicas para el campo de altura: sensores de bajo costo, telemetría, automatización del riego y analítica de cultivos para productores de papa, lácteos y café del departamento. Trabajamos de la mano con asociaciones campesinas para que la tecnología sea asequible y realmente útil en finca.\n\n' +
      'Nuestro laboratorio de prototipado recibe practicantes de Ingeniería Electrónica y de Sistemas que participan en todo el ciclo: desde el diseño de la tarjeta y el firmware hasta el tablero web donde el productor consulta sus datos. Es un entorno donde se aprende rápido y los resultados se ven en campo.',
    contact: { first: 'Lucía', last: 'Burbano', position: 'Directora de Innovación', email: 'innovacion@agronarino.example' },
    contact2: { first: 'Hernán', last: 'Cuaical', position: 'Coordinador de Laboratorio', email: 'laboratorio@agronarino.example' },
    locations: [
      { name: 'Laboratorio y oficinas', address: 'Km 4 vía Pasto – Catambuco, Parque Agroindustrial', city: 'Pasto', state: 'Nariño', hq: true },
      { name: 'Centro de acopio Túquerres', address: 'Vereda San Rafael, Zona Rural', city: 'Túquerres', state: 'Nariño', hq: false },
    ],
    areas: [
      ['Internet de las Cosas', 'Sensores, firmware y telemetría para entornos agrícolas.'],
      ['Analítica de Datos Agrícolas', 'Modelos predictivos de rendimiento y calidad.'],
      ['Automatización y Control', 'Riego tecnificado y control de procesos de poscosecha.'],
    ],
  },
  {
    key: 'C3',
    email: 'empresa.cimientos@collabu.dev',
    name: 'Cimientos del Sur Ingeniería S.A.',
    legal: 'Cimientos del Sur Ingeniería S.A.',
    nit: '900761192-4',
    industry: 'Ingeniería Civil y Construcción',
    size: 'large',
    founded: 2004,
    employees: 320,
    city: 'Pasto',
    state: 'Nariño',
    website: 'https://www.cimientosdelsur.example',
    createdAt: '2025-06-15 08:45:00-05',
    description:
      'Cimientos del Sur Ingeniería es una firma de ingeniería civil con presencia en Nariño, Putumayo y Cauca. Diseñamos, construimos e interventoramos obras de infraestructura vial, redes de acueducto y alcantarillado, edificaciones institucionales y proyectos de vivienda, con una política activa de seguridad en obra y gestión ambiental.\n\n' +
      'Nuestro programa de practicantes integra a estudiantes de Ingeniería Civil a frentes de obra y oficinas técnicas: levantamientos topográficos, modelación BIM, diseño estructural, presupuestos y control de ejecución. Cada practicante trabaja bajo la guía de un ingeniero residente con matrícula profesional vigente.',
    contact: { first: 'Héctor', last: 'Mora', position: 'Gerente Técnico', email: 'gerencia.tecnica@cimientosdelsur.example' },
    contact2: { first: 'Adriana', last: 'Villota', position: 'Coordinadora de Talento Humano', email: 'talento@cimientosdelsur.example' },
    locations: [
      { name: 'Oficina principal', address: 'Calle 18 # 33-10, Barrio Los Rosales', city: 'Pasto', state: 'Nariño', hq: true },
      { name: 'Campamento corredor vial Pasto – Buesaco', address: 'Km 18 vía Pasto – Buesaco', city: 'Buesaco', state: 'Nariño', hq: false },
    ],
    areas: [
      ['Infraestructura Vial', 'Diseño geométrico, pavimentos y obras de arte.'],
      ['Estructuras y Edificaciones', 'Diseño estructural, modelación BIM y supervisión técnica.'],
      ['Interventoría y Control de Obra', 'Seguimiento técnico, administrativo y financiero de contratos.'],
    ],
  },
  {
    key: 'C4',
    email: 'empresa.volcan@collabu.dev',
    name: 'Volcán Energía y Automatización SAS',
    legal: 'Volcán Energía y Automatización S.A.S.',
    nit: '901095547-9',
    industry: 'Energía y Automatización Industrial',
    size: 'medium',
    founded: 2010,
    employees: 95,
    city: 'Ipiales',
    state: 'Nariño',
    website: 'https://www.volcanenergia.example',
    createdAt: '2025-06-18 11:00:00-05',
    description:
      'Volcán Energía y Automatización diseña, instala y mantiene sistemas de automatización, tableros de control y soluciones de energía renovable para la industria de alimentos, bebidas y servicios públicos del sur del país. Integramos PLC, SCADA, instrumentación y electrónica de potencia en proyectos llave en mano.\n\n' +
      'Abrimos cupos de práctica y trabajo de grado para estudiantes de Electrónica y Sistemas en proyectos de automatización, mantenimiento predictivo y monitoreo energético. Los practicantes trabajan con equipos reales en planta y reciben capacitación en normas de seguridad eléctrica antes de intervenir cualquier instalación.',
    contact: { first: 'Natalia', last: 'Chamorro', position: 'Jefe de Proyectos', email: 'proyectos@volcanenergia.example' },
    contact2: { first: 'Edwin', last: 'Santacruz', position: 'Ingeniero Líder de Automatización', email: 'automatizacion@volcanenergia.example' },
    locations: [
      { name: 'Planta y oficinas Ipiales', address: 'Zona Industrial, Carrera 4 # 20-120', city: 'Ipiales', state: 'Nariño', hq: true },
      { name: 'Oficina técnica Pasto', address: 'Avenida Panamericana # 15-30, Local 3', city: 'Pasto', state: 'Nariño', hq: false },
    ],
    areas: [
      ['Automatización Industrial', 'PLC, SCADA, instrumentación y tableros de control.'],
      ['Energías Renovables', 'Sistemas solares fotovoltaicos, inversores y almacenamiento.'],
      ['Mantenimiento Predictivo', 'Análisis de vibraciones, termografía y monitoreo de condición.'],
    ],
  },
];
