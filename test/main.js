const path = require("path");
const { setupMain } = require("../dist/electron");
const { app, BrowserWindow } = require("electron");

app.whenReady().then(() => {
  setupMain({
    baseUrl: "https://example.org",
    directory: path.join(app.getPath("userData"), "download"),
    verbose: true,
  });
  const win = new BrowserWindow({
    width: 200,
    height: 200,
    webPreferences: {
      webSecurity: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  console.log("I'm ready.");
  win.loadURL("http://localhost:3000");
  win.webContents.openDevTools();
});

app.on("window-all-closed", app.quit.bind(app));
