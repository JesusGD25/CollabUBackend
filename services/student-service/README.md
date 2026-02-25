# Student Service

**Puerto:** 3003
**Base de datos:** `student_db`

## Propósito

Gestiona los perfiles específicos de estudiantes: información académica, habilidades, experiencia laboral y documentos. Solo aplica a usuarios con rol `STUDENT`.

## Estructura Interna

```
student-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts       ← Conexión a student_db
    ├── students/
    │   ├── students.module.ts
    │   ├── students.controller.ts   ← CRUD de perfil estudiantil, skills, experiencia
    │   ├── students.service.ts
    │   ├── dto/                     ← CreateStudentProfileDto, AddSkillDto, etc.
    │   ├── entities/
    │   │   ├── student-profile.entity.ts    ← Código, programa, semestre, disponibilidad
    │   │   ├── student-skill.entity.ts      ← Habilidades con nivel de dominio
    │   │   ├── academic-info.entity.ts      ← Información académica adicional
    │   │   ├── work-experience.entity.ts    ← Experiencia laboral previa
    │   │   └── student-document.entity.ts   ← CV, certificados, portafolio
    │   └── internal/
    │       └── students-internal.controller.ts ← Endpoints internos (usado por matching)
    ├── events/
    │   └── student-events.subscriber.ts
    └── health/
        └── health.controller.ts
```

## Eventos

- **Publica:** `student.profile.updated`, `student.skills.updated` → Disparan recálculo de matching
