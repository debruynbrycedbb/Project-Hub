#!/usr/bin/env node
/* ==========================================================================
   Encrypt the hub for publishing.

     node tools/encrypt.mjs path/to/hub-source

   hub-source/ holds the private, readable hub: shell.html (the page layout),
   projects.js (the site list), app.js (the behaviour) and private/ (images
   that should only be seen after signing in, bundled into the encrypted file). It is NOT kept in
   this public repository. This script asks for the username and password
   (or reads HUB_USER and HUB_PASS), then writes hub.enc next to index.html.

   The username and password are never written anywhere. Changing either one
   just means running this again: everyone who was signed in is signed out.

   Encryption: PBKDF2-SHA256 (600,000 rounds, random salt) turns
   "username:password" into a 256-bit key; AES-GCM encrypts the hub with it.
   Uses only Node's built-in Web Crypto, so there is nothing to install.
   ========================================================================== */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

const ITERATIONS = 600_000;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(process.argv[2] || join(root, '..', 'hub-source'));

function ask(question, hidden) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : '');
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      res(answer);
    });
  });
}

const b64 = (buf) => Buffer.from(buf).toString('base64');

const user = (process.env.HUB_USER ?? (await ask('Username: '))).trim();
const pass = process.env.HUB_PASS ?? (await ask('Password: ', true));
if (!user || !pass) {
  console.error('A username and a password are both needed.');
  process.exit(1);
}

const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' };
const assets = {};
for (const name of await readdir(join(srcDir, 'private')).catch(() => [])) {
  const type = TYPES[name.split('.').pop().toLowerCase()];
  if (type) assets[`private/${name}`] = `data:${type};base64,${b64(await readFile(join(srcDir, 'private', name)))}`;
}

const payload = {
  v: 1,
  assets,
  html: await readFile(join(srcDir, 'shell.html'), 'utf8'),
  scripts: [await readFile(join(srcDir, 'projects.js'), 'utf8'), await readFile(join(srcDir, 'app.js'), 'utf8')],
};

// The username is case-insensitive ("bryce" works too); the password is exact.
const secret = new TextEncoder().encode(`${user.toLowerCase()}:${pass}`);
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
  base,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
);
const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));

const out = { v: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: b64(salt) }, iv: b64(iv), data: b64(data) };
await writeFile(join(root, 'hub.enc'), JSON.stringify(out));
console.log(`Wrote hub.enc (${Math.round(out.data.length / 1024)} KB) from ${srcDir}`);
