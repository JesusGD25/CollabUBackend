# Seed "showcase" — datos completos para demos y sustentación

Cohorte **aditiva** sobre el seed base (`GUIA_SEED_DESARROLLO.md` en la raíz del proyecto): 4 empresas, 20 estudiantes, 24 proyectos, 44 postulaciones, 13 hilos académicos completos, 28 evaluaciones y 159 documentos PDF descargables. No modifica ninguna fila del seed base y se puede ejecutar varias veces sin duplicar nada.

**Contraseña de todas las cuentas:** `CollabU2026!`

## Cómo ejecutarlo

Requisitos: el seed base ya cargado (`Run-Seed.ps1`) y los servicios corriendo (el generador lee de la BD los catálogos reales —skills, programas, asesores y periodos— que `admin-service` crea en runtime con UUIDs aleatorios).

```powershell
cd Backend/scripts
./Run-Seed-Showcase.ps1                                          # local
./Run-Seed-Showcase.ps1 -PublicApiUrl http://<IP-PUBLICA>:3000   # en el servidor
```

`-PublicApiUrl` es la URL del gateway **tal como la ve el navegador**: se guarda en los links de CV y de entregables para que abran la descarga real. Otros parámetros: `-Today yyyy-MM-dd` (fecha de referencia del escenario), `-SkipAnalytics`, `-SkipEnrichment`, `-SkipMatching`.

El script ejecuta, en orden: (1) genera `seed_showcase.sql` y los PDF; (2) aplica el SQL; (3) copia los PDF a `/app/uploads` de `collab-u-storage-service` si está dockerizado; (4) refresca los cierres de convocatorias del seed base (`seed_refresh_dates.sql`); (5) aplica `seed_analytics_enrichment.sql` (datos de las cuentas demo `student01-05` y `company01-02`); (6) calcula el **match score** de todas las postulaciones con el algoritmo real de `matching-service` (`seed-match-scores.mjs`: llena `applications.match_score` y `match_results`, que alimentan la columna Match, el filtro por compatibilidad y el KPI "Match IA"); (7) dispara la agregación de analítica (backfill mensual + semanal + diaria) y crea un snapshot "de ayer" de skills (`seed_skill_trends_history.sql`) para que la tendencia (en alza / estable / a la baja) se vea desde el primer día. `analytics_db` **nunca** se llena por `INSERT`.

> `seed_shift_dates.sql` quedó **obsoleto** (filtra por prefijos de ID que ya no existen y usa una columna `decided_at` inexistente). Lo reemplaza `seed_refresh_dates.sql`, independiente de IDs.

## Empresas (4, todas verificadas, perfil completo)

| Cuenta | Empresa | Carrera que cubre | Proyectos |
|---|---|---|---|
| empresa.andestech@collabu.dev | AndesTech Soluciones SAS | Sistemas | 6: 2 publicados, 1 en curso, 2 completados, 1 con cambios solicitados |
| empresa.agronarino@collabu.dev | AgroNariño Innovación SAS | Electrónica / Sistemas (agro + IoT) | 6: 2 publicados, 1 en curso, 2 completados, 1 en revisión |
| empresa.cimientos@collabu.dev | Cimientos del Sur Ingeniería S.A. | Civil | 6: 2 publicados, 1 en curso, 2 completados, 1 cancelado |
| empresa.volcan@collabu.dev | Volcán Energía y Automatización SAS | Electrónica / Sistemas | 6: 2 publicados, 3 en curso (en etapas distintas), 1 completado |

## Estudiantes (20, perfil 100 % completo)

| Cuenta | Nombre | Prog. | Escenario |
|---|---|---|---|
| valentina.guerrero@ | Valentina Guerrero | Sis | **Completado** — Rediseño UX del portal (AndesTech) |
| andres.insuasty@ | Andrés Insuasty | Ele | **Completado** — Estación meteorológica solar (AgroNariño), con ronda de correcciones |
| daniela.portilla@ | Daniela Portilla | Sis | **Completado** — Panel de analítica de ventas (AndesTech), terminado hace pocos días |
| juan.erazo@ | Juan Erazo | Sis | **Completado** — Modelo predictivo de cosecha (AgroNariño), con correcciones |
| camila.delgado@ | Camila Delgado | Civ | **Completado** — Interventoría de alcantarillado (Cimientos) |
| sergio.villota@ | Sergio Villota | Civ | **Completado** — Puente peatonal, trabajo de grado (Cimientos) |
| laura.bolanos@ | Laura Bolaños | Ele | **Completado** — Mantenimiento predictivo de motores (Volcán) |
| miguel.zambrano@ | Miguel Zambrano | Sis | **En desarrollo** — Migración a microservicios; prueba técnica de selección aprobada |
| karen.cabrera@ | Karen Cabrera | Sis | **En desarrollo** — Trazabilidad de cadena de frío; un entregable pide revisión |
| cristian.mora@ | Cristian Mora | Civ | **En desarrollo** — Diseño de vía terciaria |
| paula.revelo@ | Paula Revelo | Ele | **Esperando documentos** — Tablero PLC; póliza enviada, pendiente de revisión del admin |
| julian.benavides@ | Julián Benavides | Ele | **Anteproyecto en revisión** — Brazo robótico; 1 de 2 jurados ya aprobó |
| natalia.ortega@ | Natalia Ortega | Ele | **Cierre** — Inversor solar; documentos finales aprobados, falta el cierre administrativo. Tiene **4 evaluaciones pendientes** (estudiante→empresa, estudiante→asesor, empresa→estudiante, asesor→estudiante): sirven para mostrar el flujo de evaluar |
| brayan.narvaez@ | Brayan Narváez | Sis | Postulante — entrevista en 3 días y **prueba técnica pendiente de entrega** |
| angela.cuaspud@ | Ángela Cuaspud | Sis | Postulante — varias postulaciones en distintos estados |
| diego.enriquez@ | Diego Enríquez | Ele | Postulante — preseleccionado en el proyecto de sensores IoT |
| monica.rodriguez@ | Mónica Rodríguez | Ele | Postulante — entrevista técnica en 5 días (SCADA) |
| oscar.tobar@ | Óscar Tobar | Civ | Postulante — entrevista presencial en 2 días (BIM); una postulación retirada |
| daniela.hidalgo@ | Daniela Hidalgo | Civ | Postulante — geotecnia y BIM |
| ricardo.chaves@ | Ricardo Chaves | Sis | Postulante — preseleccionado en citas médicas, rechazado en el asistente IA |

(todas terminan en `@collabu.dev`)

## Docentes del seed base con hilos nuevos

| Cuenta | Qué verán |
|---|---|
| faculty01 (Ana Ruiz) | Asesora de 4 hilos completados/en cierre; jurado en varios más |
| faculty02 (Luis Peña) | **Jurado con un voto pendiente** en el anteproyecto de Julián Benavides — se puede aprobar en vivo |
| faculty03 (Marta Ríos) | Asesora del hilo con prueba de correcciones (Juan Erazo) y de dos en curso |
| faculty04 (Jorge Salas) | Jurado final de 7 hilos (6 completados y 1 en cierre); asesor de Camila Delgado y Cristian Mora |
| admin01 | Cola académica con hilos en cada etapa; proyecto "Dashboard lechero" **pendiente de aprobación**; póliza de Paula Revelo por revisar |

## Escenarios sugeridos para la defensa

1. **Embudo de selección completo** (empresa AndesTech): postulaciones en `pending`, `under_review`, `shortlisted`, `interview`, `rejected`; entrevista ya programada; prueba técnica solicitada al estudiante.
2. **Ciclo académico completo** (hilos de Valentina o Sergio): selección → asesor y jurados → anteproyecto aprobado → documentos iniciales → acuerdo → entregables con comentarios → documentos finales → nota final → evaluaciones bidireccionales.
3. **Flujo en vivo del jurado**: entrar como faculty02, aprobar el anteproyecto de Julián Benavides y ver cómo avanza a documentos.
4. **Corrección de publicación**: empresa AndesTech edita y reenvía "Aplicación Móvil de Fidelización" (cambios solicitados por la facultad, con observaciones reales).
5. **Aprobación de proyecto**: admin aprueba "Dashboard de Indicadores de Producción Lechera".
6. **Analítica**: dashboards de admin y de empresa con más de un año de historial (desde jun-2025); evaluaciones con calificación por criterio; tendencias de skills.
7. **Postular**: usar una cuenta de estudiante **sin proyecto activo** (Brayan Narváez, Ángela Cuaspud, Diego Enríquez, Mónica Rodríguez, Óscar Tobar, Daniela Hidalgo o Ricardo Chaves) frente a los 8 proyectos vigentes (cierres entre 4 y 8 semanas), con matching calculado en vivo. Los estudiantes con proyecto en desarrollo, en cierre o en espera de documentos reciben "Ya tienes un proyecto activo asignado" (regla EST-16); los que ya postularon a un proyecto reciben 409 en ese proyecto.

## Alcance y límites

- Los PDF son documentos de ejemplo generados (título, datos del hilo y texto de relleno), no contenido real.
- No se siembran chat ni notificaciones (se generan al usar la plataforma).
- Las evaluaciones del hilo de Natalia Ortega quedan **pendientes a propósito**: al enviarlas cambian de estado y no se pueden repetir sin resembrar.
- Las empresas no tienen logo (`logo_url` nulo) para no mostrar imágenes rotas; se puede subir uno desde el perfil. Su completitud queda en 95 % por ese motivo.
- Los cierres de convocatoria y las entrevistas futuras se calculan respecto a `-Today` (por defecto, la fecha de ejecución). Si pasan más de ~4 semanas, regenerar con `./Run-Seed-Showcase.ps1 -Today <fecha>`; el historial usa fechas fijas.
