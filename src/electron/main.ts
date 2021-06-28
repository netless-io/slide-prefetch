import { app, ipcMain, protocol, session } from "electron";
import fs from "fs";
import path from "path";
import { channelName } from "./share";

let isInstalled = false;

/**
 * Set up `ipcMain` handler for communication between renderer and main process.
 * Register `onBeforeRequest` to intercept fetch calls.
 * - - -
 * _Optional_: To make thread more safer, you can use `contextBridge` to
 *             prevent using `ipcRender` in renderer thread. e.g.
 * ```ts
 * // in preload.js
 * const { contextBridge, ipcRenderer } = require('electron')
 * contextBridge.exposeInMainWorld("api", {
 *   save: (...args) => ipcRenderer.invoke("slide-prefetch-save-data", ...args)
 * })
 * // in renderer
 * new SlidePrefetch({ contextBridge: { name: 'api', method: 'save' } })
 * ```
 */
export function setupMain({
  baseUrl,
  directory,
  verbose,
}: {
  baseUrl: string;
  directory?: string;
  verbose?: boolean;
}) {
  if (!ipcMain || !app) {
    throw new Error("You need to call `setupMain()` from the main process.");
  }

  if (isInstalled) return;

  const dir = directory || path.join(app.getPath("userData"), "download");
  ipcMain.handle(channelName, async (_event, url: string, buffer: ArrayBuffer) => {
    if (!url.startsWith(baseUrl)) {
      throw new Error("`baseUrl` should be the same in setupMain() and new SlidePrefetch()");
    }
    const localPath = path.join(dir, url.replace(`${baseUrl}/`, ""));
    const folder = path.dirname(localPath);
    if (!fs.existsSync(folder)) {
      await fs.promises.mkdir(folder, { recursive: true });
    }
    if (verbose) {
      console.log("write cache", localPath);
    }
    await fs.promises.writeFile(localPath, Buffer.from(buffer));
  });

  protocol.registerFileProtocol("file", (request, callback) => {
    callback(decodeURI(request.url.replace("file:///", "")));
  });

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: [`${baseUrl}/*`] },
    (details, callback) => {
      const localPath = path.join(dir, details.url.replace(`${baseUrl}/`, ""));
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        callback({ redirectURL: `file://${localPath}` });
      } else {
        callback({});
      }
    }
  );

  isInstalled = true;
}
