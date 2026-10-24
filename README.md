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


## Deployment ke Vercel (backend API)

Repositori ini adalah backend API, bukan frontend web. Setelah deployment, `/` mengembalikan JSON informasi API, sedangkan pemeriksaan kesehatan berada di `/api/health`. Frontend harus memakai URL deployment backend sebagai base URL API.

- Pastikan Root Directory proyek Vercel menunjuk ke folder backend yang berisi `package.json` dan `vercel.json`.
- Deploy branch yang berisi `api/index.js`, `src/app.js` dengan ekspor bernama `createApp`, dan `src/config/env.js`.
- Untuk frontend di domain berbeda, set `CORS_ORIGIN` ke URL frontend lengkap (contoh `https://nama-frontend.vercel.app`). Jika memakai preview deployment, origin harus sesuai domain yang dipakai.
- SQLite pada `/tmp/planner.db` bersifat sementara di Vercel; gunakan database persisten eksternal jika data akun harus bertahan.
