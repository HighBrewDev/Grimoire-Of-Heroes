// HTML singolo (scarico offline, zip Windows): parte da dist/ e infila CSS e script classici dentro index.html.
// Uso: npm run build:single  ->  dist-single/index.html (+ icone e manifest accanto)
import {readFileSync, writeFileSync, mkdirSync, cpSync, rmSync} from 'node:fs';
import {execSync} from 'node:child_process';

// Seconda build in dist-s con i moduli caricati a richiesta (dadi 3D...) dentro il bundle: nel file singolo non ci sono altri file da cercare.
const IN = 'dist-s', OUT = 'dist-single';
execSync('npx vite build', {stdio:'inherit', env:{...process.env, GRIMOIRE_SINGLE:'1', GRIMOIRE_OUT:IN}});
let html = readFileSync(`${IN}/index.html`, 'utf8');
const leggi = f => readFileSync(`${IN}/${f}`, 'utf8');
html = html
  .replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => `<style>${leggi(f)}</style>`)
  .replace(/<script type="module"[^>]*\ssrc="([^"]+)"[^>]*><\/script>/g, (_, f) => `<script type="module">${leggi(f).replace(/<\/script/gi, '<\\/script')}</script>`)
  .replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>${leggi(f).replace(/<\/script/gi, '<\\/script')}</script>`);
rmSync(OUT, {recursive: true, force: true});
mkdirSync(OUT);
writeFileSync(`${OUT}/index.html`, html);
for (const f of ['icons', 'manifest.webmanifest']) cpSync(`${IN}/${f}`, `${OUT}/${f}`, {recursive: true});
rmSync(IN, {recursive: true, force: true});
console.log(`${OUT}/index.html ${(html.length / 1e6).toFixed(2)} MB`);
