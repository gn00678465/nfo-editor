import { useState, useCallback, useEffect, useRef } from 'react'
import { parseNfo, serializeNfo, emptyNfoData, type NfoData } from './lib/nfoParser'
import FileList from './components/FileList'
import MetadataEditor from './components/MetadataEditor'
import ThemeToggle from './components/ThemeToggle'
import { Button } from './components/ui/button'
import { Separator } from './components/ui/separator'
import { Save, Undo2 } from 'lucide-react'

export interface NfoFile {
  filePath: string
  folderName: string
  fileName: string
}

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}
function parentName(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/')
  parts.pop()
  return parts.pop() ?? p
}

const isElectron = !!window.electronAPI

// Browser fallback: store FileSystemFileHandle per path for read/write
type FileHandleMap = Map<string, FileSystemFileHandle>

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', '__pycache__',
  '.cache', '.vscode', '.idea', 'dist', 'dist-electron',
  '.next', '.nuxt', 'build', 'vendor',
])

async function scanNfoFilesFromDir(
  dirHandle: FileSystemDirectoryHandle,
  handles: FileHandleMap,
  pathPrefix: string,
) {
  for await (const entry of (dirHandle as any).values()) {
    const entryPath = `${pathPrefix}/${entry.name}`
    if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.nfo')) {
      handles.set(entryPath, entry as FileSystemFileHandle)
    } else if (entry.kind === 'directory') {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        await scanNfoFilesFromDir(entry as FileSystemDirectoryHandle, handles, entryPath)
      }
    }
  }
}

export default function App() {
  const [nfoFiles, setNfoFiles] = useState<NfoFile[]>([])
  const [filterText, setFilterText] = useState('')
  const [selectedFile, setSelectedFile] = useState<NfoFile | null>(null)
  const [currentData, setCurrentData] = useState<NfoData | null>(null)
  const [originalData, setOriginalData] = useState<NfoData | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  // Track which files have unsaved changes by path
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [folderPath, setFolderPath] = useState<string>('')

  // Browser-only: file handle map for File System Access API
  const fileHandles = useRef<FileHandleMap>(new Map())
  const isPickerOpen = useRef(false)

  const handleOpenFolder = useCallback(async () => {
    if (isPickerOpen.current) return
    isPickerOpen.current = true
    try {
    if (isElectron) {
      const fp = await window.electronAPI!.openFolder()
      if (!fp) return
      setFolderPath(fp)
      const files = await window.electronAPI!.scanNfoFiles(fp)
      const list: NfoFile[] = files.map(f => ({
        filePath: f,
        folderName: parentName(f),
        fileName: basename(f),
      }))
      setNfoFiles(list)
    } else {
      // Browser fallback using File System Access API
      if (!('showDirectoryPicker' in window)) {
        alert('Your browser does not support the File System Access API. Please use Chrome/Edge.')
        return
      }
      try {
        const dirHandle = await window.showDirectoryPicker!()
        const handles: FileHandleMap = new Map()
        await scanNfoFilesFromDir(dirHandle, handles, dirHandle.name)
        fileHandles.current = handles
        setFolderPath(dirHandle.name)
        const list: NfoFile[] = Array.from(handles.keys()).map(fp => ({
          filePath: fp,
          folderName: parentName(fp),
          fileName: basename(fp),
        }))
        setNfoFiles(list)
      } catch (e: unknown) {
        // User cancelled the picker or picker already active
        if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return
        throw e
      }
    }
    setSelectedFile(null)
    setCurrentData(null)
    setIsDirty(false)
    setDirtyFiles(new Set())
    setFilterText('')
    setSaveStatus('idle')
    } finally {
      isPickerOpen.current = false
    }
  }, [])

  const handleSelectFile = useCallback(async (file: NfoFile) => {
    setSelectedFile(file)
    setSaveStatus('idle')

    let content: string | undefined
    if (isElectron) {
      const result = await window.electronAPI!.readFile(file.filePath)
      if (!result.success) content = undefined
      else content = result.content
    } else {
      const handle = fileHandles.current.get(file.filePath)
      if (!handle) { setCurrentData(emptyNfoData()); setIsDirty(false); return }
      const fileObj = await handle.getFile()
      content = await fileObj.text()
    }

    if (!content) {
      const empty = emptyNfoData()
      setCurrentData(empty)
      setOriginalData(empty)
      setIsDirty(false)
      return
    }
    try {
      const data = parseNfo(content)
      setCurrentData(data)
      setOriginalData(data)
      setIsDirty(dirtyFiles.has(file.filePath))
    } catch {
      const empty = emptyNfoData()
      setCurrentData(empty)
      setOriginalData(empty)
      setIsDirty(false)
    }
  }, [dirtyFiles])

  const handleDataChange = useCallback((updated: NfoData) => {
    setCurrentData(updated)
    setIsDirty(true)
    setSaveStatus('idle')
    if (selectedFile) {
      setDirtyFiles(prev => new Set(prev).add(selectedFile.filePath))
    }
  }, [selectedFile])

  const handleSave = useCallback(async () => {
    if (!selectedFile || !currentData || isSaving) return
    setIsSaving(true)
    try {
      const xml = serializeNfo(currentData)

      let success = false
      if (isElectron) {
        const result = await window.electronAPI!.writeFile(selectedFile.filePath, xml)
        success = result.success
      } else {
        const handle = fileHandles.current.get(selectedFile.filePath)
        if (handle) {
          const writable = await handle.createWritable()
          await writable.write(xml)
          await writable.close()
          success = true
        }
      }

      if (success) {
        setIsDirty(false)
        setOriginalData(currentData)
        setSaveStatus('saved')
        setDirtyFiles(prev => {
          const next = new Set(prev)
          next.delete(selectedFile.filePath)
          return next
        })
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }, [selectedFile, currentData, isSaving])

  const handleDiscard = useCallback(() => {
    if (!originalData || !selectedFile) return
    setCurrentData(originalData)
    setIsDirty(false)
    setSaveStatus('idle')
    setDirtyFiles(prev => {
      const next = new Set(prev)
      next.delete(selectedFile.filePath)
      return next
    })
  }, [originalData, selectedFile])

  // Cmd+S / Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  const filteredFiles = filterText.trim()
    ? nfoFiles.filter(f =>
        f.folderName.toLowerCase().includes(filterText.toLowerCase()) ||
        f.fileName.toLowerCase().includes(filterText.toLowerCase())
      )
    : nfoFiles

  const saveActive = isDirty && !!selectedFile

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Titlebar */}
      <div
        className="titlebar-drag flex items-center justify-between px-4 shrink-0"
        style={{ height: 32, background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span
          className="no-drag font-title select-none"
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}
        >
          NFO METADATA EDITOR
        </span>
        <ThemeToggle />
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 32px)' }}>
        {/* LEFT PANEL */}
        <FileList
          files={filteredFiles}
          allFiles={nfoFiles}
          selectedFile={selectedFile}
          dirtyFiles={dirtyFiles}
          filterText={filterText}
          onFilterChange={setFilterText}
          onSelectFile={handleSelectFile}
          onOpenFolder={handleOpenFolder}
          folderPath={folderPath}
        />

        {/* RIGHT PANEL */}
        <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          {/* Editor header */}
          <div
            className="flex items-center justify-between shrink-0 px-6"
            style={{
              height: 48,
              background: 'var(--bg-base)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span
              className="font-mono truncate"
              style={{ fontSize: 11, color: 'var(--text-muted)' }}
            >
              {selectedFile ? selectedFile.filePath : 'No file selected'}
            </span>
            <div className="flex items-center gap-3 shrink-0 ml-4 no-drag">
              {isDirty && (
                <div
                  className="unsaved-pulse rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--accent-amber)' }}
                  title="Unsaved changes"
                />
              )}
              {isDirty && (
                <Button
                  onClick={handleDiscard}
                  className="no-drag font-title gap-1.5"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 5,
                    padding: '7px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    height: 'auto',
                  }}
                >
                  <Undo2 className="h-3 w-3" />
                  Discard
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!saveActive || isSaving}
                className="no-drag font-title gap-1.5"
                style={{
                  background: saveActive
                    ? saveStatus === 'saved' ? 'var(--accent-green)' : 'var(--accent-amber)'
                    : 'var(--bg-elevated)',
                  color: saveActive ? '#1A1000' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 5,
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: saveActive ? 'pointer' : 'not-allowed',
                  height: 'auto',
                }}
              >
                <Save className="h-3 w-3" />
                {isSaving ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                <span className="font-mono text-[10px] opacity-60">&#8984;S</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Editor content */}
          <div className="flex-1 overflow-hidden">
            {currentData ? (
              <MetadataEditor data={currentData} onChange={handleDataChange} />
            ) : (
              <div
                className="flex flex-col items-center justify-center h-full gap-3"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <p style={{ fontSize: 14 }}>Open a folder to get started</p>
                <p style={{ fontSize: 12, opacity: 0.6 }}>Select a directory containing NFO files</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
