/**
 * Estudiantes de la capa "departamentos" (20): 7 de Electrónica, 12 de Civil y 1 de Sistemas.
 * Equilibran el seed (Sistemas 24 · Electrónica 18 · Civil 18) y cubren casos de cuenta:
 *   account: 'locked'      → cuenta bloqueada por intentos fallidos
 *   account: 'inactive'    → cuenta desactivada por la Facultad
 *   account: 'unverified'  → registro sin verificar el correo (solo existe la cuenta, sin perfil)
 *   incomplete: true       → perfil sin completar (onboarding incompleto)
 * Todos FICTICIOS. Contraseña de todas las cuentas: CollabU2026!
 *
 * Los perfiles se componen desde plantillas por área (`FOCUS`) para mantener el archivo legible;
 * el resultado tiene la misma forma que `data-students.mjs`.
 * Formato de skills: [nombreNormalizadoDelCatálogo, nivel, añosDeExperiencia]
 */
const FOCUS = {
  embebidos: {
    headline: 'Estudiante de Ingeniería Electrónica · Sistemas embebidos y firmware',
    bio: 'Diseño y programo sistemas embebidos de bajo consumo y me gusta llevar un prototipo desde el esquemático hasta la prueba en banco. Documento mis decisiones y busco equipos donde el hardware y el firmware se piensen juntos.',
    skills: [['esp32', 'advanced', 2], ['stm32', 'intermediate', 1.5], ['sistemas embebidos', 'advanced', 2], ['c', 'advanced', 3], ['kicad', 'intermediate', 1.5], ['arduino', 'advanced', 3]],
    exp: { type: 'academic', title: 'Monitor del laboratorio de Sistemas Digitales', company: 'Universidad de Nariño', desc: 'Apoyo a prácticas de laboratorio y mantenimiento de equipos de medición para cursos de electrónica digital.', tech: ['VHDL', 'Osciloscopio'], ach: ['Elaboró guías de laboratorio revisadas por docentes'] },
    interests: [['Sistemas Embebidos', 'Firmware de bajo consumo'], ['Internet de las Cosas', 'Telemetría']],
    cert: ['Embedded Systems Essentials', 'Arm Education'],
  },
  potencia: {
    headline: 'Estudiante de Ingeniería Electrónica · Electrónica de potencia y energías renovables',
    bio: 'Me interesa la conversión de energía: convertidores, inversores y sistemas solares aislados. Simulo antes de construir y valido en banco, cuidando la eficiencia y la seguridad.',
    skills: [['electronica de potencia', 'advanced', 2], ['matlab/simulink', 'intermediate', 2], ['proteus', 'intermediate', 1.5], ['diseno de pcbs', 'intermediate', 1.5], ['altium designer', 'beginner', 0.5], ['control automatico', 'intermediate', 1]],
    exp: { type: 'academic', title: 'Semillero de Energías Renovables', company: 'Universidad de Nariño', desc: 'Participación en el diseño de un sistema solar fotovoltaico aislado para una escuela rural.', tech: ['MATLAB', 'Simulink'], ach: ['Dimensionó el banco de baterías y el regulador del sistema'] },
    interests: [['Energías Renovables', 'Solar fotovoltaica'], ['Electrónica de Potencia', 'Convertidores']],
    cert: ['Photovoltaic Systems Design', 'edX · Delft University'],
  },
  automatizacion: {
    headline: 'Estudiante de Ingeniería Electrónica · Automatización industrial y control',
    bio: 'Programo PLC y diseño lógicas de control para procesos industriales. Me motiva ver una línea funcionando con seguridad y buenos registros, y trabajar con ingenieros de campo.',
    skills: [['plc', 'advanced', 2], ['automatizacion industrial', 'intermediate', 1.5], ['labview', 'intermediate', 1.5], ['control automatico', 'advanced', 2], ['matlab/simulink', 'intermediate', 1.5]],
    exp: { type: 'internship', title: 'Auxiliar de mantenimiento eléctrico', company: 'Lácteos del Valle S.A.', desc: 'Apoyo al mantenimiento de tableros de control y variadores de frecuencia en la planta de producción.', tech: ['PLC', 'Variadores'], ach: ['Redujo los paros no programados de la línea de envasado'] },
    interests: [['Automatización Industrial', 'PLC y HMI'], ['Control Automático', 'Control de procesos']],
    cert: ['PLC Programming Fundamentals', 'Siemens Learning'],
  },
  senales: {
    headline: 'Estudiante de Ingeniería Electrónica · Procesamiento de señales y comunicaciones',
    bio: 'Analizo y filtro señales para extraer información útil: vibraciones, audio y telemetría. Disfruto validar algoritmos con datos reales y explicar los resultados con claridad.',
    skills: [['procesamiento de senales', 'advanced', 2], ['matlab/simulink', 'advanced', 2.5], ['python', 'intermediate', 1.5], ['comunicaciones inalambricas', 'intermediate', 1.5], ['c++', 'beginner', 0.5]],
    exp: { type: 'academic', title: 'Auxiliar de investigación en señales y sistemas', company: 'Universidad de Nariño', desc: 'Procesamiento de señales de vibración de motores para detectar fallas de rodamientos.', tech: ['MATLAB', 'Python'], ach: ['Implementó un filtro adaptativo con 92 % de detección en banco'] },
    interests: [['Procesamiento de Señales', 'Diagnóstico por vibración'], ['Comunicaciones Inalámbricas', 'LoRa']],
    cert: ['Digital Signal Processing', 'Coursera · EPFL'],
  },
  iot: {
    headline: 'Estudiante de Ingeniería Electrónica · IoT y telemetría agrícola',
    bio: 'Construyo redes de sensores de bajo costo con comunicación inalámbrica y las conecto a plataformas web. Me interesa el campo nariñense como lugar donde la tecnología debe ser simple y robusta.',
    skills: [['iot', 'advanced', 2], ['esp32', 'intermediate', 1.5], ['comunicaciones inalambricas', 'intermediate', 1.5], ['arduino', 'advanced', 2.5], ['python', 'beginner', 1]],
    exp: { type: 'freelance', title: 'Instalación de sensores de humedad', company: 'Independiente', desc: 'Montaje de nodos de humedad de suelo en parcelas demostrativas de papa en Pupiales.', tech: ['ESP32', 'LoRa'], ach: ['Instaló 12 nodos con transmisión estable a 1,5 km'] },
    interests: [['Internet de las Cosas', 'Agricultura de precisión'], ['Comunicaciones Inalámbricas', 'Redes de sensores']],
    cert: ['Fundamentals of IoT', 'Cisco Networking Academy'],
  },
  control: {
    headline: 'Estudiante de Ingeniería Electrónica · Control automático y robótica',
    bio: 'Modelo sistemas dinámicos y diseño controladores que se pueden probar en simulación y en banco. Me llama la atención la robótica educativa y de servicio.',
    skills: [['control automatico', 'advanced', 2], ['matlab/simulink', 'advanced', 2], ['robotica', 'intermediate', 1.5], ['arduino', 'intermediate', 2], ['c', 'intermediate', 2]],
    exp: { type: 'academic', title: 'Monitor de Control Automático', company: 'Universidad de Nariño', desc: 'Apoyo a las prácticas de modelado y control de motores DC y sistemas térmicos.', tech: ['MATLAB', 'Arduino'], ach: ['Diseñó la práctica de control de posición de un servomotor'] },
    interests: [['Control Automático', 'Control digital'], ['Robótica', 'Robots móviles']],
    cert: ['Control of Mobile Robots', 'Coursera · Georgia Tech'],
  },

  estructuras: {
    headline: 'Estudiante de Ingeniería Civil · Análisis y diseño estructural',
    bio: 'Modelo y verifico estructuras de concreto y acero con software y cálculos manuales independientes. Me importa la normativa sismorresistente y la claridad de las memorias de cálculo.',
    skills: [['etabs', 'intermediate', 1.5], ['sap2000', 'intermediate', 1.5], ['concreto reforzado', 'advanced', 2], ['diseno estructural', 'advanced', 2], ['autocad', 'advanced', 3], ['estructuras metalicas', 'beginner', 0.5]],
    exp: { type: 'academic', title: 'Monitor de Análisis Estructural', company: 'Universidad de Nariño', desc: 'Apoyo a talleres de modelado de pórticos y verificación de resultados de software con cálculo manual.', tech: ['ETABS', 'SAP2000'], ach: ['Elaboró una guía de verificación de modelos'] },
    interests: [['Diseño Estructural', 'Sismorresistencia'], ['Concreto Reforzado', 'Edificaciones']],
    cert: ['Seismic Design of Structures', 'FUNVISIS'],
  },
  vias: {
    headline: 'Estudiante de Ingeniería Civil · Diseño vial y topografía',
    bio: 'Diseño trazados y pavimentos para vías rurales, desde el levantamiento topográfico hasta las secciones y las cantidades. Me gusta el trabajo de campo y los entregables bien documentados.',
    skills: [['vias y pavimentos', 'advanced', 2], ['civil 3d', 'intermediate', 1.5], ['topografia', 'advanced', 2.5], ['autocad', 'advanced', 3], ['presupuestos y apus', 'intermediate', 1]],
    exp: { type: 'internship', title: 'Auxiliar de topografía', company: 'Consorcio Vial del Sur', desc: 'Levantamientos con estación total y apoyo al replanteo de ejes en una vía terciaria.', tech: ['Estación total', 'Civil 3D'], ach: ['Levantó 6 km de corredor con cierre dentro de tolerancia'] },
    interests: [['Diseño Vial', 'Vías terciarias'], ['Topografía', 'Fotogrametría con dron']],
    cert: ['Diseño Geométrico de Vías', 'SENA'],
  },
  hidraulica: {
    headline: 'Estudiante de Ingeniería Civil · Hidráulica e hidrología',
    bio: 'Modelo el comportamiento del agua en cuencas, redes y canales. Me interesa el manejo de aguas lluvias en ciudades de ladera y la calidad de los datos hidrológicos.',
    skills: [['hidraulica', 'advanced', 2], ['hidrologia', 'intermediate', 2], ['arcgis', 'intermediate', 1.5], ['autocad', 'intermediate', 2], ['presupuestos y apus', 'beginner', 0.5]],
    exp: { type: 'academic', title: 'Semillero de Recursos Hídricos', company: 'Universidad de Nariño', desc: 'Análisis de caudales máximos en quebradas urbanas de Pasto con registros históricos.', tech: ['HEC-HMS', 'ArcGIS'], ach: ['Calculó caudales de diseño para tres quebradas'] },
    interests: [['Hidráulica', 'Aguas lluvias'], ['Hidrología', 'Cuencas de montaña']],
    cert: ['Hidrología Aplicada', 'Universidad de los Andes'],
  },
  geotecnia: {
    headline: 'Estudiante de Ingeniería Civil · Geotecnia y estabilidad de taludes',
    bio: 'Interpreto ensayos de suelos y evalúo la estabilidad de taludes y cimentaciones en terrenos de montaña. Valoro los datos de campo y la prudencia en las conclusiones.',
    skills: [['geotecnia', 'advanced', 2], ['autocad', 'intermediate', 2], ['civil 3d', 'beginner', 0.5], ['control de calidad', 'intermediate', 1], ['redaccion tecnica', 'intermediate', 1.5]],
    exp: { type: 'internship', title: 'Auxiliar de laboratorio de suelos', company: 'Laboratorio Geotécnico Andino', desc: 'Ensayos de granulometría, límites de Atterberg y corte directo.', tech: ['Corte directo', 'Proctor'], ach: ['Ejecutó más de 80 ensayos con registro completo'] },
    interests: [['Geotecnia', 'Estabilidad de taludes'], ['Cimentaciones', 'Suelos blandos']],
    cert: ['Mecánica de Suelos Aplicada', 'Sociedad Colombiana de Geotecnia'],
  },
  gestion: {
    headline: 'Estudiante de Ingeniería Civil · Gestión de obra, presupuestos y programación',
    bio: 'Planeo obras con presupuestos, APU y cronogramas realistas, y hago seguimiento de avance y costos. Me motiva que el equipo de obra entienda el plan y lo pueda cumplir.',
    skills: [['presupuestos y apus', 'advanced', 2], ['ms project', 'intermediate', 1.5], ['gestion de obras', 'intermediate', 1.5], ['revit', 'beginner', 0.5], ['liderazgo', 'intermediate', 1.5]],
    exp: { type: 'internship', title: 'Auxiliar de presupuestos', company: 'Constructora Andina', desc: 'Elaboración de APU y control de cantidades de obra en un conjunto de vivienda.', tech: ['Excel', 'Primus'], ach: ['Ajustó el presupuesto con una desviación menor al 2 %'] },
    interests: [['Gestión de Obras', 'Programación y costos'], ['Presupuestos', 'APU']],
    cert: ['Project Management Fundamentals', 'PMI'],
  },
  sig: {
    headline: 'Estudiante de Ingeniería Civil · SIG y geomática aplicada a obra',
    bio: 'Uso sistemas de información geográfica y drones para entender el territorio antes de diseñar: catastro, drenajes y amenazas. Me interesa unir mapas con decisiones de ingeniería.',
    skills: [['arcgis', 'advanced', 2], ['topografia', 'intermediate', 1.5], ['hidrologia', 'beginner', 1], ['autocad', 'intermediate', 2], ['python', 'beginner', 0.5]],
    exp: { type: 'freelance', title: 'Cartografía con dron', company: 'Independiente', desc: 'Ortofotos y modelos de elevación para predios rurales del altiplano nariñense.', tech: ['Dron', 'ArcGIS'], ach: ['Entregó 14 levantamientos con ortofotos georreferenciadas'] },
    interests: [['SIG', 'Fotogrametría'], ['Hidrología', 'Amenazas naturales']],
    cert: ['Geographic Information Systems', 'Coursera · UC Davis'],
  },
  interventoria: {
    headline: 'Estudiante de Ingeniería Civil · Interventoría y control de calidad',
    bio: 'Vigilo que la obra se construya como se diseñó: verifico materiales, cantidades y cronogramas y documento las no conformidades de forma clara y respetuosa.',
    skills: [['interventoria', 'intermediate', 1.5], ['control de calidad', 'advanced', 2], ['concreto reforzado', 'intermediate', 1.5], ['autocad', 'intermediate', 2], ['redaccion tecnica', 'advanced', 2]],
    exp: { type: 'internship', title: 'Auxiliar de interventoría', company: 'Interventorías del Sur', desc: 'Control de calidad de concretos y seguimiento semanal de avance en una obra de saneamiento.', tech: ['Ensayos de concreto', 'Informes de avance'], ach: ['Redactó 20 informes semanales aprobados por la entidad contratante'] },
    interests: [['Interventoría', 'Obras públicas'], ['Control de Calidad', 'Concretos']],
    cert: ['Interventoría de Obras Civiles', 'SENA'],
  },
  fullstack: {
    headline: 'Estudiante de Ingeniería de Sistemas · Desarrollo full stack',
    bio: 'Construyo aplicaciones web de punta a punta con buenas prácticas de pruebas e integración continua. Busco equipos donde pueda aprender de revisiones de código frecuentes.',
    skills: [['react', 'intermediate', 1.5], ['nestjs', 'intermediate', 1], ['postgresql', 'intermediate', 1.5], ['typescript', 'intermediate', 1.5], ['git', 'intermediate', 2]],
    exp: { type: 'academic', title: 'Monitor de Programación Web', company: 'Universidad de Nariño', desc: 'Apoyo a talleres de desarrollo web y revisión de proyectos de curso.', tech: ['React', 'Node.js'], ach: ['Acompañó a 40 estudiantes en proyectos de curso'] },
    interests: [['Desarrollo Web', 'APIs y pruebas'], ['DevOps', 'Integración continua']],
    cert: ['Full Stack Web Development', 'Coursera'],
  },
};

const SOFT = [['comunicacion efectiva', 'advanced', 3], ['trabajo en equipo', 'advanced', 3], ['resolucion de problemas', 'intermediate', 2]];

// [key, nombres, apellidos, handle(correo), programa, semestre, promedio, área, género, nacimiento, opciones]
const SPECS = [
  // ───────────── Electrónica (7) ─────────────
  ['E1', 'Sofía', 'Ramírez Chamorro', 'sofia.ramirez', 'ELE', 9, 4.31, 'automatizacion', 'female', '2002-02-11'],
  ['E2', 'Mateo', 'Delgado Bravo', 'mateo.delgado', 'ELE', 10, 4.22, 'embebidos', 'male', '2001-11-05'],
  ['E3', 'Isabella', 'Narváez Cuaical', 'isabella.narvaez', 'ELE', 8, 4.05, 'potencia', 'female', '2002-07-19'],
  ['E4', 'Sebastián', 'Obando Pantoja', 'sebastian.obando', 'ELE', 8, 3.96, 'senales', 'male', '2002-04-23'],
  ['E5', 'Valeria', 'Mora Estrada', 'valeria.mora', 'ELE', 7, 4.12, 'iot', 'female', '2003-01-30'],
  ['E6', 'Daniel', 'Fajardo Burbano', 'daniel.fajardo', 'ELE', 6, 3.88, 'control', 'male', '2003-09-14', { account: 'locked' }],
  ['E7', 'Karol', 'Pabón Rivas', 'karol.pabon', 'ELE', 5, 3.70, 'embebidos', 'female', '2004-03-08', { incomplete: true }],
  // ───────────── Civil (12) ─────────────
  ['V1', 'Juliana', 'Cortés Eraso', 'juliana.cortes', 'CIV', 9, 4.28, 'estructuras', 'female', '2002-05-17'],
  ['V2', 'Esteban', 'Pasaje Mueses', 'esteban.pasaje', 'CIV', 9, 4.10, 'vias', 'male', '2002-08-02'],
  ['V3', 'Mariana', 'Guerrero Sañudo', 'mariana.guerrero', 'CIV', 10, 4.35, 'hidraulica', 'female', '2001-12-21'],
  ['V4', 'Brayan', 'Ceballos Lasso', 'brayan.ceballos', 'CIV', 8, 3.94, 'geotecnia', 'male', '2002-06-10'],
  ['V5', 'Laura', 'Cabrera Montenegro', 'laura.cabrera', 'CIV', 8, 4.18, 'gestion', 'female', '2002-10-27'],
  ['V6', 'Cristian', 'Yela Benavides', 'cristian.yela', 'CIV', 7, 3.99, 'vias', 'male', '2003-02-06'],
  ['V7', 'Andrea', 'Burbano Insuasty', 'andrea.burbano', 'CIV', 7, 4.07, 'sig', 'female', '2003-05-29'],
  ['V8', 'Felipe', 'Ortiz Guzmán', 'felipe.ortiz', 'CIV', 8, 3.91, 'estructuras', 'male', '2002-09-15'],
  ['V9', 'Natalia', 'Eraso Villota', 'natalia.eraso', 'CIV', 7, 4.02, 'interventoria', 'female', '2003-04-12'],
  ['V10', 'Óscar', 'Ibarra Mesías', 'oscar.ibarra', 'CIV', 6, 3.85, 'gestion', 'male', '2003-11-03', { account: 'inactive' }],
  ['V11', 'Paola', 'Santacruz Rosero', 'paola.santacruz', 'CIV', 5, 3.80, 'hidraulica', 'female', '2004-01-18', { account: 'unverified' }],
  ['V12', 'Camilo', 'Muñoz Delgado', 'camilo.munoz', 'CIV', 5, 3.75, 'geotecnia', 'male', '2004-06-25', { incomplete: true }],
  // ───────────── Sistemas (1, sin postular) ─────────────
  ['W1', 'Tatiana', 'Mesa Rodríguez', 'tatiana.mesa', 'SIS', 8, 4.01, 'fullstack', 'female', '2003-08-09'],
];

const MODES = ['hybrid', 'on_site', 'remote'];
const AVAIL = ['part_time', 'full_time', 'flexible'];

export const deptStudents = SPECS.map(([key, first, last, handle, program, semester, gpa, focus, gender, dob, opts = {}], i) => {
  const f = FOCUS[focus];
  const s = {
    key, first, last, email: `${handle}@collabu.dev`, program, semester, gpa, dob, gender,
    headline: f.headline,
    bio: opts.incomplete ? '' : f.bio,
    hours: [20, 30, 40][i % 3], mode: MODES[i % 3], availability: AVAIL[(i + 1) % 3], relocate: i % 4 === 0,
    skills: opts.incomplete ? [] : [...f.skills, ...SOFT.slice(0, 2)],
    exp: opts.incomplete ? [] : [{ ...f.exp, start: '2025-02-03', end: '2025-08-29' }],
    langs: opts.incomplete ? [] : [['Inglés', ['basic', 'intermediate', 'advanced'][i % 3], null, null]],
    interests: opts.incomplete ? [] : f.interests,
    certs: opts.incomplete ? [] : [{ name: f.cert[0], org: f.cert[1], date: '2025-05-12', id: `CERT-${key}-${3100 + i * 7}` }],
    focus,
    ...opts,
  };
  return s;
});
