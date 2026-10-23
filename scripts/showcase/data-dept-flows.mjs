/**
 * Docentes, postulaciones y hilos académicos de la capa "departamentos".
 *
 * Los hilos usan los mismos campos que `data-projects.mjs` (threads) más estas opciones:
 *   anteState    (stage waiting_anteproyecto) estado del anteproyecto: pending_submission | under_review
 *                | needs_revision | revised
 *   asesorStatus estado de la asignación del asesor cuando NO es el habitual (el flujo real solo deja accepted/completed)
 *   extraAsg     asignaciones adicionales [{ role, code, status, reason }] (declined, disconnected, replaced…)
 *   finalDocs    (stage waiting_final_docs | final_docs_review) estado de los documentos finales
 *   anonymous    tipos de evaluación que se guardan como anónimos
 */

// ───────────────────────────── Docentes nuevos ─────────────────────────────
// role: academic_director | internship_coordinator | thesis_advisor | faculty_supervisor
export const deptStaff = [
  // Electrónica
  { code: 'DOC-E01', first: 'Carlos', last: 'Andrade Pantoja', email: 'carlos.andrade@collabu.dev', program: 'ELE', role: 'thesis_advisor', spec: 'Control y Automatización', max: 8 },
  { code: 'DOC-E02', first: 'Mónica', last: 'Benavides Cuasquer', email: 'monica.benavides@collabu.dev', program: 'ELE', role: 'faculty_supervisor', spec: 'Electrónica de Potencia', max: 10 },
  { code: 'DOC-E03', first: 'Ricardo', last: 'Ibarra Zambrano', email: 'ricardo.ibarra@collabu.dev', program: 'ELE', role: 'internship_coordinator', spec: 'Sistemas Embebidos', max: 2 },
  { code: 'DOC-E04', first: 'Gloria', last: 'Martínez Erazo', email: 'gloria.martinez@collabu.dev', program: 'ELE', role: 'academic_director', spec: 'Telecomunicaciones', max: 12 },
  { code: 'DOC-E05', first: 'Hernán', last: 'Pantoja Guerrero', email: 'hernan.pantoja@collabu.dev', program: 'ELE', role: 'thesis_advisor', spec: 'Instrumentación Electrónica', max: 8, onboardingIncomplete: true },
  // Civil
  { code: 'DOC-C01', first: 'Patricia', last: 'Zambrano Rosero', email: 'patricia.zambrano@collabu.dev', program: 'CIV', role: 'thesis_advisor', spec: 'Análisis y Diseño Estructural', max: 8 },
  { code: 'DOC-C02', first: 'Jorge Luis', last: 'Revelo Ortiz', email: 'jorge.revelo@collabu.dev', program: 'CIV', role: 'faculty_supervisor', spec: 'Geotecnia', max: 10 },
  { code: 'DOC-C03', first: 'Diana', last: 'Estupiñán Mora', email: 'diana.estupinan@collabu.dev', program: 'CIV', role: 'internship_coordinator', spec: 'Hidráulica e Hidrología', max: 9 },
  { code: 'DOC-C04', first: 'Fabio', last: 'Montenegro Salas', email: 'fabio.montenegro@collabu.dev', program: 'CIV', role: 'academic_director', spec: 'Gestión de Obras', max: 12 },
  { code: 'DOC-C05', first: 'Rosa Elena', last: 'Chávez Ibarra', email: 'rosa.chavez@collabu.dev', program: 'CIV', role: 'faculty_supervisor', spec: 'Vías y Transporte', max: 8, inactive: true },
];

// ───────────────────────────── Postulaciones sueltas ─────────────────────────────
// [proyecto, estudiante, estado, fechaPostulación, carta, extra]
// extra: { reason, quick, interview:{ daysAhead|daysAgo, time, type, status, resolution, location|link, cancelledReason, feedback, score },
//          selectionDoc:{ name, description, status, comment }, asesorFlow:{ declined, declineReason, pending } }
export const deptLoose = [
  // ── Electrónica ──
  ['PE_ENVASADO', 'E4', 'pending_supervisor', '2026-09-22 10:30:00-05',
    'Mi énfasis en procesamiento de señales me permite abordar el análisis de paros de la línea; además he trabajado con PLC en laboratorio y quiero ver un proceso industrial completo.',
    { asesorFlow: { declined: 'DOC-E01', declineReason: 'Tengo la carga máxima de asesorías este semestre; sugiero asignar a otro docente del área.', pending: 'DOC-E02' },
      selectionDoc: { name: 'Prueba técnica — Lógica de control de una dosificadora', description: 'Plantea la secuencia de control y las seguridades de una dosificadora con dos sensores y un actuador. Entrega un diagrama de estados y el pseudocódigo (máx. 2 páginas).', status: 'approved', comment: 'Secuencia correcta y seguridades bien pensadas.' } }],
  ['PE_ENVASADO', 'S17', 'shortlisted', '2026-09-26 15:40:00-05', 'Mi experiencia en instrumentación y mantenimiento eléctrico me motiva a trabajar en la automatización de una línea real.'],
  ['PE_ENVASADO', 'S16', 'withdrawn', '2026-09-24 09:10:00-05', 'Quisiera sumar PLC a mi perfil de IoT trabajando en una línea de producción.',
    { reason: 'Acepté otra oportunidad que se ajusta mejor a mis horarios.', interview: { daysAhead: 2, time: '11:00:00-05', type: 'phone', status: 'cancelled', cancelledReason: 'El estudiante retiró su postulación antes de la entrevista.' } }],
  ['PE_IOT_ENERGIA', 'S16', 'accepted', '2026-09-27 10:20:00-05', 'Combino IoT y comunicación inalámbrica y quisiera llevar medidores de bajo costo desde el prototipo hasta una instalación real.',
    { interview: { daysAgo: 12, time: '14:30:00-05', type: 'phone', status: 'completed', resolution: 'passed', feedback: 'Buena claridad sobre el presupuesto energético y las pruebas de campo.', score: 4.5 } }],
  ['PE_IOT_ENERGIA', 'S17', 'rejected', '2026-09-25 16:00:00-05', 'Tengo experiencia midiendo variables eléctricas y quisiera aplicarla a medidores inteligentes.',
    { reason: 'No superó la prueba técnica de la entrevista: se requiere mayor experiencia con firmware y comunicación inalámbrica.',
      interview: { daysAgo: 9, time: '09:30:00-05', type: 'technical', status: 'completed', resolution: 'failed', feedback: 'Buen dominio de mediciones, pero dificultades al programar la comunicación.', score: 2.8 } }],
  ['PE_IOT_ENERGIA', 'S20', 'accepted', '2026-09-29 10:10:00-05', 'Me atrae unir hardware y software: quisiera construir el tablero web y la API que consumen los medidores de energía.',
    { interview: { daysAgo: 8, time: '16:00:00-05', type: 'video', status: 'completed', resolution: 'passed', link: 'https://meet.example.com/mecatronica-iot-s20', feedback: 'Buen diseño de la API y claridad al explicar el manejo de series de tiempo.', score: 4.6 } }],
  ['PE_IOT_ENERGIA', 'S14', 'under_review', '2026-10-05 09:00:00-05', 'Desarrollo web full stack y quisiera construir el tablero de consumo energético y su API.'],
  ['PE_IOT_ENERGIA', 'S15', 'interview', '2026-09-30 11:15:00-05', 'Me atrae la parte de datos del proyecto: modelar las series de consumo y detectar picos.',
    { interview: { daysAhead: 4, time: '15:30:00-05', type: 'phone' },
      selectionDoc: { name: 'Prueba técnica — Modelo de datos para series de consumo', description: 'Propón un modelo de datos para almacenar lecturas de medidores cada minuto y consultar consumo por área y hora. Entrega un diagrama y las consultas clave.', status: 'submitted', comment: null } }],
  ['PE_LORA', 'S17', 'cancelled', '2026-05-12 11:30:00-05', 'Me interesan las redes de sensores para invernaderos y la comunicación de largo alcance.',
    { reason: 'El proyecto fue cancelado por la empresa.' }],

  // ── Civil ──
  ['PV_CONCRETOS', 'V5', 'pending_supervisor', '2026-09-20 09:30:00-05',
    'Mi énfasis en gestión de obra me permite entender el control de calidad como parte del cronograma; quiero aprender a analizar resultados de ensayos y a comunicarlos al equipo.',
    { asesorFlow: { pending: 'DOC-C02' } }],
  ['PV_CONCRETOS', 'V6', 'shortlisted', '2026-09-24 14:10:00-05', 'Tengo experiencia en topografía y control de cantidades y quisiera aplicar el rigor del muestreo al control de concretos.',
    { selectionDoc: { name: 'Prueba técnica — Plan de muestreo de concreto', description: 'Define la frecuencia de muestreo y los criterios de aceptación para una placa de entrepiso de 200 m³. Entrega una tabla y una justificación breve.', status: 'rejected', comment: 'El plan no cumple la frecuencia mínima exigida por la norma; ajusta y vuelve a enviar.' } }],
  ['PV_CONCRETOS', 'V9', 'interview', '2026-09-26 08:50:00-05', 'La interventoría me enseñó a documentar no conformidades y quisiera hacerlo desde el lado del constructor.',
    { interview: { daysAhead: 6, time: '10:00:00-05', type: 'in_person', status: 'rescheduled', location: 'Obras del Pacífico, Avenida Panamericana # 3-120, Pasto' } }],
  ['PV_CONCRETOS', 'S18', 'rejected', '2026-09-23 10:40:00-05', 'Me interesa el control de calidad de concretos y su relación con el diseño de mezclas.',
    { reason: 'No asistió a la entrevista programada y no se pudo continuar con el proceso.',
      interview: { daysAgo: 8, time: '16:00:00-05', type: 'video', status: 'no_show', link: 'https://meet.example.com/pacifico-concretos' } }],
  ['PV_CONCRETOS', 'S19', 'under_review', '2026-10-02 09:20:00-05', 'Mi énfasis geotécnico me da una buena base sobre materiales y quisiera ver su comportamiento en obra.'],
  ['PV_VISOR', 'V4', 'accepted', '2026-09-28 10:00:00-05', 'La geotecnia necesita buena información espacial; quisiera aprender a estructurarla y publicarla en un visor.',
    { interview: { daysAgo: 7, time: '15:00:00-05', type: 'video', status: 'completed', resolution: 'passed', link: 'https://meet.example.com/geodata-visor', feedback: 'Buena comprensión de la información de redes y de su depuración.', score: 4.4 } }],
  ['PV_VISOR', 'S20', 'under_review', '2026-10-06 12:10:00-05', 'Desarrollo APIs y quisiera sumar el componente geoespacial a mi perfil de Sistemas.'],
  ['PV_VISOR', 'V6', 'pending', '2026-10-08 09:40:00-05', 'Me interesa la topografía aplicada a la gestión de redes y quisiera aprender a manejar capas y atributos.'],
  // Entrevistas en los estados que faltaban (completa la matriz tipo × estado)
  ['P_BIM', 'V9', 'interview', '2026-09-29 09:10:00-05', 'Quiero conocer el modelado BIM desde la coordinación de obra y aportar mi experiencia en interventoría.',
    { interview: { daysAhead: 5, time: '09:30:00-05', type: 'phone', status: 'rescheduled' } }],
  ['P_GEOTEC', 'V4', 'rejected', '2026-09-27 15:20:00-05', 'La geotecnia es mi énfasis y quisiera aplicarla a un estudio de estabilidad real.',
    { reason: 'No respondió la llamada de la entrevista programada.', interview: { daysAgo: 10, time: '10:00:00-05', type: 'phone', status: 'no_show' } }],
  ['PV_VISOR', 'S19', 'interview', '2026-10-03 11:00:00-05', 'Me interesa la información geoespacial de cimentaciones y su publicación en un visor.',
    { interview: { daysAhead: 3, time: '14:00:00-05', type: 'video', status: 'rescheduled', link: 'https://meet.example.com/geodata-visor-s19' } }],
  ['P_GEOTEC', 'V9', 'withdrawn', '2026-09-30 10:15:00-05', 'La geotecnia complementa mi experiencia en control de calidad.',
    { reason: 'Prefiero concentrarme en el proceso de BIM.', interview: { daysAhead: 4, time: '16:00:00-05', type: 'in_person', status: 'cancelled', location: 'Cimientos del Sur, Calle 18 # 33-10, Pasto', cancelledReason: 'La estudiante retiró su postulación.' } }],
  ['PV_VISOR', 'S18', 'rejected', '2026-10-01 09:40:00-05', 'Quisiera sumar información geoespacial a mi perfil de Civil.',
    { reason: 'No asistió a la entrevista presencial.', interview: { daysAgo: 7, time: '15:30:00-05', type: 'in_person', status: 'no_show', location: 'GeoData Andina, Calle 16 # 29-14, Pasto' } }],
  ['PV_VISOR', 'S14', 'withdrawn', '2026-10-04 10:00:00-05', 'Quisiera construir el servicio de mapas con APIs.',
    { reason: 'Conseguí una práctica en otra empresa.', interview: { daysAhead: 6, time: '11:30:00-05', type: 'technical', status: 'cancelled', link: 'https://meet.example.com/geodata-visor-s14', cancelledReason: 'El estudiante retiró su postulación.' } }],
  ['PV_VISOR', 'V9', 'withdrawn', '2026-10-05 15:00:00-05', 'Quisiera aplicar mi experiencia en control de calidad a la validación de la información geoespacial.',
    { reason: 'Decidí continuar con el proceso de BIM.', interview: { daysAhead: 5, time: '15:00:00-05', type: 'video', status: 'cancelled', link: 'https://meet.example.com/geodata-visor-v9', cancelledReason: 'La estudiante retiró su postulación.' } }],
  ['P_BIM', 'V4', 'interview', '2026-09-30 14:00:00-05', 'Mi trabajo con información de suelos me interesa unir con el modelado BIM.',
    { interview: { daysAhead: 7, time: '10:30:00-05', type: 'technical', status: 'rescheduled', link: 'https://meet.example.com/cimientos-bim-v4' } }],
  ['PV_VISOR', 'S15', 'rejected', '2026-10-02 12:30:00-05', 'Me interesa publicar información geoespacial con una API bien probada.',
    { reason: 'No se presentó a la entrevista técnica.', interview: { daysAgo: 6, time: '09:00:00-05', type: 'technical', status: 'no_show', link: 'https://meet.example.com/geodata-visor-s15' } }],
  ['P_LEED', 'V8', 'cancelled', '2026-04-22 11:00:00-05', 'La sostenibilidad en estructuras me interesa; quisiera aportar al diagnóstico de créditos LEED.',
    { reason: 'El proyecto fue cancelado por la empresa.' }],
];

// ───────────────────────────── Evaluaciones (texto) ─────────────────────────────
const ev = (name, topic, [c2s, s2c, a2s, s2a]) => ({
  c2s: { score: c2s, comment: `${name} entregó resultados sólidos en ${topic}; mostró criterio técnico, puntualidad y buena comunicación con el equipo.`, strengths: 'Rigor técnico, responsabilidad y capacidad de aprender rápido.', improve: 'Documentar con más detalle las decisiones de diseño intermedias.' },
  s2c: { score: s2c, comment: `Tuve responsabilidades reales en ${topic}, con acompañamiento técnico cercano y retroalimentación oportuna.`, strengths: 'Mentoría cercana, acceso a equipos y buen ambiente de trabajo.', improve: 'Agilizar la entrega de accesos y herramientas durante la primera semana.' },
  a2s: { score: a2s, comment: `Cumplió los hitos académicos y su informe final sobre ${topic} es claro y bien sustentado.` },
  s2a: { score: s2a, comment: 'Asesoría constante y precisa, con observaciones que mejoraron la calidad del anteproyecto y del informe final.' },
});

// ───────────────────────────── Hilos académicos ─────────────────────────────
export const deptThreads = [
  // ── Electrónica ──
  {
    student: 'E1', project: 'PE_AUT_RIEGO', stage: 'active', period: '2026-2', applied: '2026-07-08 10:10:00-05',
    asesor: 'DOC-E01', jurados: ['DOC-E02', 'DOC-E03'], correction: false,
    letter: 'Quiero llevar un tablero de control desde el diagrama eléctrico hasta la puesta en marcha en campo; ya programo PLC en el laboratorio y me motiva trabajar con una asociación de regantes.',
    selectionDoc: { name: 'Prueba técnica — Arranque suave de una motobomba', description: 'Describe la secuencia de arranque suave de una motobomba de 5 hp y las protecciones que incluirías en el tablero.', status: 'approved', comment: 'Selección de protecciones correcta y secuencia bien razonada.' },
  },
  {
    student: 'E2', project: 'PE_DOSIF', stage: 'completed', period: '2026-1', applied: '2026-01-13 09:25:00-05',
    asesor: 'DOC-E02', jurados: ['DOC-E01', 'DOC-E04'], final: 'DOC-E04', grade: 92.0, correction: true, anonymous: ['student_evaluates_supervisor'],
    letter: 'Quiero diseñar el control de un dosificador real, con celdas de carga y calibración; ya trabajé con STM32 y busco una empresa que me deje validar el diseño en planta.',
    eval: ev('Mateo', 'la dosificación automática', [4.6, 4.5, 4.5, 4.6]),
  },
  {
    student: 'E3', project: 'PE_POTENCIA', stage: 'waiting_anteproyecto', period: '2026-2', applied: '2026-08-06 11:00:00-05', anteState: 'revised',
    asesor: 'DOC-E02', jurados: ['DOC-E01', 'DOC-E04'], correction: true,
    letter: 'Mi trabajo de grado es un convertidor bidireccional para baterías de vehículos ligeros; quiero validarlo con una empresa que me facilite el banco de pruebas y la revisión de un ingeniero.',
  },
  {
    student: 'E6', project: 'PE_ROBOT', stage: 'waiting_anteproyecto', period: '2026-2', applied: '2026-08-24 16:20:00-05', anteState: 'pending_submission',
    asesor: 'DOC-E03', jurados: ['DOC-E01', 'DOC-E04'], correction: false,
    letter: 'La robótica móvil es mi interés principal; un robot de inspección para subestaciones me permite aplicar control de trayectoria en un problema real.',
  },
  {
    student: 'E5', project: 'PE_AIRE', stage: 'waiting_final_docs', period: '2026-2', applied: '2026-05-27 10:45:00-05',
    asesor: 'DOC-E03', jurados: ['DOC-E01', 'DOC-E04'], final: 'DOC-E02', correction: false,
    finalDocs: { informe: 'rejected', cert: 'pending' },
    extraAsg: [{ role: 'asesor', code: 'DOC-E05', status: 'replaced', reason: 'Se reasignó el asesor por cambio de línea de investigación del proyecto; continuó DOC-E03.' }],
    letter: 'Mi familia vive cerca de las ladrilleras de la sierra y quiero medir el aire que respiran con una estación de bajo costo que yo misma diseñe.',
  },
  // ── Civil ──
  {
    student: 'V1', project: 'PV_ESTRUCT', stage: 'waiting_anteproyecto', period: '2026-2', applied: '2026-08-18 09:45:00-05', anteState: 'needs_revision',
    asesor: 'DOC-C01', jurados: ['DOC-C02', 'DOC-C04'], correction: true,
    letter: 'Mi trabajo de grado es el diseño estructural de un edificio de cuatro pisos; quiero verificar mis modelos con cálculos manuales independientes y presentar planos ejecutables.',
  },
  {
    student: 'V2', project: 'PV_VIAL_DRON', stage: 'active', period: '2026-2', applied: '2026-07-06 10:30:00-05',
    asesor: 'DOC-C02', jurados: ['DOC-C03', 'DOC-C01'], correction: false,
    extraAsg: [{ role: 'jurado_anteproyecto', code: 'DOC-C05', status: 'disconnected', reason: 'La docente fue desactivada por la Facultad y su jurado se reasignó.' }],
    letter: 'Los levantamientos con dron cambian la forma de diseñar vías rurales; ya manejo estación total y Civil 3D y quiero un caso real de corredor de montaña.',
  },
  {
    student: 'V3', project: 'PV_AGUAS_LLUVIAS', stage: 'completed', period: '2026-1', applied: '2026-01-17 09:35:00-05',
    asesor: 'DOC-C03', jurados: ['DOC-C01', 'DOC-C04'], final: 'DOC-C04', grade: 94.0, correction: false,
    letter: 'El manejo de aguas lluvias en ladera es un problema real de Pasto; quiero modelarlo con datos hidrológicos y proponer obras que sí se puedan construir.',
    eval: ev('Mariana', 'el modelo hidráulico de aguas lluvias', [4.8, 4.6, 4.8, 4.7]),
  },
  {
    student: 'V7', project: 'PV_AMENAZAS', stage: 'final_docs_review', period: '2026-2', applied: '2026-06-02 11:20:00-05',
    asesor: 'DOC-C02', jurados: ['DOC-C03', 'DOC-C04'], final: 'DOC-C01', correction: false,
    finalDocs: { informe: 'submitted', cert: 'approved' },
    letter: 'Quiero unir mapas y datos de campo para entender dónde se pueden presentar movimientos en masa; me interesa que el resultado sirva a la gestión del riesgo del municipio.',
  },
];
