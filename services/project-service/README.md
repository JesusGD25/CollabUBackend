# Project Service

Microservicio para la gestión de proyectos empresariales en Collab-U. Permite a las empresas crear, publicar y gestionar proyectos para estudiantes.

## Configuración

| Variable | Valor |
|---|---|
| Puerto | 3005 |
| Base de datos | project_db |
| Prefijo API | /api/v1/projects |
| Swagger | /api/docs |

## Entidades

| Entidad | Descripción |
|---|---|
| Project | Proyecto principal con estado, tipo, ubicación, compensación |
| ProjectRequirement | Requisitos del proyecto (habilidad, herramienta, idioma, etc.) |
| ProjectDeliverable | Entregables con peso porcentual para evaluación |
| ProjectSkill | Habilidades requeridas por el proyecto — modelo unificado con catálogo maestro (`catalogSkillId` opcional, resuelto contra `admin_db.skill_catalog`; `name` libre cuando no resuelve). **No existe `ProjectTag`** — el modelo de tags fue migrado a `ProjectSkill` en `Backend/scripts/migrate-skills-unification.mjs` y la tabla `project_tags` fue eliminada; no reintroducir. |
| ProjectActivity | Actividades asignables a estudiantes con seguimiento de horas |

## Enums

- **ProjectType**: `internship`, `professional_practice`, `thesis`, `research`, `other`
- **ProjectStatus**: `draft`, `needs_changes`, `pending_approval`, `published`, `in_progress`, `completed`, `cancelled`
- **LocationType**: `remote`, `onsite`, `hybrid`
- **CompensationType**: `paid`, `unpaid`, `academic_credit`, `stipend`
- **RequirementType**: skill, tool, language, certification, academic, other
- **ActivityStatus**: pending, in_progress, completed, blocked
- **ActivityPriority**: low, medium, high, critical

## Endpoints Públicos

> Nota: esta tabla no incluye los endpoints de `ProjectSkill` (skills del proyecto, modelo unificado con catálogo — ver sección Entidades) ni los de revisión de faculty/admin (`reviewProject`) — pendiente de auditoría completa de este README, fuera del alcance de la corrección de FASE 7 de `PLANNING_ANALYTICS_SERVICE.md` (que solo corrigió los remanentes de tags y los enums obsoletos).

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | / | Buscar proyectos con filtros | JWT |
| GET | /:id | Obtener proyecto por ID | JWT |
| GET | /slug/:slug | Obtener proyecto por slug | JWT |
| GET | /company/:companyId | Proyectos de una empresa | JWT |
| POST | / | Crear proyecto | COMPANY |
| PATCH | /:id | Actualizar proyecto | COMPANY |
| PATCH | /:id/status | Cambiar estado | COMPANY |
| DELETE | /:id | Eliminar proyecto | COMPANY |
| GET | /:id/requirements | Listar requisitos | JWT |
| POST | /:id/requirements | Agregar requisito | COMPANY |
| DELETE | /:id/requirements/:requirementId | Eliminar requisito | COMPANY |
| GET | /:id/deliverables | Listar entregables | JWT |
| POST | /:id/deliverables | Agregar entregable | COMPANY |
| DELETE | /:id/deliverables/:deliverableId | Eliminar entregable | COMPANY |
| GET | /:id/activities | Listar actividades | JWT |
| POST | /:id/activities | Crear actividad | COMPANY |
| PATCH | /:id/activities/:activityId | Actualizar actividad | COMPANY |
| DELETE | /:id/activities/:activityId | Eliminar actividad | COMPANY |
| GET | /stats/overview | Estadísticas generales | COMPANY |
| POST | /:id/views | Incrementar vistas | JWT |

## Endpoints Internos

> Lista no exhaustiva — corregida solo para agregar los 2 endpoints de analítica agregados en FASE2/3 de `PLANNING_ANALYTICS_SERVICE.md`. El resto de esta tabla no fue reauditado.

| Método | Ruta | Descripción |
|---|---|---|
| GET | /internal/projects/:id/matching-data | Datos para matching |
| GET | /internal/projects/:id/exists | Verificar existencia |
| PATCH | /internal/projects/:id/increment-applications | Incrementar contador |
| GET | /internal/projects/analytics/stats | Estadísticas agregadas (totales, por status, activos) — consumido por analytics-service |
| GET | /internal/projects/skills/demand | Demanda de skills agregada por `catalogSkillId`/nombre, desde proyectos activos — consumido por analytics-service |

## Máquina de Estados

```
draft → pending_approval | cancelled
needs_changes → pending_approval | cancelled
pending_approval → published | needs_changes | draft   (revisión de faculty/admin)
published → in_progress | cancelled
in_progress → completed | cancelled
completed → (terminal)
cancelled → (terminal)
```

## Eventos

### Publicados
| Evento | Cuándo |
|---|---|
| project.created | Proyecto creado |
| project.updated | Proyecto actualizado |
| project.status.changed | Cambio de estado |
| project.published | Proyecto publicado (trigger matching) |
| project.viewed | Proyecto visto (incrementa vistas) |
| project.deleted | Proyecto eliminado |

### Suscritos
| Evento | Acción |
|---|---|
| company.profile.deactivated | Log (futuro: cancelar proyectos) |
| application.status.changed | Incrementar aplicaciones si aceptada |
| auth.user.deactivated | Log (futuro: manejar proyectos) |

## Tests

```bash
cd Backend/services/project-service
npx jest --verbose --forceExit
```

**89 tests** en 3 suites:
- project.service.spec.ts
- project.controller.spec.ts
- project-events.subscriber.spec.ts
