/* Piou Piou Express — service worker. Genere par _outils/pwaify.py, ne pas editer a la main.
 *
 * 🔴 REGLE DE SURVIE, apprise sur Drink Gamz' (correctif amont du 23/08, retrouve le
 * 30/08 dans le depot public) : LA PAGE PASSE PAR LE RESEAU D'ABORD. L'inverse — le
 * cache d'abord, qui parait pourtant le plus « hors ligne » des deux — fige l'app sur
 * la version du jour de l'installation : plus aucune correction n'atteint le telephone,
 * et si la copie gravee est mauvaise, l'app reste morte pour toujours. Le nom du cache
 * etant fixe, meme un redeploiement n'y change rien.
 * Le cache n'est donc qu'un FILET : il sert quand le reseau ne repond pas.
 * Aucune dependance reseau : l'app tient entierement en cache. */
const C = "piou-piou-express-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./favicon-32.png"];
const RESEAU = [];
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
      const ks = await caches.keys();
      await Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)));
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

function reseau(req) {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error("delai")), DELAI);
    fetch(req).then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ko(e); });
  });
}

/* Dernier recours : iOS purge le stockage apres ~7 jours sans ouverture. Sans cette
   page, `respondWith` recevrait `undefined`, ce qui donne un ecran BLANC muet. */
function horsService() {
  return new Response(
    "<!DOCTYPE html><html lang=fr><meta charset=utf-8>" +
    "<meta name=viewport content='width=device-width,initial-scale=1'>" +
    "<title>Piou Piou Express</title>" +
    "<body style='margin:0;min-height:100vh;display:flex;align-items:center;" +
    "justify-content:center;background:#8fd3ff;color:#111;" +
    "font:16px/1.6 system-ui,sans-serif;text-align:center;padding:32px'>" +
    "<div><p>Pas de reseau, et plus rien en memoire.</p>" +
    "<p>Reconnecte-toi une fois : l'app se reinstalle toute seule.</p></div>",
    {status: 200, headers: {"Content-Type": "text/html; charset=utf-8"}});
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = req.url;
  /* Ce qui doit rester vivant (meteo, tuiles de carte...) ne passe jamais par le cache :
     une donnee du monde reel servie depuis hier est un mensonge, et l'app sait deja dire
     qu'elle n'a pas pu la lire. */
  if (RESEAU.some(m => u.includes(m))) return;

  if (req.mode === "navigate") {
    /* On range la version fraiche sous ./index.html, que l'app ait ete ouverte par
       « ./ » ou par « ./index.html ». */
    e.respondWith(reseau(req)
      .then(r => { garder("./index.html", r); return r; })
      /* `caches.match` peut REJETER (stockage evince en plein vol, quota) : sans ce
         dernier catch, le repli ne rattrape que le cas « rend undefined ». */
      .catch(() => caches.match(req)
        .then(r => r || caches.match("./index.html"))
        .then(r => r || horsService())
        .catch(() => horsService())));
    return;
  }

  /* Le reste (icones, manifeste, donnees figees, bibliotheques tierces) ne bouge pas :
     cache d'abord, c'est ce qui rend l'ouverture instantanee et le hors ligne possible. */
  e.respondWith(caches.match(req)
    .then(r => r || reseau(req).then(res => { garder(req, res); return res; }))
    .catch(() => caches.match("./index.html").then(r => r || Response.error())));
});
