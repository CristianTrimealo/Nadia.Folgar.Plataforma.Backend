# AGENTS.md — Nadia.Folgar.Plataforma.Backend

## Comandos

```bash
npm install
cp .env.example .env      # completar MONGODB_URI / JWT_SECRET / JWT_REFRESH_SECRET
docker compose up -d      # levanta Mongo (y la API si se usa el compose completo)
npm run start:dev         # API en http://localhost:3000/api/v1, Swagger en /api/docs
npm run lint
npm run build
npm run test
npm run test:e2e
```

## Convención de commits y branches
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Referenciar la tarea del backlog cuando aplique, ej. `feat(clientes): alta de maestro Cliente del Estudio (FOLGAR-004)`.
- Branches: `feature/FOLGAR-XXX-descripcion-corta`, `fix/descripcion-corta`.

## Qué no tocar sin confirmación explícita
- Cualquier integración real con ARCA/AFIP (Alerta-Presentaciones, Facturación-Electrónica) — hoy son adapters **stub**. No reemplazar el stub por una llamada real sin confirmar la vía de acceso con Cristian.
- Cualquier cosa que dispare una emisión real de comprobante fiscal o un envío real de WhatsApp/mail a un cliente (fuera de ambientes de prueba).
- Credenciales o secrets de producción — nunca se commitean, solo viven en variables de entorno del hosting.
- El formato del contrato de API (`/api/v1`, shape de error, Swagger) sin avisar en el CLAUDE.md del Frontend — es el contrato entre los dos repos.

## Definition of Done por tarea del backlog
1. Código + tests unitarios (lógica no trivial) y, si aplica, al menos 1 test e2e del módulo.
2. `npm run lint` y `npm test` pasando.
3. `CLAUDE.md` actualizado: estado del módulo en la tabla "Mapa de módulos".
4. Checklist de la tarea (`Folgar_Backlog_Tareas.json`) satisfecho conceptualmente (no se edita el JSON, es el backlog fuente).
5. Si el cambio toca el contrato de API (ruta nueva, DTO, forma de respuesta): dejar una línea en la sección "Pendiente de sincronizar con el Backend" del `CLAUDE.md` del Frontend.

## Cómo actualizar CLAUDE.md y este archivo
- `CLAUDE.md`: actualizar la tabla de módulos en el mismo commit que el código que cambia el estado de ese módulo. Si una decisión de arquitectura nueva se toma en el camino, sumarla a la sección "Decisiones de arquitectura" con el motivo.
- `AGENTS.md`: actualizar cuando cambian los comandos reales (scripts de `package.json`) o las reglas de qué no tocar.
- Si en algún momento no se llega a actualizar la documentación junto con el código, decirlo explícitamente en la respuesta al usuario en vez de dejarla desactualizada en silencio.
