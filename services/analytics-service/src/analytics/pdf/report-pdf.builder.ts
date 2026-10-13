import PDFDocument from 'pdfkit';
import { Report } from '../entities/report.entity';

/**
 * Genera el PDF de un reporte ya construido (Report.data): no hace queries nuevos, solo
 * renderiza lo que buildReportData() calculó y persistió.
 *
 * Estructura común de todos los reportes:
 *   1. Portada con título, tipo, alcance y fecha.
 *   2. "¿Qué es este reporte?" — qué mide y para qué sirve.
 *   3. Resumen ejecutivo — párrafo narrativo generado a partir de los datos.
 *   4. Indicadores clave (tarjetas), gráficos vectoriales (barras, dona, línea) y tablas.
 *   5. Hallazgos y observaciones — lectura automática de los números.
 *   6. Pie de página con numeración.
 *
 * Los gráficos se dibujan con primitivas vectoriales de pdfkit (sin dependencias nuevas).
 */

// ─── Constantes de diseño ───────────────────────────────────────────────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40; // margen lateral
const CW = PAGE_W - M * 2; // ancho útil
const BOTTOM = PAGE_H - 58; // y máxima antes de saltar de página

const C = {
  primary: '#166534',
  primaryDark: '#14532d',
  primarySoft: '#dcfce7',
  ink: '#111827',
  text: '#374151',
  muted: '#6b7280',
  line: '#e5e7eb',
  zebra: '#f3f4f6',
  card: '#f0fdf4',
  warn: '#b45309',
  bad: '#b91c1c',
};

const PALETTE = ['#166534', '#2563eb', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#65a30d', '#db2777', '#475569'];

type Doc = PDFKit.PDFDocument;
type Data = Record<string, any>;
interface Item {
  label: string;
  value: number;
  color?: string;
}

// ─── Punto de entrada ───────────────────────────────────────────────────────────────────────

export function buildReportPdf(report: Report): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: M, size: 'A4', bufferPages: true, info: { Title: report.name, Author: 'Collab-U' } });
  const d: Data = report.data ?? {};

  cover(doc, report, d);

  if (report.status === 'failed') {
    box(doc, 'No se pudo generar este reporte', `El proceso de generación terminó con un error. Detalle técnico: ${d.error ?? 'error desconocido'}. Vuelve a generarlo; si el problema persiste, revisa que los servicios de métricas estén disponibles.`, C.bad);
    footers(doc, report);
    return doc;
  }

  box(doc, '¿Qué es este reporte?', reportPurpose(report.reportType));

  switch (report.reportType) {
    case 'period_summary':
      renderPeriodSummary(doc, d);
      break;
    case 'skill_gap_analysis':
      renderSkillGap(doc, d);
      break;
    case 'matching_effectiveness':
      renderMatching(doc, d);
      break;
    case 'academic_process_summary':
      renderAcademicProcess(doc, d);
      break;
    case 'supervisor_workload':
      renderSupervisorWorkload(doc, d);
      break;
    case 'project_completion_rates':
      renderCompletionRates(doc, d);
      break;
    case 'company_performance':
      renderCompany(doc, d);
      break;
    case 'student_outcomes':
      renderStudent(doc, d);
      break;
    case 'supervisor_report':
      renderSupervisor(doc, d);
      break;
    default:
      renderGeneric(doc, d);
  }

  footers(doc, report);
  return doc;
}

// ─── Reportes por tipo ──────────────────────────────────────────────────────────────────────

function renderPeriodSummary(doc: Doc, d: Data): void {
  const series = metricsSeries(d.platformMetrics);
  const latest = series[series.length - 1];
  const skills = dedupeSkills(d.topSkills, (s) => s.skillName ?? s.name, (s) => s.demandCount ?? s.demand, (s) => s.supplyCount ?? s.supply);

  if (!latest) {
    paragraph(doc, 'Todavía no hay snapshots de plataforma. Las métricas se consolidan cada madrugada (1:00 a.m.) o pueden dispararse manualmente desde el panel de administración; vuelve a generar el reporte cuando existan datos.');
    return;
  }

  const appsPerProject = latest.totalProjects > 0 ? latest.totalApplications / latest.totalProjects : 0;
  const studentsPerCompany = latest.totalCompanies > 0 ? latest.totalStudents / latest.totalCompanies : 0;
  summary(doc, [
    `Al corte del ${dateLabel(latest.snapshotDate)} la plataforma reúne a ${n(latest.totalUsers)} usuarios: ${n(latest.totalStudents)} estudiantes y ${n(latest.totalCompanies)} empresas.`,
    `Hay ${n(latest.totalProjects)} proyectos registrados, de los cuales ${n(latest.activeProjects)} están activos, y se han recibido ${n(latest.totalApplications)} postulaciones (${appsPerProject.toFixed(1)} por proyecto en promedio).`,
    latest.avgMatchScore != null ? `El puntaje promedio de compatibilidad entre estudiantes y proyectos es de ${fmt(latest.avgMatchScore)}%.` : '',
    series.length > 1 ? `El histórico cubre ${series.length} cortes, entre ${dateLabel(series[0].snapshotDate)} y ${dateLabel(latest.snapshotDate)}.` : '',
  ]);

  kpiRow(doc, [
    { label: 'Usuarios totales', value: n(latest.totalUsers) },
    { label: 'Estudiantes', value: n(latest.totalStudents) },
    { label: 'Empresas', value: n(latest.totalCompanies) },
    { label: 'Proyectos activos', value: n(latest.activeProjects), hint: `de ${n(latest.totalProjects)} totales` },
  ]);
  kpiRow(doc, [
    { label: 'Postulaciones', value: n(latest.totalApplications) },
    { label: 'Postulaciones por proyecto', value: appsPerProject.toFixed(1) },
    { label: 'Match IA promedio', value: latest.avgMatchScore != null ? `${fmt(latest.avgMatchScore)}%` : '—' },
    { label: 'Nuevos usuarios (periodo)', value: n(latest.newUsersPeriod) },
  ]);

  heading(doc, 'Composición de la comunidad');
  paragraph(doc, 'Proporción entre estudiantes y empresas registradas. Un equilibrio saludable garantiza que haya suficientes oportunidades para la demanda estudiantil.');
  donut(doc, [
    { label: 'Estudiantes', value: latest.totalStudents },
    { label: 'Empresas', value: latest.totalCompanies },
    { label: 'Otros roles', value: Math.max(0, latest.totalUsers - latest.totalStudents - latest.totalCompanies) },
  ].filter((i) => i.value > 0));

  if (series.length > 1) {
    heading(doc, 'Evolución histórica');
    paragraph(doc, 'Comportamiento de los principales indicadores en los cortes disponibles. Permite ver el ritmo de adopción de la plataforma.');
    lineChart(doc, 'Usuarios totales', series.map((s) => ({ x: shortDate(s.snapshotDate), y: s.totalUsers })), C.primary);
    lineChart(doc, 'Postulaciones acumuladas', series.map((s) => ({ x: shortDate(s.snapshotDate), y: s.totalApplications })), '#2563eb');
    lineChart(doc, 'Proyectos totales', series.map((s) => ({ x: shortDate(s.snapshotDate), y: s.totalProjects })), '#d97706');
  }

  if (skills.length > 0) {
    heading(doc, 'Habilidades más demandadas');
    paragraph(doc, 'Comparación entre las habilidades que piden las empresas (demanda) y las que declaran los estudiantes (oferta).');
    groupedBars(doc, skills.slice(0, 10).map((s) => ({ label: s.name, a: s.demand, b: s.supply })), 'Demanda', 'Oferta');
    table(doc, ['Habilidad', 'Demanda', 'Oferta', 'Diferencia'], skills.slice(0, 10).map((s) => [s.name, n(s.demand), n(s.supply), signed(s.demand - s.supply)]));
  }

  const findings: string[] = [];
  findings.push(`Cada empresa cuenta, en promedio, con ${studentsPerCompany.toFixed(1)} estudiantes registrados en la plataforma.`);
  const deficit = skills.filter((s) => s.demand > s.supply).slice(0, 3).map((s) => s.name);
  if (deficit.length) findings.push(`Habilidades con más demanda que oferta: ${deficit.join(', ')}. Conviene impulsar su formación o su registro en los perfiles.`);
  if (latest.totalProjects > 0 && latest.activeProjects / latest.totalProjects < 0.4) findings.push('Menos del 40% de los proyectos están activos: revisar convocatorias vencidas o pendientes de aprobación.');
  if (latest.avgMatchScore != null) findings.push(matchReading(latest.avgMatchScore));
  bulletBox(doc, 'Hallazgos', findings);
}

function renderSkillGap(doc: Doc, d: Data): void {
  const skills = dedupeSkills(d.skills, (s) => s.name, (s) => s.demand, (s) => s.supply, (s) => s.trend, (s) => s.gap);
  if (skills.length === 0) {
    paragraph(doc, 'Aún no hay tendencias de habilidades calculadas. Se generan con la agregación diaria a partir de los proyectos publicados y los perfiles de estudiantes.');
    return;
  }
  const deficit = skills.filter((s) => s.demand > s.supply).sort((a, b) => b.demand - b.supply - (a.demand - a.supply));
  const surplus = skills.filter((s) => s.supply > s.demand).sort((a, b) => b.supply - b.demand - (a.supply - a.demand));
  const totalDemand = skills.reduce((t, s) => t + s.demand, 0);
  const totalSupply = skills.reduce((t, s) => t + s.supply, 0);

  summary(doc, [
    `Se analizaron ${n(skills.length)} habilidades. Las empresas solicitan en total ${n(totalDemand)} habilidades en sus proyectos, frente a ${n(totalSupply)} registradas por los estudiantes.`,
    deficit.length ? `${n(deficit.length)} habilidades tienen más demanda que oferta (déficit); la de mayor brecha es ${deficit[0].name}, con ${n(deficit[0].demand)} solicitudes frente a ${n(deficit[0].supply)} estudiantes.` : 'Ninguna habilidad presenta déficit: la oferta estudiantil cubre la demanda empresarial.',
    surplus.length ? `${n(surplus.length)} habilidades muestran superávit, es decir, más estudiantes que oportunidades concretas.` : '',
  ]);

  kpiRow(doc, [
    { label: 'Habilidades analizadas', value: n(skills.length) },
    { label: 'Con déficit', value: n(deficit.length), hint: 'demanda > oferta' },
    { label: 'Con superávit', value: n(surplus.length), hint: 'oferta > demanda' },
    { label: 'Demanda total', value: n(totalDemand), hint: `oferta ${n(totalSupply)}` },
  ]);

  heading(doc, 'Demanda frente a oferta (top 10 por demanda)');
  paragraph(doc, 'La barra verde es lo que piden las empresas; la azul, lo que ofrecen los estudiantes. Donde la verde supera a la azul hay una brecha por cubrir.');
  groupedBars(doc, [...skills].sort((a, b) => b.demand - a.demand).slice(0, 10).map((s) => ({ label: s.name, a: s.demand, b: s.supply })), 'Demanda', 'Oferta');

  if (deficit.length) {
    heading(doc, 'Mayores brechas (déficit)');
    hbars(doc, deficit.slice(0, 8).map((s) => ({ label: s.name, value: s.demand - s.supply, color: C.bad })), { suffix: '' });
  }

  const trends: Record<string, number> = {};
  for (const s of skills) if (s.trend) trends[s.trend] = (trends[s.trend] ?? 0) + 1;
  if (Object.keys(trends).length) {
    heading(doc, 'Tendencia de la demanda');
    paragraph(doc, 'Cuántas habilidades están en alza, estables o a la baja según la comparación con cortes anteriores.');
    donut(doc, Object.entries(trends).map(([k, v]) => ({ label: trendLabel(k), value: v })));
  }

  heading(doc, 'Detalle por habilidad');
  table(doc, ['Habilidad', 'Demanda', 'Oferta', 'Brecha', 'Tendencia'], [...skills].sort((a, b) => b.demand - a.demand).slice(0, 30).map((s) => [s.name, n(s.demand), n(s.supply), signed(s.demand - s.supply), s.trend ? trendLabel(s.trend) : '—']));

  const findings: string[] = [];
  if (deficit.length) findings.push(`Prioridad de formación: ${deficit.slice(0, 3).map((s) => s.name).join(', ')}.`);
  if (surplus.length) findings.push(`Perfiles con exceso de oferta: ${surplus.slice(0, 3).map((s) => s.name).join(', ')}; sugerir a las empresas proyectos que los aprovechen.`);
  const rising = skills.filter((s) => s.trend === 'rising').slice(0, 3).map((s) => s.name);
  if (rising.length) findings.push(`Habilidades en alza: ${rising.join(', ')}.`);
  bulletBox(doc, 'Hallazgos', findings);
}

function renderMatching(doc: Doc, d: Data): void {
  const series = metricsSeries(d.platformMetrics);
  const score = d.avgMatchScore;
  const fill = d.avgTimeToFillDays;
  summary(doc, [
    score != null ? `El puntaje promedio de compatibilidad (matching) entre estudiantes y proyectos es de ${fmt(score)} sobre 100. ${matchReading(score)}` : 'Todavía no hay puntajes de compatibilidad calculados. El sistema los genera cuando los estudiantes consultan proyectos recomendados o se postulan; el reporte se llenará a medida que haya actividad.',
    fill != null ? `En promedio, un proyecto tarda ${fmt(fill)} días en cubrir sus vacantes desde su publicación.` : '',
  ]);
  kpiRow(doc, [
    { label: 'Match IA promedio', value: score != null ? `${fmt(score)}%` : '—' },
    { label: 'Días promedio para cubrir vacante', value: fill != null ? fmt(fill) : '—' },
    { label: 'Cortes analizados', value: n(series.length) },
  ]);

  if (score != null) {
    heading(doc, 'Calidad del emparejamiento');
    paragraph(doc, 'Medidor del puntaje promedio frente a la escala completa de 0 a 100.');
    gauge(doc, 'Match promedio', score, 100, '%');
  }
  const withScore = series.filter((s) => s.avgMatchScore != null);
  if (withScore.length > 1) {
    heading(doc, 'Evolución del puntaje de match');
    lineChart(doc, 'Match IA promedio (%)', withScore.map((s) => ({ x: shortDate(s.snapshotDate), y: Number(s.avgMatchScore) })), C.primary);
  }
  const withFill = series.filter((s) => s.avgTimeToFillDays != null);
  if (withFill.length > 1) {
    heading(doc, 'Evolución del tiempo de cobertura');
    lineChart(doc, 'Días promedio para cubrir vacante', withFill.map((s) => ({ x: shortDate(s.snapshotDate), y: Number(s.avgTimeToFillDays) })), '#d97706');
  }

  const findings: string[] = [];
  if (score != null) findings.push(matchReading(score));
  if (withScore.length > 1) {
    const delta = Number(withScore[withScore.length - 1].avgMatchScore) - Number(withScore[0].avgMatchScore);
    findings.push(`Entre el primer y el último corte el puntaje ${delta >= 0 ? 'subió' : 'bajó'} ${Math.abs(delta).toFixed(1)} puntos.`);
  }
  if (fill != null) findings.push(fill > 30 ? 'El tiempo de cobertura supera los 30 días: revisar la visibilidad de las convocatorias.' : 'El tiempo de cobertura es razonable (menos de 30 días).');
  bulletBox(doc, 'Hallazgos', findings);
}

function renderAcademicProcess(doc: Doc, d: Data): void {
  const a = d.assignmentStats ?? {};
  const s = d.academicStats ?? {};
  const total = s.totalRecords ?? 0;
  const completed = s.completedCount ?? 0;
  const rate = total > 0 ? Math.round((completed / total) * 1000) / 10 : null;

  summary(doc, [
    `El proceso académico registra ${n(total)} expedientes, de los cuales ${n(completed)} están completados${rate != null ? ` (${rate}%)` : ''}.`,
    s.avgDurationDays != null ? `Un expediente tarda en promedio ${fmt(s.avgDurationDays)} días en completarse y el anteproyecto requiere ${fmt(s.avgAnteproyectoCorrections)} rondas de corrección en promedio.` : '',
    a.totalAssignments != null ? `Se han hecho ${n(a.totalAssignments)} asignaciones de docentes (asesores y jurados)${a.avgAcceptanceHours != null ? `, aceptadas en promedio en ${fmt(a.avgAcceptanceHours)} horas` : ''}.` : '',
  ]);

  kpiRow(doc, [
    { label: 'Expedientes', value: n(total) },
    { label: 'Completados', value: n(completed), hint: rate != null ? `${rate}% del total` : undefined },
    { label: 'Duración promedio (días)', value: fmt(s.avgDurationDays) },
    { label: 'Rondas de corrección', value: fmt(s.avgAnteproyectoCorrections), hint: 'del anteproyecto, promedio' },
  ]);
  kpiRow(doc, [
    { label: 'Asignaciones docentes', value: n(a.totalAssignments) },
    { label: 'Aceptación promedio (horas)', value: fmt(a.avgAcceptanceHours) },
  ]);

  if (s.byStatus && Object.keys(s.byStatus).length) {
    heading(doc, 'Expedientes por estado');
    paragraph(doc, 'Distribución de los expedientes académicos según la etapa del proceso en que se encuentran.');
    donut(doc, objItems(s.byStatus));
  }
  if (a.byRole && Object.keys(a.byRole).length) {
    heading(doc, 'Asignaciones por rol');
    hbars(doc, Object.entries(a.byRole).map(([k, v], i) => ({ label: roleLabel(k), value: Number(v), color: PALETTE[i % PALETTE.length] })));
  }
  if (a.byStatus && Object.keys(a.byStatus).length) {
    heading(doc, 'Asignaciones por estado');
    donut(doc, objItems(a.byStatus));
  }
  const workload: any[] = Array.isArray(a.supervisorWorkload) ? a.supervisorWorkload : [];
  if (workload.length) {
    heading(doc, 'Carga activa por docente');
    hbars(doc, workload.slice(0, 12).map((w) => ({ label: String(w.supervisorName ?? 'Docente'), value: Number(w.activeCount) })));
  }

  const findings: string[] = [];
  if (rate != null) findings.push(rate >= 50 ? `Más de la mitad de los expedientes ya concluyó (${rate}%).` : `Solo el ${rate}% de los expedientes ha concluido: la mayoría sigue en curso.`);
  if (s.avgAnteproyectoCorrections != null && s.avgAnteproyectoCorrections > 1.5) findings.push('El anteproyecto necesita más de una ronda de corrección en promedio: considerar guías o plantillas para estudiantes.');
  if (workload.length) {
    const top = [...workload].sort((x, y) => y.activeCount - x.activeCount)[0];
    findings.push(`El docente con más carga activa es ${top.supervisorName ?? 'sin nombre'} (${top.activeCount} estudiantes).`);
  }
  bulletBox(doc, 'Hallazgos', findings);
}

function renderSupervisorWorkload(doc: Doc, d: Data): void {
  const workload: any[] = Array.isArray(d.supervisorWorkload) ? [...d.supervisorWorkload].sort((x, y) => y.activeCount - x.activeCount) : [];
  const totalActive = workload.reduce((t, w) => t + Number(w.activeCount ?? 0), 0);
  const avg = workload.length ? totalActive / workload.length : 0;

  summary(doc, [
    `Se registran ${n(d.totalAssignments ?? 0)} asignaciones de docentes en la plataforma${d.avgAcceptanceHours != null ? `, con un tiempo promedio de aceptación de ${fmt(d.avgAcceptanceHours)} horas` : ''}.`,
    workload.length ? `${n(workload.length)} docentes tienen carga activa, con ${n(totalActive)} estudiantes a cargo en total (${avg.toFixed(1)} por docente).` : 'Ningún docente tiene estudiantes activos asignados en este momento.',
  ]);
  kpiRow(doc, [
    { label: 'Asignaciones totales', value: n(d.totalAssignments ?? 0) },
    { label: 'Docentes con carga', value: n(workload.length) },
    { label: 'Estudiantes a cargo', value: n(totalActive) },
    { label: 'Aceptación promedio (h)', value: fmt(d.avgAcceptanceHours) },
  ]);

  if (d.byRole && Object.keys(d.byRole).length) {
    heading(doc, 'Asignaciones por rol');
    paragraph(doc, 'Cuántas asignaciones corresponden a asesoría, jurado de anteproyecto y jurado final.');
    donut(doc, Object.entries(d.byRole).map(([k, v]) => ({ label: roleLabel(k), value: Number(v) })));
  }
  if (workload.length) {
    heading(doc, 'Carga por docente');
    paragraph(doc, 'Estudiantes activos por docente; ayuda a equilibrar nuevas asignaciones.');
    hbars(doc, workload.slice(0, 15).map((w) => ({ label: String(w.supervisorName ?? w.supervisorId ?? 'Docente'), value: Number(w.activeCount) })));
    table(doc, ['Docente', 'Estudiantes activos'], workload.map((w) => [String(w.supervisorName ?? w.supervisorId ?? '—'), n(w.activeCount)]));
  }

  const findings: string[] = [];
  if (workload.length > 1) {
    const max = workload[0];
    const min = workload[workload.length - 1];
    findings.push(`La mayor carga la tiene ${max.supervisorName ?? 'un docente'} (${max.activeCount}) y la menor ${min.supervisorName ?? 'otro docente'} (${min.activeCount}).`);
    if (max.activeCount > avg * 1.5) findings.push('La distribución está desbalanceada: priorizar a los docentes con menos carga en nuevas asignaciones.');
  }
  if (d.avgAcceptanceHours != null && d.avgAcceptanceHours > 48) findings.push('Los docentes tardan más de 48 horas en aceptar: considerar recordatorios automáticos.');
  bulletBox(doc, 'Hallazgos', findings);
}

function renderCompletionRates(doc: Doc, d: Data): void {
  const total = d.totalRecords ?? 0;
  const rate = d.completionRate;
  summary(doc, [
    `De ${n(total)} expedientes registrados, ${n(d.completedCount ?? 0)} han concluido satisfactoriamente${rate != null ? `, lo que equivale a una tasa de completitud del ${fmt(rate)}%` : ''}.`,
    d.avgDurationDays != null ? `La duración media de un proceso completo es de ${fmt(d.avgDurationDays)} días.` : '',
    d.avgAnteproyectoCorrections != null ? `El anteproyecto se corrige en promedio ${fmt(d.avgAnteproyectoCorrections)} veces antes de su aprobación.` : '',
  ]);
  kpiRow(doc, [
    { label: 'Expedientes totales', value: n(total) },
    { label: 'Completados', value: n(d.completedCount ?? 0) },
    { label: 'Tasa de completitud', value: rate != null ? `${fmt(rate)}%` : '—' },
    { label: 'Duración promedio (días)', value: fmt(d.avgDurationDays) },
  ]);
  if (rate != null) {
    heading(doc, 'Tasa de completitud');
    gauge(doc, 'Expedientes completados', Number(rate), 100, '%');
  }
  if (d.byStatus && Object.keys(d.byStatus).length) {
    heading(doc, 'Expedientes por estado');
    paragraph(doc, 'Dónde se encuentra hoy cada expediente dentro del proceso académico.');
    donut(doc, objItems(d.byStatus));
    hbars(doc, objItems(d.byStatus));
  }
  const findings: string[] = [];
  if (rate != null) findings.push(rate >= 60 ? 'La tasa de completitud es alta: la mayor parte de los procesos termina con éxito.' : 'La tasa de completitud es baja o el semestre está en curso; hacer seguimiento a los expedientes detenidos.');
  if (d.avgAnteproyectoCorrections != null && d.avgAnteproyectoCorrections >= 2) findings.push('El anteproyecto requiere varias correcciones: revisar criterios y retroalimentación temprana.');
  bulletBox(doc, 'Hallazgos', findings);
}

function renderCompany(doc: Doc, d: Data): void {
  const received = d.totalApplicationsReceived ?? 0;
  const accepted = d.acceptedCount ?? 0;
  const rejected = d.rejectedCount ?? 0;
  const inProcess = Math.max(0, received - accepted - rejected);

  summary(doc, [
    `${d.companyName ?? 'La empresa'}${d.industry ? ` (sector ${d.industry})` : ''} ha creado ${n(d.totalProjects)} proyectos: ${n(d.activeProjects)} activos y ${n(d.completedProjects)} completados${d.completionRate != null ? ` (tasa de finalización ${fmt(d.completionRate)}%)` : ''}.`,
    `Ha recibido ${n(received)} postulaciones; aceptó ${n(accepted)} y rechazó ${n(rejected)}${d.conversionRate != null ? `, para una tasa de conversión del ${fmt(d.conversionRate)}%` : ''}.`,
    d.avgEvaluationReceived != null ? `Los estudiantes calificaron su experiencia con ${fmt(d.avgEvaluationReceived)} sobre 5 en promedio.` : 'Aún no ha recibido evaluaciones de estudiantes.',
  ]);
  kpiRow(doc, [
    { label: 'Proyectos totales', value: n(d.totalProjects) },
    { label: 'Proyectos activos', value: n(d.activeProjects) },
    { label: 'Completados', value: n(d.completedProjects) },
    { label: 'Tasa de finalización', value: d.completionRate != null ? `${fmt(d.completionRate)}%` : '—' },
  ]);
  kpiRow(doc, [
    { label: 'Postulaciones recibidas', value: n(received) },
    { label: 'Aceptadas', value: n(accepted) },
    { label: 'Rechazadas', value: n(rejected) },
    { label: 'Evaluación promedio', value: d.avgEvaluationReceived != null ? `${fmt(d.avgEvaluationReceived)} / 5` : '—' },
  ]);

  if (d.projectsByStatus && Object.keys(d.projectsByStatus).length) {
    heading(doc, 'Proyectos por estado');
    paragraph(doc, 'Estado actual de todos los proyectos publicados por la empresa.');
    donut(doc, Object.entries(d.projectsByStatus).map(([k, v]) => ({ label: statusLabel(k), value: Number(v) })));
  }
  if (received > 0) {
    heading(doc, 'Embudo de postulaciones');
    paragraph(doc, 'Qué ocurrió con las postulaciones recibidas: cuántas se aceptaron, cuántas se rechazaron y cuántas siguen en proceso.');
    hbars(doc, [
      { label: 'Recibidas', value: received, color: '#475569' },
      { label: 'Aceptadas', value: accepted, color: C.primary },
      { label: 'Rechazadas', value: rejected, color: C.bad },
      { label: 'En proceso', value: inProcess, color: '#d97706' },
    ]);
  }
  if (d.conversionRate != null) gauge(doc, 'Tasa de conversión', Number(d.conversionRate), 100, '%');
  if (d.avgEvaluationReceived != null) gauge(doc, 'Evaluación promedio (escala 5)', Number(d.avgEvaluationReceived), 5, '');

  const findings: string[] = [];
  if (d.conversionRate != null) findings.push(d.conversionRate >= 30 ? 'La empresa acepta una proporción sana de postulantes.' : 'La proporción de aceptados es baja; revisar si los requisitos del proyecto son demasiado exigentes.');
  if (inProcess > 0) findings.push(`${n(inProcess)} postulaciones siguen pendientes de decisión.`);
  if (d.avgEvaluationReceived != null) findings.push(d.avgEvaluationReceived >= 4 ? 'La valoración de los estudiantes es muy positiva.' : 'La valoración de los estudiantes es mejorable: revisar acompañamiento y claridad de tareas.');
  bulletBox(doc, 'Hallazgos', findings);
}

function renderStudent(doc: Doc, d: Data): void {
  const total = d.totalApplications ?? 0;
  const accepted = d.acceptedCount ?? 0;
  const rejected = d.rejectedCount ?? 0;
  const completed = d.completedCount ?? 0;
  const pending = Math.max(0, total - accepted - rejected - completed);

  summary(doc, [
    `${d.studentName ?? 'El estudiante'}${d.program ? `, del programa ${d.program},` : ''} tiene ${n(d.skillsCount)} habilidades registradas en su perfil.`,
    `Ha realizado ${n(total)} postulaciones: ${n(accepted)} aceptadas, ${n(rejected)} rechazadas y ${n(completed)} procesos completados${d.placementRate != null ? ` (tasa de colocación ${fmt(d.placementRate)}%)` : ''}.`,
    d.avgTimeToDecisionHours != null ? `Las empresas tardan en promedio ${fmt(d.avgTimeToDecisionHours)} horas en responderle.` : '',
    d.avgEvaluationReceived != null ? `Su evaluación promedio recibida es ${fmt(d.avgEvaluationReceived)} sobre 5.` : 'Todavía no tiene evaluaciones recibidas.',
  ]);
  kpiRow(doc, [
    { label: 'Habilidades en el perfil', value: n(d.skillsCount) },
    { label: 'Postulaciones', value: n(total) },
    { label: 'Aceptadas', value: n(accepted) },
    { label: 'Completadas', value: n(completed) },
  ]);
  kpiRow(doc, [
    { label: 'Tasa de colocación', value: d.placementRate != null ? `${fmt(d.placementRate)}%` : '—' },
    { label: 'Respuesta promedio (h)', value: fmt(d.avgTimeToDecisionHours) },
    { label: 'Evaluación promedio', value: d.avgEvaluationReceived != null ? `${fmt(d.avgEvaluationReceived)} / 5` : '—' },
  ]);

  if (total > 0) {
    heading(doc, 'Resultado de sus postulaciones');
    paragraph(doc, 'Distribución de las postulaciones según su resultado.');
    donut(doc, [
      { label: 'Aceptadas', value: accepted },
      { label: 'Rechazadas', value: rejected },
      { label: 'Completadas', value: completed },
      { label: 'En proceso', value: pending },
    ].filter((i) => i.value > 0));
  }
  if (d.avgEvaluationReceived != null) gauge(doc, 'Evaluación promedio (escala 5)', Number(d.avgEvaluationReceived), 5, '');

  const findings: string[] = [];
  if ((d.skillsCount ?? 0) < 5) findings.push('El perfil tiene pocas habilidades: agregar más mejora el puntaje de compatibilidad con los proyectos.');
  if (total > 0 && accepted === 0 && completed === 0) findings.push('Aún no ha sido aceptado en ningún proyecto; se recomienda ampliar las postulaciones y reforzar la carta de presentación.');
  if (d.placementRate != null && d.placementRate >= 50) findings.push('Su tasa de colocación es alta.');
  bulletBox(doc, 'Hallazgos', findings);
}

function renderSupervisor(doc: Doc, d: Data): void {
  const assignments: any[] = Array.isArray(d.assignments) ? d.assignments : [];
  const byStatus: Record<string, number> = {};
  for (const a of assignments) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

  summary(doc, [
    `${d.supervisorName ?? 'El docente'}${d.department ? ` (${d.department})` : ''} tiene ${n(d.totalAssignments)} asignaciones registradas, de las cuales ${n(d.activeAssignments)} están activas.`,
    d.byRole && Object.keys(d.byRole).length ? `Su participación se reparte así: ${Object.entries(d.byRole).map(([k, v]) => `${roleLabel(k).toLowerCase()} (${v})`).join(', ')}.` : '',
  ]);
  kpiRow(doc, [
    { label: 'Asignaciones totales', value: n(d.totalAssignments) },
    { label: 'Asignaciones activas', value: n(d.activeAssignments) },
    { label: 'Roles distintos', value: n(Object.keys(d.byRole ?? {}).length) },
  ]);
  if (d.byRole && Object.keys(d.byRole).length) {
    heading(doc, 'Participación por rol');
    donut(doc, Object.entries(d.byRole).map(([k, v]) => ({ label: roleLabel(k), value: Number(v) })));
  }
  if (assignments.length) {
    heading(doc, 'Estado de las asignaciones');
    hbars(doc, Object.entries(byStatus).map(([k, v], i) => ({ label: statusLabel(k), value: v, color: PALETTE[i % PALETTE.length] })));
    heading(doc, 'Estudiantes asignados');
    table(doc, ['Estudiante', 'Proyecto', 'Rol', 'Estado'], assignments.map((a) => [String(a.studentName ?? '—'), String(a.projectTitle ?? '—'), roleLabel(a.role), statusLabel(a.status)]));
  } else {
    paragraph(doc, 'Este docente no tiene asignaciones registradas todavía.');
  }
  const findings: string[] = [];
  if (d.activeAssignments > 5) findings.push('La carga activa es alta (más de 5 estudiantes simultáneos).');
  if (d.totalAssignments > 0 && d.activeAssignments === 0) findings.push('No tiene asignaciones activas; puede recibir nuevas.');
  bulletBox(doc, 'Hallazgos', findings);
}

function renderGeneric(doc: Doc, d: Data): void {
  heading(doc, 'Parámetros del reporte');
  const entries = Object.entries(d.parameters ?? {});
  if (entries.length === 0) {
    paragraph(doc, 'Este reporte personalizado no tiene parámetros ni métricas asociadas.');
    return;
  }
  table(doc, ['Parámetro', 'Valor'], entries.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]));
}

// ─── Descripciones y lecturas automáticas ───────────────────────────────────────────────────

function reportPurpose(type: string): string {
  const map: Record<string, string> = {
    period_summary:
      'Fotografía general de la plataforma en su último corte: cuántos usuarios, proyectos y postulaciones existen, cómo ha evolucionado el uso y cuáles son las habilidades más buscadas. Úsalo para informes institucionales y seguimiento del semestre.',
    skill_gap_analysis:
      'Compara las habilidades que las empresas piden en sus proyectos con las que los estudiantes declaran tener. Identifica déficits (falta de talento) y superávits, y orienta decisiones de formación y de publicación de convocatorias.',
    matching_effectiveness:
      'Mide qué tan bien el motor de compatibilidad empareja estudiantes y proyectos (puntaje promedio) y cuánto tardan los proyectos en cubrir sus vacantes. Sirve para evaluar la calidad del matching y detectar cuellos de botella.',
    academic_process_summary:
      'Resume el avance del proceso académico: expedientes por etapa, duración, correcciones de anteproyecto y asignaciones de asesores y jurados. Útil para el comité académico y la coordinación de prácticas.',
    supervisor_workload:
      'Muestra cuántos estudiantes tiene a cargo cada docente y cuánto tardan en aceptar las asignaciones. Permite equilibrar la carga al asignar nuevos asesores y jurados.',
    project_completion_rates:
      'Indica qué porcentaje de los procesos de práctica concluye con éxito, cuánto duran y en qué estado se encuentra cada expediente. Es el indicador principal de resultado del programa.',
    company_performance:
      'Informe individual de una empresa: proyectos publicados y su estado, postulaciones recibidas, aceptadas y rechazadas, y la evaluación que le dan los estudiantes. Sirve para seguimiento de convenios y relaciones con aliados.',
    student_outcomes:
      'Informe individual de un estudiante: habilidades, postulaciones, resultados, tiempos de respuesta y evaluaciones recibidas. Sirve para acompañamiento y orientación del estudiante.',
    supervisor_report:
      'Informe individual de un docente: estudiantes y proyectos que acompaña, su rol (asesor o jurado) y el estado de cada asignación. Sirve para el seguimiento de la carga y para soportar certificaciones.',
    custom: 'Reporte personalizado con los parámetros indicados al generarlo.',
  };
  return map[type] ?? 'Reporte generado por la plataforma Collab-U.';
}

function reportScopeLabel(type: string): string {
  if (['company_performance'].includes(type)) return 'Empresa';
  if (['student_outcomes'].includes(type)) return 'Estudiante';
  if (['supervisor_report'].includes(type)) return 'Docente';
  return 'Plataforma completa';
}

function matchReading(score: number): string {
  if (score >= 70) return 'El nivel de compatibilidad es alto: los estudiantes se ven bien alineados con los proyectos.';
  if (score >= 40) return 'El nivel de compatibilidad es moderado: hay margen para mejorar con perfiles más completos y requisitos más claros.';
  return 'El nivel de compatibilidad es bajo: suele deberse a perfiles incompletos o requisitos poco alineados con la oferta estudiantil.';
}

// ─── Componentes de layout ──────────────────────────────────────────────────────────────────

function cover(doc: Doc, report: Report, d: Data): void {
  doc.rect(0, 0, PAGE_W, 128).fill(C.primary);
  doc.rect(0, 128, PAGE_W, 4).fill(C.primaryDark);
  doc.fillColor('#bbf7d0').font('Helvetica-Bold').fontSize(9).text('COLLAB-U  ·  UNIVERSIDAD DE NARIÑO', M, 30, { width: CW });
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(21).text(report.name, M, 48, { width: CW });
  const y = Math.max(doc.y + 4, 84);
  doc.fillColor('#dcfce7').font('Helvetica').fontSize(11).text(reportTypeLabel(report.reportType), M, y, { width: CW });
  doc.fillColor('#bbf7d0').fontSize(9).text(
    `Alcance: ${reportScopeLabel(report.reportType)}   ·   Generado el ${dateTimeLabel(report.createdAt)}   ·   Ref. ${String(report.id).slice(0, 8)}`,
    M, 108, { width: CW },
  );
  doc.y = 150;
  doc.x = M;
  doc.fillColor(C.ink).font('Helvetica');
  void d;
}

function ensure(doc: Doc, h: number): void {
  if (doc.y + h > BOTTOM) {
    doc.addPage();
    doc.y = M;
  }
}

function heading(doc: Doc, title: string): void {
  ensure(doc, 130); // evita títulos huérfanos al final de página (se mantiene junto a su contenido)
  doc.moveDown(0.5);
  const y = doc.y;
  doc.rect(M, y, 4, 16).fill(C.primary);
  doc.fillColor(C.primaryDark).font('Helvetica-Bold').fontSize(13).text(title, M + 12, y + 1, { width: CW - 12 });
  doc.y = y + 24;
  doc.x = M;
  doc.fillColor(C.text).font('Helvetica');
}

function paragraph(doc: Doc, text: string): void {
  if (!text) return;
  const h = doc.font('Helvetica').fontSize(10).heightOfString(text, { width: CW, lineGap: 2 });
  ensure(doc, h + 6);
  doc.fillColor(C.text).text(text, M, doc.y, { width: CW, align: 'justify', lineGap: 2 });
  doc.moveDown(0.6);
  doc.x = M;
}

function summary(doc: Doc, sentences: string[]): void {
  const text = sentences.filter(Boolean).join(' ');
  heading(doc, 'Resumen ejecutivo');
  paragraph(doc, text);
}

function box(doc: Doc, title: string, text: string, accent = C.primary): void {
  const w = CW - 28;
  doc.font('Helvetica').fontSize(10);
  const h = doc.heightOfString(text, { width: w, lineGap: 2 }) + 40;
  ensure(doc, h);
  const y = doc.y;
  doc.roundedRect(M, y, CW, h - 6, 6).fill(accent === C.primary ? C.card : '#fef2f2');
  doc.rect(M, y, 4, h - 6).fill(accent);
  doc.fillColor(accent).font('Helvetica-Bold').fontSize(10.5).text(title, M + 16, y + 10, { width: w });
  doc.fillColor(C.text).font('Helvetica').fontSize(10).text(text, M + 16, y + 26, { width: w, align: 'justify', lineGap: 2 });
  doc.y = y + h + 4;
  doc.x = M;
}

function bulletBox(doc: Doc, title: string, items: string[]): void {
  const list = items.filter(Boolean);
  if (list.length === 0) return;
  heading(doc, title);
  for (const it of list) {
    const h = doc.font('Helvetica').fontSize(10).heightOfString(it, { width: CW - 16, lineGap: 2 });
    ensure(doc, h + 6);
    const y = doc.y;
    doc.circle(M + 4, y + 5, 2.2).fill(C.primary);
    doc.fillColor(C.text).text(it, M + 16, y, { width: CW - 16, lineGap: 2 });
    doc.y = y + h + 5;
    doc.x = M;
  }
}

function kpiRow(doc: Doc, cards: { label: string; value: string; hint?: string }[]): void {
  const perRow = 4;
  const gap = 10;
  const w = (CW - gap * (perRow - 1)) / perRow;
  const h = 62;
  ensure(doc, h + 10);
  const y = doc.y;
  cards.slice(0, perRow).forEach((c, i) => {
    const x = M + i * (w + gap);
    doc.roundedRect(x, y, w, h, 6).fill(C.card);
    doc.rect(x, y + 10, 3, h - 20).fill(C.primary);
    doc.fillColor(C.primaryDark).font('Helvetica-Bold').fontSize(c.value.length > 9 ? 14 : 19).text(c.value, x + 12, y + 10, { width: w - 18, lineBreak: false });
    doc.fillColor(C.text).font('Helvetica').fontSize(8).text(c.label, x + 12, y + 35, { width: w - 18 });
    if (c.hint) doc.fillColor(C.muted).fontSize(7).text(c.hint, x + 12, y + 49, { width: w - 18, lineBreak: false });
  });
  doc.y = y + h + 10;
  doc.x = M;
}

function table(doc: Doc, headers: string[], rows: string[][]): void {
  if (rows.length === 0) return;
  const first = headers.length > 2 ? 0.34 : 0.6;
  const widths = headers.map((_, i) => (i === 0 ? CW * first : (CW * (1 - first)) / (headers.length - 1)));
  const drawHeader = (): void => {
    const y = doc.y;
    doc.rect(M, y, CW, 20).fill(C.primary);
    let x = M;
    headers.forEach((h, i) => {
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5).text(h, x + 6, y + 6, { width: widths[i] - 12, lineBreak: false });
      x += widths[i];
    });
    doc.y = y + 20;
  };
  ensure(doc, 60);
  drawHeader();
  rows.forEach((row, idx) => {
    doc.font('Helvetica').fontSize(8.5);
    const rowH = Math.max(...row.map((cell, i) => doc.heightOfString(cell, { width: widths[i] - 12 }))) + 9;
    if (doc.y + rowH > BOTTOM) {
      doc.addPage();
      doc.y = M;
      drawHeader();
    }
    const y = doc.y;
    if (idx % 2 === 1) doc.rect(M, y, CW, rowH).fill(C.zebra);
    let x = M;
    row.forEach((cell, i) => {
      doc.fillColor(C.ink).font('Helvetica').fontSize(8.5).text(cell, x + 6, y + 4.5, { width: widths[i] - 12 });
      x += widths[i];
    });
    doc.y = y + rowH;
  });
  doc.moveDown(0.8);
  doc.x = M;
}

// ─── Gráficos ───────────────────────────────────────────────────────────────────────────────

/** Barras horizontales: una barra por elemento, con etiqueta a la izquierda y valor al final. */
function hbars(doc: Doc, items: Item[], opts: { suffix?: string } = {}): void {
  const data = items.filter((i) => Number.isFinite(i.value));
  if (data.length === 0) return;
  const labelW = 150;
  const valueW = 46;
  const barMax = CW - labelW - valueW - 8;
  const rowH = 20;
  const max = Math.max(...data.map((i) => i.value), 1);
  ensure(doc, Math.min(data.length, 6) * rowH + 10);
  data.forEach((it, idx) => {
    ensure(doc, rowH + 2);
    const y = doc.y;
    doc.fillColor(C.text).font('Helvetica').fontSize(9).text(truncate(it.label, 28), M, y + 5, { width: labelW - 8, lineBreak: false });
    doc.roundedRect(M + labelW, y + 3, barMax, 12, 3).fill(C.zebra);
    const w = Math.max(2, (it.value / max) * barMax);
    doc.roundedRect(M + labelW, y + 3, w, 12, 3).fill(it.color ?? PALETTE[idx % PALETTE.length]);
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text(`${fmt(it.value)}${opts.suffix ?? ''}`, M + labelW + barMax + 6, y + 5, { width: valueW, lineBreak: false });
    doc.y = y + rowH;
  });
  doc.moveDown(0.6);
  doc.x = M;
}

/** Dos barras por categoría (p. ej. demanda vs oferta) con leyenda. */
function groupedBars(doc: Doc, rows: { label: string; a: number; b: number }[], nameA: string, nameB: string): void {
  if (rows.length === 0) return;
  const labelW = 130;
  const barMax = CW - labelW - 40;
  const rowH = 26;
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]), 1);
  ensure(doc, 40);
  const ly = doc.y;
  doc.rect(M + labelW, ly + 2, 10, 8).fill(PALETTE[0]);
  doc.fillColor(C.text).font('Helvetica').fontSize(8.5).text(nameA, M + labelW + 14, ly + 2, { lineBreak: false });
  doc.rect(M + labelW + 80, ly + 2, 10, 8).fill(PALETTE[1]);
  doc.fillColor(C.text).text(nameB, M + labelW + 94, ly + 2, { lineBreak: false });
  doc.y = ly + 18;
  rows.forEach((r) => {
    ensure(doc, rowH + 2);
    const y = doc.y;
    doc.fillColor(C.text).font('Helvetica').fontSize(9).text(truncate(r.label, 24), M, y + 7, { width: labelW - 8, lineBreak: false });
    doc.roundedRect(M + labelW, y + 1, Math.max(2, (r.a / max) * barMax), 9, 2).fill(PALETTE[0]);
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(8).text(fmt(r.a), M + labelW + Math.max(2, (r.a / max) * barMax) + 4, y + 2, { lineBreak: false });
    doc.roundedRect(M + labelW, y + 12, Math.max(2, (r.b / max) * barMax), 9, 2).fill(PALETTE[1]);
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(8).text(fmt(r.b), M + labelW + Math.max(2, (r.b / max) * barMax) + 4, y + 13, { lineBreak: false });
    doc.y = y + rowH;
  });
  doc.moveDown(0.6);
  doc.x = M;
}

/** Gráfico de dona con leyenda (valor y porcentaje). */
function donut(doc: Doc, items: Item[]): void {
  const data = items.filter((i) => i.value > 0);
  const total = data.reduce((t, i) => t + i.value, 0);
  if (total === 0) {
    paragraph(doc, 'Sin datos para graficar.');
    return;
  }
  const r = 62;
  const h = Math.max(r * 2 + 16, data.length * 18 + 16);
  ensure(doc, h);
  const top = doc.y + 4;
  const cx = M + r + 10;
  const cy = top + r;
  let start = -Math.PI / 2;
  data.forEach((it, i) => {
    const color = it.color ?? PALETTE[i % PALETTE.length];
    const angle = (it.value / total) * Math.PI * 2;
    if (data.length === 1) {
      doc.circle(cx, cy, r).fill(color);
    } else {
      const end = start + angle;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = angle > Math.PI ? 1 : 0;
      doc.path(`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`).fill(color);
      start = end;
    }
  });
  doc.circle(cx, cy, r * 0.58).fill('#ffffff');
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(15).text(n(total), cx - 30, cy - 10, { width: 60, align: 'center', lineBreak: false });
  doc.fillColor(C.muted).font('Helvetica').fontSize(7.5).text('total', cx - 30, cy + 7, { width: 60, align: 'center', lineBreak: false });

  const lx = cx + r + 40;
  data.forEach((it, i) => {
    const y = top + 4 + i * 18;
    doc.roundedRect(lx, y + 2, 10, 10, 2).fill(it.color ?? PALETTE[i % PALETTE.length]);
    doc.fillColor(C.text).font('Helvetica').fontSize(9).text(truncate(it.label, 34), lx + 16, y + 2, { width: 190, lineBreak: false });
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9).text(`${n(it.value)}  (${Math.round((it.value / total) * 100)}%)`, lx + 210, y + 2, { width: 90, lineBreak: false });
  });
  doc.y = top + h;
  doc.x = M;
}

/** Gráfico de línea con ejes, cuadrícula y puntos. */
function lineChart(doc: Doc, title: string, points: { x: string; y: number }[], color: string): void {
  const pts = points.filter((p) => Number.isFinite(p.y));
  if (pts.length < 2) return;
  const h = 150;
  ensure(doc, h + 24);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(9.5).text(title, M, doc.y, { width: CW });
  const top = doc.y + 6;
  const left = M + 38;
  const w = CW - 48;
  const ch = h - 40;
  const min = Math.min(...pts.map((p) => p.y));
  const max = Math.max(...pts.map((p) => p.y));
  const lo = min === max ? min - 1 : Math.min(0, min);
  const hi = min === max ? max + 1 : max * 1.1;
  const yOf = (v: number): number => top + ch - ((v - lo) / (hi - lo)) * ch;
  const xOf = (i: number): number => left + (i / (pts.length - 1)) * w;

  for (let g = 0; g <= 4; g++) {
    const val = lo + ((hi - lo) * g) / 4;
    const gy = yOf(val);
    doc.strokeColor(C.line).lineWidth(0.5).moveTo(left, gy).lineTo(left + w, gy).stroke();
    doc.fillColor(C.muted).font('Helvetica').fontSize(7).text(fmt(Math.round(val * 10) / 10), M, gy - 3, { width: 32, align: 'right', lineBreak: false });
  }
  doc.strokeColor(color).lineWidth(1.8);
  pts.forEach((p, i) => (i === 0 ? doc.moveTo(xOf(i), yOf(p.y)) : doc.lineTo(xOf(i), yOf(p.y))));
  doc.stroke();
  pts.forEach((p, i) => doc.circle(xOf(i), yOf(p.y), 2.6).fill(color));
  const step = Math.ceil(pts.length / 8);
  pts.forEach((p, i) => {
    if (i % step === 0 || i === pts.length - 1) {
      doc.fillColor(C.muted).font('Helvetica').fontSize(7).text(p.x, xOf(i) - 22, top + ch + 6, { width: 44, align: 'center', lineBreak: false });
    }
  });
  doc.lineWidth(1);
  doc.y = top + h - 18;
  doc.x = M;
}

/** Medidor horizontal: valor frente a un máximo (p. ej. 100 % o escala de 5). */
function gauge(doc: Doc, label: string, value: number, max: number, suffix: string): void {
  ensure(doc, 44);
  const y = doc.y;
  const pctVal = Math.max(0, Math.min(1, value / max));
  const color = pctVal >= 0.7 ? C.primary : pctVal >= 0.4 ? '#d97706' : C.bad;
  doc.fillColor(C.text).font('Helvetica').fontSize(9).text(label, M, y, { width: CW - 80, lineBreak: false });
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(11).text(`${fmt(value)}${suffix}`, M, y - 1, { width: CW, align: 'right', lineBreak: false });
  doc.roundedRect(M, y + 16, CW, 11, 5).fill(C.zebra);
  doc.roundedRect(M, y + 16, Math.max(6, CW * pctVal), 11, 5).fill(color);
  doc.y = y + 38;
  doc.x = M;
}

// ─── Pie de página ──────────────────────────────────────────────────────────────────────────

function footers(doc: Doc, report: Report): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const prev = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // evita que pdfkit cree una página nueva al escribir en el pie
    doc.strokeColor(C.line).lineWidth(0.7).moveTo(M, PAGE_H - 44).lineTo(PAGE_W - M, PAGE_H - 44).stroke();
    doc.fillColor(C.muted).font('Helvetica').fontSize(8);
    doc.text(`Collab-U · ${truncate(report.name, 60)}`, M, PAGE_H - 36, { width: CW - 80, lineBreak: false });
    doc.text(`Página ${i - range.start + 1} de ${range.count}`, M, PAGE_H - 36, { width: CW, align: 'right', lineBreak: false });
    doc.text('Documento generado automáticamente por la plataforma Collab-U. Información de uso institucional.', M, PAGE_H - 24, { width: CW, lineBreak: false });
    doc.page.margins.bottom = prev;
  }
}

// ─── Utilidades de datos y formato ──────────────────────────────────────────────────────────

/** Snapshots de plataforma ordenados cronológicamente (el servicio los entrega del más nuevo al más viejo). */
function metricsSeries(raw: unknown): any[] {
  if (!Array.isArray(raw)) return [];
  return [...raw].sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime());
}

/** Una fila por habilidad: si hay varios cortes del mismo nombre se queda con la de mayor demanda. */
function dedupeSkills(
  raw: unknown,
  name: (s: any) => string,
  demand: (s: any) => number,
  supply: (s: any) => number,
  trend: (s: any) => string | null = () => null,
  gap: (s: any) => number | null = () => null,
): { name: string; demand: number; supply: number; trend: string | null; gap: number | null }[] {
  if (!Array.isArray(raw)) return [];
  const map = new Map<string, { name: string; demand: number; supply: number; trend: string | null; gap: number | null }>();
  for (const s of raw) {
    const nm = String(name(s) ?? '').trim();
    if (!nm) continue;
    const key = nm.toLowerCase();
    const row = { name: nm, demand: Number(demand(s) ?? 0), supply: Number(supply(s) ?? 0), trend: trend(s) ?? null, gap: gap(s) ?? null };
    const prev = map.get(key);
    if (!prev || row.demand > prev.demand) map.set(key, row);
  }
  return [...map.values()];
}

function objItems(obj: Record<string, unknown>): Item[] {
  return Object.entries(obj).map(([k, v]) => ({ label: statusLabel(k), value: Number(v) }));
}

function n(v: unknown): string {
  if (v === null || v === undefined || v === '') return '0';
  const num = Number(v);
  return Number.isFinite(num) ? num.toLocaleString('es-CO') : String(v);
}

function fmt(v: unknown, suffix = ''): string {
  if (v === null || v === undefined || v === '') return '—';
  const num = Number(v);
  if (Number.isFinite(num)) return `${Math.round(num * 100) / 100}${suffix}`;
  return `${v}${suffix}`;
}

function signed(v: number): string {
  return v > 0 ? `+${n(v)}` : n(v);
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function dateLabel(v: unknown): string {
  const dt = new Date(v as any);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

function shortDate(v: unknown): string {
  const dt = new Date(v as any);
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }).replace('.', '');
}

function dateTimeLabel(v: unknown): string {
  const dt = new Date(v as any);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Borrador', needs_changes: 'Necesita cambios', pending_approval: 'Pendiente de aprobación',
    published: 'Publicado', in_progress: 'En curso', completed: 'Completado', cancelled: 'Cancelado',
    pending: 'Pendiente', accepted: 'Aceptado', active: 'Activo', rejected: 'Rechazado',
    under_review: 'En revisión', shortlisted: 'Preseleccionado', interview: 'En entrevista',
    withdrawn: 'Retirado', pending_supervisor: 'Esperando asesor', closed: 'Cerrado',
    waiting_documents: 'Esperando documentos', waiting_anteproyecto: 'Esperando anteproyecto', waiting_agreement: 'Esperando acuerdo',
    final_docs_review: 'Revisión de documentos finales', finalizing: 'En cierre', pending_acceptance: 'Pendiente de aceptación',
    declined: 'Declinado', expired: 'Vencido',
  };
  if (map[status]) return map[status];
  const t = status.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    asesor: 'Asesor', jurado_anteproyecto: 'Jurado de anteproyecto', jurado_final: 'Jurado final',
  };
  return map[role] ?? statusLabel(role);
}

function trendLabel(t: string): string {
  const map: Record<string, string> = { rising: 'En alza', stable: 'Estable', declining: 'A la baja' };
  return map[t] ?? t;
}

function reportTypeLabel(type: string): string {
  const map: Record<string, string> = {
    period_summary: 'Resumen de Período',
    company_performance: 'Desempeño de Empresa',
    student_outcomes: 'Resultados de Estudiante',
    supervisor_report: 'Carga de Docente',
    skill_gap_analysis: 'Análisis de Brecha de Skills',
    matching_effectiveness: 'Efectividad del Matching',
    academic_process_summary: 'Resumen del Proceso Académico',
    supervisor_workload: 'Carga de Docentes (Plataforma)',
    project_completion_rates: 'Tasas de Completitud',
    custom: 'Personalizado',
  };
  return map[type] ?? type;
}
