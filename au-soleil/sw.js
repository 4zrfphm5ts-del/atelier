/* Au Soleil — service worker. Genere par _outils/pwaify.py, ne pas editer a la main.
 *
 * 🔴 REGLE DE SURVIE, apprise sur Drink Gamz' (correctif amont du 23/08, retrouve le
 * 30/08 dans le depot public) : LA PAGE PASSE PAR LE RESEAU D'ABORD. L'inverse — le
 * cache d'abord, qui parait pourtant le plus « hors ligne » des deux — fige l'app sur
 * la version du jour de l'installation : plus aucune correction n'atteint le telephone,
 * et si la copie gravee est mauvaise, l'app reste morte pour toujours. Le nom du cache
 * etant fixe, meme un redeploiement n'y change rien.
 * Le cache n'est donc qu'un FILET : il sert quand le reseau ne repond pas.
 * Toujours au reseau : tile.openstreetmap, basemaps.cartocdn, api.open-meteo, tiles. Tuiles de carte gardees (600 au plus) : tile.openstreetmap.org. */
const C = "terrasses-soleil-v3";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./favicon-32.png", "./data.js", "./leaflet.js", "./leaflet.css"];
const RESEAU = ["tile.openstreetmap", "basemaps.cartocdn", "api.open-meteo", "tiles."];
/* Donnees vivantes de l'app (catalogue, base) : reseau d'abord, comme la page, sinon la
   copie de l'installation resterait servie pour toujours (le precache ne se renouvelle
   qu'avec le numero du worker). */
const FRAIS = [];
/* Tuiles de fond de carte : gardees a part (voir tuile()), bornees a TUILES_MAX. */
const TUILES = ["tile.openstreetmap.org"];
const TUILES_CACHE = "terrasses-soleil-tuiles";
const TUILES_MAX = 600;
/* Soiree en cave, reseau a une barre : on n'attend pas la fin des temps. */
const DELAI = 3000;

self.addEventListener("install", e => {
  /* Tolerant au fichier manquant : `addAll` est tout-ou-rien, une icone absente et le
     worker ne s'installe JAMAIS, sans que rien ne le dise. */
  e.waitUntil(caches.open(C)
    .then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, {cache: "reload"})).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const pret = await caches.open(C).then(c => c.match("./index.html")).catch(() => null);
    if (pret) {
      /* 🔴 20/10/2026 : les apps de l'atelier partagent UNE origine (4zrfphm5ts-del.github.io) et
         CacheStorage est commun a l'origine, pas au worker. L'ancien filtre (`k !== C`) effacait
         donc le hors ligne de TOUTES les apps voisines a chaque activation. On ne purge plus que
         nos propres anciennes versions. */
      const ks = await caches.keys();
      await Promise.all(ks.filter(k => k !== C && k.startsWith("terrasses-soleil-v")).map(k => caches.delete(k)));
    }
    await self.clients.claim();
  })());
});

/* On ne grave qu'une vraie page servie par le site : ni erreur, ni reponse partielle.
   Mettre un 404 ou un 503 en cache revient a condamner l'app. Une reponse REDIRIGEE est
   refusee par Safari quand on la ressert pour une navigation, soit exactement l'ecran
   blanc qu'on cherche a supprimer. */
const gravable = r => r && r.status === 200 && r.type === "basic" && !r.redirected;

function garder(cle, res) {
  if (!gravable(res)) return;
  const cp = res.clone();
  caches.open(C).then(c => c.put(cle, cp)).catch(() => {});
}

/* 30/10/2026 (KAYAKAK, iPad loin du Mac endormi derriere Tailscale) : quand le serveur ne REPOND
   PAS (la connexion pend au lieu d'echouer), chaque fichier frais attendait son propre DELAI :
   3 s pour la page, puis 3 s de plus pour les scripts, soit plus de 6 s d'ecran vide. Apres un
   premier delai depasse ou une erreur, le reseau est donc tenu pour MORT pendant 30 s : le
   reste part du cache tout de suite. Le premier succes le ranime. */
let mortJusqua = 0;
function reseau(req) {
  if (Date.now() < mortJusqua) return Promise.reject(new Error("reseau tenu pour mort"));
  return new Promise((ok, ko) => {
    const t = setTimeout(() => { mortJusqua = Date.now() + 30000; ko(new Error("delai")); }, DELAI);
    fetch(req).then(r => { clearTimeout(t); mortJusqua = 0; ok(r); },
                    e => { clearTimeout(t); mortJusqua = Date.now() + 30000; ko(e); });
  });
}

/* 31/10/2026 (avant le vol du 09/11) : les tuiles de carte passent par le reseau d'abord, comme
   avant, mais chaque tuile recue est gardee dans un cache A PART, borne a TUILES_MAX tuiles (les plus
   anciennes partent d'abord). Sans reseau, une zone deja vue revient du cache ; une zone jamais vue
   rend une erreur, et l'app dit que son fond de carte manque. La tuile est redemandee en CORS (OSM
   et CARTO l'acceptent) : lisible, on ne garde qu'une vraie image (200) et sa taille reelle compte
   au quota, pas le forfait qu'une reponse opaque y pese. Refusee en CORS, la tuile part telle que la
   page l'a demandee, sans etre gardee, et sans faire passer le reseau pour mort. */
let posees = 0;
function rogner() {
  caches.open(TUILES_CACHE).then(c => c.keys().then(ks =>
    Promise.all(ks.slice(0, Math.max(0, ks.length - TUILES_MAX)).map(k => c.delete(k))))).catch(() => {});
}
function garderTuile(url, res) {
  caches.open(TUILES_CACHE).then(c => c.put(url, res)).then(() => { if (++posees % 25 === 0) rogner(); }).catch(() => {});
}
function tuile(req) {
  const depuisCache = () => caches.open(TUILES_CACHE).then(c => c.match(req.url)).catch(() => undefined);
  if (Date.now() < mortJusqua) return depuisCache().then(r => r || Response.error());
  return new Promise(ok => {
    let fini = false;
    const t = setTimeout(() => {
      if (fini) return; fini = true; mortJusqua = Date.now() + 30000;
      depuisCache().then(r => ok(r || Response.error()));
    }, DELAI);
    fetch(new Request(req.url, {mode: "cors", credentials: "omit"})).then(r => {
      if (r.ok) garderTuile(req.url, r.clone());
      if (fini) return; fini = true; clearTimeout(t); mortJusqua = 0;
      if (r.ok) ok(r); else depuisCache().then(c => ok(c || r));   /* serveur de tuiles en erreur : la copie deja vue */
    }, () => {
      if (fini) return; fini = true; clearTimeout(t);
      fetch(req).then(ok, () => { mortJusqua = Date.now() + 30000; depuisCache().then(r => ok(r || Response.error())); });
    });
  });
}

/* Dernier recours : iOS purge le stockage apres ~7 jours sans ouverture. Sans cette
   page, `respondWith` recevrait `undefined`, ce qui donne un ecran BLANC muet. */
function horsService() {
  return new Response(
    "<!DOCTYPE html><html lang=fr><meta charset=utf-8>" +
    "<meta name=viewport content='width=device-width,initial-scale=1'>" +
    "<title>Au Soleil</title>" +
    "<body style='margin:0;min-height:100vh;display:flex;align-items:center;" +
    "justify-content:center;background:#ffd166;color:#111;" +
    "font:16px/1.6 system-ui,sans-serif;text-align:center;padding:32px'>" +
    "<div><p>Pas de reseau, et plus rien en memoire.</p>" +
    "<p>Reconnecte-toi une fois : l'app se reinstalle toute seule.</p></div>",
    {status: 200, headers: {"Content-Type": "text/html; charset=utf-8"}});
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = req.url;
  /* Tuiles de carte : avant RESEAU, qui peut nommer le meme serveur (voir tuile()). */
  if (TUILES.some(m => u.includes(m))) { e.respondWith(tuile(req)); return; }
  /* Ce qui doit rester vivant (meteo, tuiles de carte...) ne passe jamais par le cache :
     une donnee du monde reel servie depuis hier est un mensonge, et l'app sait deja dire
     qu'elle n'a pas pu la lire. */
  if (RESEAU.some(m => u.includes(m))) return;

  const frais = FRAIS.some(f => u.endsWith("/" + f));
  if (req.mode === "navigate" || frais) {
    /* On range la version fraiche sous ./index.html, que l'app ait ete ouverte par
       « ./ » ou par « ./index.html » ; un fichier frais est range sous sa propre cle. */
    const cle = req.mode === "navigate" ? "./index.html" : req;
    e.respondWith(reseau(req)
      /* 31/10/2026 : une ERREUR du serveur (5xx) n'est pas une page. Tailscale Serve repond 502 des que
         le serveur du Mac est arrete (KAYAKAK sur l'iPad, Mac allume), GitHub Pages 503 pendant un
         incident : l'app affichait « 502 Bad Gateway » au lieu de sa copie. Le cache sert, comme sans
         reseau ; un fichier frais en 5xx servi tel quel cassait aussi la page (erreur de syntaxe). */
      .then(r => { if (r.status >= 500) throw new Error("serveur en erreur " + r.status); garder(cle, r); return r; })
      /* `caches.match` peut REJETER (stockage evince en plein vol, quota) : sans ce
         dernier catch, le repli ne rattrape que le cas « rend undefined ».
         Pour un fichier frais, on s'arrete a sa copie en cache : servir la page
         « hors service » sous un src de script casserait l'app (erreur de syntaxe). */
      .catch(() => req.mode !== "navigate"
        ? caches.match(req).then(r => r || Response.error()).catch(() => Response.error())
        : caches.match(req)
          .then(r => r || caches.match("./index.html"))
          .then(r => r || horsService())
          .catch(() => horsService())));
    return;
  }

  /* Le reste (icones, manifeste, donnees figees, bibliotheques tierces) ne bouge pas :
     cache d'abord, c'est ce qui rend l'ouverture instantanee et le hors ligne possible.
     31/10/2026 : sans reseau ni copie, une ERREUR, plus la page : servie sous un src de script ou
     de feuille de style, la page HTML cassait l'app (erreur de syntaxe), sans rien reparer. */
  e.respondWith(caches.match(req)
    .then(r => r || reseau(req).then(res => { garder(req, res); return res; }))
    .catch(() => Response.error()));
});
