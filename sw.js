/* Atelier — service worker de la page d'accueil (hors ligne). https seulement.
 *
 * Même règle de survie que les apps : la page passe par le RÉSEAU d'abord, le
 * cache n'est qu'un filet ; on ne grave qu'une vraie réponse 200 du site.
 *
 * Particularité : sa portée est tout le dépôt (/atelier/), donc il verrait
 * passer enseigne/, dada/ et les apps. Il ne répond QUE pour ses propres
 * fichiers — tout le reste part au réseau sans être touché, et les apps qui ont
 * leur propre worker (portée plus précise, elle gagne) gardent la main.
 */
const C = "atelier-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png", "./favicon-32.png"];

const NET_TIMEOUT = 3000;
const BASE = new URL("./", location.href).pathname;   // /atelier/
const AMOI = new Set(CORE.map(u => new URL(u, location.href).pathname));

self.addEventListener("install", e => {
  // addAll est tout-ou-rien : un fichier manquant et le worker ne s'installe
  // jamais. On grave un par un.
  e.waitUntil(caches.open(C)
    .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Ni erreur, ni réponse partielle, ni autre domaine, ni réponse redirigée
// (Safari refuse de resservir cette dernière pour une navigation : écran blanc).
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

// iOS purge le stockage après ~7 jours sans ouvrir l'app : sans ce dernier
// recours, respondWith recevrait undefined, donc un écran blanc.
function horsService() {
  return new Response(
    "<!DOCTYPE html><html lang=fr><meta charset=utf-8>" +
    "<meta name=viewport content='width=device-width,initial-scale=1'>" +
    "<title>Studio BFievé — ateliers</title>" +
    "<body style=\"margin:0;min-height:100vh;display:flex;align-items:center;" +
    "justify-content:center;background:#26221C;color:#FAF5EC;" +
    "font:16px/1.6 system-ui,sans-serif;text-align:center;padding:32px\">" +
    "<div><p style=\"font-size:2rem;margin:0 0 12px\">🧰</p>" +
    "<p>Pas de réseau, et plus rien en mémoire.</p>" +
    "<p style=\"color:#b5ab9e\">Reconnecte-toi une fois : la page se réinstalle toute seule.</p>" +
    "</div>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    // Seule la page d'accueil nous regarde. enseigne/, dada/ et les apps
    // partent au réseau : ce worker n'a pas à décider pour elles.
    if (url.pathname !== BASE && url.pathname !== BASE + "index.html") return;
    e.respondWith(reseau(req)
      .then(res => { garder("./index.html", res); return res; })
      // caches.match peut REJETER (stockage évincé en plein vol, quota) :
      // sans ce catch, le repli ne rattrape que le cas « rend undefined ».
      .catch(() => caches.match(req)
        .then(r => r || caches.match("./index.html"))
        .then(r => r || horsService())
        .catch(() => horsService())));
    return;
  }

  if (!AMOI.has(url.pathname)) return;    // icônes et manifeste des autres : pas à nous
  e.respondWith(caches.match(req)
    .then(r => r || fetch(req).then(res => { garder(req, res); return res; }))
    .catch(() => Response.error()));
});
