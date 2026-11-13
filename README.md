# Login App

Halaman **login sederhana** yang dijalankan lewat **Docker**.

- Default user: `user`
- Default password: `password`
- Halaman login: `/`
- Halaman setelah login: `/welcome`

## Ciri-ciri

- Tidak pakai library tambahan (built-in `http`)
- Password bisa diubah lewat environment: `USERNAME` dan `PASSWORD`

## Build & jalankan

```bash
docker build -t login-app .
docker run --rm -d -p 3000:3000 --name login-app login-app
```

Buka http://localhost:3000

## Contoh
- user / password → masuk
- selain user/password → gagal

## Hapus
```bash
docker stop login-app
```
