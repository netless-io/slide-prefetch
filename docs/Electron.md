## @netless/slide-prefetch

This doc includes necessary steps to use this library in electron.

### How it works?

Like on the [web], instead the main thread of electron plays the role of
storing and intercepting. Let's say `render` is the render thread and
`main` is the main thread, `fs` is your file system. It works as follows:

- `main` intercepts all requests in `webRequest.onBeforeRequest`, if `fs` has some resource,
  just return its path. Otherwise fallback to default `fetch` behavior.
- `render` listen to change slide event, and start downloading the prepacked zips
  made for each slide. Once downloaded, unzip the resources and send them to
  `main` thread to store the files

### Usage

1. Create intercepts and register ipc handlers in your main thread.

   ```ts
   import path from "path";
   import { app } from "electron";
   import { setupMain } from "@netless/slide-prefetch/electron";
   setupMain({
     baseUrl: "https://<cdn name>",
     directory: path.join(app.getPath("userData"), "downloads"),
   });
   ```

2. _Optional_: use `preload.js` and `contextBridge` for safer environment.

   ```js
   const { contextBridge, ipcRenderer } = require("electron");
   contextBridge.exposeInMainWorld("api", {
     save: (...args) => ipcRenderer.invoke("slide-prefetch-save-data", ...args),
   });
   ```

3. Call this library in your page scripts.

   ```ts
   import { SlidePrefetch } from "@netless/slide-prefetch/electron";
   const slidePrefetch = new SlidePrefetch({
     // the full resource url will be
     // https://<cdn name>/dynamicConvert/{uuid}/...
     // note that there's no `/` at the end of baseUrl
     baseUrl: 'https://<cdn name>',
   });

   sdk.joinRoom(...).then(room => {
     slidePrefetch.listen(room)
   });

   // you can manually stop listening at any time
   // stop() is automatically called once room is disconnected
   slidePrefetch.stop()
   ```

[web]: ./Web.md
