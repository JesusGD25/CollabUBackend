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
| ProjectTag | Etiquetas/tags del proyecto (único por proyecto) |
| ProjectActivity | Actividades asignables a estudiantes con seguimiento de horas |

## Enums

- **ProjectType**: academic, professional, research, social, entrepreneurship
- **ProjectStatus**: draft, published, in_progress, completed, cancelled
- **LocationType**: remote, on_site, hybrid
- **CompensationType**: paid, unpaid, academic_credit, mixed
- **RequirementType**: skill, tool, language, certification, academic, other
- **ActivityStatus**: pending, in_progress, completed, blocked
- **ActivityPriority**: low, medium, high, critical

## Endpoints Públicos (23)

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
| GET | /:id/tags | Listar tags | JWT |
| POST | /:id/tags | Agregar tag | COMPANY |
| DELETE | /:id/tags/:tagId | Eliminar tag | COMPANY |
| GET | /:id/activities | Listar actividades | JWT |
| POST | /:id/activities | Crear actividad | COMPANY |
| PATCH | /:id/activities/:activityId | Actualizar actividad | COMPANY |
| DELETE | /:id/activities/:activityId | Eliminar actividad | COMPANY |
| GET | /stats/overview | Estadísticas generales | COMPANY |
| POST | /:id/views | Incrementar vistas | JWT |

## Endpoints Internos (3)

| Método | Ruta | Descripción |
|---|---|---|
| GET | /internal/projects/:id/matching-data | Datos para matching |
| GET | /internal/projects/:id/exists | Verificar existencia |
| PATCH | /internal/projects/:id/increment-applications | Incrementar contador |

## Máquina de Estados

```
draft → published (requiere al menos 1 requirement)
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
