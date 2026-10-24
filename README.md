# ifs24018-pabwe2026-proyek1 — Backend

REST API Study Planner menggunakan Express.js dan SQLite (`better-sqlite3`).

## Install dan jalankan

```bash
bun install
cp .env.example .env
bun run start
```

Default port `3001`; database `./data/planner.db`. Pastikan folder untuk database dapat ditulisi. Atur `CORS_ORIGIN` jika frontend dipasang pada domain berbeda.
Set `AUTH_TOKEN_SECRET` ke secret acak yang sama pada semua instance backend. Buat nilai kuat dengan:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Simpan hasilnya hanya di environment deployment, jangan commit ke Git. Production akan menolak
start jika secret tidak disetel. Logout menghapus token di browser; token yang sudah disalin tetap
berlaku sampai masa tujuh harinya habis atau secret dirotasi.

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
- Set `AUTH_TOKEN_SECRET` yang sama pada environment production dan preview. Token login ditandatangani sehingga tetap dapat divalidasi ketika permintaan berikutnya ditangani instance serverless berbeda. Setelah mengubah secret, pengguna perlu login ulang.
- Routing Vercel harus meneruskan semua path ke `api/index.js`; setelah deployment, `GET /` harus mengembalikan JSON `{"name":"Study Planner API","status":"ok",...}` dan `GET /api/health` harus mengembalikan `{"status":"ok"}`. Jika `/api/health` bekerja tetapi `/` masih menampilkan `Cannot GET /`, periksa deployment Production dan pastikan domain mengarah ke deployment terbaru dari branch tersebut.
- Untuk frontend di domain berbeda, set `CORS_ORIGIN` ke URL frontend lengkap (contoh `https://nama-frontend.vercel.app`). Beberapa origin dapat dipisahkan koma untuk menyertakan domain preview. Preflight API mengizinkan header `Authorization` yang dibutuhkan endpoint sesi dan dashboard.
- SQLite pada `/tmp/planner.db` bersifat sementara di Vercel; gunakan database persisten eksternal jika data akun harus bertahan.
