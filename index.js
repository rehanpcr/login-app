const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 3000;

// Default credential (bisa diubah lewat env)
const USERNAME = process.env.USERNAME || 'user';
const PASSWORD = process.env.PASSWORD || 'password';

const PUBLIC_DIR = path.join(__dirname, 'public');

// Session store: sessionId -> { isLoggedIn, username }
const sessions = new Map();

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function setCookie(res, name, value, options = {}) {
  const parts = [name + '=' + value];
  if (options.maxAge) parts.push('Max-Age=' + options.maxAge);
  if (options.path) parts.push('Path=' + options.path);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push('SameSite=' + options.sameSite);
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearCookie(res, name) {
  res.setHeader('Set-Cookie', [name + '=; Max-Age=0; Path=/; HttpOnly']);
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(';').reduce((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return acc;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    acc[name] = value;
    return acc;
  }, {});
}

function redirect(res, target) {
  res.writeHead(302, { Location: target });
  res.end();
}

function readFileHtml(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return sendHtml(res, 404, '<h1>404</h1><p>Halaman tidak ditemukan.</p>');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      req.destroy();
    }
  });
  req.on('end', () => callback(body));
}

function parseQs(body) {
  const params = new URLSearchParams(body);
  const result = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const cookies = parseCookies(req);

  // POST /login
  if (req.method === 'POST' && url.pathname === '/login') {
    parseBody(req, (body) => {
      const { username, password } = parseQs(body);

      if (username === USERNAME && password === PASSWORD) {
        const id = crypto.randomUUID();
        sessions.set(id, { isLoggedIn: true, username });
        setCookie(res, 'session', id, { httpOnly: true, path: '/', maxAge: 86400 });
        return redirect(res, '/welcome');
      }

      return redirect(res, '/?error=gagal');
    });
    return;
  }

  // GET /welcome (hanya boleh kalau session aktif)
  if (req.method === 'GET' && url.pathname === '/welcome') {
    const session = cookies.session ? sessions.get(cookies.session) : null;
    if (session && session.isLoggedIn) {
      return sendHtml(res, 200, `
        <!doctype html>
        <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Berhasil Login</title>
          <style>
            body { font-family: sans-serif; background: #f1f5f9; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .box { background: #fff; padding: 28px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,.1); width: 320px; text-align: center; }
            h1 { color: #047857; }
            .username { font-size: 18px; color: #333; margin: 8px 0 16px; }
            button { padding: 8px 16px; background: #2563eb; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
            a { display: inline-block; margin-top: 12px; color: #2563eb; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>Login Berhasil</h1>
            <div class="username">Halo, ${session.username}!</div>
            <p>Selamat datang di halaman admin.</p>
            <a href="/logout">Logout</a>
          </div>
        </body>
        </html>
      `);
    }
    return redirect(res, '/');
  }

  // GET /logout (bersihkan session + cookie)
  if (req.method === 'GET' && url.pathname === '/logout') {
    const id = cookies.session;
    if (id) sessions.delete(id);
    clearCookie(res, 'session');
    return redirect(res, '/');
  }

  // GET / (halaman login)
  if (url.pathname === '/') {
    return readFileHtml(res, path.join(PUBLIC_DIR, 'index.html'));
  }

  return sendHtml(res, 404, '<h1>404</h1><p>Halaman tidak ditemukan.</p>');
});

server.listen(PORT, HOST, () => {
  console.log(`Server login berjalan di http://${HOST}:${PORT}/`);
});
