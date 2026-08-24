# Ábrelo — MVP 0.1

Ábrelo es un regalo digital interactivo reutilizable. El destinatario recibe una experiencia tipo sobre: rompe el sello, abre la carta y descubre un ticket de "Vale por…".

## Qué incluye este MVP

- Experiencia de sobre animado.
- Sello que debe mantenerse presionado para abrirse.
- Carta previa al regalo.
- Reveal final tipo ticket "Vale por…".
- Confetti.
- 4 temas visuales.
- Pantalla de configuración reutilizable.
- Persistencia local del regalo durante desarrollo.
- Publicación de snapshots inmutables mediante Cloudflare Worker + D1.
- Enlace opaco, copia, Web Share y QR para entregar el regalo.
- Base de Tauri 2 para convertir la experiencia en app de escritorio.

## Ejecutar el frontend

```bash
npm install
npm run dev
```

Abre `http://localhost:1420`.

- Runtime: `/` o `/#/runtime`
- Creator: `/#/creator`

Para probar publicación local con D1, consulta [`docs/publishing.md`](docs/publishing.md).
Para preparar staging o producción, consulta [`docs/production.md`](docs/production.md); los deploys remotos permanecen bloqueados hasta configurar recursos reales.
La arquitectura de despliegue, los límites entre D1/R2 y los flujos futuros de assets privados están definidos en [`docs/deployment-architecture.md`](docs/deployment-architecture.md).

## Ejecutar con Tauri

Instala primero los prerequisitos de Tauri/Rust para tu sistema y luego:

```bash
npm install
npm run tauri dev
```

## Compilar

```bash
npm run tauri build
```

Para generar instaladores de Windows, el build de Windows se realiza en Windows. Más adelante podemos automatizarlo con GitHub Actions.

## Arquitectura prevista

La versión de producto separará:

1. **Creator**: configura el regalo.
2. **Gift Runtime**: reproduce la experiencia sin mostrar el editor.
3. **GiftConfig**: archivo de datos serializable con destinatario, mensajes, tema, interacción y contenido del regalo.
4. **Publisher**: publica snapshots no listados en la experiencia web recipient-only.
5. **Exporter**: generará paquetes nativos en una fase posterior.

Creator, Preview, Runtime web y publicación mantienen entry points y responsabilidades separados.
