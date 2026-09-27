import PDFDocument from 'pdfkit';
import { Report } from '../entities/report.entity';

/**
 * Genera el PDF de un reporte ya construido (Report.data) — no hace ningún query nuevo, solo
 * renderiza lo que buildReportData() ya calculó y persistió. Cada reportType tiene su propio
 * layout porque el pedido explícito fue "reportes específicos", no un volcado genérico de JSON
 * en una tabla — el contenido cambia según sea un reporte de plataforma, empresa, estudiante o docente.
 */
export function buildReportPdf(report: Report): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const d = report.data ?? {};

  header(doc, report);

  if (report.status === 'failed') {
    doc.fillColor('#b91c1c').fontSize(12).text('Este reporte no pudo generarse correctamente.');
    doc.moveDown(0.5);
    doc.fillColor('#000000').fontSize(10).text(`Detalle: ${d.error ?? 'Error desconocido'}`);
    return doc;
  }

  switch (report.reportType) {
    case 'company_performance':
      renderCompanyPerformance(doc, d);
      break;
    case 'student_outcomes':
      renderStudentOutcomes(doc, d);
      break;
    case 'supervisor_report':
      renderSupervisorReport(doc, d);
      break;
    case 'period_summary':
      renderPeriodSummary(doc, d);
      break;
    case 'skill_gap_analysis':
      renderSkillGapAnalysis(doc, d);
      break;
    case 'matching_effectiveness':
      renderKeyValues(doc, [
        ['Score de match promedio', fmt(d.avgMatchScore)],
        ['Tiempo promedio de llenado (días)', fmt(d.avgTimeToFillDays)],
      ]);
      break;
    case 'academic_process_summary':
      renderAcademicProcessSummary(doc, d);
      break;
    case 'supervisor_workload':
      renderSupervisorWorkload(doc, d);
      break;
    case 'project_completion_rates':
      renderKeyValues(doc, [
        ['Expedientes totales', fmt(d.totalRecords)],
        ['Completados', fmt(d.completedCount)],
        ['Tasa de completitud', pct(d.completionRate)],
        ['Duración promedio (días)', fmt(d.avgDurationDays)],
        ['Correcciones promedio de anteproyecto', fmt(d.avgAnteproyectoCorrections)],
      ]);
      break;
    default:
      doc.fontSize(10).text(JSON.stringify(d, null, 2));
  }

  return doc;
}

// ─── Layouts por tipo de reporte ────────────────────────────────────────────────────────────

function renderCompanyPerformance(doc: PDFKit.PDFDocument, d: Record<string, any>): void {
  section(doc, d.companyName ?? 'Empresa', d.industry ? `Sector: ${d.industry}` : undefined);
  renderKeyValues(doc, [
    ['Proyectos totales', fmt(d.totalProjects)],
    ['Proyectos activos', fmt(d.activeProjects)],
    ['Proyectos completados', fmt(d.completedProjects)],
    ['Tasa de finalización', pct(d.completionRate)],
    ['Aplicaciones recibidas', fmt(d.totalApplicationsReceived)],
    ['Aplicaciones aceptadas', fmt(d.acceptedCount)],
    ['Aplicaciones rechazadas', fmt(d.rejectedCount)],
    ['Tasa de conversión', pct(d.conversionRate)],
    ['Evaluación promedio recibida', fmt(d.avgEvaluationReceived, '/5')],
  ]);
  if (d.projectsByStatus) {
    doc.moveDown(0.5);
    subheading(doc, 'Proyectos por estado');
    renderKeyValues(doc, Object.entries(d.projectsByStatus).map(([k, v]) => [statusLabel(k), fmt(v)]));
  }
}

function renderStudentOutcomes(doc: PDFKit.PDFDocument, d: Record<string, any>): void {
  section(doc, d.studentName ?? 'Estudiante', d.program ?? undefined);
  renderKeyValues(doc, [
    ['Skills registradas', fmt(d.skillsCount)],
    ['Aplicaciones totales', fmt(d.totalApplications)],
    ['Aceptadas', fmt(d.acceptedCount)],
    ['Rechazadas', fmt(d.rejectedCount)],
    ['Completadas', fmt(d.completedCount)],
    ['Tasa de colocación', pct(d.placementRate)],
    ['Tiempo promedio a decisión (horas)', fmt(d.avgTimeToDecisionHours)],
    ['Evaluación promedio recibida', fmt(d.avgEvaluationReceived, '/5')],
  ]);
}

function renderSupervisorReport(doc: PDFKit.PDFDocument, d: Record<string, any>): void {
  section(doc, d.supervisorName ?? 'Docente', d.department ?? undefined);
  renderKeyValues(doc, [
    ['Asignaciones totales', fmt(d.totalAssignments)],
    ['Asignaciones activas', fmt(d.activeAssignments)],
  ]);
  if (d.byRole) {
    doc.moveDown(0.3);
    subheading(doc, 'Por rol');
    renderKeyValues(doc, Object.entries(d.byRole).map(([k, v]) => [roleLabel(k), fmt(v)]));
  }
  const assignments: any[] = Array.isArray(d.assignments) ? d.assignments : [];
  if (assignments.length > 0) {
    doc.moveDown(0.6);
    subheading(doc, 'Estudiantes asignados');
    const rows = assignments.map((a) => [
      String(a.studentName ?? '—'),
      String(a.projectTitle ?? '—'),
      roleLabel(a.role),
      statusLabel(a.status),
    ]);
    renderTable(doc, ['Estudiante', 'Proyecto', 'Rol', 'Estado'], rows);
  } else {
    doc.moveDown(0.4).fontSize(10).fillColor('#666').text('Sin asignaciones registradas.');
  }
}

function renderPeriodSummary(doc: PDFKit.PDFDocument, d: Record<string, any>): void {
  const latest = Array.isArray(d.platformMetrics) ? d.platformMetrics[0] : null;
  if (latest) {
    renderKeyValues(doc, [
      ['Usuarios totales', fmt(latest.totalUsers)],
      ['Estudiantes', fmt(latest.totalStudents)],
      ['Empresas', fmt(latest.totalCompanies)],
      ['Proyectos totales', fmt(latest.totalProjects)],
      ['Proyectos activos', fmt(latest.activeProjects)],
      ['Aplicaciones totales', fmt(latest.totalApplications)],
      ['Score de match promedio', fmt(latest.avgMatchScore)],
    ]);
  } else {
    doc.fontSize(10).fillColor('#666').text('Sin snapshot de plataforma disponible todavía.');
  }
  const skills: any[] = Array.isArray(d.topSkills) ? d.topSkills : [];
  if (skills.length > 0) {
    doc.moveDown(0.6);
    subheading(doc, 'Top skills demandadas');
    renderTable(
      doc,
      ['Skill', 'Demanda', 'Oferta'],
      skills.slice(0, 10).map((s) => [String(s.skillName ?? s.name ?? '—'), fmt(s.demandCount ?? s.demand), fmt(s.supplyCount ?? s.supply)]),
    );
  }
}

function renderSkillGapAnalysis(doc: PDFKit.PDFDocument, d: Record<string, any>): void {
  const skills: any[] = Array.isArray(d.skills) ? d.skills : [];
  if (skills.length === 0) {
    doc.fontSize(10).fillColor('#666').text('Sin datos de skills todavía.');
    return;
  }
  renderTable(
    doc,
    ['Skill', 'Demanda', 'Oferta', 'Brecha'],
    skills.map((s) => [String(s.name ?? '—'), fmt(s.demand), fmt(s.supply), fmt(s.gap)]),
  );
}

function renderAcademicProcessSummary(doc: PDFKit.PDFDocument, d: Record<string, any>): void {
  const a = d.assignmentStats ?? {};
  const s = d.academicStats ?? {};
  subheading(doc, 'Asignaciones');
  renderKeyValues(doc, [
    ['Asignaciones totales', fmt(a.totalAssignments)],
    ['Tiempo promedio de aceptación (horas)', fmt(a.avgAcceptanceHours)],
  ]);
  doc.moveDown(0.5);
  subheading(doc, 'Expedientes académicos');
  renderKeyValues(doc, [
    ['Expedientes totales', fmt(s.totalRecords)],
    ['Completados', fmt(s.completedCount)],
    ['Duración promedio (días)', fmt(s.avgDurationDays)],
    ['Correcciones promedio de anteproyecto', fmt(s.avgAnteproyectoCorrections)],
  ]);
}

function renderSupervisorWorkload(doc: PDFKit.PDFDocument, d: Record<string, any>): void {
  renderKeyValues(doc, [
    ['Asignaciones totales', fmt(d.totalAssignments)],
    ['Tiempo promedio de aceptación (horas)', fmt(d.avgAcceptanceHours)],
  ]);
  const workload: any[] = Array.isArray(d.supervisorWorkload) ? d.supervisorWorkload : [];
  if (workload.length > 0) {
    doc.moveDown(0.6);
    subheading(doc, 'Carga por docente');
    renderTable(
      doc,
      ['Docente', 'Estudiantes activos'],
      workload.map((w) => [String(w.supervisorName ?? w.supervisorId ?? '—'), fmt(w.activeCount)]),
    );
  }
}

// ─── Helpers de layout ───────────────────────────────────────────────────────────────────────

function header(doc: PDFKit.PDFDocument, report: Report): void {
  doc.fontSize(18).fillColor('#166534').text('Collab-U', { continued: false });
  doc.fontSize(14).fillColor('#000000').text(report.name);
  doc.fontSize(9).fillColor('#666666').text(
    `Generado el ${new Date(report.createdAt).toLocaleString('es-CO')} — Tipo: ${reportTypeLabel(report.reportType)}`,
  );
  doc.moveDown(1);
  doc.strokeColor('#e5e7eb').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
  doc.fillColor('#000000');
}

function section(doc: PDFKit.PDFDocument, title: string, subtitle?: string): void {
  doc.fontSize(13).fillColor('#111827').text(title);
  if (subtitle) doc.fontSize(9).fillColor('#666666').text(subtitle);
  doc.moveDown(0.6);
  doc.fillColor('#000000');
}

function subheading(doc: PDFKit.PDFDocument, title: string): void {
  doc.fontSize(11).fillColor('#166534').text(title);
  doc.moveDown(0.3);
  doc.fillColor('#000000');
}

function renderKeyValues(doc: PDFKit.PDFDocument, rows: [string, string][]): void {
  for (const [label, value] of rows) {
    doc.fontSize(10).fillColor('#374151').text(label, 50, doc.y, { continued: true, width: 300 });
    doc.fillColor('#111827').text(`  ${value}`);
  }
  doc.moveDown(0.4);
}

function renderTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]): void {
  const colWidth = 495 / headers.length;
  const startX = 50;
  let y = doc.y;

  doc.fontSize(9).fillColor('#ffffff');
  doc.rect(startX, y, 495, 18).fill('#166534');
  doc.fillColor('#ffffff');
  headers.forEach((h, i) => doc.text(h, startX + i * colWidth + 4, y + 5, { width: colWidth - 8 }));
  y += 18;

  doc.fillColor('#111827');
  rows.forEach((row, rowIndex) => {
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
    if (rowIndex % 2 === 1) {
      doc.rect(startX, y, 495, 16).fill('#f3f4f6');
      doc.fillColor('#111827');
    }
    row.forEach((cell, i) => doc.fontSize(9).text(cell, startX + i * colWidth + 4, y + 4, { width: colWidth - 8 }));
    y += 16;
  });
  doc.y = y + 8;
}

function fmt(v: unknown, suffix = ''): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return `${Math.round(v * 100) / 100}${suffix}`;
  return `${v}${suffix}`;
}

function pct(v: unknown): string {
  if (v === null || v === undefined) return '—';
  return `${v}%`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Borrador', needs_changes: 'Necesita cambios', pending_approval: 'Pendiente de aprobación',
    published: 'Publicado', in_progress: 'En curso', completed: 'Completado', cancelled: 'Cancelado',
    pending: 'Pendiente', accepted: 'Aceptado', active: 'Activo', rejected: 'Rechazado',
  };
  return map[status] ?? status;
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    asesor: 'Asesor', jurado_anteproyecto: 'Jurado de anteproyecto', jurado_final: 'Jurado final',
  };
  return map[role] ?? role;
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
