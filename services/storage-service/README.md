# Storage Service

**Puerto:** 3013
**Base de datos:** `storage_db`

## Propósito

Gestiona el almacenamiento de archivos del sistema: hojas de vida, certificados, logos de empresa, documentos de verificación y archivos adjuntos del chat. Almacena metadatos en la base de datos y los archivos en disco (o S3 en producción).

## Estructura Interna

```
storage-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts       ← Conexión a storage_db
    ├── storage/
    │   ├── storage.module.ts
    │   ├── storage.controller.ts    ← Upload, download, delete, URL firmada
    │   ├── storage.service.ts
    │   ├── dto/
    │   ├── entities/
    │   │   ├── file-metadata.entity.ts  ← Nombre, tipo, tamaño, ruta, propietario
    │   │   └── storage-quota.entity.ts  ← Cuota de almacenamiento por usuario
    │   └── internal/
    │       └── storage-internal.controller.ts
    ├── events/
    │   └── storage-events.subscriber.ts
    └── health/
        └── health.controller.ts
```

## Tipos de Archivo Soportados

| Categoría | Extensiones | Tamaño Máximo |
|-----------|------------|---------------|
| Documentos | PDF, DOC, DOCX | 10 MB |
| Imágenes | JPG, PNG, WEBP | 5 MB |
| Hojas de vida | PDF | 5 MB |
| Otros | ZIP | 20 MB |

## Eventos

- **Publica:** `storage.file.uploaded`, `storage.file.deleted`
