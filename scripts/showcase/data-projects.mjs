/**
 * Proyectos del seed "showcase" (24), repartidos entre 4 empresas ficticias y las
 * tres carreras (SIS = Sistemas, ELE = Electrónica, CIV = Civil).
 *
 * Estados cubiertos: published (8), in_progress (6), completed (7),
 * needs_changes (1), pending_approval (1), cancelled (1).
 *
 * Formato de skills:       [nombreNormalizadoDelCatálogo, nivel, obligatoria]
 * Formato de entregables:  [título, descripción, pesoPorcentual, díasDesdeElInicio]
 */
export const projects = [
  // ═══════════════ AndesTech Soluciones (C1) ═══════════════
  {
    key: 'P_CITAS', co: 'C1', status: 'published', type: 'professional_practice',
    title: 'Plataforma de Gestión de Citas Médicas con Recordatorios Inteligentes',
    short: 'Aplicación web para que clínicas medianas agenden, reprogramen y recuerden citas por WhatsApp y correo.',
    desc: 'Una red de clínicas de Pasto pierde cerca del 20 % de sus citas por inasistencia y gestiona la agenda en hojas de cálculo. El proyecto consiste en construir una plataforma web donde los pacientes soliciten y reprogramen citas, y donde el personal administrativo gestione agendas por especialista, con recordatorios automáticos por correo y mensajería.\n\nEl estudiante participará en el diseño del modelo de datos, la construcción de la API con NestJS y la interfaz con React, y en la definición de pruebas automatizadas. Trabajará dentro de un equipo con ceremonias ágiles semanales y revisiones de código, y presentará una demostración funcional ante la clínica al finalizar.',
    months: 5, weekly: 30, loc: 'hybrid', locText: 'Pasto, Nariño (2 días presenciales por semana)', comp: ['stipend', 1300000], positions: 1, minSem: 7, programs: ['SIS'], featured: true, views: 214,
    created: '2026-09-14 09:00:00-05', deadlineAhead: 38,
    skills: [['react', 'advanced', true], ['nestjs', 'intermediate', true], ['postgresql', 'intermediate', true], ['rest apis', 'intermediate', true], ['docker', 'beginner', false], ['testing', 'beginner', false], ['comunicacion efectiva', 'intermediate', false]],
    deliverables: [
      ['Modelo de datos y arquitectura de la plataforma', 'Diagrama entidad-relación, decisiones de arquitectura y contratos de la API documentados.', 30, 35],
      ['Módulo de agendamiento y recordatorios (API + web)', 'Funcionalidad completa de solicitud, reprogramación y recordatorios automáticos desplegada en un ambiente de pruebas.', 50, 90],
      ['Pruebas automatizadas y documentación técnica', 'Suite de pruebas unitarias y de integración, manual de despliegue y guía de usuario.', 20, 130],
    ],
  },
  {
    key: 'P_ASISTENTE', co: 'C1', status: 'published', type: 'professional_practice',
    title: 'Asistente Virtual con IA Generativa para Atención al Cliente',
    short: 'Chatbot que responde preguntas frecuentes de clientes a partir de la base de conocimiento de la empresa.',
    desc: 'Un cliente del sector financiero recibe más de 2.000 consultas mensuales sobre productos, requisitos y estados de solicitud, la mayoría repetitivas. Se busca diseñar un asistente conversacional que responda con información verificada de su base de conocimiento y escale a un agente humano cuando no tenga certeza.\n\nEl alcance incluye la indexación de documentos, la recuperación de contexto relevante, la integración con un modelo de lenguaje a través de una API, el diseño de las políticas de escalamiento y la medición de calidad con un conjunto de preguntas de prueba. Se valora experiencia previa en Python y curiosidad por la evaluación rigurosa de modelos.',
    months: 5, weekly: 30, loc: 'remote', locText: 'Trabajo remoto con reuniones semanales de seguimiento', comp: ['stipend', 1400000], positions: 1, minSem: 8, programs: ['SIS'], featured: true, views: 187,
    created: '2026-09-08 10:30:00-05', deadlineAhead: 52,
    skills: [['python', 'advanced', true], ['machine learning', 'intermediate', true], ['rest apis', 'intermediate', true], ['sql', 'intermediate', true], ['docker', 'beginner', false], ['comunicacion efectiva', 'intermediate', false]],
    deliverables: [
      ['Análisis de la base de conocimiento y diseño de la solución', 'Inventario de fuentes, estrategia de indexación y diseño del flujo conversacional.', 25, 30],
      ['Prototipo funcional del asistente', 'Asistente operativo con recuperación de contexto y escalamiento a agente humano.', 50, 90],
      ['Evaluación de calidad y transferencia', 'Informe con métricas sobre un conjunto de pruebas y documentación para el equipo de soporte.', 25, 130],
    ],
  },
  {
    key: 'P_MIG', co: 'C1', status: 'in_progress', type: 'professional_practice',
    title: 'Migración de Monolito a Microservicios para Plataforma de Recaudo',
    short: 'Descomposición gradual de una plataforma de recaudo en servicios independientes con integración continua.',
    desc: 'La plataforma de recaudo de una cooperativa creció como un monolito difícil de desplegar y de escalar en temporadas pico. El proyecto aborda la identificación de dominios, la extracción gradual de los módulos de pagos y notificaciones como servicios independientes y la automatización de su despliegue.\n\nEl estudiante diseñará los contratos entre servicios, implementará los primeros microservicios con NestJS y PostgreSQL, contenerizará con Docker y configurará un flujo de integración continua. Se prioriza la migración sin interrumpir el servicio, con pruebas de regresión en cada paso.',
    months: 5, weekly: 30, loc: 'hybrid', locText: 'Pasto, Nariño (modalidad híbrida)', comp: ['stipend', 1500000], positions: 1, minSem: 8, programs: ['SIS'], featured: false, views: 142,
    created: '2026-06-22 09:15:00-05', start: '2026-08-17', weeks: 20,
    skills: [['nestjs', 'advanced', true], ['microservicios', 'intermediate', true], ['docker', 'intermediate', true], ['postgresql', 'intermediate', true], ['ci/cd', 'beginner', false], ['redis', 'beginner', false]],
    deliverables: [
      ['Mapa de dominios y estrategia de migración', 'Identificación de bounded contexts y plan de extracción por fases.', 20, 28],
      ['Microservicio de pagos desplegado en contenedor', 'Servicio independiente con su base de datos, pruebas y despliegue automatizado.', 40, 84],
      ['Microservicio de notificaciones y pipeline CI/CD', 'Segundo servicio extraído y pipeline de integración continua documentado.', 40, 130],
    ],
  },
  {
    key: 'P_UX', co: 'C1', status: 'completed', type: 'professional_practice',
    title: 'Rediseño de la Experiencia de Usuario del Portal de Clientes',
    short: 'Rediseño completo del portal de clientes con investigación, prototipos de alta fidelidad y sistema de diseño.',
    desc: 'El portal de clientes de una aseguradora regional tenía una tasa de abandono alta en el flujo de consulta de pólizas y solicitud de servicios. El proyecto abordó la investigación con usuarios reales, el rediseño de las pantallas críticas y la construcción de una guía de componentes reutilizable para el equipo de desarrollo.\n\nSe realizaron entrevistas y pruebas de usabilidad con clientes, se entregaron prototipos de alta fidelidad en Figma y se acompañó la implementación inicial de los componentes en React, midiendo antes y después la facilidad de uso de los flujos intervenidos.',
    months: 4, weekly: 30, loc: 'hybrid', locText: 'Pasto, Nariño', comp: ['stipend', 1300000], positions: 1, minSem: 8, programs: ['SIS'], featured: false, views: 168,
    created: '2025-06-24 09:00:00-05', start: '2025-08-25', weeks: 16,
    skills: [['figma', 'advanced', true], ['react', 'intermediate', true], ['typescript', 'intermediate', false], ['comunicacion efectiva', 'advanced', true], ['pensamiento critico', 'intermediate', false]],
    deliverables: [
      ['Informe de investigación con usuarios', 'Resultados de entrevistas y pruebas de usabilidad con hallazgos priorizados.', 25, 28],
      ['Prototipos de alta fidelidad de flujos críticos', 'Pantallas de consulta de pólizas y solicitud de servicios, validadas con usuarios.', 45, 70],
      ['Sistema de diseño y componentes en React', 'Guía de estilos y librería inicial de componentes reutilizables.', 30, 105],
    ],
  },
  {
    key: 'P_VENTAS', co: 'C1', status: 'completed', type: 'professional_practice',
    title: 'Panel de Analítica de Ventas en Tiempo Real',
    short: 'Tablero interactivo que consolida las ventas de 12 puntos y alerta caídas atípicas.',
    desc: 'La gerencia comercial de una distribuidora consolidaba las ventas manualmente cada semana, con información que llegaba tarde para tomar decisiones. El proyecto construyó un panel que integra las ventas de 12 puntos de venta, muestra indicadores clave casi en tiempo real y genera alertas ante caídas atípicas.\n\nSe modeló una base de datos analítica en PostgreSQL, se desarrolló la interfaz en Angular con gráficos interactivos y se automatizó la carga de datos, dejando documentados los indicadores y sus definiciones para el equipo comercial.',
    months: 3, weekly: 30, loc: 'remote', locText: 'Trabajo remoto', comp: ['stipend', 1300000], positions: 1, minSem: 8, programs: ['SIS'], featured: false, views: 131,
    created: '2026-05-20 11:00:00-05', start: '2026-07-13', weeks: 12,
    skills: [['angular', 'advanced', true], ['typescript', 'intermediate', true], ['sql', 'advanced', true], ['postgresql', 'intermediate', true], ['analisis de datos', 'advanced', true], ['git', 'intermediate', false]],
    deliverables: [
      ['Modelo analítico y carga automática de datos', 'Esquema de datos y proceso de carga programado desde los puntos de venta.', 30, 21],
      ['Panel interactivo de indicadores', 'Interfaz en Angular con filtros, comparativos y exportación.', 50, 56],
      ['Alertas de caídas atípicas y manual', 'Reglas de alerta y documentación de indicadores para el equipo comercial.', 20, 80],
    ],
  },
  {
    key: 'P_FIDEL', co: 'C1', status: 'needs_changes', type: 'internship',
    title: 'Aplicación Móvil de Fidelización de Clientes para Comercios Locales',
    short: 'App móvil de puntos y recompensas para comercios de barrio.',
    desc: 'Desarrollo de una aplicación móvil que permita a pequeños comercios ofrecer un programa de puntos y recompensas a sus clientes frecuentes.',
    months: 5, weekly: 30, loc: 'remote', locText: 'Trabajo remoto', comp: ['stipend', 1200000], positions: 1, minSem: 7, programs: ['SIS'], featured: false, views: 12,
    created: '2026-09-28 15:40:00-05', submitted: '2026-09-29 08:30:00-05', reviewed: '2026-10-02 16:20:00-05',
    facultyNotes: 'La descripción no detalla el stack tecnológico ni las funcionalidades esperadas, y faltan los entregables con fechas. Por favor especifica las tecnologías requeridas (por ejemplo, el framework móvil) y agrega al menos tres entregables medibles antes de reenviar el proyecto a revisión.',
    rejCats: ['descripcion_incompleta', 'faltan_entregables'],
    skills: [['flutter', 'intermediate', true], ['rest apis', 'intermediate', true]],
    deliverables: [],
  },

  // ═══════════════ AgroNariño Innovación (C2) ═══════════════
  {
    key: 'P_PAPA', co: 'C2', status: 'published', type: 'professional_practice',
    title: 'Red de Sensores IoT para Monitoreo de Cultivos de Papa en Altura',
    short: 'Nodos de bajo costo que miden humedad, temperatura y radiación y envían alertas de helada al productor.',
    desc: 'Los productores de papa de zonas altas de Nariño enfrentan heladas y excesos de humedad que arruinan lotes completos. El proyecto diseña e instala una red de nodos de bajo costo que miden humedad del suelo, temperatura y radiación, y envían los datos por comunicación inalámbrica de largo alcance a una plataforma que genera alertas tempranas.\n\nEl estudiante participará en el diseño del nodo y el firmware con ESP32, en la configuración de la red inalámbrica y en las pruebas en parcelas demostrativas en Túquerres, con apoyo del equipo de laboratorio y de técnicos de campo.',
    months: 5, weekly: 40, loc: 'onsite', locText: 'Pasto y parcelas demostrativas en Túquerres', comp: ['stipend', 1500000], positions: 1, minSem: 7, programs: ['ELE', 'SIS'], featured: true, views: 203,
    created: '2026-09-10 08:50:00-05', deadlineAhead: 45,
    skills: [['iot', 'intermediate', true], ['esp32', 'intermediate', true], ['arduino', 'intermediate', true], ['sistemas embebidos', 'intermediate', true], ['comunicaciones inalambricas', 'intermediate', false], ['python', 'beginner', false]],
    deliverables: [
      ['Diseño del nodo sensor y selección de componentes', 'Esquemáticos, lista de materiales y plan de pruebas del nodo.', 25, 30],
      ['Prototipos funcionales instalados en parcelas', 'Mínimo 6 nodos operando con transmisión de datos y autonomía documentada.', 50, 90],
      ['Informe de resultados y manual de instalación', 'Análisis de datos de campo, lecciones aprendidas y guía para replicar la red.', 25, 135],
    ],
  },
  {
    key: 'P_RIEGO', co: 'C2', status: 'published', type: 'internship',
    title: 'Automatización de Riego por Goteo con Control Difuso',
    short: 'Controlador que ajusta el riego según humedad y clima para ahorrar agua en cultivos de hortalizas.',
    desc: 'Un grupo de productores de hortalizas riega por calendario fijo, desperdiciando agua en días lluviosos y quedándose corto en días secos. Se propone un controlador que ajuste el tiempo de riego según la humedad del suelo y el pronóstico, usando lógica difusa sobre un microcontrolador.\n\nEl estudiante modelará el proceso, diseñará e implementará el controlador, y validará el ahorro de agua frente al riego tradicional en una parcela piloto durante varias semanas, documentando la metodología y los resultados.',
    months: 4, weekly: 30, loc: 'hybrid', locText: 'Pasto (laboratorio) y visitas a parcela piloto', comp: ['stipend', 1300000], positions: 1, minSem: 7, programs: ['ELE'], featured: false, views: 96,
    created: '2026-09-18 14:10:00-05', deadlineAhead: 33,
    skills: [['control automatico', 'intermediate', true], ['automatizacion industrial', 'beginner', false], ['arduino', 'intermediate', true], ['iot', 'beginner', false], ['matlab/simulink', 'intermediate', true]],
    deliverables: [
      ['Modelo del proceso y diseño del controlador difuso', 'Modelo simulado y reglas del controlador validadas en simulación.', 35, 28],
      ['Prototipo de riego automatizado en parcela piloto', 'Controlador instalado y operando con registro de consumo de agua.', 45, 75],
      ['Informe comparativo de ahorro de agua', 'Resultados frente al riego tradicional y recomendaciones de escalamiento.', 20, 105],
    ],
  },
  {
    key: 'P_TRAZA', co: 'C2', status: 'in_progress', type: 'professional_practice',
    title: 'Sistema de Trazabilidad de Cadena de Frío para Lácteos',
    short: 'Plataforma que registra la temperatura de la leche desde el acopio hasta la planta y alerta rupturas de frío.',
    desc: 'La calidad de los lácteos depende de mantener la cadena de frío desde el acopio hasta la planta, pero hoy el control se hace con registros manuales. El proyecto implementa sensores de temperatura en los tanques y vehículos, una API que recibe y almacena las lecturas y un tablero web con alertas de ruptura de la cadena.\n\nEl estudiante desarrollará el backend con Node.js y PostgreSQL, el tablero con React y la integración con los dispositivos IoT, trabajando junto al equipo de laboratorio que construye los sensores.',
    months: 5, weekly: 30, loc: 'hybrid', locText: 'Pasto, Nariño', comp: ['stipend', 1500000], positions: 1, minSem: 8, programs: ['SIS'], featured: false, views: 118,
    created: '2026-06-25 10:00:00-05', start: '2026-08-24', weeks: 20,
    skills: [['node', 'advanced', true], ['react', 'intermediate', true], ['postgresql', 'intermediate', true], ['iot', 'intermediate', true], ['rest apis', 'intermediate', true], ['docker', 'beginner', false]],
    deliverables: [
      ['API de recepción de lecturas y modelo de datos', 'Servicio que recibe, valida y almacena lecturas de los sensores.', 30, 35],
      ['Tablero web con alertas de ruptura de frío', 'Interfaz con mapa de tanques, gráficos históricos y notificaciones.', 45, 91],
      ['Informe de pruebas en planta y manual de operación', 'Validación con datos reales y guía para el personal de acopio.', 25, 130],
    ],
  },
  {
    key: 'P_ESTACION', co: 'C2', status: 'completed', type: 'professional_practice',
    title: 'Estación Meteorológica Autónoma con Telemetría Solar',
    short: 'Estación alimentada por energía solar que transmite datos climáticos de zonas sin cobertura eléctrica.',
    desc: 'La falta de datos climáticos locales limita la planeación agrícola en veredas sin red eléctrica. El proyecto diseñó y construyó una estación meteorológica autónoma, alimentada por un panel solar, que mide temperatura, humedad, presión y precipitación y transmite los datos por radio de largo alcance.\n\nSe diseñó la tarjeta electrónica, se desarrolló el firmware de bajo consumo y se instaló un prototipo en finca durante un mes, comparando sus mediciones con una estación comercial de referencia.',
    months: 4, weekly: 40, loc: 'onsite', locText: 'Pasto y vereda de instalación', comp: ['stipend', 1500000], positions: 1, minSem: 8, programs: ['ELE'], featured: false, views: 104,
    created: '2025-06-26 09:30:00-05', start: '2025-09-01', weeks: 15,
    skills: [['esp32', 'advanced', true], ['sistemas embebidos', 'advanced', true], ['comunicaciones inalambricas', 'intermediate', true], ['electronica de potencia', 'intermediate', false], ['diseno de pcbs', 'intermediate', false], ['kicad', 'intermediate', false]],
    deliverables: [
      ['Diseño electrónico y PCB de la estación', 'Esquemáticos, diseño de placa y presupuesto energético.', 30, 28],
      ['Firmware de bajo consumo y telemetría', 'Firmware con adquisición, modo de reposo y transmisión por radio.', 40, 63],
      ['Informe de validación frente a estación de referencia', 'Comparación de mediciones durante 30 días y análisis de error.', 30, 98],
    ],
  },
  {
    key: 'P_COSECHA', co: 'C2', status: 'completed', type: 'professional_practice',
    title: 'Modelo Predictivo de Rendimiento de Cosecha',
    short: 'Modelo de aprendizaje automático que estima el rendimiento de lotes de papa a partir de clima y manejo.',
    desc: 'Estimar el rendimiento de un lote antes de la cosecha permite negociar mejor y planear la logística. El proyecto desarrolló un modelo de aprendizaje automático que predice el rendimiento por lote a partir de datos climáticos, de suelo y de prácticas de manejo recopilados durante tres ciclos productivos.\n\nSe depuraron y analizaron los datos, se compararon varios algoritmos con validación cruzada y se entregó un cuaderno reproducible y un resumen para técnicos no especializados con la interpretación de las variables más influyentes.',
    months: 4, weekly: 30, loc: 'remote', locText: 'Trabajo remoto', comp: ['stipend', 1400000], positions: 1, minSem: 8, programs: ['SIS'], featured: false, views: 99,
    created: '2025-11-20 10:20:00-05', start: '2026-02-02', weeks: 19,
    skills: [['python', 'advanced', true], ['machine learning', 'intermediate', true], ['analisis de datos', 'advanced', true], ['sql', 'intermediate', false]],
    deliverables: [
      ['Análisis exploratorio y depuración de datos', 'Informe de calidad de datos, tratamiento de valores atípicos y variables derivadas.', 30, 35],
      ['Modelos comparados con validación cruzada', 'Evaluación de al menos tres algoritmos con métricas y análisis de errores.', 45, 91],
      ['Cuaderno reproducible y resumen para técnicos', 'Código documentado y síntesis de las variables más influyentes.', 25, 125],
    ],
  },
  {
    key: 'P_DASH_LECHE', co: 'C2', status: 'pending_approval', type: 'internship',
    title: 'Dashboard de Indicadores de Producción Lechera',
    short: 'Tablero para que cooperativas lecheras sigan volumen, calidad y precios por proveedor.',
    desc: 'Las cooperativas lecheras de la región registran volumen, calidad y precio por proveedor en hojas separadas, lo que dificulta el seguimiento y la liquidación. Se propone un tablero web que integre esas fuentes y muestre indicadores por proveedor, ruta y periodo, con exportación para la liquidación quincenal.\n\nEl estudiante diseñará el modelo de datos, construirá la interfaz y definirá con el equipo comercial los indicadores y sus reglas de cálculo.',
    months: 4, weekly: 30, loc: 'remote', locText: 'Trabajo remoto', comp: ['stipend', 1200000], positions: 1, minSem: 7, programs: ['SIS'], featured: false, views: 8,
    created: '2026-10-05 09:40:00-05', submitted: '2026-10-06 11:15:00-05',
    skills: [['angular', 'intermediate', true], ['postgresql', 'intermediate', true], ['sql', 'intermediate', true], ['analisis de datos', 'intermediate', false]],
    deliverables: [
      ['Modelo de datos e integración de fuentes', 'Esquema unificado y carga de las hojas existentes.', 35, 28],
      ['Tablero con indicadores por proveedor y ruta', 'Interfaz con filtros por periodo y exportación quincenal.', 45, 70],
      ['Manual de usuario y capacitación', 'Documentación y sesión de capacitación al personal.', 20, 100],
    ],
  },

  // ═══════════════ Cimientos del Sur Ingeniería (C3) ═══════════════
  {
    key: 'P_BIM', co: 'C3', status: 'published', type: 'professional_practice',
    title: 'Modelado BIM de Edificio Institucional de Seis Pisos',
    short: 'Modelo BIM coordinado (arquitectura, estructura e instalaciones) para detectar interferencias antes de construir.',
    desc: 'La firma ejecutará un edificio institucional de seis pisos y quiere detectar interferencias entre arquitectura, estructura e instalaciones antes de iniciar obra. El proyecto consiste en construir el modelo BIM del edificio a partir de planos 2D existentes, coordinar las disciplinas y generar planos, cantidades de obra y reportes de interferencias.\n\nEl estudiante trabajará con el equipo de diseño en Revit y AutoCAD, participará en reuniones de coordinación y entregará un modelo documentado con los hallazgos de interferencias priorizados para su resolución antes de la construcción.',
    months: 5, weekly: 40, loc: 'onsite', locText: 'Oficina principal, Pasto', comp: ['paid', 1800000], positions: 1, minSem: 7, programs: ['CIV'], featured: true, views: 176,
    created: '2026-09-12 08:30:00-05', deadlineAhead: 41,
    skills: [['revit', 'advanced', true], ['autocad', 'advanced', true], ['diseno estructural', 'intermediate', true], ['gestion de obras', 'beginner', false], ['comunicacion efectiva', 'intermediate', false]],
    deliverables: [
      ['Modelo BIM de arquitectura y estructura', 'Modelo base con niveles de detalle acordados y familias personalizadas.', 35, 42],
      ['Coordinación de disciplinas y reporte de interferencias', 'Modelo coordinado con instalaciones y reporte priorizado de conflictos.', 40, 98],
      ['Planos, cantidades de obra y guía de uso del modelo', 'Planos generados desde el modelo, cuantificación y documentación del flujo de trabajo.', 25, 135],
    ],
  },
  {
    key: 'P_GEOTEC', co: 'C3', status: 'published', type: 'professional_practice',
    title: 'Estudio Geotécnico y Estabilidad de Taludes en el Corredor Pasto–Buesaco',
    short: 'Caracterización geotécnica y análisis de estabilidad de taludes críticos en un corredor vial de montaña.',
    desc: 'El corredor vial Pasto–Buesaco presenta taludes que se inestabilizan en temporada de lluvias. El proyecto realiza la caracterización geotécnica de cinco sitios críticos mediante exploración, ensayos de laboratorio y levantamientos topográficos, y analiza su estabilidad para proponer medidas de mitigación.\n\nEl estudiante participará en trabajo de campo, en la interpretación de ensayos, en el análisis de estabilidad y en la elaboración del informe técnico, apoyándose en sistemas de información geográfica para zonificar la amenaza por movimientos en masa.',
    months: 5, weekly: 40, loc: 'hybrid', locText: 'Oficina Pasto y frente de obra Buesaco', comp: ['paid', 1800000], positions: 1, minSem: 8, programs: ['CIV'], featured: false, views: 121,
    created: '2026-09-20 09:00:00-05', deadlineAhead: 57,
    skills: [['geotecnia', 'intermediate', true], ['topografia', 'intermediate', true], ['arcgis', 'intermediate', true], ['autocad', 'intermediate', false], ['redaccion tecnica', 'advanced', true], ['hidrologia', 'beginner', false]],
    deliverables: [
      ['Plan de exploración y levantamiento topográfico', 'Programa de exploración, ensayos y topografía de los cinco sitios.', 30, 35],
      ['Análisis de estabilidad y zonificación de amenaza', 'Modelos de estabilidad por sitio y mapa de amenaza por movimientos en masa.', 45, 98],
      ['Informe técnico con medidas de mitigación', 'Documento final con recomendaciones priorizadas y presupuesto indicativo.', 25, 135],
    ],
  },
  {
    key: 'P_VIA', co: 'C3', status: 'in_progress', type: 'professional_practice',
    title: 'Diseño Geométrico y Presupuesto de Vía Terciaria en Zona Rural',
    short: 'Diseño de 6 km de vía terciaria que conecta tres veredas, con presupuesto y cronograma de obra.',
    desc: 'Tres veredas del municipio de Buesaco dependen de un camino que se vuelve intransitable en invierno. El proyecto contempla el levantamiento topográfico, el diseño geométrico de 6 km de vía terciaria, el diseño de obras de drenaje y el presupuesto detallado con análisis de precios unitarios.\n\nEl estudiante trabajará con la cuadrilla de topografía, modelará el corredor en Civil 3D y elaborará el presupuesto y el cronograma que la comunidad y la alcaldía utilizarán para gestionar la financiación de la obra.',
    months: 5, weekly: 40, loc: 'hybrid', locText: 'Pasto y trabajo de campo en Buesaco', comp: ['paid', 1800000], positions: 1, minSem: 8, programs: ['CIV'], featured: false, views: 109,
    created: '2026-07-10 10:00:00-05', start: '2026-09-07', weeks: 18,
    skills: [['civil 3d', 'intermediate', true], ['topografia', 'advanced', true], ['vias y pavimentos', 'intermediate', true], ['presupuestos y apus', 'intermediate', true], ['autocad', 'intermediate', false]],
    deliverables: [
      ['Levantamiento topográfico y modelo del terreno', 'Planos y modelo digital del terreno del corredor de 6 km.', 30, 28],
      ['Diseño geométrico y obras de drenaje', 'Planta, perfil y secciones transversales con obras de arte.', 40, 77],
      ['Presupuesto, APU y cronograma de obra', 'Presupuesto detallado con análisis de precios unitarios y cronograma.', 30, 119],
    ],
  },
  {
    key: 'P_INTERV', co: 'C3', status: 'completed', type: 'professional_practice',
    title: 'Interventoría de Obra de Alcantarillado Pluvial',
    short: 'Seguimiento técnico y administrativo de una obra de alcantarillado pluvial de 1,8 km.',
    desc: 'Se realizó el apoyo a la interventoría de una obra de alcantarillado pluvial de 1,8 km en el sector sur de Pasto, verificando que la ejecución cumpliera especificaciones técnicas, cronograma y presupuesto. El trabajo incluyó la revisión de materiales, el control de calidad en campo y la elaboración de informes mensuales de avance.\n\nSe participó en comités de obra, se actualizó el cronograma con seguimiento de rendimientos y se documentaron no conformidades con su respectivo plan de corrección, entregando un informe final con lecciones aprendidas para futuras interventorías.',
    months: 4, weekly: 40, loc: 'onsite', locText: 'Frente de obra, Pasto', comp: ['paid', 1800000], positions: 1, minSem: 8, programs: ['CIV'], featured: false, views: 88,
    created: '2025-11-24 09:30:00-05', start: '2026-02-09', weeks: 18,
    skills: [['interventoria', 'intermediate', true], ['gestion de obras', 'intermediate', true], ['hidraulica', 'intermediate', true], ['hidrologia', 'beginner', false], ['ms project', 'intermediate', false], ['redaccion tecnica', 'intermediate', true]],
    deliverables: [
      ['Plan de interventoría y formatos de control', 'Plan de seguimiento, formatos de inspección y matriz de riesgos.', 25, 28],
      ['Informes mensuales de avance técnico y financiero', 'Tres informes con control de cantidades, calidad y cronograma.', 50, 98],
      ['Informe final y lecciones aprendidas', 'Balance de la ejecución, no conformidades y recomendaciones.', 25, 119],
    ],
  },
  {
    key: 'P_PUENTE', co: 'C3', status: 'completed', type: 'thesis',
    title: 'Análisis y Diseño Estructural de Puente Peatonal en Concreto Reforzado',
    short: 'Diseño estructural de un puente peatonal de 24 m de luz conforme a la NSR-10.',
    desc: 'Como trabajo de grado se analizó y diseñó un puente peatonal de concreto reforzado de 24 m de luz para un cruce de quebrada, aplicando la normativa sismorresistente colombiana. Se evaluaron cargas, se modeló la estructura en software especializado y se verificaron los resultados con cálculos manuales.\n\nSe entregaron memorias de cálculo, planos estructurales y un presupuesto de obra, y se presentó la propuesta a la entidad municipal interesada en ejecutar la obra.',
    months: 4, weekly: 40, loc: 'hybrid', locText: 'Oficina Pasto', comp: ['academic_credit', null], positions: 1, minSem: 9, programs: ['CIV'], featured: false, views: 94,
    created: '2025-11-28 10:45:00-05', start: '2026-02-16', weeks: 17,
    skills: [['etabs', 'advanced', true], ['sap2000', 'advanced', true], ['concreto reforzado', 'advanced', true], ['diseno estructural', 'advanced', true], ['autocad', 'intermediate', false]],
    deliverables: [
      ['Predimensionamiento y evaluación de cargas', 'Memoria de cargas y alternativas de predimensionamiento.', 25, 28],
      ['Modelo estructural y verificación de resultados', 'Modelo en software y verificación con cálculos manuales.', 45, 77],
      ['Planos estructurales, memorias y presupuesto', 'Paquete completo de diseño listo para licitación.', 30, 112],
    ],
  },
  {
    key: 'P_LEED', co: 'C3', status: 'cancelled', type: 'other',
    title: 'Estrategia de Sostenibilidad y Certificación LEED para Proyecto Residencial',
    short: 'Diagnóstico de sostenibilidad y ruta de certificación LEED para un conjunto residencial.',
    desc: 'Estudio de viabilidad para aplicar a la certificación LEED en un conjunto residencial, con diagnóstico de créditos alcanzables, análisis de costo-beneficio y plan de implementación. El proyecto fue cancelado por la empresa al reprogramarse el inicio de la obra residencial para el próximo año.',
    months: 4, weekly: 30, loc: 'hybrid', locText: 'Pasto', comp: ['stipend', 1300000], positions: 1, minSem: 8, programs: ['CIV'], featured: false, views: 41,
    created: '2026-04-14 11:20:00-05', submitted: '2026-04-15 09:00:00-05', reviewed: '2026-04-20 15:30:00-05',
    skills: [['sostenibilidad y leed', 'intermediate', true], ['gestion de obras', 'beginner', false]],
    deliverables: [],
  },

  // ═══════════════ Volcán Energía y Automatización (C4) ═══════════════
  {
    key: 'P_SCADA', co: 'C4', status: 'published', type: 'professional_practice',
    title: 'Supervisión SCADA para Subestación Eléctrica de Media Tensión',
    short: 'Sistema SCADA que supervisa tensiones, corrientes y estados de una subestación de media tensión.',
    desc: 'Una subestación de media tensión que alimenta a un parque industrial se supervisa hoy con rondas manuales. El proyecto implementa un sistema SCADA que adquiere variables eléctricas, estados de interruptores y alarmas de protecciones, con pantallas de operación, histórico de eventos y reportes.\n\nEl estudiante configurará la adquisición de datos con PLC y medidores, diseñará las pantallas de operación bajo criterios de seguridad y ergonomía, y participará en las pruebas de aceptación en sitio junto al ingeniero líder de automatización.',
    months: 5, weekly: 40, loc: 'onsite', locText: 'Planta Ipiales (alojamiento de apoyo para practicantes de Pasto)', comp: ['paid', 1800000], positions: 1, minSem: 8, programs: ['ELE'], featured: true, views: 158,
    created: '2026-09-16 09:10:00-05', deadlineAhead: 29,
    skills: [['plc', 'intermediate', true], ['automatizacion industrial', 'intermediate', true], ['labview', 'intermediate', false], ['control automatico', 'intermediate', true], ['comunicaciones inalambricas', 'beginner', false]],
    deliverables: [
      ['Ingeniería básica y lista de señales', 'Arquitectura del sistema, lista de señales y selección de equipos.', 30, 35],
      ['Programación de PLC y pantallas de operación', 'Lógica de adquisición y pantallas SCADA con alarmas y tendencias.', 45, 98],
      ['Pruebas de aceptación y documentación', 'Protocolo de pruebas en sitio, manual de operación y planos as-built.', 25, 135],
    ],
  },
  {
    key: 'P_ENERGIA_WEB', co: 'C4', status: 'published', type: 'professional_practice',
    title: 'Plataforma Web de Monitoreo de Consumo Energético Industrial',
    short: 'Aplicación web que muestra el consumo eléctrico por línea de producción y detecta picos anómalos.',
    desc: 'Los clientes industriales de la empresa quieren ver cuánta energía consume cada línea de producción y recibir alertas ante picos inusuales. El proyecto desarrolla una plataforma web que recibe las lecturas de medidores inteligentes, las almacena y las presenta en tableros con comparativos por turno, línea y periodo.\n\nEl estudiante construirá la API y la interfaz, definirá las reglas de detección de anomalías con el equipo de energía y documentará la integración con los medidores para facilitar nuevos despliegues.',
    months: 5, weekly: 30, loc: 'remote', locText: 'Trabajo remoto con visitas ocasionales a planta', comp: ['stipend', 1400000], positions: 1, minSem: 7, programs: ['SIS'], featured: false, views: 112,
    created: '2026-09-22 10:40:00-05', deadlineAhead: 47,
    skills: [['react', 'intermediate', true], ['nestjs', 'intermediate', true], ['postgresql', 'intermediate', true], ['iot', 'beginner', false], ['rest apis', 'intermediate', true], ['graphql', 'beginner', false]],
    deliverables: [
      ['API de lecturas y modelo de datos de consumo', 'Servicio de recepción y almacenamiento de lecturas de medidores.', 30, 35],
      ['Tableros de consumo por línea, turno y periodo', 'Interfaz con comparativos, filtros y exportación.', 45, 98],
      ['Detección de anomalías y documentación', 'Reglas de alerta, pruebas y guía de integración con nuevos medidores.', 25, 135],
    ],
  },
  {
    key: 'P_PLC', co: 'C4', status: 'in_progress', type: 'professional_practice',
    title: 'Tablero de Control con PLC para Línea de Embotellado',
    short: 'Rediseño del tablero de control y la lógica de una línea de embotellado de 3.000 botellas por hora.',
    desc: 'La línea de embotellado de un cliente de bebidas opera con un tablero antiguo cuyas fallas causan paradas frecuentes. El proyecto rediseña el tablero de control, selecciona y dimensiona los componentes y programa la nueva lógica en PLC, con modos manual y automático, enclavamientos de seguridad y registro de alarmas.\n\nEl estudiante trabajará bajo la guía del ingeniero líder, participará en el montaje y puesta en marcha y documentará el sistema con planos eléctricos y manuales de operación.',
    months: 5, weekly: 40, loc: 'onsite', locText: 'Planta del cliente, Ipiales', comp: ['paid', 1800000], positions: 1, minSem: 8, programs: ['ELE'], featured: false, views: 97,
    created: '2026-07-14 09:25:00-05', start: '2026-10-19', weeks: 18,
    skills: [['plc', 'intermediate', true], ['automatizacion industrial', 'intermediate', true], ['control automatico', 'intermediate', true], ['electronica de potencia', 'beginner', false]],
    deliverables: [
      ['Ingeniería de detalle y selección de componentes', 'Planos eléctricos, listado de materiales y análisis de seguridad.', 30, 28],
      ['Programación de PLC y pruebas en banco', 'Lógica completa con modos de operación, enclavamientos y alarmas.', 40, 70],
      ['Montaje, puesta en marcha y manual de operación', 'Instalación en planta, pruebas de aceptación y documentación final.', 30, 119],
    ],
  },
  {
    key: 'P_BRAZO', co: 'C4', status: 'in_progress', type: 'thesis',
    title: 'Brazo Robótico Didáctico para Capacitación Técnica',
    short: 'Brazo robótico de 4 grados de libertad para formar técnicos en programación de movimiento.',
    desc: 'Como trabajo de grado en colaboración con la empresa, se diseñará y construirá un brazo robótico didáctico de cuatro grados de libertad que sirva para capacitar a técnicos en programación de movimiento y operaciones de recogida y colocación. Incluye el diseño mecánico simple, el control con microcontrolador y una interfaz de programación por bloques.\n\nSe validará el repetibilidad del posicionamiento y se elaborará material didáctico para al menos cinco prácticas de laboratorio.',
    months: 5, weekly: 30, loc: 'hybrid', locText: 'Pasto', comp: ['academic_credit', null], positions: 1, minSem: 9, programs: ['ELE'], featured: false, views: 83,
    created: '2026-07-28 11:05:00-05', start: '2026-11-02', weeks: 20,
    skills: [['robotica', 'intermediate', true], ['arduino', 'advanced', true], ['sistemas embebidos', 'intermediate', true], ['matlab/simulink', 'intermediate', false], ['control automatico', 'intermediate', true]],
    deliverables: [
      ['Diseño mecánico y cinemática del brazo', 'Modelo del brazo, cinemática directa e inversa y selección de actuadores.', 25, 35],
      ['Prototipo con control de movimiento', 'Brazo operativo con control de trayectoria y repetibilidad medida.', 45, 98],
      ['Interfaz de programación y guías de práctica', 'Interfaz por bloques y cinco guías de laboratorio.', 30, 133],
    ],
  },
  {
    key: 'P_MANT', co: 'C4', status: 'completed', type: 'professional_practice',
    title: 'Mantenimiento Predictivo de Motores con Análisis de Vibraciones',
    short: 'Sistema que detecta desbalance y desalineación en motores a partir de su vibración.',
    desc: 'Las paradas no planeadas de motores críticos generan costos altos para los clientes industriales. El proyecto desarrolló un sistema de adquisición y análisis de vibraciones que detecta desbalance y desalineación en motores trifásicos y estima su severidad para programar el mantenimiento antes de la falla.\n\nSe instrumentaron tres motores con acelerómetros, se procesaron las señales en el dominio de la frecuencia y se validó la detección con fallas inducidas controladamente, entregando una guía de interpretación para los técnicos.',
    months: 4, weekly: 40, loc: 'onsite', locText: 'Planta Ipiales y laboratorio', comp: ['paid', 1700000], positions: 1, minSem: 8, programs: ['ELE'], featured: false, views: 101,
    created: '2025-11-26 10:10:00-05', start: '2026-02-23', weeks: 16,
    skills: [['procesamiento de senales', 'advanced', true], ['matlab/simulink', 'advanced', true], ['python', 'intermediate', false], ['iot', 'beginner', false]],
    deliverables: [
      ['Instrumentación y adquisición de vibraciones', 'Montaje de acelerómetros y protocolo de adquisición en tres motores.', 30, 28],
      ['Algoritmo de detección y clasificación de fallas', 'Procesamiento espectral y reglas de diagnóstico validadas con fallas inducidas.', 45, 77],
      ['Guía de interpretación para técnicos', 'Manual con umbrales, ejemplos y recomendaciones de mantenimiento.', 25, 105],
    ],
  },
  {
    key: 'P_INV', co: 'C4', status: 'in_progress', type: 'thesis',
    title: 'Inversor Solar de Baja Potencia con Seguimiento MPPT',
    short: 'Inversor monofásico de 1 kW con seguimiento del punto de máxima potencia para sistemas aislados.',
    desc: 'Como trabajo de grado con la empresa, se desarrolló un inversor monofásico de 1 kW con seguimiento del punto de máxima potencia, orientado a pequeños sistemas solares aislados del sector rural. Incluyó el diseño del convertidor, la tarjeta de circuito impreso, el firmware de control en un microcontrolador STM32 y la validación en banco.\n\nSe midieron eficiencia, distorsión armónica y desempeño del seguimiento ante cambios de irradiancia, y se entregó la documentación necesaria para una futura producción de bajo volumen.',
    months: 3, weekly: 40, loc: 'onsite', locText: 'Laboratorio Pasto', comp: ['academic_credit', null], positions: 1, minSem: 9, programs: ['ELE'], featured: false, views: 90,
    created: '2026-05-26 09:50:00-05', start: '2026-07-13', weeks: 12,
    skills: [['electronica de potencia', 'advanced', true], ['stm32', 'intermediate', true], ['diseno de pcbs', 'advanced', true], ['altium designer', 'intermediate', false], ['proteus', 'intermediate', false]],
    deliverables: [
      ['Diseño y simulación del convertidor', 'Topología, dimensionamiento de componentes y simulación de desempeño.', 30, 21],
      ['Prototipo de potencia con PCB y firmware MPPT', 'Prototipo funcional con control digital y seguimiento de máxima potencia.', 45, 56],
      ['Validación en banco y documentación', 'Mediciones de eficiencia y armónicos, y paquete de producción.', 25, 80],
    ],
  },
];

/**
 * Postulaciones que NO forman parte de un hilo académico (publicados, rechazadas, retiradas).
 * [proyecto, estudiante, estado, fechaPostulación, cartaDePresentación, extra]
 * extra: { quick: true (pending→rejected directo), reason, interview: { daysAhead, time, type, link|location } }
 */
export const looseApplications = [
  // Publicados · AndesTech
  ['P_CITAS', 'S14', 'pending', '2026-10-03 10:15:00-05', 'Desarrollo aplicaciones con React y NestJS y me atrae el reto de un producto con impacto real en la salud. Quisiera aportar al módulo de agendamiento y aprender de las prácticas de pruebas del equipo.'],
  ['P_CITAS', 'S15', 'under_review', '2026-09-30 16:40:00-05', 'Me interesa el trabajo con datos de la clínica para anticipar inasistencias; además tengo experiencia en SQL y APIs REST que puedo aplicar en el backend.'],
  ['P_CITAS', 'S20', 'shortlisted', '2026-09-27 09:05:00-05', 'Lideré un equipo bajo Scrum con alta cobertura de pruebas y quisiera aportar esa disciplina al proyecto de citas médicas, que exige confiabilidad.'],
  ['P_ASISTENTE', 'S14', 'interview', '2026-09-25 11:30:00-05', 'He explorado la integración de modelos de lenguaje con APIs en proyectos propios y quisiera aplicarlo a un caso real de atención al cliente.', { interview: { daysAhead: 3, time: '10:00:00-05', type: 'video', link: 'https://meet.example.com/andestech-asistente-entrevista' } }],
  ['P_ASISTENTE', 'S15', 'pending', '2026-10-06 08:55:00-05', 'Mi experiencia clasificando textos de encuestas ciudadanas me motiva a trabajar en un asistente que entienda preguntas reales de clientes.'],
  ['P_ASISTENTE', 'S20', 'rejected', '2026-10-01 14:20:00-05', 'Busco una práctica donde pueda aprender sobre sistemas conversacionales y aportar con pruebas automatizadas y metodologías ágiles.', { reason: 'Valoramos tu perfil, pero para este proyecto buscamos candidatos con experiencia previa en procesamiento de lenguaje natural y modelos de lenguaje.' }],
  ['P_ENERGIA_WEB', 'S20', 'pending', '2026-10-04 13:10:00-05', 'Me interesa construir tableros de datos con buenas prácticas de calidad; tengo experiencia con NestJS, React y PostgreSQL.'],
  ['P_ENERGIA_WEB', 'S15', 'under_review', '2026-10-03 17:25:00-05', 'Quisiera aportar mi experiencia en análisis de datos al diseño de las reglas de detección de anomalías de consumo.'],
  ['P_ENERGIA_WEB', 'S14', 'rejected', '2026-10-02 09:45:00-05', 'Desarrollo web full stack y me gustaría sumar IoT a mi perfil trabajando con datos de medidores inteligentes.', { reason: 'Gracias por postularte. En esta ocasión avanzamos con candidatos con mayor experiencia en bases de datos de series de tiempo.' }],

  // Publicados · AgroNariño
  ['P_PAPA', 'S16', 'shortlisted', '2026-10-01 10:00:00-05', 'Mi familia produce papa en Pupiales y ya instalé nodos de humedad con ESP32 en parcelas demostrativas; este proyecto une mi formación con una necesidad que conozco de cerca.'],
  ['P_PAPA', 'S17', 'pending', '2026-10-05 15:35:00-05', 'Tengo experiencia en instrumentación y control y quisiera aplicarla al monitoreo de cultivos, un campo clave para la región.'],
  ['P_PAPA', 'S14', 'pending', '2026-10-07 09:20:00-05', 'Aunque vengo de Sistemas, me interesa la parte de plataforma y análisis de datos de la red de sensores y puedo apoyar el backend del proyecto.'],
  ['P_RIEGO', 'S16', 'pending', '2026-10-04 11:50:00-05', 'Quiero ayudar a que los productores ahorren agua; ya trabajé con sensores de humedad y me interesa aprender control difuso.'],
  ['P_RIEGO', 'S17', 'under_review', '2026-10-02 16:15:00-05', 'Mi formación en control automático y MATLAB me permite abordar el modelado del proceso y el diseño del controlador.'],

  // Publicados · Cimientos del Sur
  ['P_BIM', 'S18', 'interview', '2026-09-28 10:40:00-05', 'Manejo Revit y AutoCAD y me interesa la coordinación BIM para evitar interferencias en obra; me gustaría modelar un edificio institucional completo.', { interview: { daysAhead: 2, time: '15:00:00-05', type: 'in_person', location: 'Oficina principal de Cimientos del Sur, Calle 18 # 33-10, Pasto' } }],
  ['P_BIM', 'S19', 'under_review', '2026-10-01 09:30:00-05', 'Aunque mi énfasis es geotecnia, quiero fortalecer mi manejo de BIM y puedo aportar en la coordinación con la parte estructural y de cimentaciones.'],
  ['P_GEOTEC', 'S19', 'pending', '2026-10-05 08:50:00-05', 'La geotecnia es mi área de interés; he realizado ensayos de suelos en laboratorio y quiero aplicarlos en un estudio real de estabilidad de taludes.'],
  ['P_GEOTEC', 'S18', 'withdrawn', '2026-10-02 10:10:00-05', 'Me interesa el estudio geotécnico del corredor y su relación con el diseño de cimentaciones.', { reason: 'Decidí priorizar el proceso de la práctica de modelado BIM, que se ajusta mejor a mi perfil.' }],

  // Publicados · Volcán
  ['P_SCADA', 'S16', 'pending', '2026-10-06 12:05:00-05', 'Estoy desarrollando mi perfil en automatización y me gustaría aprender SCADA en un proyecto real con equipos de media tensión.'],
  ['P_SCADA', 'S17', 'interview', '2026-09-29 14:00:00-05', 'Tengo experiencia programando PLC y apoyando mantenimiento eléctrico en planta, y este proyecto integra justo lo que busco: supervisión y seguridad.', { interview: { daysAhead: 5, time: '09:00:00-05', type: 'technical', link: 'https://meet.example.com/volcan-scada-entrevista' } }],

  // Rechazadas / retiradas en proyectos con hilo académico (historial del embudo)
  ['P_UX', 'S15', 'rejected', '2025-07-23 10:20:00-05', 'Me interesa la investigación con usuarios y quisiera aprender del proceso de rediseño de un portal de clientes.', { quick: true, reason: 'Para este proyecto se priorizó a una candidata con portafolio de diseño de interfaces.' }],
  ['P_ESTACION', 'S16', 'rejected', '2025-07-27 15:10:00-05', 'Tengo experiencia con ESP32 y sensores y quisiera trabajar en el diseño de una estación meteorológica autónoma.', { reason: 'Seleccionamos un candidato con mayor experiencia en diseño de PCB y electrónica de potencia para el sistema solar.' }],
  ['P_VENTAS', 'S14', 'rejected', '2026-06-08 09:35:00-05', 'Me gustaría sumar analítica a mi perfil full stack trabajando en tableros de ventas.', { quick: true, reason: 'Este proyecto requería experiencia previa con Angular y modelado analítico.' }],
  ['P_COSECHA', 'S20', 'rejected', '2026-01-02 11:00:00-05', 'Quisiera aplicar mis conocimientos de pruebas y de datos a un modelo predictivo agrícola.', { reason: 'Priorizamos candidatos con experiencia demostrable en aprendizaje automático.' }],
  ['P_INTERV', 'S18', 'rejected', '2026-01-03 10:30:00-05', 'Me interesa conocer el trabajo de interventoría de obras de saneamiento y apoyar el control de calidad.', { reason: 'Buscábamos un perfil con mayor formación en hidráulica y manejo de cronogramas de obra.' }],
  ['P_PUENTE', 'S19', 'rejected', '2026-01-10 14:45:00-05', 'Aunque mi énfasis es geotecnia, el diseño de cimentaciones de puentes me interesa y quisiera colaborar.', { reason: 'Para el diseño estructural completo del puente se requería experiencia con software de análisis estructural.' }],
  ['P_MANT', 'S17', 'rejected', '2026-01-06 09:15:00-05', 'Mi experiencia en mantenimiento eléctrico me motiva a trabajar en técnicas predictivas de diagnóstico de motores.', { reason: 'Seleccionamos una candidata con mayor experiencia en procesamiento de señales.' }],
  ['P_MIG', 'S15', 'rejected', '2026-07-24 16:20:00-05', 'Me interesa la arquitectura de datos en un contexto de microservicios y quisiera aprender del proceso de migración.', { reason: 'El proyecto requería experiencia previa con NestJS y contenedores.' }],
  ['P_VIA', 'S19', 'withdrawn', '2026-08-05 10:05:00-05', 'Me interesa la topografía y el diseño vial rural, y quisiera colaborar en el levantamiento del corredor.', { reason: 'Recibí una oferta para otro proyecto que coincide mejor con mi énfasis en geotecnia.' }],
  ['P_PLC', 'S16', 'rejected', '2026-08-22 13:25:00-05', 'Quisiera ampliar mi perfil de IoT hacia la automatización industrial con PLC.', { reason: 'Para este proyecto se requería experiencia previa programando PLC.' }],
  ['P_INV', 'S17', 'rejected', '2026-06-06 10:50:00-05', 'Me interesa la electrónica de potencia aplicada a energías renovables.', { quick: true, reason: 'El proyecto requería experiencia en diseño de convertidores y de tarjetas de circuito impreso.' }],
];

/**
 * Hilos académicos (aplicaciones aceptadas): una por estudiante de S1 a S13.
 * stage: completed | active | waiting_documents | waiting_anteproyecto | finalizing
 * La postulación se fecha 'applied'; el resto de fechas se deriva en el generador.
 */
export const threads = [
  {
    student: 'S1', project: 'P_UX', stage: 'completed', period: '2025-2', applied: '2025-07-24 09:20:00-05',
    asesor: 'DOC-001', jurados: ['DOC-002', 'DOC-003'], final: 'DOC-004', grade: 94.5, correction: false,
    letter: 'El rediseño de portales es mi pasión: he trabajado con negocios locales y quiero hacerlo con una empresa que valore la investigación con usuarios y la calidad técnica.',
    eval: {
      c2s: { score: 4.8, comment: 'Valentina lideró la investigación con usuarios y entregó prototipos de una calidad que superó lo esperado. Su comunicación con el equipo de desarrollo hizo que la implementación inicial fuera ágil.', strengths: 'Rigor en la investigación, claridad al comunicar decisiones de diseño y autonomía.', improve: 'Documentar con más detalle los criterios de accesibilidad aplicados.' },
      s2c: { score: 4.6, comment: 'Excelente acompañamiento del equipo de producto; tuve acceso a usuarios reales y a retroalimentación semanal que me hizo crecer como diseñadora.', strengths: 'Mentoría cercana, acceso a usuarios y apertura a proponer cambios.', improve: 'Agilizar la entrega de accesos a herramientas durante la primera semana.' },
      a2s: { score: 4.7, comment: 'Cumplió con rigor los hitos académicos y su informe final fue claro y bien sustentado. Demostró madurez profesional.' },
      s2a: { score: 4.9, comment: 'La asesoría fue constante y precisa, con retroalimentación que me permitió mejorar el anteproyecto y la sustentación.' },
    },
  },
  {
    student: 'S2', project: 'P_ESTACION', stage: 'completed', period: '2025-2', applied: '2025-07-28 10:05:00-05',
    asesor: 'DOC-001', jurados: ['DOC-002', 'DOC-003'], final: 'DOC-004', grade: 91.0, correction: true,
    letter: 'Diseñar hardware autónomo para el campo es justo lo que busco; ya trabajé con ESP32 y quiero llevar un prototipo desde el esquemático hasta la finca.',
    eval: {
      c2s: { score: 4.5, comment: 'Andrés entregó una estación funcional que superó las pruebas de campo. Mostró criterio técnico al resolver el presupuesto energético y la comunicación de largo alcance.', strengths: 'Criterio técnico, documentación ordenada y compromiso con las pruebas en finca.', improve: 'Anticipar con mayor margen los tiempos de fabricación de la tarjeta.' },
      s2c: { score: 4.4, comment: 'Pude probar mi diseño en una finca real, con apoyo del laboratorio y de técnicos de campo. Una experiencia muy completa.', strengths: 'Acceso a campo, laboratorio bien dotado y buen ambiente de equipo.', improve: 'Disponer de más repuestos de componentes para iterar más rápido.' },
      a2s: { score: 4.5, comment: 'Superó una corrección del anteproyecto con una respuesta sólida y cumplió el cronograma. Su informe final es completo.' },
      s2a: { score: 4.7, comment: 'La asesoría fue clara y exigente en el momento justo; me ayudó a estructurar mejor el anteproyecto tras la corrección.' },
    },
  },
  {
    student: 'S3', project: 'P_VENTAS', stage: 'completed', period: '2026-2', applied: '2026-06-10 09:40:00-05',
    asesor: 'DOC-002', jurados: ['DOC-001', 'DOC-003'], final: 'DOC-004', grade: 96.0, correction: false,
    letter: 'Quiero convertir datos de ventas en decisiones; he trabajado con Angular y PostgreSQL y me motiva ver mi trabajo usado por la gerencia comercial.',
    eval: {
      c2s: { score: 4.9, comment: 'Daniela construyó un panel que la gerencia comercial adoptó de inmediato. Entendió el negocio, propuso indicadores útiles y entregó antes de lo previsto.', strengths: 'Orientación al negocio, calidad técnica y comunicación clara de resultados.', improve: 'Ninguna relevante; sugerimos ampliar la documentación de los indicadores.' },
      s2c: { score: 4.7, comment: 'Tuve libertad técnica y acompañamiento cuando lo necesité. Ver mi panel usado por la gerencia fue muy motivador.', strengths: 'Confianza en el practicante, retroalimentación oportuna y proyecto con impacto.', improve: 'Contar con un ambiente de datos de pruebas desde el primer día.' },
      a2s: { score: 4.8, comment: 'Trabajo impecable en lo académico y lo técnico; el informe final fue de nivel sobresaliente.' },
      s2a: { score: 4.8, comment: 'Excelente asesoría, siempre disponible y con observaciones que elevaron la calidad del trabajo.' },
    },
  },
  {
    student: 'S4', project: 'P_COSECHA', stage: 'completed', period: '2026-1', applied: '2026-01-02 11:00:00-05',
    asesor: 'DOC-003', jurados: ['DOC-001', 'DOC-002'], final: 'DOC-004', grade: 92.5, correction: true,
    letter: 'Aplicar aprendizaje automático a la agricultura de mi región es mi meta; ya trabajé con series de tiempo climáticas en el semillero y quiero un caso con datos reales de productores.',
    eval: {
      c2s: { score: 4.6, comment: 'Juan Sebastián depuró datos difíciles, comparó modelos con criterio y explicó los resultados de forma comprensible para técnicos de campo.', strengths: 'Rigor metodológico, reproducibilidad y claridad al explicar los resultados.', improve: 'Documentar antes las decisiones de limpieza de datos para facilitar la revisión.' },
      s2c: { score: 4.5, comment: 'Acceso a datos reales de tres ciclos productivos y a técnicos que me explicaron el contexto agronómico. Muy enriquecedor.', strengths: 'Datos reales, contexto agronómico y apertura para proponer enfoques.', improve: 'Formalizar un repositorio de datos para futuros practicantes.' },
      a2s: { score: 4.6, comment: 'Atendió con seriedad las correcciones del anteproyecto y entregó un cuaderno reproducible de muy buen nivel.' },
      s2a: { score: 4.6, comment: 'Retroalimentación precisa y oportuna; sus observaciones sobre validación fueron clave para el trabajo.' },
    },
  },
  {
    student: 'S5', project: 'P_INTERV', stage: 'completed', period: '2026-1', applied: '2026-01-05 10:30:00-05',
    asesor: 'DOC-004', jurados: ['DOC-002', 'DOC-003'], final: 'DOC-001', grade: 90.0, correction: false,
    letter: 'Quiero aprender interventoría desde el frente de obra; ya apoyé el control de cronogramas y me interesa el seguimiento técnico y financiero de contratos de saneamiento.',
    eval: {
      c2s: { score: 4.4, comment: 'Camila asumió con responsabilidad el control de calidad y los informes de avance. Su presencia constante en obra fue muy valorada por el residente.', strengths: 'Responsabilidad, disciplina de seguimiento y buena redacción de informes.', improve: 'Ganar seguridad para plantear no conformidades ante contratistas con más experiencia.' },
      s2c: { score: 4.3, comment: 'Aprendí mucho del residente de obra y de los comités. Me dieron responsabilidades reales con supervisión adecuada.', strengths: 'Aprendizaje en frente de obra, acompañamiento del residente y trato respetuoso.', improve: 'Disponer de equipo de protección y transporte más oportuno a obra.' },
      a2s: { score: 4.4, comment: 'Cumplió con los hitos del cronograma académico y su informe final refleja un aprendizaje sólido de la interventoría.' },
      s2a: { score: 4.5, comment: 'Buen acompañamiento, con visitas a obra y observaciones prácticas que mejoraron mis informes.' },
    },
  },
  {
    student: 'S6', project: 'P_PUENTE', stage: 'completed', period: '2026-1', applied: '2026-01-12 14:10:00-05',
    asesor: 'DOC-001', jurados: ['DOC-002', 'DOC-003'], final: 'DOC-004', grade: 95.0, correction: false,
    letter: 'Diseñar un puente peatonal como trabajo de grado me permite aplicar todo lo aprendido en estructuras; quiero verificar mis modelos con cálculos manuales y presentar una propuesta ejecutable.',
    eval: {
      c2s: { score: 4.8, comment: 'Sergio entregó memorias de cálculo impecables y verificó sus modelos con cálculos independientes. La propuesta fue presentada al municipio con buena recepción.', strengths: 'Rigor de cálculo, verificación independiente y excelente documentación.', improve: 'Considerar con más detalle los procesos constructivos en las alternativas.' },
      s2c: { score: 4.6, comment: 'Recibí libertad para decidir el enfoque del diseño y revisión experta de mis resultados. Excelente para un trabajo de grado.', strengths: 'Revisión experta, libertad técnica y acceso a software especializado.', improve: 'Contar con más tiempo de reunión con el ingeniero revisor.' },
      a2s: { score: 4.8, comment: 'Trabajo de grado de muy alto nivel; los resultados fueron consistentes y la sustentación, sobresaliente.' },
      s2a: { score: 4.8, comment: 'Orientación precisa en la normativa y en la verificación de resultados; muy buena comunicación.' },
    },
  },
  {
    student: 'S7', project: 'P_MANT', stage: 'completed', period: '2026-1', applied: '2026-01-08 09:55:00-05',
    asesor: 'DOC-002', jurados: ['DOC-001', 'DOC-003'], final: 'DOC-004', grade: 93.5, correction: false,
    letter: 'Convertir señales de vibración en diagnósticos que eviten paradas es lo que quiero hacer; ya trabajé con análisis espectral y banco de pruebas en la universidad.',
    eval: {
      c2s: { score: 4.7, comment: 'Laura desarrolló un sistema de diagnóstico con precisión alta en las fallas inducidas y una guía de interpretación que los técnicos usan hoy.', strengths: 'Dominio de señales, validación cuidadosa y capacidad de explicar resultados a técnicos.', improve: 'Ampliar las pruebas a motores de otras potencias.' },
      s2c: { score: 4.5, comment: 'Pude trabajar con motores y equipos de medición reales, con orientación del ingeniero líder. Muy buena experiencia.', strengths: 'Equipos reales, orientación técnica y reconocimiento del trabajo realizado.', improve: 'Programar con más antelación las ventanas de acceso a planta.' },
      a2s: { score: 4.7, comment: 'Trabajo sólido y bien validado; la comunicación con la empresa y con la academia fue ejemplar.' },
      s2a: { score: 4.7, comment: 'Asesoría clara y oportuna, con énfasis en la validación experimental.' },
    },
  },
  // ───────────── En curso ─────────────
  {
    student: 'S8', project: 'P_MIG', stage: 'active', period: '2026-2', applied: '2026-07-15 10:00:00-05',
    asesor: 'DOC-002', jurados: ['DOC-001', 'DOC-003'], correction: false,
    letter: 'Quiero participar en una migración real hacia microservicios; ya construyo APIs con NestJS y me interesa aprender de un equipo con prácticas de integración continua.',
    selectionDoc: { name: 'Prueba técnica — API de recaudo con NestJS', description: 'Construye una API REST mínima de recaudo con autenticación, pruebas y Docker. Entrega un repositorio comprimido y un breve README.', status: 'approved', comment: 'Buena estructura, pruebas claras y Dockerfile correcto. Excelente solución.' },
  },
  {
    student: 'S9', project: 'P_TRAZA', stage: 'active', period: '2026-2', applied: '2026-07-20 11:20:00-05',
    asesor: 'DOC-003', jurados: ['DOC-001', 'DOC-002'], correction: true,
    letter: 'Conectar sensores con plataformas web es lo que más disfruto; ya digitalicé el acopio de leche de una asociación y quiero llevar esa experiencia a una cadena de frío completa.',
  },
  {
    student: 'S10', project: 'P_VIA', stage: 'active', period: '2026-2', applied: '2026-08-03 09:30:00-05',
    asesor: 'DOC-004', jurados: ['DOC-002', 'DOC-003'], correction: false,
    letter: 'Las vías rurales son una necesidad real de mi región; tengo experiencia en topografía y quisiera participar en el diseño y presupuesto de esta vía terciaria.',
  },
  {
    student: 'S11', project: 'P_PLC', stage: 'waiting_documents', docState: 'rejected', period: '2026-2', applied: '2026-08-24 10:15:00-05',
    asesor: 'DOC-002', jurados: ['DOC-001', 'DOC-003'], correction: false,
    letter: 'Quiero aprender a llevar un tablero de control desde el diseño hasta la puesta en marcha en planta; ya programo PLC en el laboratorio y busco una práctica con responsabilidad real.',
  },
  {
    student: 'S12', project: 'P_BRAZO', stage: 'waiting_anteproyecto', period: '2026-2', applied: '2026-09-01 15:05:00-05',
    asesor: 'DOC-003', jurados: ['DOC-001', 'DOC-002'], correction: false,
    letter: 'Mi trabajo de grado es el brazo robótico didáctico; me motiva que esté orientado a formar técnicos y quisiera contar con el respaldo de una empresa del sector.',
  },
  {
    student: 'S13', project: 'P_INV', stage: 'finalizing', period: '2026-2', applied: '2026-06-08 08:45:00-05',
    asesor: 'DOC-001', jurados: ['DOC-002', 'DOC-003'], final: 'DOC-004', correction: false,
    letter: 'Mi trabajo de grado es un inversor solar con seguimiento MPPT; trabajar con una empresa de energía me permitirá validar el diseño con criterios industriales.',
  },
];
