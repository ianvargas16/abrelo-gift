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
- Base de Tauri 2 para convertir la experiencia en app de escritorio.

## Ejecutar el frontend

```bash
npm install
npm run dev
```

Abre `http://localhost:1420`.

- Vista regalo: `/`
- Editor: `/?editor=1`

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
4. **Exporter**: genera el paquete final y dispara el build del ejecutable.

El MVP mantiene Creator y Runtime juntos para iterar rápido sobre la experiencia antes de separar el pipeline de exportación.
