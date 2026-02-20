import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: process.platform === 'darwin'
      ? path.join(__dirname, '../build/icon.icns')
      : process.platform === 'win32'
        ? path.join(__dirname, '../build/icon.ico')
        : path.join(__dirname, '../build/256x256.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'NFO Metadata Editor',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC: Select folder
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select folder containing NFO files',
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// IPC: Scan folder for NFO files recursively
ipcMain.handle('fs:scanNfoFiles', async (_event, folderPath: string) => {
  const SKIP_DIRS = new Set([
    'node_modules', '.git', '.svn', '.hg', '__pycache__',
    '.cache', '.vscode', '.idea', 'dist', 'dist-electron',
    '.next', '.nuxt', '.DS_Store', 'vendor', 'release',
  ])

  const nfoFiles: string[] = []

  async function scanDir(dir: string) {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            await scanDir(path.join(dir, entry.name))
          }
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.nfo')) {
          nfoFiles.push(path.join(dir, entry.name))
        }
      }
    } catch {
      // Skip dirs we can't read
    }
  }

  await scanDir(folderPath)
  return nfoFiles
})

// IPC: Read file
ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { success: true, content }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

// IPC: Write file
ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})
