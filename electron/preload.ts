const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  scanNfoFiles: (folderPath: string) => ipcRenderer.invoke('fs:scanNfoFiles', folderPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
})
