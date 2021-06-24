const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  save: (...args) => ipcRenderer.invoke("slide-prefetch-save-data", ...args),
});
