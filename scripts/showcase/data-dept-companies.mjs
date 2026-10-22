/**
 * Empresas de la capa "departamentos" del seed (todas FICTICIAS: nombres, NIT y dominios `.example`).
 * Completan el equilibrio entre Sistemas / Electrónica / Civil y cubren los 4 estados de verificación
 * (`verified`, `pending`, `rejected`, `suspended`). Contraseña de todas las cuentas: CollabU2026!
 *
 *   status    verified (por defecto) | pending | rejected | suspended
 *   programs  departamentos donde la empresa opera (SIS/ELE/CIV); con 2 aparece ante dos admins
 *   reason    motivo registrado por el admin cuando status es rejected o suspended
 */
const mk = (o) => ({
  status: 'verified',
  size: 'small',
  employees: 30,
  state: 'Nariño',
  createdAt: '2025-09-15 10:00:00-05',
  ...o,
  contact2: o.contact2 || { first: 'Equipo', last: 'de Talento', position: 'Gestión de Personas', email: `talento@${o.domain}` },
  website: `https://www.${o.domain}`,
  locations: o.locations || [{ name: 'Sede principal', address: o.address, city: o.city, state: 'Nariño', hq: true }],
});

export const deptCompanies = [
  // ═══════════════ Sistemas ═══════════════
  mk({
    key: 'C5', email: 'empresa.datasur@collabu.dev', domain: 'datasur.example',
    name: 'DataSur Analytics SAS', legal: 'DataSur Analytics S.A.S.', nit: '901377120-4',
    industry: 'Analítica de Datos y Business Intelligence', size: 'small', founded: 2019, employees: 36, city: 'Pasto',
    address: 'Calle 19 # 24-31, Oficina 304', status: 'suspended', programs: ['SIS'], createdAt: '2025-08-04 09:30:00-05',
    reason: 'Suspendida por incumplimiento del convenio: dos proyectos publicados sin acompañamiento técnico para el practicante.',
    description: 'DataSur Analytics construye tableros y modelos analíticos para comercios, cooperativas y entidades del sur de Colombia. Su equipo combina ingenieros de datos y analistas de negocio.\n\nHa recibido practicantes de Ingeniería de Sistemas en proyectos de integración de datos y visualización, aunque su vinculación está hoy suspendida mientras regulariza el acompañamiento a los estudiantes.',
    contact: { first: 'Mauricio', last: 'Guerrero', position: 'Gerente de Operaciones', email: 'operaciones@datasur.example' },
    areas: [['Ingeniería de Datos', 'Integración y modelado de datos.'], ['Inteligencia de Negocios', 'Tableros e indicadores para la gerencia.']],
  }),
  mk({
    key: 'C6', email: 'empresa.cloudnarino@collabu.dev', domain: 'cloudnarino.example',
    name: 'CloudNariño Soluciones SAS', legal: 'CloudNariño Soluciones S.A.S.', nit: '901518864-0',
    industry: 'Servicios en la Nube y DevOps', size: 'startup', founded: 2023, employees: 14, city: 'Pasto',
    address: 'Carrera 32 # 17-60, Local 2', status: 'pending', programs: ['SIS'], createdAt: '2026-10-08 11:00:00-05',
    description: 'CloudNariño es una empresa joven que migra pequeñas y medianas empresas a la nube y automatiza sus despliegues. Su equipo es de seis ingenieros con experiencia en contenedores y observabilidad.\n\nAcaba de registrarse en Collab-U y espera la verificación de su documentación para publicar su primer proyecto de práctica en infraestructura y DevOps.',
    contact: { first: 'Paola', last: 'Cabrera', position: 'Fundadora y CTO', email: 'paola@cloudnarino.example' },
    areas: [['DevOps', 'Automatización de despliegues y observabilidad.'], ['Migración a la Nube', 'Traslado de aplicaciones a proveedores cloud.']],
  }),
  mk({
    key: 'C7', email: 'empresa.appsrapidas@collabu.dev', domain: 'appsrapidas.example',
    name: 'Apps Rápidas SAS', legal: 'Apps Rápidas S.A.S.', nit: '900912445-3',
    industry: 'Desarrollo de Aplicaciones Móviles', size: 'startup', founded: 2022, employees: 9, city: 'Ipiales',
    address: 'Carrera 6 # 12-08', status: 'rejected', programs: ['SIS'], createdAt: '2026-09-02 15:20:00-05',
    reason: 'Rechazada: el certificado de existencia y representación legal está vencido y el NIT no coincide con el RUT adjunto.',
    description: 'Apps Rápidas desarrolla aplicaciones móviles a la medida para pequeños comercios de la frontera. Su equipo es de nueve personas y trabaja con metodologías ágiles.\n\nSu solicitud de vinculación fue rechazada por inconsistencias en la documentación legal; puede volver a presentarla con los soportes corregidos.',
    contact: { first: 'Iván', last: 'Realpe', position: 'Gerente General', email: 'gerencia@appsrapidas.example' },
    areas: [['Aplicaciones Móviles', 'Apps nativas e híbridas para comercio local.']],
  }),

  // ═══════════════ Electrónica ═══════════════
  mk({
    key: 'C8', email: 'empresa.mecatronica@collabu.dev', domain: 'mecatronicasur.example',
    name: 'MecatrónicaSur SAS', legal: 'MecatrónicaSur S.A.S.', nit: '901266903-8',
    industry: 'Automatización y Mecatrónica Industrial', size: 'medium', founded: 2015, employees: 85, city: 'Pasto',
    address: 'Zona Industrial Chapal, Bodega 7', programs: ['ELE'], createdAt: '2025-07-21 08:45:00-05',
    description: 'MecatrónicaSur diseña, construye y pone en marcha líneas de automatización para la agroindustria y la manufactura ligera del suroccidente colombiano: bandas transportadoras, dosificadoras, tableros de control y supervisión remota.\n\nSu taller de prototipado recibe practicantes de Ingeniería Electrónica que participan desde el diseño del tablero y la programación del controlador hasta las pruebas de aceptación en planta, con acompañamiento de ingenieros de campo.',
    contact: { first: 'Rodrigo', last: 'Bastidas', position: 'Director de Ingeniería', email: 'ingenieria@mecatronicasur.example' },
    locations: [
      { name: 'Planta y taller', address: 'Zona Industrial Chapal, Bodega 7', city: 'Pasto', state: 'Nariño', hq: true },
      { name: 'Oficina Cali', address: 'Avenida 6N # 25-40, Oficina 801', city: 'Cali', state: 'Valle del Cauca', hq: false },
    ],
    areas: [['Automatización Industrial', 'PLC, HMI y supervisión de procesos.'], ['Diseño de Tableros', 'Ingeniería eléctrica y fabricación de tableros de control.'], ['Mantenimiento Predictivo', 'Medición y diagnóstico de equipos rotativos.']],
  }),
  mk({
    key: 'C9', email: 'empresa.electrosur@collabu.dev', domain: 'electrosur.example',
    name: 'ElectroSur Servicios Ltda', legal: 'ElectroSur Servicios Ltda.', nit: '800655217-2',
    industry: 'Servicios Eléctricos e Instalaciones', size: 'small', founded: 2009, employees: 42, city: 'Túquerres',
    address: 'Calle 13 # 14-22', status: 'suspended', programs: ['ELE'], createdAt: '2025-08-19 10:10:00-05',
    reason: 'Suspendida temporalmente: reportes de la Facultad por retraso en la afiliación a riesgos laborales de los practicantes.',
    description: 'ElectroSur presta servicios de instalaciones eléctricas, mantenimiento de subestaciones y medición de energía para el sector comercial e industrial de la sierra nariñense.\n\nLa empresa recibió estudiantes de Electrónica en el pasado; su vinculación se encuentra suspendida hasta que acredite la afiliación a riesgos laborales de los practicantes.',
    contact: { first: 'Hugo', last: 'Chamorro', position: 'Gerente', email: 'gerencia@electrosur.example' },
    areas: [['Instalaciones Eléctricas', 'Obras de baja y media tensión.'], ['Medición de Energía', 'Calidad de potencia y eficiencia energética.']],
  }),
  mk({
    key: 'C10', email: 'empresa.domotica@collabu.dev', domain: 'domoticaandina.example',
    name: 'Domótica Andina SAS', legal: 'Domótica Andina S.A.S.', nit: '901604731-5',
    industry: 'Domótica y Edificios Inteligentes', size: 'startup', founded: 2024, employees: 11, city: 'Pasto',
    address: 'Carrera 40 # 20-15, Piso 2', status: 'pending', programs: ['ELE', 'SIS'], createdAt: '2026-10-10 09:00:00-05',
    description: 'Domótica Andina instala sistemas de automatización residencial y de edificios: control de iluminación, climatización, seguridad y monitoreo energético con tecnología inalámbrica.\n\nOpera en dos frentes —hardware embebido y plataforma web— por lo que busca practicantes de Electrónica y de Sistemas. Está pendiente de verificación para publicar su primer proyecto.',
    contact: { first: 'Natalia', last: 'Ojeda', position: 'Directora de Producto', email: 'producto@domoticaandina.example' },
    areas: [['Domótica', 'Control de iluminación, clima y seguridad.'], ['Plataforma IoT', 'Aplicaciones web y móviles para monitoreo.']],
  }),

  // ═══════════════ Civil ═══════════════
  mk({
    key: 'C11', email: 'empresa.pacifico@collabu.dev', domain: 'obrasdelpacifico.example',
    name: 'Obras del Pacífico SAS', legal: 'Obras del Pacífico S.A.S.', nit: '900788352-6',
    industry: 'Construcción de Obras Civiles y Vivienda', size: 'large', founded: 2006, employees: 260, city: 'Pasto',
    address: 'Avenida Panamericana # 3-120', programs: ['CIV'], createdAt: '2025-07-08 09:20:00-05',
    description: 'Obras del Pacífico ejecuta proyectos de vivienda, equipamiento urbano y obras de infraestructura en Nariño y el Cauca. Maneja frentes de obra con residentes, topografía propia y un laboratorio de concretos.\n\nCada semestre acoge practicantes de Ingeniería Civil en los frentes de obra, el control de calidad y la programación, con acompañamiento de residentes e interventores.',
    contact: { first: 'Adriana', last: 'Paz', position: 'Directora de Talento Humano', email: 'talento@obrasdelpacifico.example' },
    locations: [
      { name: 'Oficina principal', address: 'Avenida Panamericana # 3-120', city: 'Pasto', state: 'Nariño', hq: true },
      { name: 'Laboratorio de concretos', address: 'Km 2 vía Pasto – Tangua', city: 'Pasto', state: 'Nariño', hq: false },
    ],
    areas: [['Edificaciones y Vivienda', 'Construcción de conjuntos residenciales.'], ['Control de Calidad', 'Ensayos de concreto y suelos.'], ['Programación de Obra', 'Presupuestos, APU y cronogramas.']],
  }),
  mk({
    key: 'C12', email: 'empresa.geodata@collabu.dev', domain: 'geodataandina.example',
    name: 'GeoData Andina SAS', legal: 'GeoData Andina S.A.S.', nit: '901195478-9',
    industry: 'Geomática, Topografía y Sistemas de Información Geográfica', size: 'small', founded: 2017, employees: 33, city: 'Pasto',
    address: 'Calle 16 # 29-14, Oficina 201', programs: ['CIV', 'SIS'], createdAt: '2025-09-01 14:00:00-05',
    description: 'GeoData Andina levanta información del territorio con drones y estaciones totales y la convierte en modelos digitales, catastros y tableros geoespaciales para alcaldías, empresas de servicios públicos y proyectos viales.\n\nSu trabajo une ingeniería civil (topografía, diseño vial) con desarrollo de software (APIs geoespaciales y visores web), por eso recibe practicantes de ambos programas.',
    contact: { first: 'Sebastián', last: 'Nastar', position: 'Director Técnico', email: 'tecnica@geodataandina.example' },
    areas: [['Topografía y Fotogrametría', 'Levantamientos con dron y estación total.'], ['SIG y Desarrollo Geoespacial', 'Visores web y servicios de mapas.']],
  }),
  mk({
    key: 'C13', email: 'empresa.galeras@collabu.dev', domain: 'constructoragaleras.example',
    name: 'Constructora Galeras SAS', legal: 'Constructora Galeras S.A.S.', nit: '901443190-1',
    industry: 'Construcción y Urbanismo', size: 'medium', founded: 2012, employees: 120, city: 'Pasto',
    address: 'Carrera 25 # 12-55, Piso 3', status: 'pending', programs: ['CIV'], createdAt: '2026-10-12 08:30:00-05',
    description: 'Constructora Galeras desarrolla proyectos de vivienda de interés social y urbanismo en Pasto y municipios cercanos. Cuenta con áreas de presupuestos, programación y residencia de obra.\n\nSe registró en Collab-U para vincular practicantes de Ingeniería Civil y se encuentra en revisión documental por parte de la Facultad.',
    contact: { first: 'Fernando', last: 'Díaz', position: 'Gerente de Proyectos', email: 'proyectos@constructoragaleras.example' },
    areas: [['Vivienda de Interés Social', 'Conjuntos residenciales de mediana escala.'], ['Urbanismo', 'Vías internas y redes de servicios.']],
  }),
  mk({
    key: 'C14', email: 'empresa.estructuras@collabu.dev', domain: 'estructurasdelsur.example',
    name: 'Estructuras del Sur Ltda', legal: 'Estructuras del Sur Ltda.', nit: '800301556-7',
    industry: 'Diseño y Cálculo Estructural', size: 'small', founded: 2001, employees: 18, city: 'Pasto',
    address: 'Calle 20 # 38-07', status: 'rejected', programs: ['CIV'], createdAt: '2026-08-25 16:45:00-05',
    reason: 'Rechazada: no adjunta la matrícula profesional vigente del ingeniero responsable ni el certificado de existencia y representación legal.',
    description: 'Estructuras del Sur es una oficina de diseño y cálculo estructural para edificaciones de mediana altura, con más de veinte años de trayectoria en la región.\n\nSu solicitud fue rechazada por documentación incompleta; la empresa puede reenviarla con la matrícula profesional y el certificado de existencia actualizados.',
    contact: { first: 'Álvaro', last: 'Rosero', position: 'Ingeniero Director', email: 'direccion@estructurasdelsur.example' },
    areas: [['Diseño Estructural', 'Cálculo y planos de edificaciones.']],
  }),
];
