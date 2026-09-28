import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Preserve Sites metadata and migrations under dist/.openai in every archive.
const root = process.cwd();
const archive = process.argv[2];
if (!archive || !path.isAbsolute(archive)) throw new Error("Provide an absolute archive path.");
const source = JSON.parse(fs.readFileSync(".openai/hosting.json", "utf8"));
const built = JSON.parse(fs.readFileSync("dist/.openai/hosting.json", "utf8"));
if (source.project_id !== built.project_id || source.d1 !== built.d1 || source.r2 !== built.r2) {
  throw new Error("Build metadata is stale. Rebuild before packaging.");
}
for (const required of ["dist/server/index.js", "dist/client"]) {
  if (!fs.existsSync(required)) throw new Error(`Missing build output: ${required}`);
}
if (source.d1) {
  const journal = JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8"));
  for (const entry of journal.entries) {
    const sql = `${entry.tag}.sql`;
    if (!fs.readFileSync(path.join("drizzle", sql)).equals(fs.readFileSync(path.join("dist/.openai/drizzle", sql)))) {
      throw new Error(`Migration ${sql} is missing or stale in the build.`);
    }
  }
}
function checkTree(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Build output must not contain symlinks.");
    if (entry.isDirectory()) checkTree(filename);
    else if (!entry.isFile()) throw new Error("Unexpected special file in build output.");
  }
}
checkTree(path.join(root, "dist"));
const result = spawnSync("tar", ["-czf", archive, "dist"], { cwd: root, stdio: "inherit", windowsHide: true });
if (result.status !== 0) process.exit(result.status || 1);
console.log(JSON.stringify({ archive, project_id: source.project_id }));
