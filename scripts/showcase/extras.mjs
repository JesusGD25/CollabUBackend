/**
 * Capa "departamentos": filas que no encajan en el motor de empresas/estudiantes/proyectos/hilos
 * de `generate-seed-showcase.mjs` y que se emiten con las mismas utilidades (`ctx`):
 *   1. Admins de departamento (uno por programa) y docentes nuevos (cuentas + perfil + supervisor).
 *   2. Flujos de asesor de postulaciones en `pending_supervisor` (asignación declinada + pendiente).
 *   3. Evaluaciones en estados que el motor no cubre (pendiente de Sistemas, en curso, vencida).
 *   4. Notificaciones realistas (leídas y sin leer) para estudiantes, empresas, docentes y admins.
 *   5. Chat: conversaciones directas, de grupo y de proyecto con mensajes.
 *
 * Todo con IDs determinísticos (`uid`) y `ON CONFLICT DO NOTHING`: se puede ejecutar varias veces.
 */
import { deptStaff } from './data-dept-flows.mjs';

const DEPT_ADMINS = [
  { key: 'SIS', email: 'admin.sistemas@collabu.dev', first: 'Marcela', last: 'Burbano Rivera', title: 'Coordinadora de Prácticas — Ingeniería de Sistemas' },
  { key: 'ELE', email: 'admin.electronica@collabu.dev', first: 'Andrés', last: 'Cuaical Pantoja', title: 'Coordinador de Prácticas — Ingeniería Electrónica' },
  { key: 'CIV', email: 'admin.civil@collabu.dev', first: 'Liliana', last: 'Ortega Mesías', title: 'Coordinadora de Prácticas — Ingeniería Civil' },
];

export function emitExtras(ctx) {
  const { ins, uid, T, D, J, val, col, addDays, atTime, dayOffset, TODAY, S, P, C, apps, supervisors, programs, ADMIN_ID, PASSWORD_HASH, periodIds,
    USERS_COLS, USER_PROFILE_COLS, evalRows, asg, asgHistory, asgPatches, threads, students, raw } = ctx;
  const out = { adminIds: {}, staff: {} };

  // ═════════════ 1. Admins de departamento y docentes ═════════════
  DEPT_ADMINS.forEach((a, i) => {
    const id = uid(`dept-admin:${a.key}`);
    const created = col('2026-08-03 09:00');
    out.adminIds[a.key] = id;
    // `users` lleva dos columnas más (admin_level, department_id) que el resto de cuentas: va como SQL directo.
    const row = [id, a.email, PASSWORD_HASH, 'admin', true, true, true, T(created), 'v1.0', true, 0, null, T(dayOffset(-(1 + i), '07:45')), T(created), T(created), 'department', programs[a.key].id];
    ctx.raw.auth_db.push(`INSERT INTO "users" (${[...USERS_COLS, 'admin_level', 'department_id'].join(', ')}) VALUES (${row.map(val).join(', ')}) ON CONFLICT DO NOTHING;`);
    ins('user_db', 'user_profiles', USER_PROFILE_COLS,
      [[uid(`dept-admin-prof:${a.key}`), id, 'admin', a.first, a.last, 'Colombia', 'Pasto', 'Nariño', a.title, null, null, null, 100, true, T(dayOffset(-(1 + i), '07:45')), T(created), T(created)]]);
  });

  deptStaff.forEach((d, i) => {
    const userId = supervisors[d.code].userId;
    const created = col(`2025-0${7 + (i % 3)}-${String(10 + i).padStart(2, '0')} 09:00`);
    const lastLogin = dayOffset(-(2 + (i % 6)), '10:15');
    out.staff[d.code] = { ...d, userId, id: supervisors[d.code].id };
    ins('auth_db', 'users', USERS_COLS,
      [[userId, d.email, PASSWORD_HASH, 'faculty', true, !d.inactive, true, T(created), 'v1.0', true, 0, null, d.inactive ? T(addDays(created, 200)) : T(lastLogin), T(created), T(created)]]);
    ins('user_db', 'user_profiles', USER_PROFILE_COLS,
      [[uid(`staff-prof:${d.code}`), userId, 'faculty', d.first, d.last, 'Colombia', 'Pasto', 'Nariño', `Docente de ${programs[d.program].name}. Especialidad: ${d.spec}.`, null, null, null, d.onboardingIncomplete ? 40 : 100, !d.onboardingIncomplete, T(lastLogin), T(created), T(created)]]);
  });

  // ═════════════ 2. Flujo de asesor para postulaciones en pending_supervisor ═════════════
  const periodNow = periodIds['2026-2'];
  for (const a of apps.filter((x) => x.asesorFlow)) {
    const flow = a.asesorFlow, stu = S[a.sk], proj = P[a.pk];
    const mk = (code, status, extra = {}) => {
      const sup = supervisors[code];
      const id = uid(`asg:${a.sk}:asesor:${code}:${status}`);
      const when = atTime(addDays(a.applied, 11), '10:00');
      asg.push([id, sup.id, stu.userId, proj.id, a.id, periodNow, ADMIN_ID, 'asesor', D(addDays(TODAY, 14)), null, status, null, null, T(when), programs[stu.program].id]);
      asgHistory.push([uid(`asgh:${id}:created`), id, 'created', null, sup.id, null, ADMIN_ID, T(when)]);
      if (status === 'declined') {
        asgPatches.push(`UPDATE supervisor_assignments SET decline_reason = ${val(flow.declineReason)}, declined_at = ${val(T(addDays(when, 1)))} WHERE id = ${val(id)};`);
        asgHistory.push([uid(`asgh:${id}:declined`), id, 'declined', null, sup.id, flow.declineReason, sup.userId, T(addDays(when, 1))]);
      }
      return id;
    };
    if (flow.declined) mk(flow.declined, 'declined');
    if (flow.pending) mk(flow.pending, 'pending_acceptance');
  }

  // ═════════════ 3. Evaluaciones en estados adicionales ═════════════
  const appOf = (pk, sk) => apps.find((x) => x.pk === pk && x.sk === sk);
  const selfEval = (pk, sk, status, extra = {}) => {
    const a = appOf(pk, sk);
    if (!a) return;
    const stu = S[sk];
    const id = uid(`eval:${sk}:self_evaluation:${status}`);
    const created = addDays(TODAY, -6);
    evalRows.push([id, a.id, P[pk].id, stu.userId, stu.userId, 'self_evaluation', status, null, null, null, null, false, T(addDays(TODAY, extra.dueDays ?? 10)), null, T(created), T(created)]);
  };
  selfEval('P_MIG', 'S8', 'pending');           // Sistemas: autoevaluación pendiente
  selfEval('P_TRAZA', 'S9', 'in_progress');     // Sistemas: autoevaluación iniciada
  {
    const a = appOf('P_VIA', 'S10');              // Civil: evaluación de la empresa vencida sin completar
    if (a) {
      const id = uid('eval:S10:company_evaluates_student:expired');
      evalRows.push([id, a.id, P.P_VIA.id, P.P_VIA.company.userId, S.S10.userId, 'company_evaluates_student', 'expired', null, null, null, null, false, T(addDays(TODAY, -5)), null, T(addDays(TODAY, -35)), T(addDays(TODAY, -5))]);
    }
  }

  // ═════════════ 4. Notificaciones ═════════════
  const NOTIF_COLS = ['id', 'user_id', 'type', 'title', 'message', 'data', 'channel', 'priority', 'is_read', 'read_at', 'action_url', 'group_key', 'expires_at', 'created_at'];
  const notes = [];
  let nIdx = 0;
  const notify = (userId, type, title, message, { at, url = null, group = null, priority = 'normal', data = {}, read } = {}) => {
    if (!userId) return;
    nIdx++;
    const when = at || dayOffset(-(1 + (nIdx % 12)), '09:30');
    const isRead = read !== undefined ? read : (TODAY - when) / 864e5 > 5 && nIdx % 4 !== 0; // lo reciente y 1 de cada 4 quedan sin leer
    // El id depende del CONTENIDO (no del orden de generación): agregar postulaciones no duplica las notificaciones ya sembradas.
    notes.push([uid(`notif:${userId}:${type}:${title}:${message}:${group || ''}`), userId, type, title, message, J(data), 'in_app', priority, isRead, isRead ? T(new Date(when.getTime() + 36e5)) : null, url, group, null, T(when)]);
  };

  const stateText = {
    under_review: ['application_status_changed', 'Tu postulación está en revisión', (p) => `La empresa está revisando tu postulación a «${p}».`],
    shortlisted: ['application_status_changed', 'Quedaste preseleccionado/a', (p) => `Pasaste a la siguiente etapa del proceso para «${p}».`],
    interview: ['interview_scheduled', 'Tienes una entrevista programada', (p) => `La empresa programó una entrevista para «${p}». Revisa la fecha y el enlace.`],
    accepted: ['application_accepted', 'Tu postulación fue aceptada', (p) => `La empresa aceptó tu postulación a «${p}». La Facultad te asignará un asesor académico.`],
    pending_supervisor: ['supervisor_assigned', 'Asesor académico asignado', (p) => `Se asignó un asesor a tu proyecto «${p}»; el proyecto inicia cuando acepte.`],
    in_progress: ['supervisor_accepted', 'Tu proyecto ya inició', (p) => `El asesor aceptó y comenzó el seguimiento de «${p}».`],
    completed: ['academic_completed', 'Proyecto finalizado', (p) => `Cerraste con éxito «${p}». Revisa tu nota y las evaluaciones.`],
    rejected: ['application_rejected', 'Actualización de tu postulación', (p) => `Tu postulación a «${p}» no continuó en el proceso. Revisa el motivo y sigue postulándote.`],
    cancelled: ['project_status_changed', 'El proyecto fue cancelado', (p) => `La empresa canceló «${p}»; tu postulación quedó cerrada.`],
  };
  for (const a of apps) {
    const stu = S[a.sk], proj = P[a.pk];
    const st = stateText[a.status];
    const lastAt = a.updatedAt || a.applied;
    if (st) notify(stu.userId, st[0], st[1], st[2](proj.title), { at: lastAt, url: `/my-applications`, group: `project:${proj.id}`, data: { applicationId: a.id, projectId: proj.id, status: a.status } });
    if (['pending', 'under_review', 'shortlisted', 'interview'].includes(a.status)) {
      notify(proj.company.userId, 'application_received', 'Nueva postulación recibida', `${stu.fullName} se postuló a «${proj.title}».`, { at: a.applied, url: `/received-applications`, group: `project:${proj.id}`, data: { applicationId: a.id, projectId: proj.id } });
    }
  }
  // Estudiantes sin postulaciones: la plataforma les sugiere proyectos (recomendaciones de Smart Matching).
  const withApps = new Set(apps.map((a) => a.sk));
  for (const s of Object.values(S)) {
    if (withApps.has(s.key) || s.account === 'unverified' || s.incomplete) continue;
    notify(s.userId, 'match_recommendation', 'Tienes proyectos recomendados para ti', 'Smart Matching encontró proyectos publicados que encajan con tus habilidades. Revisa las recomendaciones y postúlate.', { url: '/matching', priority: 'high', read: false, at: dayOffset(-1, '08:30') });
    notify(s.userId, 'project_new', 'Nuevos proyectos publicados en tu programa', 'Hay convocatorias abiertas para tu programa académico. Explora los proyectos y revisa los requisitos.', { url: '/projects', read: false, at: dayOffset(-2, '09:00') });
  }
  for (const p of Object.values(P)) {
    const owner = p.company.userId;
    if (p.status === 'published') notify(owner, 'project_approved', 'Tu proyecto fue aprobado y publicado', `«${p.title}» ya es visible para los estudiantes.`, { url: `/my-projects`, group: `project:${p.id}` });
    if (p.status === 'needs_changes') notify(owner, 'project_needs_changes', 'La Facultad solicitó cambios', `Revisa las observaciones sobre «${p.title}» y reenvíalo.`, { priority: 'high', url: `/my-projects`, group: `project:${p.id}`, read: false });
    if (p.status === 'pending_approval') {
      for (const k of p.programs) notify(out.adminIds[k], 'project_submitted_for_review', 'Proyecto pendiente de revisión', `${p.company.name} envió «${p.title}» para aprobación.`, { priority: 'high', url: '/admin/verifications', group: `project:${p.id}`, read: false });
    }
    if (p.status === 'cancelled') notify(owner, 'project_status_changed', 'Proyecto cancelado', `«${p.title}» fue marcado como cancelado.`, { url: `/my-projects`, group: `project:${p.id}` });
  }
  for (const c of Object.values(C)) {
    if (c.status === 'pending') for (const k of c.programKeys) notify(out.adminIds[k], 'system_announcement', 'Empresa pendiente de verificación', `${c.name} solicitó su vinculación y espera la revisión de su documentación.`, { priority: 'high', url: '/admin/verifications', group: `company:${c.companyId}`, read: false });
    if (c.status === 'verified') notify(c.userId, 'company_verified', 'Tu empresa fue verificada', 'Ya puedes publicar proyectos y recibir postulaciones de estudiantes.', { url: '/my-projects/create', read: true, at: col(c.createdAt) });
  }
  // Docentes: asignaciones pendientes de aceptación y recordatorios de evaluación
  for (const row of asg) {
    const [, supId, , , appId, , , role, , , status] = row;
    const dept = Object.values(out.staff).find((x) => x.id === supId) || Object.entries(supervisors).map(([code, v]) => ({ code, ...v })).find((x) => x.id === supId);
    const userId = dept?.userId;
    const a = apps.find((x) => x.id === appId);
    if (!userId || !a) continue;
    if (status === 'pending_acceptance') notify(userId, 'supervisor_assigned', 'Nueva asignación como asesor', `${S[a.sk].fullName} te espera como asesor en «${P[a.pk].title}». Acepta o declina la asignación.`, { priority: 'high', url: '/my-students', group: `project:${P[a.pk].id}`, read: false });
  }
  for (const ev of evalRows.filter((e) => e[6] === 'pending')) {
    notify(ev[3], 'evaluation_pending', 'Tienes una evaluación pendiente', 'Completa tu evaluación para cerrar el proceso del proyecto.', { priority: 'high', url: '/my-evaluations', group: `eval:${ev[0]}`, read: false });
  }
  for (const [pk, sk, text] of [['P_TRAZA', 'S9', 'La empresa pidió ajustes en el entregable «Validación en cadena de frío».'], ['P_MIG', 'S8', 'Tienes un nuevo entregable asignado en tu proyecto.']]) {
    const a = appOf(pk, sk);
    if (a) notify(S[sk].userId, pk === 'P_TRAZA' ? 'deliverable_feedback' : 'deliverable_assigned', pk === 'P_TRAZA' ? 'Retroalimentación de un entregable' : 'Nuevo entregable asignado', text, { priority: 'high', url: `/workspace/${a.id}`, group: `project:${P[pk].id}`, read: false });
  }
  for (const t of threads.filter((x) => x.anteState === 'needs_revision' || x.anteState === 'revised')) {
    const stu = S[t.student];
    notify(stu.userId, 'anteproyecto_correction_requested', 'Corrección solicitada en tu anteproyecto', 'El jurado pidió precisar el alcance y la metodología.', { priority: 'high', url: `/workspace/${apps.find((a) => a.sk === t.student && a.pk === t.project)?.id}?tab=academic`, read: false });
  }
  // Anuncios del sistema para cada admin de departamento
  for (const a of DEPT_ADMINS) {
    notify(out.adminIds[a.key], 'system_announcement', 'Bienvenido al panel de tu departamento', `Verás únicamente la información de ${programs[a.key].name}.`, { read: true, at: dayOffset(-30, '08:00') });
    notify(out.adminIds[a.key], 'system_announcement', 'Cierre de convocatorias del período 2026-2', 'Revisa los proyectos pendientes antes del cierre de convocatorias.', { priority: 'high', url: '/admin/verifications', read: false });
  }
  ins('notification_db', 'notifications', NOTIF_COLS, notes);
  // Si existen copias con otro id (cargas anteriores con ids distintos), se eliminan: queda solo la del seed actual.
  if (notes.length) {
    const vals = notes.map((n) => `(${[n[0], n[1], n[2], n[3], n[4]].map(val).join(', ')})`).join(',\n');
    raw.notification_db.push(`DELETE FROM notifications n USING (VALUES\n${vals}\n) AS v(id, user_id, type, title, message) WHERE n.user_id = v.user_id AND n.type::text = v.type AND n.title = v.title AND n.message = v.message AND n.id::text <> v.id;`);
  }

  // ═════════════ 5. Chat ═════════════
  const CONV_COLS = ['id', 'type', 'name', 'description', 'project_id', 'application_id', 'avatar_url', 'is_active', 'last_message_at', 'last_message_preview', 'created_by', 'created_at', 'updated_at'];
  const PART_COLS = ['id', 'conversation_id', 'user_id', 'role', 'nickname', 'is_muted', 'last_read_at', 'last_read_message_id', 'unread_count', 'joined_at', 'left_at', 'is_active'];
  const MSG_COLS = ['id', 'conversation_id', 'sender_id', 'type', 'content', 'reply_to_id', 'is_edited', 'edited_at', 'is_deleted', 'deleted_at', 'metadata', 'created_at'];
  const convs = [], parts = [], msgs = [];
  const chat = (key, { type, name = null, description = null, projectId = null, applicationId = null, people, lines, startDaysAgo = 14 }) => {
    const id = uid(`conv:${key}`);
    const start = dayOffset(-startDaysAgo, '10:00');
    let last = start, lastText = '';
    lines.forEach(([who, text], i) => {
      const at = new Date(start.getTime() + i * (3 * 36e5 + 17 * 6e4));
      msgs.push([uid(`msg:${key}:${i}`), id, people[who], 'text', text, null, false, null, false, null, null, T(at)]);
      last = at; lastText = text;
    });
    convs.push([id, type, name, description, projectId, applicationId, null, true, T(last), lastText.slice(0, 90), people[lines[0][0]], T(start), T(last)]);
    const unreadFor = (who) => (lines.length ? lines.filter(([w], i) => w !== who && i >= lines.length - 2).length : 0);
    Object.entries(people).forEach(([who, userId], k) => {
      const unread = k === 0 ? 0 : unreadFor(who) % 3;
      parts.push([uid(`part:${key}:${userId}`), id, userId, k === 0 ? 'owner' : 'member', null, false, T(last), null, unread, T(start), null, true]);
    });
  };
  const first = (s) => S[s].first.split(' ')[0];

  // Grupos de seguimiento (estudiante + empresa + asesor) de varios hilos
  const groupThreads = [...threads.filter((t) => ['active', 'waiting_final_docs', 'final_docs_review', 'waiting_anteproyecto'].includes(t.stage))];
  for (const t of groupThreads) {
    const proj = P[t.project], stu = S[t.student];
    const asesorUser = (out.staff[t.asesor] || supervisors[t.asesor]).userId;
    const app = apps.find((x) => x.pk === t.project && x.sk === t.student);
    const topic = proj.short.charAt(0).toLowerCase() + proj.short.slice(1).replace(/\.$/, '');
    chat(`grp:${t.student}`, {
      type: 'group', name: `Seguimiento — ${proj.title.length > 52 ? proj.title.slice(0, 49) + '…' : proj.title}`, description: `Coordinación entre ${first(t.student)}, ${proj.company.name} y su asesor académico.`,
      projectId: proj.id, applicationId: app?.id || null, startDaysAgo: 12,
      people: { co: proj.company.userId, st: stu.userId, as: asesorUser },
      lines: [
        ['co', `Hola ${first(t.student)}, bienvenido/a al equipo. Este proyecto busca ${topic}. Esta semana te comparto los accesos y el plan del primer entregable.`],
        ['st', 'Gracias, ya revisé el plan. Una duda: ¿el primer entregable incluye pruebas o solo el diseño?'],
        ['as', 'Incluye ambos; deja las evidencias en el informe para que podamos revisarlas desde lo académico.'],
        ['st', 'Perfecto. Les envío el avance el jueves y agendamos una revisión corta de 30 minutos.'],
        ['co', 'Me parece bien. El jueves a las 4 p. m. tenemos un espacio con el equipo técnico.'],
        ['as', 'Yo me conecto también. Recuerden registrar las decisiones importantes en el documento del proyecto.'],
      ],
    });
  }
  // Conversaciones directas entre estudiante y empresa en postulaciones avanzadas
  const direct = apps.filter((a) => ['interview', 'accepted', 'shortlisted'].includes(a.status)).slice(0, 10);
  for (const a of direct) {
    const proj = P[a.pk], stu = S[a.sk];
    chat(`dir:${a.id}`, {
      type: 'direct', applicationId: a.id, startDaysAgo: 6,
      people: { co: proj.company.userId, st: stu.userId },
      lines: [
        ['co', `Hola ${first(a.sk)}, te escribimos de ${proj.company.name} sobre tu postulación a «${proj.title}». ¿Podrías confirmar tu disponibilidad esta semana?`],
        ['st', 'Hola, muchas gracias por escribir. Tengo disponibilidad el miércoles y el jueves en la tarde.'],
        ['co', 'Perfecto, coordinamos para el jueves. Te enviamos el enlace por la plataforma.'],
        ['st', 'Quedo atento/a. ¿Hay algo que deba preparar de antemano?'],
      ],
    });
  }
  // Conversaciones de proyecto (preguntas de postulantes) en proyectos publicados
  for (const key of ['PE_ENVASADO', 'PV_CONCRETOS', 'PV_VISOR']) {
    const proj = P[key];
    const askers = apps.filter((a) => a.pk === key).slice(0, 2).map((a) => S[a.sk]);
    if (askers.length < 2) continue;
    chat(`prj:${key}`, {
      type: 'project', name: `Preguntas sobre «${proj.title.length > 48 ? proj.title.slice(0, 45) + '…' : proj.title}»`, projectId: proj.id, startDaysAgo: 9,
      people: { co: proj.company.userId, a: askers[0].userId, b: askers[1].userId },
      lines: [
        ['a', '¿El proyecto exige experiencia previa con las herramientas de la lista o se puede aprender durante la práctica?'],
        ['co', 'No es indispensable: valoramos más la disposición para aprender; hay acompañamiento técnico desde la primera semana.'],
        ['b', '¿La modalidad es presencial toda la semana o hay días de trabajo remoto?'],
        ['co', 'Es principalmente presencial; se pueden acordar uno o dos días remotos cuando no haya pruebas en sitio.'],
        ['a', 'Gracias por la aclaración, completo mi postulación hoy.'],
      ],
    });
  }
  ins('chat_db', 'conversations', CONV_COLS, convs);
  ins('chat_db', 'conversation_participants', PART_COLS, parts);
  ins('chat_db', 'messages', MSG_COLS, msgs);

  // ═════════════ 6. Docentes: filas de supervisor (con carga real calculada) ═════════════
  const active = new Set(['accepted', 'active', 'pending_acceptance']);
  const load = (id) => asg.filter((r) => r[1] === id && r[7] === 'asesor' && active.has(r[10])).length;
  ins('admin_db', 'supervisors', ['id', 'user_id', 'employee_code', 'department', 'role', 'specialization', 'max_students', 'current_students', 'is_active', 'is_onboarding_complete', 'created_at', 'updated_at', 'program_id'],
    deptStaff.map((d, i) => {
      const created = col(`2025-0${7 + (i % 3)}-${String(10 + i).padStart(2, '0')} 09:00`);
      return [supervisors[d.code].id, supervisors[d.code].userId, d.code, programs[d.program].name, d.role, d.spec, d.max, Math.min(load(supervisors[d.code].id), d.max), !d.inactive, !d.onboardingIncomplete, T(created), T(created), programs[d.program].id];
    }));

  return out;
}
