# ifs24018-pabwe2026-proyek1 — Backend

REST API Study Planner menggunakan Express.js, SQLite untuk pengembangan lokal, dan Supabase PostgreSQL untuk deployment Vercel.

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

SQLite lokal menggunakan `node:sqlite`, sehingga memerlukan Node.js 22.13 atau lebih baru. Deployment Vercel menggunakan Supabase PostgreSQL seperti dijelaskan di bawah.


## Deployment ke Vercel (backend API)

Repositori ini adalah backend API, bukan frontend web. Vercel Functions tidak boleh memakai SQLite di `/tmp` untuk akun atau data aplikasi karena filesystem tersebut sementara dan berbeda antar-instance. Gunakan Supabase PostgreSQL sebagai database persisten bersama.

- Pastikan Root Directory proyek Vercel menunjuk ke folder backend yang berisi `package.json` dan `vercel.json`.
- Deploy branch yang berisi `api/index.js`, `src/app.js` dengan ekspor bernama `createApp`, dan `src/config/env.js`.
- Buat project Supabase. Dari Project Settings → Database, salin connection string PostgreSQL **Transaction Pooler** dan set sebagai `DATABASE_URL` pada Environment Variables project backend Vercel. Backend juga menerima `POSTGRES_URL` bila Vercel Postgres mengisi nama tersebut.
- `AUTH_TOKEN_SECRET` dapat diatur sebagai secret terpisah (minimal 32 karakter). Jika tidak diatur, backend menurunkan secret stabil dari `DATABASE_URL`/`POSTGRES_URL`, sehingga environment database saja cukup. Tabel aplikasi dimigrasikan otomatis saat backend mulai; semua instance menggunakan akun, sesi, jadwal, tugas, alarm, dan pengaturan yang sama.
- Jangan commit atau membagikan `DATABASE_URL`, `POSTGRES_URL`, maupun `AUTH_TOKEN_SECRET`. Setelah menambah environment variables, redeploy backend.
- Akun dan data yang sebelumnya tersimpan di `/tmp/planner.db` tidak dapat dipindahkan otomatis karena file tersebut tidak persisten dan tidak tersedia untuk migrasi. Pengguna perlu membuat akun sekali lagi di database baru; setelah itu login normal akan memakai akun yang sama.
- Routing Vercel harus meneruskan semua path ke `api/index.js`; setelah deployment, `GET /` harus mengembalikan JSON `{"name":"Study Planner API","status":"ok",...}` dan `GET /api/health` harus mengembalikan `{"status":"ok","database":"connected","dialect":"postgres","revision":"<commit>"}`. Pastikan `dialect` bernilai `postgres` dan `revision` cocok dengan commit yang dideploy. Jika health hanya mengembalikan `{"status":"ok"}`, domain masih mengarah ke deployment backend lama atau project/root directory Vercel perlu diperiksa.
- Untuk frontend di domain berbeda, set `CORS_ORIGIN` ke URL frontend lengkap (contoh `https://nama-frontend.vercel.app`). Beberapa origin dapat dipisahkan koma untuk menyertakan domain preview. Preflight API mengizinkan header `Authorization` yang dibutuhkan endpoint sesi dan dashboard.
