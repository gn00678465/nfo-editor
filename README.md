# NFO Metadata Editor

A modern, cross-platform desktop application for managing and editing video metadata in NFO format. Built with Electron, React, and Tailwind CSS.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Electron](https://img.shields.io/badge/Electron-34.3-indigo)
![React](https://img.shields.io/badge/React-18.3-blue)

## ✨ Features

- **Robust NFO Parsing**: Accurate parsing and serialization of movie metadata including CDATA blocks and nested elements.
- **Modern Editor Interface**: Categorized metadata fields (Core Info, Cast, Production, Identifiers, etc.) with a clean, responsive UI.
- **Smart Tag Editing**: Toggle between visual chips and bulk text mode (comma-separated) for genres and tags.
- **Recursive Scanning**: Quickly find NFO files across large directory structures while automatically skipping system folders.
- **Multi-environment Support**: Seamlessly works as a native Electron app or in supported browsers via the File System Access API.
- **Themeable**: Full support for Dark and Light modes with persistent user preference.
- **Keyboard Friendly**: Quick save with `Cmd/Ctrl + S` and efficient navigation.

## 🚀 Tech Stack

- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Desktop Shell**: [Electron](https://www.electronjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Parser**: [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
- **Testing**: [Vitest](https://vitest.dev/)
- **Package Manager**: [Bun](https://bun.sh/) (recommended)

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- Git

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/nfo-editor.git
   cd nfo-editor
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Run in development mode**
   ```bash
   bun dev
   # or
   npm run dev
   ```

4. **Run tests**
   ```bash
   bun test
   # or
   npm run test
   ```

## 📦 Building & Distribution

The application uses `electron-builder` for packaging.

- **macOS**: `bun run dist:mac`
- **Windows**: `bun run dist:win`
- **Linux**: `bun run dist:linux`

Built artifacts will be located in the `release/` directory.

## 📄 License

MIT License - feel free to use and modify for your own needs.
