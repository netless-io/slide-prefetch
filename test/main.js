const path = require("path");
const { setupMain } = require("../dist/electron");
const { app, BrowserWindow } = require("electron");

app.whenReady().then(() => {
  setupMain({
    baseUrl: "https://example.org",
    directory: path.join(app.getPath("userData"), "download"),
  });
  const win = new BrowserWindow({
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  win.loadURL("http://localhost:3000");
});

app.on("window-all-closed", app.quit.bind(app));
