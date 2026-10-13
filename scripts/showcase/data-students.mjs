/**
 * Estudiantes del seed "showcase" (20), todos FICTICIOS y con perfil completo
 * (bio, titular, skills, experiencia, educación, idiomas, intereses, certificaciones y CV).
 * Contraseña de todas las cuentas: CollabU2026!
 *
 * Formato de skills: [nombreNormalizadoDelCatálogo, nivel, añosDeExperiencia]
 * (el generador resuelve el catalog_skill_id y el nombre visible desde admin_db).
 *
 * Distribución:
 *   S1–S7   proyecto COMPLETADO (con evaluaciones y nota final)
 *   S8–S13  proyecto EN CURSO (distintas etapas académicas)
 *   S14–S20 postulantes activos a proyectos publicados
 */
export const students = [
  // ───────────── Completados ─────────────
  {
    key: 'S1', first: 'Valentina', last: 'Guerrero Burbano', email: 'valentina.guerrero@collabu.dev',
    program: 'SIS', semester: 10, gpa: 4.32, dob: '2002-03-14', gender: 'female',
    headline: 'Ingeniera de Sistemas en formación · UX/UI y Frontend',
    bio: 'Me apasiona unir diseño y código para crear interfaces claras y accesibles. He liderado el rediseño de portales web y disfruto traducir investigación con usuarios en decisiones de producto. Busco crecer en equipos que valoren la experiencia de usuario tanto como la calidad técnica.',
    hours: 30, mode: 'hybrid', availability: 'part_time', relocate: false,
    skills: [['figma', 'advanced', 2.5], ['react', 'advanced', 2], ['typescript', 'intermediate', 1.5], ['javascript', 'advanced', 2.5], ['git', 'intermediate', 2], ['comunicacion efectiva', 'advanced', 3], ['pensamiento critico', 'advanced', 3]],
    exp: [
      { type: 'freelance', title: 'Diseñadora UI/UX freelance', company: 'Independiente', desc: 'Diseño de interfaces y prototipos para emprendimientos locales de turismo y gastronomía en Pasto.', start: '2024-03-01', end: '2025-05-31', tech: ['Figma', 'React'], ach: ['Rediseño de 4 sitios web con aumento promedio de 30 % en consultas', 'Creación de un sistema de diseño reutilizable'] },
    ],
    langs: [['Inglés', 'intermediate', 'TOEIC', '720']],
    interests: [['Experiencia de Usuario', 'Sistemas de diseño'], ['Frontend', 'Accesibilidad web']],
    certs: [{ name: 'Google UX Design Professional Certificate', org: 'Google · Coursera', date: '2024-11-20', id: 'UX-GOOG-84213' }],
  },
  {
    key: 'S2', first: 'Andrés Felipe', last: 'Insuasty Rosero', email: 'andres.insuasty@collabu.dev',
    program: 'ELE', semester: 10, gpa: 4.18, dob: '2001-09-02', gender: 'male',
    headline: 'Ingeniero Electrónico en formación · Sistemas embebidos e IoT',
    bio: 'Diseño hardware y firmware para dispositivos de bajo consumo con comunicación inalámbrica. Disfruto llevar un prototipo desde el esquemático hasta la prueba en campo y documentar cada decisión técnica. Me interesa el IoT aplicado al sector agrícola.',
    hours: 40, mode: 'on_site', availability: 'full_time', relocate: true,
    skills: [['esp32', 'advanced', 2], ['arduino', 'advanced', 3], ['sistemas embebidos', 'advanced', 2.5], ['kicad', 'intermediate', 1.5], ['comunicaciones inalambricas', 'intermediate', 1.5], ['c', 'advanced', 3], ['electronica de potencia', 'intermediate', 1]],
    exp: [
      { type: 'academic', title: 'Monitor del laboratorio de Sistemas Digitales', company: 'Universidad de Nariño', desc: 'Apoyo a prácticas de laboratorio y mantenimiento de equipos de medición para cursos de electrónica digital.', start: '2024-02-01', end: '2025-06-30', tech: ['VHDL', 'Osciloscopio'], ach: ['Elaboró 6 guías de laboratorio revisadas por docentes'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Internet de las Cosas', 'Telemetría de bajo consumo'], ['Electrónica de Potencia', 'Energía solar']],
    certs: [{ name: 'Fundamentals of IoT', org: 'Cisco Networking Academy', date: '2024-08-15', id: 'CNA-IOT-55120' }],
  },
  {
    key: 'S3', first: 'Daniela Alejandra', last: 'Portilla Ceballos', email: 'daniela.portilla@collabu.dev',
    program: 'SIS', semester: 10, gpa: 4.41, dob: '2002-01-27', gender: 'female',
    headline: 'Ingeniera de Sistemas en formación · Datos y visualización',
    bio: 'Me gusta convertir datos en decisiones: modelo bases relacionales, construyo tableros interactivos y automatizo reportes. He trabajado con Angular y PostgreSQL en proyectos de analítica comercial. Valoro la comunicación clara de resultados a públicos no técnicos.',
    hours: 30, mode: 'remote', availability: 'flexible', relocate: false,
    skills: [['angular', 'advanced', 2], ['typescript', 'advanced', 2], ['sql', 'advanced', 2.5], ['postgresql', 'intermediate', 2], ['analisis de datos', 'advanced', 2], ['git', 'intermediate', 2], ['docker', 'beginner', 0.5]],
    exp: [
      { type: 'internship', title: 'Practicante de Inteligencia de Negocios', company: 'Distribuidora Andina del Sur', desc: 'Construcción de tableros de ventas y automatización de reportes semanales para la gerencia comercial.', start: '2025-01-13', end: '2025-06-27', tech: ['SQL', 'PostgreSQL', 'Excel'], ach: ['Redujo de 6 h a 20 min la generación del reporte semanal'] },
    ],
    langs: [['Inglés', 'advanced', 'TOEFL ITP', '580']],
    interests: [['Analítica de Datos', 'Visualización'], ['Frontend', 'Aplicaciones de datos']],
    certs: [{ name: 'Data Analysis with SQL', org: 'Coursera', date: '2024-05-18', id: 'SQL-DA-33871' }, { name: 'Angular Avanzado', org: 'Plataforma Aprende Digital', date: '2025-03-02', id: 'ANG-ADV-1209' }],
  },
  {
    key: 'S4', first: 'Juan Sebastián', last: 'Erazo Timaná', email: 'juan.erazo@collabu.dev',
    program: 'SIS', semester: 9, gpa: 4.27, dob: '2002-06-09', gender: 'male',
    headline: 'Ingeniero de Sistemas en formación · Machine Learning aplicado',
    bio: 'Entreno y evalúo modelos predictivos sobre datos reales, cuidando la validación y la interpretabilidad. Me interesa el uso de ML en agricultura y salud pública. Programo principalmente en Python y documento mis experimentos para que sean reproducibles.',
    hours: 30, mode: 'hybrid', availability: 'part_time', relocate: false,
    skills: [['python', 'advanced', 2.5], ['machine learning', 'intermediate', 1.5], ['analisis de datos', 'advanced', 2], ['sql', 'intermediate', 2], ['git', 'intermediate', 2], ['redaccion tecnica', 'intermediate', 1]],
    exp: [
      { type: 'academic', title: 'Semillero de Investigación en Inteligencia Artificial', company: 'Universidad de Nariño', desc: 'Participación en un semillero que aplica aprendizaje automático a series de tiempo climáticas de la región.', start: '2024-08-01', end: null, current: true, tech: ['Python', 'scikit-learn', 'Pandas'], ach: ['Ponencia en el encuentro regional de semilleros 2025'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Inteligencia Artificial', 'Series de tiempo'], ['Agricultura de precisión', 'Modelos predictivos']],
    certs: [{ name: 'Machine Learning Specialization', org: 'DeepLearning.AI · Coursera', date: '2025-01-30', id: 'ML-SPEC-90214' }],
  },
  {
    key: 'S5', first: 'María Camila', last: 'Delgado Yépez', email: 'camila.delgado@collabu.dev',
    program: 'CIV', semester: 10, gpa: 4.22, dob: '2001-11-21', gender: 'female',
    headline: 'Ingeniera Civil en formación · Interventoría y control de obra',
    bio: 'Me enfoco en el control técnico y administrativo de obras de saneamiento: seguimiento de cronogramas, verificación de calidad y elaboración de informes. Disfruto el trabajo en campo y la coordinación con contratistas. Aspiro a especializarme en gestión de proyectos de infraestructura.',
    hours: 40, mode: 'on_site', availability: 'full_time', relocate: true,
    skills: [['interventoria', 'intermediate', 1], ['gestion de obras', 'intermediate', 1.5], ['hidraulica', 'intermediate', 1.5], ['hidrologia', 'intermediate', 1], ['ms project', 'intermediate', 1.5], ['autocad', 'advanced', 2.5], ['redaccion tecnica', 'advanced', 2]],
    exp: [
      { type: 'internship', title: 'Auxiliar de ingeniería', company: 'Constructora Altos del Galeras', desc: 'Apoyo en la programación de obra, control de materiales y elaboración de actas de avance en un proyecto de vivienda.', start: '2025-01-20', end: '2025-06-20', tech: ['AutoCAD', 'MS Project'], ach: ['Actualizó el cronograma maestro con seguimiento semanal de rendimientos'] },
    ],
    langs: [['Inglés', 'basic', null, null]],
    interests: [['Gestión de Proyectos', 'Interventoría'], ['Saneamiento básico', 'Redes de alcantarillado']],
    certs: [{ name: 'Gestión de Proyectos con MS Project', org: 'SENA', date: '2024-10-04', id: 'SENA-GP-77120' }],
  },
  {
    key: 'S6', first: 'Sergio Esteban', last: 'Villota Narváez', email: 'sergio.villota@collabu.dev',
    program: 'CIV', semester: 10, gpa: 4.35, dob: '2001-04-30', gender: 'male',
    headline: 'Ingeniero Civil en formación · Diseño estructural',
    bio: 'Analizo y diseño estructuras de concreto reforzado aplicando la NSR-10 y modelo en ETABS y SAP2000. Me gusta verificar resultados con cálculos manuales antes de confiar en el software. Mi objetivo es dedicarme al diseño de puentes y edificaciones sismorresistentes.',
    hours: 40, mode: 'hybrid', availability: 'full_time', relocate: true,
    skills: [['etabs', 'advanced', 1.5], ['sap2000', 'advanced', 1.5], ['concreto reforzado', 'advanced', 2], ['diseno estructural', 'advanced', 2], ['autocad', 'advanced', 2.5], ['revit', 'intermediate', 1]],
    exp: [
      { type: 'academic', title: 'Monitor de Estructuras de Concreto', company: 'Universidad de Nariño', desc: 'Acompañamiento a estudiantes en talleres de diseño de vigas, columnas y losas.', start: '2024-02-01', end: '2024-12-15', tech: ['ETABS', 'Excel'], ach: ['Elaboró hojas de cálculo de verificación utilizadas en el curso'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Estructuras', 'Puentes'], ['Sismorresistencia', 'NSR-10']],
    certs: [{ name: 'Análisis y Diseño Sismorresistente', org: 'Sociedad Nariñense de Ingenieros', date: '2025-02-14', id: 'SNI-ADS-3341' }],
  },
  {
    key: 'S7', first: 'Laura Sofía', last: 'Bolaños Chamorro', email: 'laura.bolanos@collabu.dev',
    program: 'ELE', semester: 10, gpa: 4.29, dob: '2001-12-18', gender: 'female',
    headline: 'Ingeniera Electrónica en formación · Señales y mantenimiento predictivo',
    bio: 'Trabajo con adquisición y procesamiento de señales para detectar fallas en maquinaria rotativa. Combino MATLAB, Python e instrumentación para convertir mediciones en diagnósticos accionables. Me motiva reducir paradas no planeadas en la industria.',
    hours: 40, mode: 'on_site', availability: 'full_time', relocate: false,
    skills: [['procesamiento de senales', 'advanced', 2], ['matlab/simulink', 'advanced', 2.5], ['python', 'intermediate', 1.5], ['iot', 'intermediate', 1], ['labview', 'intermediate', 1.5], ['control automatico', 'intermediate', 1.5]],
    exp: [
      { type: 'academic', title: 'Auxiliar de investigación en vibraciones', company: 'Universidad de Nariño', desc: 'Adquisición y análisis espectral de vibraciones en un banco de pruebas de motores trifásicos.', start: '2024-08-01', end: '2025-06-30', tech: ['MATLAB', 'LabVIEW', 'Acelerómetros'], ach: ['Identificó desbalance y desalineación con precisión superior al 90 % en el banco de pruebas'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Mantenimiento Predictivo', 'Análisis espectral'], ['Procesamiento de Señales', 'Diagnóstico de fallas']],
    certs: [{ name: 'Signal Processing with MATLAB', org: 'MathWorks Academia', date: '2024-06-22', id: 'MW-SP-61209' }],
  },

  // ───────────── En curso ─────────────
  {
    key: 'S8', first: 'Miguel Ángel', last: 'Zambrano Pantoja', email: 'miguel.zambrano@collabu.dev',
    program: 'SIS', semester: 9, gpa: 4.24, dob: '2002-02-11', gender: 'male',
    headline: 'Ingeniero de Sistemas en formación · Backend y arquitectura de microservicios',
    bio: 'Construyo APIs con NestJS y PostgreSQL y me interesa la arquitectura distribuida: contenedores, mensajería y observabilidad. Aprendo rápido y disfruto las revisiones de código. Actualmente participo en la migración de una plataforma de recaudo hacia microservicios.',
    hours: 30, mode: 'hybrid', availability: 'part_time', relocate: false,
    skills: [['nestjs', 'advanced', 1.5], ['node', 'advanced', 2], ['typescript', 'advanced', 2], ['microservicios', 'intermediate', 1], ['docker', 'intermediate', 1.5], ['postgresql', 'intermediate', 2], ['ci/cd', 'beginner', 0.5], ['rest apis', 'advanced', 2], ['git', 'advanced', 2.5]],
    exp: [
      { type: 'freelance', title: 'Desarrollador backend freelance', company: 'Independiente', desc: 'APIs REST y automatizaciones para comercios locales y una asociación de transportadores.', start: '2024-06-01', end: null, current: true, tech: ['NestJS', 'PostgreSQL', 'Docker'], ach: ['Entregó 5 proyectos en producción con cero incidentes críticos'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Backend', 'Arquitectura de microservicios'], ['DevOps', 'Integración continua']],
    certs: [{ name: 'Docker Essentials', org: 'Plataforma Aprende Digital', date: '2025-04-10', id: 'DKR-ESS-4410' }],
  },
  {
    key: 'S9', first: 'Karen Tatiana', last: 'Cabrera Ortiz', email: 'karen.cabrera@collabu.dev',
    program: 'SIS', semester: 9, gpa: 4.15, dob: '2002-08-05', gender: 'female',
    headline: 'Ingeniera de Sistemas en formación · Full stack con IoT',
    bio: 'Me gusta conectar el mundo físico con el software: recibo datos de sensores, los almaceno y los muestro en tableros claros. Trabajo con Node.js, React y PostgreSQL. Estoy desarrollando un sistema de trazabilidad de cadena de frío para la industria láctea.',
    hours: 30, mode: 'hybrid', availability: 'part_time', relocate: false,
    skills: [['node', 'advanced', 2], ['react', 'intermediate', 1.5], ['postgresql', 'intermediate', 1.5], ['iot', 'intermediate', 1], ['rest apis', 'advanced', 2], ['docker', 'beginner', 0.5], ['javascript', 'advanced', 2.5]],
    exp: [
      { type: 'volunteer', title: 'Voluntaria de transformación digital', company: 'Asociación de Productores de Leche de Nariño', desc: 'Digitalización del registro de acopio de leche con una aplicación web sencilla para los transportadores.', start: '2024-09-01', end: '2025-04-30', tech: ['React', 'Node.js'], ach: ['Reemplazó el registro en papel de 40 productores'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Internet de las Cosas', 'Trazabilidad'], ['Full stack', 'Aplicaciones para el agro']],
    certs: [{ name: 'Node.js: Aplicaciones Escalables', org: 'Plataforma Aprende Digital', date: '2025-02-25', id: 'NODE-ESC-7712' }],
  },
  {
    key: 'S10', first: 'Cristian David', last: 'Mora Santacruz', email: 'cristian.mora@collabu.dev',
    program: 'CIV', semester: 9, gpa: 4.11, dob: '2001-10-07', gender: 'male',
    headline: 'Ingeniero Civil en formación · Diseño vial y topografía',
    bio: 'Me interesan las vías rurales: levantamientos topográficos, diseño geométrico y presupuestos que realmente reflejen las condiciones del terreno. Manejo Civil 3D y AutoCAD, y disfruto el trabajo en campo. Participo en el diseño de una vía terciaria para mejorar el acceso de comunidades campesinas.',
    hours: 40, mode: 'on_site', availability: 'full_time', relocate: true,
    skills: [['civil 3d', 'intermediate', 1.5], ['topografia', 'advanced', 2], ['vias y pavimentos', 'intermediate', 1.5], ['presupuestos y apus', 'intermediate', 1], ['autocad', 'advanced', 2.5], ['arcgis', 'beginner', 0.5]],
    exp: [
      { type: 'internship', title: 'Auxiliar de topografía', company: 'Topografía y Vías del Sur', desc: 'Apoyo en levantamientos con estación total y GPS para proyectos de mejoramiento vial rural.', start: '2025-06-23', end: '2025-12-12', tech: ['Estación total', 'Civil 3D'], ach: ['Participó en el levantamiento de 12 km de corredores veredales'] },
    ],
    langs: [['Inglés', 'basic', null, null]],
    interests: [['Infraestructura Vial', 'Vías rurales'], ['Topografía', 'Modelos digitales de terreno']],
    certs: [{ name: 'Civil 3D para Diseño Vial', org: 'Autodesk · Aula Virtual', date: '2025-03-14', id: 'ADSK-C3D-2218' }],
  },
  {
    key: 'S11', first: 'Paula Andrea', last: 'Revelo Guerrero', email: 'paula.revelo@collabu.dev',
    program: 'ELE', semester: 9, gpa: 4.2, dob: '2002-05-16', gender: 'female',
    headline: 'Ingeniera Electrónica en formación · Automatización con PLC',
    bio: 'Programo PLC y diseño lógicas de control para procesos industriales, con atención especial a la seguridad y la documentación. Me interesa la integración de variadores, sensores y HMI. Voy a desarrollar el tablero de control de una línea de embotellado.',
    hours: 40, mode: 'on_site', availability: 'full_time', relocate: true,
    skills: [['plc', 'intermediate', 1.5], ['automatizacion industrial', 'intermediate', 1.5], ['control automatico', 'intermediate', 1.5], ['electronica de potencia', 'intermediate', 1], ['labview', 'beginner', 0.5], ['multisim', 'intermediate', 1.5]],
    exp: [
      { type: 'academic', title: 'Auxiliar del laboratorio de Automatización', company: 'Universidad de Nariño', desc: 'Mantenimiento de estaciones didácticas con PLC y apoyo a prácticas de control de motores.', start: '2024-08-01', end: '2025-06-30', tech: ['PLC', 'Ladder'], ach: ['Documentó 8 prácticas con diagramas y listas de materiales'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Automatización Industrial', 'PLC y HMI'], ['Electrónica de Potencia', 'Variadores de frecuencia']],
    certs: [{ name: 'Programación de PLC Nivel I', org: 'Centro de Formación Industrial del Sur', date: '2025-01-18', id: 'CFI-PLC-1-0452' }],
  },
  {
    key: 'S12', first: 'Julián David', last: 'Benavides Paz', email: 'julian.benavides@collabu.dev',
    program: 'ELE', semester: 9, gpa: 4.13, dob: '2002-03-03', gender: 'male',
    headline: 'Ingeniero Electrónico en formación · Robótica y control',
    bio: 'Diseño y construyo prototipos robóticos con microcontroladores, desde la mecánica básica hasta el control de movimiento. Me gusta la parte didáctica: hacer que la tecnología sea comprensible. Mi trabajo de grado es un brazo robótico para capacitación técnica.',
    hours: 30, mode: 'hybrid', availability: 'part_time', relocate: false,
    skills: [['robotica', 'intermediate', 1.5], ['arduino', 'advanced', 3], ['sistemas embebidos', 'intermediate', 1.5], ['matlab/simulink', 'intermediate', 1.5], ['control automatico', 'intermediate', 1.5], ['c++', 'intermediate', 2]],
    exp: [
      { type: 'volunteer', title: 'Instructor de robótica educativa', company: 'Club de Ciencia y Tecnología Juvenil', desc: 'Talleres de robótica con Arduino para estudiantes de bachillerato de colegios públicos.', start: '2024-03-01', end: '2025-06-30', tech: ['Arduino', 'Servomotores'], ach: ['Capacitó a más de 60 estudiantes de secundaria'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Robótica', 'Manipuladores'], ['Educación Tecnológica', 'Kits didácticos']],
    certs: [{ name: 'Robotics: Aerial and Industrial Systems', org: 'Coursera', date: '2024-12-05', id: 'ROB-AI-58392' }],
  },
  {
    key: 'S13', first: 'Natalia Estefanía', last: 'Ortega Muñoz', email: 'natalia.ortega@collabu.dev',
    program: 'ELE', semester: 10, gpa: 4.37, dob: '2001-07-24', gender: 'female',
    headline: 'Ingeniera Electrónica en formación · Electrónica de potencia y energía solar',
    bio: 'Diseño convertidores de potencia y sus tarjetas de circuito impreso, desde la simulación hasta la validación en banco. Me interesa mejorar la eficiencia de los sistemas fotovoltaicos con seguimiento del punto de máxima potencia. Mi trabajo de grado desarrolla un inversor solar de baja potencia.',
    hours: 40, mode: 'on_site', availability: 'full_time', relocate: true,
    skills: [['electronica de potencia', 'advanced', 2], ['stm32', 'intermediate', 1.5], ['diseno de pcbs', 'advanced', 2], ['altium designer', 'intermediate', 1.5], ['proteus', 'advanced', 2.5], ['c', 'intermediate', 2]],
    exp: [
      { type: 'internship', title: 'Practicante de diseño electrónico', company: 'Soluciones Electrónicas Pacífico', desc: 'Diseño de fuentes conmutadas y rediseño de una tarjeta de control para equipos de medición.', start: '2025-01-13', end: '2025-06-13', tech: ['Altium Designer', 'Proteus'], ach: ['Redujo el costo de la tarjeta de control en un 18 %'] },
    ],
    langs: [['Inglés', 'advanced', 'TOEFL ITP', '560']],
    interests: [['Energías Renovables', 'Sistemas fotovoltaicos'], ['Electrónica de Potencia', 'Convertidores DC-AC']],
    certs: [{ name: 'Power Electronics Specialization', org: 'University of Colorado · Coursera', date: '2024-09-12', id: 'PE-SPEC-47751' }],
  },

  // ───────────── Postulantes activos ─────────────
  {
    key: 'S14', first: 'Brayan Steven', last: 'Narváez Ibarra', email: 'brayan.narvaez@collabu.dev',
    program: 'SIS', semester: 8, gpa: 4.05, dob: '2003-01-19', gender: 'male',
    headline: 'Ingeniero de Sistemas en formación · Desarrollo web full stack',
    bio: 'Desarrollo aplicaciones web con React y NestJS y me interesa llevar un producto desde la idea hasta producción. Aprendo con proyectos propios y colaboro activamente en equipos pequeños. Busco una práctica donde pueda aportar desde el primer día y seguir creciendo.',
    hours: 30, mode: 'hybrid', availability: 'part_time', relocate: false,
    skills: [['react', 'intermediate', 1.5], ['nestjs', 'intermediate', 1], ['postgresql', 'intermediate', 1.5], ['typescript', 'intermediate', 1.5], ['docker', 'beginner', 0.5], ['git', 'intermediate', 2]],
    exp: [
      { type: 'freelance', title: 'Desarrollador web freelance', company: 'Independiente', desc: 'Sitios y tiendas en línea para pequeños comercios de Pasto e Ipiales.', start: '2024-10-01', end: null, current: true, tech: ['React', 'NestJS'], ach: ['Lanzó 3 tiendas en línea con pasarela de pagos'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Desarrollo Web', 'Aplicaciones full stack'], ['Emprendimiento', 'Productos digitales']],
    certs: [{ name: 'React: De Cero a Experto', org: 'Plataforma Aprende Digital', date: '2025-05-08', id: 'REACT-CE-8821' }],
  },
  {
    key: 'S15', first: 'Ángela Lucía', last: 'Cuaspud Melo', email: 'angela.cuaspud@collabu.dev',
    program: 'SIS', semester: 9, gpa: 4.3, dob: '2002-04-12', gender: 'female',
    headline: 'Ingeniera de Sistemas en formación · Ciencia de datos y NLP',
    bio: 'Me apasiona la ciencia de datos aplicada: limpieza, modelado y comunicación de hallazgos. He trabajado con clasificación de texto y análisis de series de tiempo. Busco una práctica donde pueda poner a prueba modelos con datos reales y aprender de un equipo experimentado.',
    hours: 30, mode: 'remote', availability: 'flexible', relocate: false,
    skills: [['python', 'advanced', 2.5], ['machine learning', 'intermediate', 1.5], ['sql', 'advanced', 2], ['analisis de datos', 'advanced', 2], ['javascript', 'intermediate', 1.5], ['rest apis', 'intermediate', 1.5]],
    exp: [
      { type: 'academic', title: 'Auxiliar de investigación en minería de datos', company: 'Universidad de Nariño', desc: 'Clasificación de textos de encuestas ciudadanas y construcción de tableros para el observatorio regional.', start: '2024-08-01', end: '2025-06-30', tech: ['Python', 'Pandas', 'scikit-learn'], ach: ['Automatizó la clasificación de 5.000 respuestas abiertas'] },
    ],
    langs: [['Inglés', 'advanced', 'TOEFL ITP', '575']],
    interests: [['Ciencia de Datos', 'Procesamiento de lenguaje natural'], ['Analítica Social', 'Datos abiertos']],
    certs: [{ name: 'Natural Language Processing Specialization', org: 'DeepLearning.AI · Coursera', date: '2025-03-28', id: 'NLP-SPEC-20977' }],
  },
  {
    key: 'S16', first: 'Diego Armando', last: 'Enríquez Lasso', email: 'diego.enriquez@collabu.dev',
    program: 'ELE', semester: 8, gpa: 4.08, dob: '2002-11-29', gender: 'male',
    headline: 'Ingeniero Electrónico en formación · IoT y agrotecnología',
    bio: 'Crecí en una familia de productores y quiero usar la electrónica para facilitar el trabajo en finca. Desarrollo nodos de sensado con ESP32 y los conecto a plataformas en la nube. Busco una práctica en IoT donde pueda probar mis diseños directamente en campo.',
    hours: 40, mode: 'on_site', availability: 'full_time', relocate: true,
    skills: [['iot', 'intermediate', 1.5], ['esp32', 'intermediate', 1.5], ['arduino', 'advanced', 2.5], ['python', 'intermediate', 1.5], ['sistemas embebidos', 'intermediate', 1.5], ['comunicaciones inalambricas', 'intermediate', 1]],
    exp: [
      { type: 'volunteer', title: 'Proyecto comunitario de monitoreo de humedad', company: 'Asociación de Productores de Papa de Pupiales', desc: 'Instalación de nodos de humedad de suelo con ESP32 en 6 parcelas demostrativas.', start: '2024-11-01', end: '2025-05-31', tech: ['ESP32', 'LoRa'], ach: ['Los productores redujeron riegos innecesarios en las parcelas piloto'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Internet de las Cosas', 'Agricultura de precisión'], ['Sistemas Embebidos', 'Bajo consumo']],
    certs: [{ name: 'IoT Fundamentals', org: 'Cisco Networking Academy', date: '2025-02-10', id: 'CNA-IOTF-60418' }],
  },
  {
    key: 'S17', first: 'Mónica Alejandra', last: 'Rodríguez Eraso', email: 'monica.rodriguez@collabu.dev',
    program: 'ELE', semester: 9, gpa: 4.26, dob: '2002-02-08', gender: 'female',
    headline: 'Ingeniera Electrónica en formación · Automatización y SCADA',
    bio: 'Me enfoco en automatización industrial: lógicas con PLC, supervisión con SCADA y puesta en marcha en planta. Valoro la seguridad y la documentación rigurosa. Busco una práctica en una empresa que trabaje con subestaciones o procesos continuos.',
    hours: 40, mode: 'on_site', availability: 'full_time', relocate: true,
    skills: [['plc', 'advanced', 2], ['automatizacion industrial', 'advanced', 2], ['labview', 'intermediate', 1.5], ['control automatico', 'advanced', 2], ['matlab/simulink', 'intermediate', 1.5], ['c', 'intermediate', 2]],
    exp: [
      { type: 'internship', title: 'Practicante de mantenimiento eléctrico', company: 'Embotelladora Regional del Sur', desc: 'Apoyo en el mantenimiento de tableros y en la programación de rutinas de PLC para una línea de llenado.', start: '2025-01-13', end: '2025-06-13', tech: ['PLC', 'Variadores'], ach: ['Redujo en un 12 % los paros por fallas en sensores'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Automatización Industrial', 'SCADA'], ['Energía Eléctrica', 'Subestaciones']],
    certs: [{ name: 'Seguridad Eléctrica RETIE', org: 'SENA', date: '2024-11-22', id: 'SENA-RETIE-9034' }],
  },
  {
    key: 'S18', first: 'Óscar Iván', last: 'Tobar Burbano', email: 'oscar.tobar@collabu.dev',
    program: 'CIV', semester: 8, gpa: 4.0, dob: '2002-09-13', gender: 'male',
    headline: 'Ingeniero Civil en formación · Edificaciones y modelación BIM',
    bio: 'Me interesa la coordinación de proyectos de edificación con herramientas BIM para detectar interferencias antes de construir. Manejo Revit y AutoCAD y aprendo rápido en obra. Busco una práctica donde pueda modelar y apoyar la supervisión técnica.',
    hours: 40, mode: 'hybrid', availability: 'full_time', relocate: false,
    skills: [['revit', 'intermediate', 1.5], ['autocad', 'advanced', 2.5], ['diseno estructural', 'intermediate', 1], ['gestion de obras', 'beginner', 0.5], ['topografia', 'intermediate', 1]],
    exp: [
      { type: 'volunteer', title: 'Voluntario en mejoramiento de vivienda', company: 'Fundación Techo Nariño', desc: 'Levantamientos y planos para el mejoramiento de viviendas de familias de bajos recursos.', start: '2024-06-01', end: '2025-05-31', tech: ['AutoCAD'], ach: ['Elaboró planos para 9 viviendas intervenidas'] },
    ],
    langs: [['Inglés', 'basic', null, null]],
    interests: [['BIM', 'Coordinación de proyectos'], ['Edificaciones', 'Vivienda de interés social']],
    certs: [{ name: 'Revit Architecture Fundamentals', org: 'Autodesk · Aula Virtual', date: '2025-04-02', id: 'ADSK-RVT-1980' }],
  },
  {
    key: 'S19', first: 'Daniela Fernanda', last: 'Hidalgo Paz', email: 'daniela.hidalgo@collabu.dev',
    program: 'CIV', semester: 9, gpa: 4.19, dob: '2002-06-26', gender: 'female',
    headline: 'Ingeniera Civil en formación · Geotecnia y gestión del riesgo',
    bio: 'Me interesa entender el comportamiento del suelo y la estabilidad de taludes en una región montañosa como Nariño. Combino trabajo de campo, ensayos de laboratorio y sistemas de información geográfica. Aspiro a aportar a la gestión del riesgo en corredores viales.',
    hours: 40, mode: 'hybrid', availability: 'full_time', relocate: true,
    skills: [['geotecnia', 'intermediate', 1.5], ['topografia', 'intermediate', 1.5], ['arcgis', 'intermediate', 1], ['autocad', 'advanced', 2], ['hidrologia', 'intermediate', 1], ['redaccion tecnica', 'advanced', 2]],
    exp: [
      { type: 'academic', title: 'Auxiliar del laboratorio de Suelos', company: 'Universidad de Nariño', desc: 'Ejecución de ensayos de clasificación, compactación y corte directo, y elaboración de informes.', start: '2024-08-01', end: '2025-06-30', tech: ['Ensayos de suelos', 'Excel'], ach: ['Elaboró más de 30 informes de laboratorio'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Geotecnia', 'Estabilidad de taludes'], ['Gestión del Riesgo', 'Movimientos en masa']],
    certs: [{ name: 'Fundamentos de SIG con ArcGIS', org: 'Esri Colombia · Aula Virtual', date: '2025-03-06', id: 'ESRI-SIG-4417' }],
  },
  {
    key: 'S20', first: 'Ricardo Andrés', last: 'Chaves Rivera', email: 'ricardo.chaves@collabu.dev',
    program: 'SIS', semester: 8, gpa: 4.1, dob: '2003-03-07', gender: 'male',
    headline: 'Ingeniero de Sistemas en formación · Full stack y buenas prácticas',
    bio: 'Me interesan las buenas prácticas de ingeniería: pruebas automatizadas, revisión de código y metodologías ágiles. Desarrollo con NestJS, React y GraphQL, y disfruto trabajar en equipos con cultura de calidad. Busco una práctica donde pueda aprender de desarrolladores con experiencia.',
    hours: 30, mode: 'remote', availability: 'part_time', relocate: false,
    skills: [['nestjs', 'intermediate', 1], ['react', 'intermediate', 1.5], ['graphql', 'beginner', 0.5], ['postgresql', 'intermediate', 1.5], ['docker', 'beginner', 0.5], ['testing', 'intermediate', 1], ['metodologias agiles', 'intermediate', 1.5]],
    exp: [
      { type: 'academic', title: 'Líder de equipo en proyecto de curso de Ingeniería de Software', company: 'Universidad de Nariño', desc: 'Coordinación de un equipo de 5 personas bajo Scrum para entregar una plataforma de gestión de inventarios.', start: '2025-02-01', end: '2025-06-15', tech: ['NestJS', 'React', 'Jest'], ach: ['Entregó el proyecto con 85 % de cobertura de pruebas'] },
    ],
    langs: [['Inglés', 'intermediate', null, null]],
    interests: [['Calidad de Software', 'Pruebas automatizadas'], ['Metodologías Ágiles', 'Scrum']],
    certs: [{ name: 'Professional Scrum Fundamentals', org: 'Scrum Academia', date: '2025-04-19', id: 'PSF-3358' }],
  },
];
