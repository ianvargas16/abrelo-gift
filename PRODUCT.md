# Ábrelo — visión de producto

## Idea central

Ábrelo convierte un regalo intangible o futuro en una experiencia física-digital: el destinatario no recibe simplemente un texto que dice "vale por una cena", sino un pequeño ritual interactivo que crea expectativa antes de revelar la sorpresa.

## Principios

1. **La apertura es parte del regalo.** Debe existir expectativa, respuesta visual y una pequeña resistencia juguetona.
2. **Cero instalación compleja para quien recibe.** Abrir y disfrutar.
3. **Offline por defecto cuando aplique.** Un regalo personal no debería necesitar una cuenta para abrirse.
4. **Reutilizable para quien crea.** Cambiar persona, mensaje y regalo sin tocar código.
5. **El regalo no se spoilea.** El Runtime no muestra configuraciones ni nombres internos del premio antes del reveal.
6. **Emocional antes que gamificado.** Las interacciones deben sentirse bonitas, no como un minijuego frustrante.

## Flujo v1

1. Pantalla de llegada: nombre + "Hay algo para ti".
2. Sobre cerrado.
3. Mantener presionado el sello. Si se suelta antes, el sobre reacciona y anima a intentar otra vez.
4. El sello se rompe.
5. Abrir la solapa.
6. Sacar la tarjeta.
7. Leer mensaje personal.
8. Pulsar "Descubrir mi regalo".
9. Reveal con confeti.
10. Ticket premium "Vale por…".

## Creator

Campos iniciales:

- Destinatario.
- Remitente.
- Fecha/texto introductorio.
- Mensaje de la carta.
- Regalo.
- Descripción del regalo.
- Condiciones o detalle divertido.
- Código visual del ticket.
- Tema visual.

El Creator exporta un archivo `.gift.json`. En una fase posterior, el Exporter tomará ese archivo y generará el ejecutable final.

## Runtime

El Runtime es el reproductor del regalo. No contiene controles de edición en builds finales. Recibe un `GiftConfig` y renderiza una secuencia de escenas.

Estados iniciales:

`sealed -> unsealed -> opened -> letter -> revealed`

Esto permite reemplazar el sobre por otras experiencias futuras sin cambiar el modelo de regalo.

## Tipos de regalo previstos

- Vale por…
- Entrada / evento.
- Viaje o escapada.
- Regalo físico con foto/reveal.
- Dinero / transferencia simbólica.
- Código o QR.
- Enlace no listado.
- Pista para encontrar un regalo físico.
- Mensaje final personalizado.

## Interacciones futuras

- Arrastrar una cinta para desatarla.
- Raspar una tarjeta.
- Romper papel virtual con el mouse.
- Soplar/apagar velas usando micrófono (opcional).
- Mover el mouse para buscar una pista.
- Puzzle sencillo de 3 piezas.
- Cuenta regresiva para una fecha.
- Selección de una de varias cajas antes del reveal.

No todas deben aparecer juntas. El creador debería elegir 1–3 pasos según la personalidad del destinatario.

## Arquitectura objetivo

### 1. Creator
Editor visual donde se crea y previsualiza un regalo.

### 2. GiftConfig
Formato versionado y portable (`*.gift.json`). No depende de la UI.

### 3. Runtime
Aplicación visual que interpreta GiftConfig y ejecuta escenas.

### 4. Exporter
Generador que combina Runtime + GiftConfig + assets y produce la entrega final.

### 5. Builders
Pipelines por plataforma:
- Windows `.exe` / instalador.
- macOS `.app` / `.dmg`.
- Más adelante versión web compartible mediante enlace.

## Qué NO construir todavía

- Backend o cuentas.
- Marketplace de plantillas.
- Base de datos remota.
- Pagos.
- Editor de animaciones libre.
- Diez tipos de regalos simultáneamente.

Primero hay que hacer excelente la sensación de abrir un único regalo.

## Roadmap

### MVP 0.1 — actual
Sobre + carta + ticket + editor básico + temas + `.gift.json`.

### MVP 0.2
Separar Creator/Runtime, assets locales, audio, pantalla completa, animación de sello más física y modo regalo sin editor.

### MVP 0.3
Exporter: escoger `.gift.json` y generar un paquete de distribución.

### 0.4
Plantillas de reveal y nuevos tipos de regalo.

### 1.0
Creator terminado, build automatizado Windows/macOS, firma, iconos personalizados y flujo de distribución pulido.
