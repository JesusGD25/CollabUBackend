# Company Service

**Puerto:** 3004
**Base de datos:** `company_db`

## Propósito

Gestiona los perfiles de empresa: datos corporativos, información de contacto y estado de verificación. Solo aplica a usuarios con rol `COMPANY`.

## Estructura Interna

```
company-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts       ← Conexión a company_db
    ├── companies/
    │   ├── companies.module.ts
    │   ├── companies.controller.ts  ← CRUD de perfil empresarial
    │   ├── companies.service.ts
    │   ├── dto/                     ← CreateCompanyDto, UpdateCompanyDto, etc.
    │   ├── entities/
    │   │   ├── company-profile.entity.ts  ← Nombre, NIT, industria, tamaño, logo
    │   │   └── company-contact.entity.ts  ← Personas de contacto de la empresa
    │   └── internal/
    │       └── companies-internal.controller.ts
    ├── events/
    │   └── company-events.subscriber.ts
    └── health/
        └── health.controller.ts
```

## Eventos

- **Consume:** `admin.company.verified` → Actualiza estado de verificación
- **Publica:** `company.profile.updated`
