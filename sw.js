"use strict";

const CACHE_NAME = "kadr-shell-v47";
const APP_FILES = [
  "./",
  "./index.html",
  "./cover-service.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(APP_FILES.map(async (file) => {
        const cacheBustedUrl = new URL(file, self.location);
        cacheBustedUrl.searchParams.set("__sw", CACHE_NAME);
        const response = await fetch(cacheBustedUrl);
        if (!response.ok) throw new Error(`Не удалось кэшировать ${file}: ${response.status}`);
        await cache.put(file, response);
      }));
    })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("kadr-shell-") && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((response) => {
          if (response.ok && requestUrl.pathname.endsWith("/")) {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
          }
          return response;
        });
      })
      .catch(() => {
        if (request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return Response.error();
      })
  );
});
