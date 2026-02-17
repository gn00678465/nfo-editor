import { app as a, BrowserWindow as m, ipcMain as l, dialog as w } from "electron";
import o from "path";
import d from "fs";
import { fileURLToPath as _ } from "url";
const y = _(import.meta.url), u = o.dirname(y);
let r = null;
function h() {
  r = new m({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: o.join(u, "preload.js"),
      contextIsolation: !0,
      nodeIntegration: !1
    },
    titleBarStyle: "default",
    title: "NFO Metadata Editor"
  }), process.env.VITE_DEV_SERVER_URL ? (r.loadURL(process.env.VITE_DEV_SERVER_URL), r.webContents.openDevTools()) : r.loadFile(o.join(u, "../dist/index.html"));
}
a.whenReady().then(() => {
  h(), a.on("activate", () => {
    m.getAllWindows().length === 0 && h();
  });
});
a.on("window-all-closed", () => {
  process.platform !== "darwin" && a.quit();
});
l.handle("dialog:openFolder", async () => {
  const n = await w.showOpenDialog(r, {
    properties: ["openDirectory"],
    title: "Select folder containing NFO files"
  });
  return n.canceled ? null : n.filePaths[0];
});
l.handle("fs:scanNfoFiles", async (n, i) => {
  const t = /* @__PURE__ */ new Set([
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    "__pycache__",
    ".cache",
    ".vscode",
    ".idea",
    "dist",
    "dist-electron",
    ".next",
    ".nuxt",
    "build",
    ".DS_Store",
    "vendor"
  ]), s = [];
  async function f(c) {
    try {
      const p = await d.promises.readdir(c, { withFileTypes: !0 });
      for (const e of p)
        e.isDirectory() ? !t.has(e.name) && !e.name.startsWith(".") && await f(o.join(c, e.name)) : e.isFile() && e.name.toLowerCase().endsWith(".nfo") && s.push(o.join(c, e.name));
    } catch {
    }
  }
  return await f(i), s;
});
l.handle("fs:readFile", async (n, i) => {
  try {
    return { success: !0, content: d.readFileSync(i, "utf-8") };
  } catch (t) {
    return { success: !1, error: String(t) };
  }
});
l.handle("fs:writeFile", async (n, i, t) => {
  try {
    return d.writeFileSync(i, t, "utf-8"), { success: !0 };
  } catch (s) {
    return { success: !1, error: String(s) };
  }
});
