import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(__dirname, "node_modules", "partykit", "dist", "bin.mjs");

if (fs.existsSync(binPath)) {
  let content = fs.readFileSync(binPath, "utf8");
  let modified = false;

  // Fix 1: generated.js path resolution on Windows
  if (content.includes('fileURLToPath7(\n          path14.join(path14.dirname(import.meta.url), "../dist/generated.js")\n        )')) {
    content = content.replace(
      'fileURLToPath7(\n          path14.join(path14.dirname(import.meta.url), "../dist/generated.js")\n        )',
      'path14.join(path14.dirname(fileURLToPath7(import.meta.url)), "../dist/generated.js")'
    );
    modified = true;
  }

  // Fix 2: inject-process.js in build
  if (content.includes('fileURLToPath7(\n            path14.join(path14.dirname(import.meta.url), "../inject-process.js")\n          )')) {
    content = content.replace(
      'fileURLToPath7(\n            path14.join(path14.dirname(import.meta.url), "../inject-process.js")\n          )',
      'path14.join(path14.dirname(fileURLToPath7(import.meta.url)), "../inject-process.js")'
    );
    modified = true;
  }

  // Fix 3: inject-process.js in deploy
  if (content.includes('fileURLToPath8(\n        path15.join(path15.dirname(import.meta.url), "../inject-process.js")\n      )')) {
    content = content.replace(
      'fileURLToPath8(\n        path15.join(path15.dirname(import.meta.url), "../inject-process.js")\n      )',
      'path15.join(path15.dirname(fileURLToPath8(import.meta.url)), "../inject-process.js")'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(binPath, content, "utf8");
    console.log("[PartyHub] Applied Windows path fix to PartyKit CLI");
  }
}
