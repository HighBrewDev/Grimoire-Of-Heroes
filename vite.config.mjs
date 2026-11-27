// Fase 0 del porting: la build deve produrre lo stesso sito di oggi (index.html, style.css, sw.js, config.js...).
// Il codice dell'app è ancora negli <script> classici di index.html: Vite li lascia intatti. I file statici
// elencati sotto sono copiati tali e quali in dist/.
import {defineConfig} from 'vite';
import {cpSync, existsSync, readdirSync} from 'node:fs';

// Tutti i file classici nella radice (srd.js, config.js, style.css, sw.js, aspetto.js, effetti.js, legal.html...)
// entrano nella build senza elencarli; index.html lo gestisce Vite. Le cartelle statiche sono elencate.
const NON_SITO = new Set(['node_modules', 'dist', 'dist-single', 'docs', 'tests', 'scripts', 'src', 'supabase']);
const statici = () => [
  ...readdirSync('.').filter(f => f !== 'index.html' && /\.(js|css|html|webmanifest)$/.test(f)),
  '.nojekyll',
  // cartelle del sito (icons, effects...): tutte tranne quelle di sviluppo
  ...readdirSync('.', {withFileTypes: true}).filter(d => d.isDirectory() && !NON_SITO.has(d.name) && !d.name.startsWith('.')).map(d => d.name),
];

const salvati = [];
const PROTETTI = /<link rel="(?:manifest|icon|apple-touch-icon|stylesheet)"[^>]*>|<script(?![^>]*type="module")[^>]*\ssrc="[^"]*"[^>]*><\/script>/g;

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {output: {assetFileNames: '[name][extname]'}},
  },
  plugins: [{
    // Per ora il sito è ancora quello di oggi: link e script classici restano com'è scritto nell'HTML
    // (Vite altrimenti li riscriverebbe: icons/ appiattite, CSS rinominato e minificato, avvisi su config.js).
    // Quando arriverà il primo modulo (<script type="module">) quel tag passerà normalmente da Vite.
    name: 'html-invariato',
    transformIndexHtml: {
      order: 'pre',
      handler(html){ salvati.length = 0; return html.replace(PROTETTI, m => `<!--keep:${salvati.push(m) - 1}-->`); },
    },
  }, {
    name: 'html-invariato-ripristino',
    transformIndexHtml: {
      order: 'post',
      handler(html){ return html.replace(/<!--keep:(\d+)-->/g, (_, i) => salvati[i]); },
    },
  }, {
    name: 'copia-statici',
    closeBundle(){
      for (const f of statici()) if (existsSync(f)) cpSync(f, 'dist/' + f, {recursive: true});
    },
  }],
});
