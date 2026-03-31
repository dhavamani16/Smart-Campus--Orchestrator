import fs from "fs";
import path from "path";
import babel from "@babel/core";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    // skip node_modules, dist, etc.
    if (isDirectory && !['node_modules', 'dist', 'build', '.git'].includes(f)) {
      walkDir(dirPath, callback);
    } else if (!isDirectory) {
      callback(path.join(dir, f));
    }
  });
}

function convert(dir) {
  walkDir(dir, (filePath) => {
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      // Ignore declaration files
      if (filePath.endsWith(".d.ts")) {
        fs.unlinkSync(filePath);
        console.log(`Deleted types file: ${filePath}`);
        return;
      }

      console.log(`Processing: ${filePath}`);
      const code = fs.readFileSync(filePath, "utf-8");

      try {
        const result = babel.transformSync(code, {
          filename: filePath,
          presets: [
            ["@babel/preset-typescript", { isTSX: filePath.endsWith(".tsx"), allExtensions: true }]
          ],
          retainLines: true, // try to retain exact same line numbers
        });

        // Determine new file extension
        const newExt = filePath.endsWith(".tsx") ? ".jsx" : ".js";
        const newFilePath = filePath.replace(/\.tsx?$/, newExt);

        fs.writeFileSync(newFilePath, result.code, "utf-8");
        fs.unlinkSync(filePath);
        console.log(`Successfully converted ${filePath} to ${newFilePath}`);
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
      }
    }
  });
}

console.log("Starting TS to JS conversion...");
// Convert in the specific folders
['artifacts', 'lib', 'scripts'].forEach(folder => {
  const fullPath = path.join(__dirname, folder);
  if (fs.existsSync(fullPath)) {
    convert(fullPath);
  }
});
console.log("TS to JS conversion complete!");
