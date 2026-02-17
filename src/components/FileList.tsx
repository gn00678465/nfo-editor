import type { NfoFile } from '../App'

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
      <div
        style={{
          padding: 12,
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <button
          onClick={onOpenFolder}
          className="folder-btn no-drag"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          {allFiles.length > 0 ? 'Change Folder…' : 'Select Folder…'}
        </button>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 9,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            type="text"
            value={filterText}
            onChange={e => onFilterChange(e.target.value)}
            placeholder="Filter files… ⌘F"
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 5,
              padding: '6px 10px 6px 30px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* File count */}
      {allFiles.length > 0 && (
        <div
          style={{
            padding: '6px 12px',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: "'DM Mono', monospace",
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
      <div style={{ flex: 1, overflowY: 'auto' }}>
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
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: isSelected ? '#FDE68A' : 'var(--text-primary)',
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: '0.02em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.folderName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {file.fileName}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
