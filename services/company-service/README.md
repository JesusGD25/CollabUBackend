# Company Service

Microservicio de perfiles de empresas para la plataforma Collab-U.

## Puerto
- **3004** (por defecto)

## Base de Datos
- PostgreSQL: `company_db` en puerto `5435`

## Estructura

```
src/
├── company/
│   ├── dto/
│   │   ├── create-company-profile.dto.ts
│   │   ├── update-company-profile.dto.ts
│   │   ├── create-location.dto.ts
│   │   ├── update-location.dto.ts
│   │   ├── create-contact.dto.ts
│   │   ├── update-contact.dto.ts
│   │   ├── create-business-area.dto.ts
│   │   ├── company-search-query.dto.ts
│   │   └── index.ts
│   ├── entities/
│   │   ├── company-profile.entity.ts
│   │   ├── company-location.entity.ts
│   │   ├── company-contact.entity.ts
│   │   └── business-area.entity.ts
│   ├── company.service.ts
│   ├── company.service.spec.ts
│   ├── company.controller.ts
│   ├── company.controller.spec.ts
│   ├── company-internal.controller.ts
│   └── company.module.ts
├── events/
│   ├── company-events.subscriber.ts
│   └── company-events.subscriber.spec.ts
├── config/
│   └── database.config.ts
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

## Endpoints

### Públicos (con JWT)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/api/v1/companies/profile` | Crear perfil | COMPANY |
| GET | `/api/v1/companies/profile` | Obtener perfil propio | COMPANY |
| GET | `/api/v1/companies/profile/:userId` | Obtener perfil por userId | Autenticado |
| PATCH | `/api/v1/companies/profile` | Actualizar perfil | COMPANY |
| GET | `/api/v1/companies/search` | Buscar empresas | Autenticado |
| GET | `/api/v1/companies/locations` | Obtener ubicaciones | COMPANY |
| POST | `/api/v1/companies/locations` | Agregar ubicación | COMPANY |
| PATCH | `/api/v1/companies/locations/:locationId` | Actualizar ubicación | COMPANY |
| DELETE | `/api/v1/companies/locations/:locationId` | Eliminar ubicación | COMPANY |
| GET | `/api/v1/companies/contacts` | Obtener contactos | COMPANY |
| POST | `/api/v1/companies/contacts` | Agregar contacto | COMPANY |
| PATCH | `/api/v1/companies/contacts/:contactId` | Actualizar contacto | COMPANY |
| DELETE | `/api/v1/companies/contacts/:contactId` | Eliminar contacto | COMPANY |
| GET | `/api/v1/companies/business-areas` | Obtener áreas de negocio | COMPANY |
| POST | `/api/v1/companies/business-areas` | Agregar área de negocio | COMPANY |
| DELETE | `/api/v1/companies/business-areas/:areaId` | Eliminar área de negocio | COMPANY |

### Internos (sin JWT)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/internal/companies/:userId/basic-info` | Datos básicos para otros servicios |
| GET | `/internal/companies/:userId/exists` | Verificar existencia |
| POST | `/internal/companies/update-rating` | Actualizar rating |

### Health
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |

## Eventos

### Publica
- `company.profile.created` — Al crear un perfil
- `company.profile.updated` — Al actualizar un perfil
- `company.verification.updated` — Al cambiar estado de verificación

### Suscribe
- `auth.user.created` (rol=company) → Crea perfil base
- `admin.company.verified` → Actualiza estado de verificación
- `auth.user.deactivated` → Desactiva perfil

## Tests
```bash
npx jest --verbose --forceExit
```

**69 tests** en 3 suites:
- `company.service.spec.ts` — 37 tests
- `company.controller.spec.ts` — 20 tests
- `company-events.subscriber.spec.ts` — 12 tests

## Swagger
Disponible en: `http://localhost:3004/api/docs`

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
