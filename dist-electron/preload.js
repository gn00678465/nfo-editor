import { contextBridge as n, ipcRenderer as i } from "electron";
n.exposeInMainWorld("electronAPI", {
  openFolder: () => i.invoke("dialog:openFolder"),
  scanNfoFiles: (e) => i.invoke("fs:scanNfoFiles", e),
  readFile: (e) => i.invoke("fs:readFile", e),
  writeFile: (e, o) => i.invoke("fs:writeFile", e, o)
});
