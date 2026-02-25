# shared/

Librería compartida que contiene código reutilizado por todos los microservicios. Cada servicio importa este paquete como dependencia local.

## Estructura Interna

```
shared/
├── package.json         ← Dependencias compartidas
├── tsconfig.json        ← Configuración TypeScript
└── src/
    ├── dto/             ← DTOs genéricos (paginación, respuesta API)
    ├── interfaces/      ← Interfaces para eventos de dominio y respuestas
    ├── guards/          ← Guards de autenticación JWT y autorización por roles
    ├── decorators/      ← Decoradores custom (@Roles, @CurrentUser)
    ├── filters/         ← Filtro global de excepciones HTTP
    ├── interceptors/    ← Interceptores de transformación y logging
    ├── rabbitmq/        ← Módulo completo de conexión y pub/sub con RabbitMQ
    ├── http-client/     ← Cliente HTTP centralizado para comunicación inter-servicio
    ├── resilience/      ← Patrones de resiliencia (Circuit Breaker, retry)
    └── constants/       ← Enums, routing keys de eventos y códigos de error
```

## Propósito

Evitar duplicación de código entre los 14 microservicios. Todo lo que sea transversal y no pertenezca a un dominio específico se coloca aquí.
