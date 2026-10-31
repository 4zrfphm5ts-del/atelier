/* Guide Médocs — service worker. Genere par _outils/pwaify.py, ne pas editer a la main.
 *
 * 🔴 REGLE DE SURVIE, apprise sur Drink Gamz' (correctif amont du 23/08, retrouve le
 * 30/08 dans le depot public) : LA PAGE PASSE PAR LE RESEAU D'ABORD. L'inverse — le
 * cache d'abord, qui parait pourtant le plus « hors ligne » des deux — fige l'app sur
 * la version du jour de l'installation : plus aucune correction n'atteint le telephone,
 * et si la copie gravee est mauvaise, l'app reste morte pour toujours. Le nom du cache
 * etant fixe, meme un redeploiement n'y change rien.
 * Le cache n'est donc qu'un FILET : il sert quand le reseau ne repond pas.
 * Aucune dependance reseau : l'app tient entierement en cache. */
const C = "medocs-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./favicon-32.png"];
const RESEAU = [];
/* Donnees vivantes de l'app (catalogue, base) : reseau d'abord, comme la page, sinon la
   copie de l'installation resterait servie pour toujours (le precache ne se renouvelle
   qu'avec le numero du worker). */
const FRAIS = [];
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
      await Promise.all(ks.filter(k => k !== C && k.startsWith("medocs-v")).map(k => caches.delete(k)));
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

/* Dernier recours : iOS purge le stockage apres ~7 jours sans ouverture. Sans cette
   page, `respondWith` recevrait `undefined`, ce qui donne un ecran BLANC muet. */
function horsService() {
  return new Response(
    "<!DOCTYPE html><html lang=fr><meta charset=utf-8>" +
    "<meta name=viewport content='width=device-width,initial-scale=1'>" +
    "<title>Guide Médocs</title>" +
    "<body style='margin:0;min-height:100vh;display:flex;align-items:center;" +
    "justify-content:center;background:#073F40;color:#f3eee4;" +
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
