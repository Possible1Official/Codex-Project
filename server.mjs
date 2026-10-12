import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const allowed = new Set(['/index.html', '/src/app.js', '/src/model.js', '/src/style.css', '/src/simulation.js', '/src/simulation-ui.js']);
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const target = pathname === '/' ? '/index.html' : pathname;
    if (!allowed.has(target)) { res.writeHead(404); res.end('Not found'); return; }
    const body = await readFile(path.join(root, target));
    res.writeHead(200, { 'Content-Type': `${types[path.extname(target)]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Unable to serve application'); }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`Signal Atlas: http://localhost:${server.address().port}`));
