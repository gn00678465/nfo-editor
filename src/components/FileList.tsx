import type { NfoFile } from '../App'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { FolderOpen, Search } from 'lucide-react'

interface FileListProps {
  files: NfoFile[]
  allFiles: NfoFile[]
  selectedFile: NfoFile | null
  dirtyFiles: Set<string>
  filterText: string
  onFilterChange: (v: string) => void
  onSelectFile: (f: NfoFile) => void
  onOpenFolder: () => void
  folderPath: string
}

export default function FileList({
  files,
  allFiles,
  selectedFile,
  dirtyFiles,
  filterText,
  onFilterChange,
  onSelectFile,
  onOpenFolder,
  folderPath,
}: FileListProps) {
  return (
    <div
      style={{
        width: 276,
        flexShrink: 0,
        background: 'var(--bg-base)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header controls */}
      <div className="p-3 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Button
          variant="outline"
          onClick={onOpenFolder}
          className="no-drag w-full justify-center gap-2 font-ui"
          style={{
            background: 'transparent',
            border: '1px dashed var(--accent-amber)',
            color: 'var(--accent-amber)',
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 500,
            height: 34,
            padding: '0 12px',
          }}
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="leading-none">{allFiles.length > 0 ? 'Change Folder...' : 'Select Folder...'}</span>
        </Button>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <Input
            type="text"
            value={filterText}
            onChange={e => onFilterChange(e.target.value)}
            placeholder="Filter files... &#8984;F"
            className="pl-8 font-ui"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 5,
              padding: '6px 10px 6px 30px',
              fontSize: 12,
              color: 'var(--text-primary)',
              height: 32,
            }}
          />
        </div>
      </div>

      {/* File count */}
      {allFiles.length > 0 && (
        <div
          className="font-mono"
          style={{
            padding: '6px 12px',
            fontSize: 11,
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {files.length === allFiles.length
            ? `${allFiles.length} files`
            : `${files.length} / ${allFiles.length} files`}
          {folderPath && (
            <span style={{ marginLeft: 4, opacity: 0.6 }}>
              · {folderPath.split('/').pop() || folderPath}
            </span>
          )}
        </div>
      )}

      {/* File list */}
      <ScrollArea className="flex-1">
        {files.length === 0 && allFiles.length === 0 && (
          <div
            style={{
              padding: '24px 16px',
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            No files loaded.<br/>Select a folder to begin.
          </div>
        )}
        {files.length === 0 && allFiles.length > 0 && (
          <div
            style={{
              padding: '24px 16px',
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            No matching files.
          </div>
        )}
        {files.map(file => {
          const isSelected = selectedFile?.filePath === file.filePath
          const isDirty = dirtyFiles.has(file.filePath)
          return (
            <button
              key={file.filePath}
              onClick={() => onSelectFile(file)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: isSelected ? '3px solid var(--accent-amber)' : '3px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {isDirty && (
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 10,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent-amber)',
                  }}
                />
              )}
              <div
                className="font-mono"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: isSelected ? 'var(--accent-amber)' : 'var(--text-primary)',
                  letterSpacing: '0.02em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.folderName}
              </div>
              <div
                className="font-ui"
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={file.filePath}
              >
                {file.filePath}
              </div>
            </button>
          )
        })}
      </ScrollArea>
    </div>
  )
}
