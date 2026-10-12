import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('HTTP serves the complete browser module graph and rejects unlisted project files', { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, ['server.mjs'], { cwd: new URL('..', import.meta.url), env: {...process.env, PORT:'0'}, stdio:['ignore','pipe','pipe'] });
  const exited = once(child, 'exit');
  try {
    const url = await new Promise((resolve, reject) => {
      let output = '';
      child.stdout.on('data', data => { output += data; const match = output.match(/http:\/\/localhost:\d+/); if (match) resolve(match[0]); });
      child.once('error', reject); child.once('exit', code => reject(new Error(`Server exited ${code}`)));
    });
    const response = await fetch(url);
    assert.equal(response.status, 200); assert.ok(response.headers.get('content-type').startsWith('text/html'));
    const page = await response.text();
    assert.ok(page.includes('id="simulation-run"')); assert.ok(page.includes('id="comparison-body"'));
    const visited = new Set();
    async function visit(modulePath) {
      if (visited.has(modulePath)) return; visited.add(modulePath);
      const response = await fetch(`${url}${modulePath}`);
      assert.equal(response.status, 200, modulePath);
      assert.ok(response.headers.get('content-type').startsWith('text/javascript'));
      const source = await response.text();
      for (const [, relative] of source.matchAll(/from ['"](.+?)['"]/g)) await visit(new URL(relative, `http://test${modulePath}`).pathname);
    }
    await visit('/src/app.js');
    assert.ok(visited.has('/src/simulation.js')); assert.ok(visited.has('/src/simulation-ui.js'));
    assert.ok(visited.has('/src/workbench.js')); assert.ok(visited.has('/src/workbench-ui.js'));
    const css = await fetch(`${url}/src/style.css`); assert.equal(css.status, 200); assert.ok(css.headers.get('content-type').startsWith('text/css'));
    for (const p of ['/missing','/package.json','/docs/STATUS.md','/.git/config']) assert.equal((await fetch(`${url}${p}`)).status,404);
  } finally { child.kill(); await exited; }
});
