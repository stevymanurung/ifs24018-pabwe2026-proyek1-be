# ifs24018-pabwe2026-proyek1 — Backend

REST API Study Planner menggunakan Express.js dan SQLite (`better-sqlite3`).

## Install dan jalankan

```bash
bun install
cp .env.example .env
bun run start
```

Default port `3001`; database `./data/planner.db`. Pastikan folder untuk database dapat ditulisi. Atur `CORS_ORIGIN` jika frontend dipasang pada domain berbeda.

## Perintah lain

```bash
bun run dev
bun run seed
bun run test
```

Catatan: `better-sqlite3` memakai native bindings. Pastikan versi Bun/runtime dan OS deployment mendukung instalasi paket native ini; bila log deployment menunjukkan kegagalan native binding, perlu menyesuaikan runtime atau driver database.
