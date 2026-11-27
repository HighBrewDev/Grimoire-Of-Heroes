// HTML singolo (scarico offline, zip Windows): parte da dist/ e infila CSS e script classici dentro index.html.
// Uso: npm run build:single  ->  dist-single/index.html (+ icone e manifest accanto)
import {readFileSync, writeFileSync, mkdirSync, cpSync, rmSync} from 'node:fs';

const IN = 'dist', OUT = 'dist-single';
let html = readFileSync(`${IN}/index.html`, 'utf8');
const leggi = f => readFileSync(`${IN}/${f}`, 'utf8');
html = html
  .replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => `<style>${leggi(f)}</style>`)
  .replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>${leggi(f).replace(/<\/script/gi, '<\\/script')}</script>`);
rmSync(OUT, {recursive: true, force: true});
mkdirSync(OUT);
writeFileSync(`${OUT}/index.html`, html);
for (const f of ['icons', 'manifest.webmanifest']) cpSync(`${IN}/${f}`, `${OUT}/${f}`, {recursive: true});
console.log(`${OUT}/index.html ${(html.length / 1e6).toFixed(2)} MB`);
