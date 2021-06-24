// thanks to https://github.com/simonhochrein/electromon
import { ChildProcess, spawn } from "child_process";
import chokidar from "chokidar";
import electron from "electron";
import readline from "readline";

let timer: NodeJS.Timeout;
let child: ChildProcess;

function restart() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    child?.kill();
    child = spawn(electron as unknown as string, ["test"]);
    child.stdout?.pipe(process.stdout);
  }, 500);
}

chokidar.watch(["dist/electron.js", "test/main.js"]).on("all", restart);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", (cmd) => {
  if (cmd === "rs") restart();
});

rl.on("SIGINT", () => {
  child.kill();
  process.exit();
});
