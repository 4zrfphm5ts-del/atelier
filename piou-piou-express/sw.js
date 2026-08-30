/* Piou Piou Express — service worker (hors ligne). Actif uniquement en https.
 *
 * Même règle de survie que Drink Gamz' : la page passe par le RÉSEAU d'abord,
 * le cache n'est qu'un filet. L'inverse fige l'app sur la version du jour de
 * l'installation — plus aucune correction n'atteint le téléphone, et si la
 * copie gravée est mauvaise, l'app reste morte pour toujours.
 */
const C = "pioupiou-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png", "./favicon-32.png"];

/* Train en marche, réseau à une barre : on n'attend pas la fin des temps. */
const NET_TIMEOUT = 3000;

self.addEventListener("install", e => {
  // addAll est tout-ou-rien : une icône absente et le worker ne s'installerait
  // jamais. On grave fichier par fichier, les manquants ne bloquent rien.
  e.waitUntil(caches.open(C)
    .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// On ne grave qu'une vraie page servie par le site : ni erreur, ni réponse
// partielle, ni ressource d'un autre domaine. Graver un 404 ou un 503 revient à
// condamner l'app. Une réponse redirigée est refusée par Safari quand on la
// ressert pour une navigation : elle non plus ne doit pas entrer en cache.
const gravable = res => res && res.status === 200 && res.type === "basic" && !res.redirected;

function garder(req, res) {
  if (!gravable(res)) return;
  const cp = res.clone();
  caches.open(C).then(c => c.put(req, cp)).catch(() => {});
}

function reseau(req) {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error("timeout")), NET_TIMEOUT);
    fetch(req).then(r => { clearTimeout(t); ok(r); },
                    e => { clearTimeout(t); ko(e); });
  });
}

// Dernier recours : iOS purge le stockage après ~7 jours sans ouvrir l'app.
// Sans ça, respondWith recevrait undefined -> écran blanc au lieu d'un message.
function horsService() {
  return new Response(
    "<!DOCTYPE html><html lang=fr><meta charset=utf-8>" +
    "<meta name=viewport content='width=device-width,initial-scale=1'>" +
    "<title>Piou Piou Express</title>" +
    "<body style=\"margin:0;min-height:100vh;display:flex;align-items:center;" +
    "justify-content:center;background:#4a97d8;color:#fff;" +
    "font:16px/1.6 system-ui,sans-serif;text-align:center;padding:32px\">" +
    "<div><p style=\"font-size:2rem;margin:0 0 12px\">🐦</p>" +
    "<p>Pas de réseau, et plus rien en mémoire.</p>" +
    "<p style=\"color:#dbeeff\">Reconnecte-toi une fois : l'app se réinstalle toute seule.</p>" +
    "</div>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;

  // La page : réseau d'abord, pour que les corrections arrivent jusqu'au
  // téléphone. On range la version fraîche sous index.html, que l'app ait été
  // ouverte via "./" ou via "./index.html".
  if (req.mode === "navigate") {
    e.respondWith(reseau(req)
      .then(res => { garder("./index.html", res); return res; })
      // caches.match peut aussi REJETER (stockage évincé en plein vol, quota) :
      // sans ce catch final, le repli ne rattrape que le cas « rend undefined ».
      .catch(() => caches.match(req)
        .then(r => r || caches.match("./index.html"))
        .then(r => r || horsService())
        .catch(() => horsService())));
    return;
  }

  // Le reste (icônes, manifeste) ne bouge pas : cache d'abord.
  e.respondWith(caches.match(req)
    .then(r => r || fetch(req).then(res => { garder(req, res); return res; }))
    .catch(() => Response.error()));
});
