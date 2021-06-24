import { ElectronSlidePrefetch, SlidePrefetch } from "../src";

document.querySelector("#app")!.textContent = "Hello, world!";
document.title = "Loaded";

if (window.api) {
  console.log("using contextBridge, window.api =", window.api);
  window.SlidePrefetch = ElectronSlidePrefetch;
} else {
  console.log("i'm in a web app");
  window.SlidePrefetch = SlidePrefetch;
}

console.log("window.SlidePrefetch =", window.SlidePrefetch);
