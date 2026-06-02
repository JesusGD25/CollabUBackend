-- =========================================================================
-- COLLAB-U — Seed: Criterios y Plantillas de Evaluación
-- Base de datos: evaluation_db
-- =========================================================================

\c evaluation_db;

-- ─────────────────────────────────────────────────────────
-- CRITERIOS PARA company_evaluates_student
-- ─────────────────────────────────────────────────────────

INSERT INTO "evaluation_criteria" (id, name, description, category, evaluation_type, weight, rating_scale, is_required, is_active, display_order) VALUES
  ('c1010101-0101-0101-0101-010101010101', 'Comunicación clara',         'Capacidad de expresar ideas de forma clara y efectiva',       'soft_skills',   'company_evaluates_student', 1.000, '1_to_5', true, true, 1),
  ('c2020202-0202-0202-0202-020202020202', 'Puntualidad y asistencia',   'Respeto por los horarios y cumplimiento de compromisos',          'professional',  'company_evaluates_student', 1.000, '1_to_5', true, true, 2),
  ('c3030303-0303-0303-0303-030303030303', 'Calidad técnica del trabajo','Nivel técnico y calidad de los entregables producidos',         'technical',     'company_evaluates_student', 1.500, '1_to_5', true, true, 3),
  ('c4040404-0404-0404-0404-040404040404', 'Trabajo en equipo',           'Colaboración con el equipo y otras áreas de la empresa',         'soft_skills',   'company_evaluates_student', 1.000, '1_to_5', true, true, 4),
  ('c5050505-0505-0505-0505-050505050505', 'Iniciativa y proactividad',  'Capacidad de proposer soluciones sin que se lo pidan',           'professional',  'company_evaluates_student', 0.750, '1_to_5', true, true, 5),
  ('c6060606-0606-0606-0606-060606060606', 'Adaptabilidad',              'Capacidad de ajustarse a nuevos entornos y tecnologías',          'technical',     'company_evaluates_student', 0.750, '1_to_5', true, true, 6)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- CRITERIOS PARA student_evaluates_company
-- ─────────────────────────────────────────────────────────

INSERT INTO "evaluation_criteria" (id, name, description, category, evaluation_type, weight, rating_scale, is_required, is_active, display_order) VALUES
  ('d1010101-0101-0101-0101-010101010101', 'Ambiente laboral',           'El ambiente donde se desempeñó el estudiante fue adecuado',       'general',       'student_evaluates_company', 1.000, '1_to_5', true, true, 1),
  ('d2020202-0202-0202-0202-020202020202', 'Mentoría recibida',           'Nivel de acompañamiento y guía por parte del mentor',             'professional',  'student_evaluates_company', 1.000, '1_to_5', true, true, 2),
  ('d3030303-0303-0303-0303-030303030303', 'Relevancia del proyecto',    'El proyecto permitió aplicar conocimientos del área de estudio',     'academic',      'student_evaluates_company', 1.250, '1_to_5', true, true, 3),
  ('d4040404-0404-0404-0404-040404040404', 'Comunicación de la empresa', 'La empresa mantuvo una comunicación clara y constante',         'soft_skills',   'student_evaluates_company', 0.750, '1_to_5', true, true, 4),
  ('d5050505-0505-0505-0505-050505050505', 'Compensación y beneficios',  'Los beneficios y/o compensación fueron adecuados',             'general',       'student_evaluates_company', 0.500, '1_to_5', false, true, 5),
  ('d6060606-0606-0606-0606-060606060606', 'Claridad de expectativas',    'Las expectativas del rol estuvieron bien definidas',             'professional',  'student_evaluates_company', 1.000, '1_to_5', true, true, 6)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- CRITERIOS PARA supervisor_evaluates_student
-- ─────────────────────────────────────────────────────────

INSERT INTO "evaluation_criteria" (id, name, description, category, evaluation_type, weight, rating_scale, is_required, is_active, display_order) VALUES
  ('e1010101-0101-0101-0101-010101010101', 'Desempeño académico',       'Cumplimiento de objetivos académicos y entregables',               'academic',      'supervisor_evaluates_student', 1.500, '1_to_5', true, true, 1),
  ('e2020202-0202-0202-0202-020202020202', 'Profesionalismo',            'Actitud y comportamiento profesional en el entorno',              'professional',  'supervisor_evaluates_student', 1.000, '1_to_5', true, true, 2),
  ('e3030303-0303-0303-0303-030303030303', 'Integración con el equipo',  'Relación con compañeros y participación en actividades',             'soft_skills',   'supervisor_evaluates_student', 0.750, '1_to_5', true, true, 3),
  ('e4040404-0404-0404-0404-040404040404', 'Progreso observable',        'Avance demonstrable en competencias y habilidades',                 'academic',      'supervisor_evaluates_student', 1.000, '1_to_5', true, true, 4),
  ('e5050505-0505-0505-0505-050505050505', 'Cumplimiento del plan',     'Seguimiento al plan de trabajo acordado',                         'professional',  'supervisor_evaluates_student', 1.000, '1_to_5', true, true, 5)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- CRITERIOS PARA self_evaluation
-- ─────────────────────────────────────────────────────────

INSERT INTO "evaluation_criteria" (id, name, description, category, evaluation_type, weight, rating_scale, is_required, is_active, display_order) VALUES
  ('f1010101-0101-0101-0101-010101010101', 'Autocrítica constructiva',   'Capacidad de identificar áreas de mejora con honestidad',         'general',       'self_evaluation', 1.000, '1_to_5', true, true, 1),
  ('f2020202-0202-0202-0202-020202020202', 'Metas alcanzadas',           'Evaluación del cumplimiento de los objetivo personales',        'professional',  'self_evaluation', 1.000, '1_to_5', true, true, 2),
  ('f3030303-0303-0303-0303-030303030303', 'Aprendizaje nuevo',          'Nuevos conocimientos o habilidades adquiridos',                 'academic',      'self_evaluation', 1.250, '1_to_5', true, true, 3),
  ('f4040404-0404-0404-0404-040404040404', 'Contribución al proyecto',  'Impacto personal en el avance del proyecto',                  'professional',  'self_evaluation', 1.000, '1_to_5', true, true, 4)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- PLANTILLAS (is_default = true para uso rápido)
-- ─────────────────────────────────────────────────────────

INSERT INTO "evaluation_templates" (id, name, description, evaluation_type, criteria_ids, is_default, is_active, created_by) VALUES
  ('t1010101-0101-0101-0101-010101010101', 'Evaluación estándar — Empresa a Estudiante', 'Plantilla completa para cuando una empresa evalúa a un estudiante', 'company_evaluates_student',
    ARRAY['c1010101-0101-0101-0101-010101010101','c2020202-0202-0202-0202-020202020202','c3030303-0303-0303-0303-030303030303','c4040404-0404-0404-0404-040404040404','c5050505-0505-0505-0505-050505050505','c6060606-0606-0606-0606-060606060606'],
    true, true, NULL),

  ('t2020202-0202-0202-0202-020202020202', 'Evaluación estándar — Estudiante a Empresa', 'Plantilla completa para cuando un estudiante evalúa a la empresa', 'student_evaluates_company',
    ARRAY['d1010101-0101-0101-0101-010101010101','d2020202-0202-0202-0202-020202020202','d3030303-0303-0303-0303-030303030303','d4040404-0404-0404-0404-040404040404','d5050505-0505-0505-0505-050505050505','d6060606-0606-0606-0606-060606060606'],
    true, true, NULL),

  ('t3030303-0303-0303-0303-030303030303', 'Evaluación estándar — Supervisor a Estudiante', 'Plantilla completa para supervisión académica', 'supervisor_evaluates_student',
    ARRAY['e1010101-0101-0101-0101-010101010101','e2020202-0202-0202-0202-020202020202','e3030303-0303-0303-0303-030303030303','e4040404-0404-0404-0404-040404040404','e5050505-0505-0505-0505-050505050505'],
    true, true, NULL),

  ('t4040404-0404-0404-0404-040404040404', 'Auto-evaluación estándar', 'Plantilla simple para auto-evaluación del estudiante', 'self_evaluation',
    ARRAY['f1010101-0101-0101-0101-010101010101','f2020202-0202-0202-0202-020202020202','f3030303-0303-0303-0303-030303030303','f4040404-0404-0404-0404-040404040404'],
    true, true, NULL)
ON CONFLICT (id) DO NOTHING;
