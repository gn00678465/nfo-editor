import type { NfoFile } from '../App'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { CheckSquare, FolderOpen, Search } from 'lucide-react'

interface FileListProps {
  files: NfoFile[]
  allFiles: NfoFile[]
  selectedFile: NfoFile | null
  dirtyFiles: Set<string>
  filterText: string
  onFilterChange: (v: string) => void
  onSelectFile: (f: NfoFile) => void
  onOpenFolder: () => void | Promise<void>
  appVersion?: string
  batchMode: boolean
  batchSelectedFiles: Set<string>
  isBatchWriting: boolean
  onBatchToggle: () => void
  onBatchSelectFile: (filePath: string, selected: boolean) => void | Promise<void>
  onBatchSelectAll: () => void
  onBatchClear: () => void
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
  appVersion,
  batchMode,
  batchSelectedFiles,
  isBatchWriting,
  onBatchToggle,
  onBatchSelectFile,
  onBatchSelectAll,
  onBatchClear,
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

        {allFiles.length > 0 && (
          <Button
            variant="outline"
            onClick={onBatchToggle}
            disabled={isBatchWriting}
            className="no-drag w-full justify-center gap-2 font-ui"
            style={{
              background: batchMode ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${batchMode ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
              color: batchMode ? 'var(--accent-indigo)' : 'var(--text-muted)',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 500,
              height: 34,
              padding: '0 12px',
            }}
          >
            <CheckSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="leading-none">{batchMode ? 'Exit Batch Edit' : 'Batch Edit'}</span>
          </Button>
        )}

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
        <>
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
          </div>
          {batchMode && (
            <div
              className="font-mono flex items-center gap-2"
              style={{
                padding: '5px 12px 6px',
                fontSize: 10,
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span>{batchSelectedFiles.size} selected</span>
              <span style={{ opacity: 0.45 }}>·</span>
              <button
                type="button"
                onClick={onBatchSelectAll}
                disabled={isBatchWriting}
                style={{
                  color: 'var(--accent-indigo)',
                  cursor: isBatchWriting ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  opacity: isBatchWriting ? 0.5 : 1,
                }}
              >
                All
              </button>
              <span style={{ opacity: 0.45 }}>·</span>
              <button
                type="button"
                onClick={onBatchClear}
                disabled={isBatchWriting}
                style={{
                  color: 'var(--accent-indigo)',
                  cursor: isBatchWriting ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  opacity: isBatchWriting ? 0.5 : 1,
                }}
              >
                Clear
              </button>
            </div>
          )}
        </>
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
          const isBatchSelected = batchSelectedFiles.has(file.filePath)
          const isDirty = dirtyFiles.has(file.filePath)
          const isActive = batchMode ? isBatchSelected : isSelected
          return (
            <button
              key={file.filePath}
              type="button"
              onClick={() => {
                if (batchMode && !isBatchWriting) onBatchSelectFile(file.filePath, !isBatchSelected)
                else if (!batchMode) onSelectFile(file)
              }}
              disabled={batchMode && isBatchWriting}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: batchMode
                  ? isActive
                    ? '3px solid var(--accent-indigo)'
                    : '3px solid transparent'
                  : isSelected
                    ? '3px solid var(--accent-amber)'
                    : '3px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: (batchMode && isBatchWriting) ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'background 100ms',
                opacity: (batchMode && isBatchWriting) ? 0.6 : 1,
              }}
              onMouseEnter={e => {
                if (!isActive && !(batchMode && isBatchWriting)) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {batchMode && (
                  <span
                    aria-hidden="true"
                    style={{
                      marginTop: 1,
                      width: 14,
                      height: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      borderRadius: 3,
                      border: `1px solid ${isBatchSelected ? 'var(--accent-indigo)' : 'var(--border-default)'}`,
                      background: isBatchSelected ? 'var(--accent-indigo)' : 'transparent',
                      color: isBatchSelected ? 'white' : 'var(--text-muted)',
                      opacity: isBatchSelected ? 1 : 0.75,
                    }}
                  >
                    {isBatchSelected && <CheckSquare className="h-3 w-3" />}
                  </span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  {isDirty && !batchMode && (
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
                      color: batchMode
                        ? isBatchSelected
                          ? 'var(--accent-indigo)'
                          : 'var(--text-primary)'
                        : isSelected
                          ? 'var(--accent-amber)'
                          : 'var(--text-primary)',
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
                </div>
              </div>
            </button>
          )
        })}
      </ScrollArea>

      {/* Version footer */}
      {appVersion && (
        <div
          className="font-mono"
          style={{
            padding: '6px 12px',
            fontSize: 10,
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-subtle)',
            opacity: 0.5,
            userSelect: 'none',
          }}
        >
          v{appVersion}
        </div>
      )}
    </div>
  )
}
