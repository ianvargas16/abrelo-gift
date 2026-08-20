# Recipient Web Runtime

Ábrelo has two application entry points that share the same recipient experience components.

## Entries and builds

- `index.html` -> `src/main.tsx` -> `src/App.tsx` is the Creator application. It owns editing, Preview, draft persistence, import/export, hash routes, and the Tauri desktop shell.
- `runtime.html` -> `src/runtime-main.tsx` -> `RecipientRuntimeApp` is the recipient-only browser application. It imports `RuntimeView`, the GiftFile parser, shared Runtime components, styles, and locally bundled fonts. It does not import `App`, Creator, Preview, draft storage, or Tauri APIs.

Build the Creator/Tauri frontend with `npm run build`. Its output remains `dist/`, which is the directory configured in Tauri.

Build the recipient application with `npm run build:runtime`. Its independent output is `dist-runtime/`. Use `npm run dev:runtime` and open `/runtime.html` for the local demo, or use `npm run preview:runtime` to serve the production output.

## Style boundary

Design tokens, resets, themes, focus behavior, and reduced-motion defaults live in `src/styles/base.css`. The physical recipient experience has one visual implementation in `src/styles/runtime.css`.

The Creator entry imports base, Runtime, and `src/styles/creator.css`, because Creator Preview renders the real Runtime. The standalone recipient entry imports only local fonts, base styles, and Runtime styles. Creator and Preview selectors must not enter `dist-runtime`; `npm run check:runtime-bundle` enforces this boundary after the production Runtime build.

## Gift bootstrap contract

The recipient shell expects one serialized `GiftFile` in an embedded JSON element:

```html
<script id="abrelo-gift-data" type="application/json">
  {"schema":"abrelo.gift","version":1,"gift":{...}}
</script>
```

`src/runtime/runtimeBootstrap.ts` reads the text, parses JSON, and delegates validation and migration to the existing `parseGiftFile` contract. There is no second schema and no localStorage fallback.

A Publisher must serialize this script safely. In particular, literal `<` characters in JSON strings must be escaped, for example as `\u003c`, so gift text cannot terminate the script element.

During Vite development only, a missing payload displays `defaultGift` for convenience. Malformed or unsupported payloads still fail. In a production Runtime build, missing, malformed, and unsupported data all render the same recipient-safe unavailable state. Production never substitutes the demo birthday gift.

## Published public routes

The Publish Worker maps `/g/<opaque-gift-id>` to the recipient shell and injects the matching immutable GiftFile snapshot. IDs are generated from 128 bits of server-side randomness and contain no names, occasions, messages, or other GiftConfig data. Runtime components do not inspect the URL and do not depend on Creator hash routing.

The Publisher provides:

- the recipient Runtime shell and static assets;
- a safely serialized, validated GiftFile payload;
- an opaque gift identifier and route mapping;
- exact-ID availability decisions before serving the shell;
- gift-specific metadata and preview images when those features are introduced.

## Privacy and metadata

`runtime.html` defaults to `noindex`, `nofollow`, `noarchive`, `nosnippet`, and a `no-referrer` policy. Its title, description, site name, and Open Graph type are deliberately generic and contain no recipient data.

Messaging and social crawlers usually do not execute client JavaScript reliably. Recipient-specific titles, descriptions, and preview images must eventually be rendered by the publishing/server layer when it serves `/g/<gift-id>`; the client Runtime cannot provide reliable dynamic social cards by itself.

## Browser independence

The recipient Runtime is the primary distribution surface and must remain normal browser code. Tauri remains an optional wrapper for the Creator application only. Do not import `@tauri-apps/api`, draft persistence, publishing clients, or editing controls into the recipient graph.

Fonts are bundled from Fontsource packages into the build. The recipient experience does not need Google Fonts, `fonts.gstatic.com`, or another font CDN. Publishing, QR, and sharing controls exist only in Creator and the Worker boundary; PWA caching and authentication remain outside the recipient Runtime.
