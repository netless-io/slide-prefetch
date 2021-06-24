## @netless/slide-prefetch

This doc includes necessary steps to use this library in web project.

### How it works?

It depends on [service worker] to intercept `fetch` calls and [cache storage]
to store responses. Let's say `ui` is the ui thread and `sw` is the service
worker thread, `cache` is where responses are stored. It works as follows:

- `sw` checks all fetch calls in `self.onfetch`, if `cache` has some resource,
  just return it. Otherwise fallback to default `fetch` behavior.
- `ui` listen to change slide event, and start downloading the prepacked zips
  made for each slide. Once downloaded, unzip the resources and put them into `cache`.

### Usage

1. Put and register the [`service-worker.js`] in your web project.

   ```ts
   if (navigator.serviceWorker && navigator.serviceWorker.register) {
     navigator.serviceWorker
       .register("./service-worker.js")
       .then((registration) => {
         console.log("registration finish");
       })
       .catch((error) => {
         console.log(error.message);
       });
   }
   ```

   **NOTICE**: you have to configure the `baseUrl` in the source file.

2. Call this library in your page scripts.

   ```ts
   import { SlidePrefetch } from "@netless/slide-prefetch";

   const slidePrefetch = new SlidePrefetch({
     // the full resource url will be
     // https://<cdn name>/dynamicConvert/{uuid}/...
     // note that there's no `/` at the end of baseUrl
     baseUrl: 'https://<cdn name>',

     // if specified, it will put resources into this cache storage
     cacheName: 'netless',

     // or, you can customize the behavior when resources got unzipped
     // url = https://<cdn name>/dynamicConvert/{uuid}/...
     // blob = file data
     onFetch(url: string, blob: Blob) {
       localforage.setItem(url, blob);
     }
   });

   sdk.joinRoom(...).then(room => {
     slidePrefetch.listen(room)
   });

   // you can manually stop listening at any time
   // stop() is automatically called once room is disconnected
   slidePrefetch.stop()
   ```

3. <a name="iife"></a> If you are using vanilla js to use this library, here is an example.

   ```html
   <!-- 1. you have to add @zip.js/zip.js before this library -->
   <script src="https://cdn.jsdelivr.net/npm/@zip.js/zip.js/dist/zip-full.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/@netless/slide-prefetch"></script>
   <script>
     // 2. get the SlidePrefetch class from global name "slide_prefetch"
     const { SlidePrefetch } = slide_prefetch;
     // 3. do whatever you want
     new SlidePrefetch(...);
   </script>
   ```

[service worker]: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
[cache storage]: https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
[`service-worker.js`]: ../service-worker.js
