/*! MIT License © netless */

var baseUrl = "https://<cdn name>";
var cacheName = "netless";

self.oninstall = function () {
  self.skipWaiting();
};

var cachePromise;
function openCache() {
  return cachePromise || (cachePromise = caches.open(cacheName));
}

self.onfetch = function (event) {
  var request = event.request;
  if (request.url.startsWith(baseUrl)) {
    event.respondWith(
      openCache().then(function (cache) {
        return cache.match(request).then(function (response) {
          return response || fetch(request);
        });
      })
    );
  }
};
