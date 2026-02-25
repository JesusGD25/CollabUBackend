# Project Service

**Puerto:** 3005
**Base de datos:** `project_db`

## Propósito

Gestiona la creación, edición, publicación y cierre de proyectos de práctica. Las empresas crean proyectos con requisitos; los estudiantes los exploran y aplican.

## Estructura Interna

```
project-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts        ← Conexión a project_db
    ├── projects/
    │   ├── projects.module.ts
    │   ├── projects.controller.ts    ← CRUD de proyectos, listado público, filtros
    │   ├── projects.service.ts
    │   ├── dto/                      ← CreateProjectDto, UpdateProjectDto, ProjectFiltersDto
    │   ├── entities/
    │   │   ├── project.entity.ts             ← Título, descripción, tipo, modalidad, fechas, estado
    │   │   └── project-requirement.entity.ts ← Skills requeridas con nivel y obligatoriedad
    │   └── internal/
    │       └── projects-internal.controller.ts
    ├── events/
    │   └── project-events.subscriber.ts
    └── health/
        └── health.controller.ts
```

## Eventos

- **Publica:** `project.published` (dispara matching), `project.updated`, `project.closed`
