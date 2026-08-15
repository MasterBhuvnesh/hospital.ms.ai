# packages/ui

React components shared by web and the desktop renderer.

shadcn/ui components, owned as source rather than pulled as a dependency, plus the design tokens.

This package is what makes one component library serve both `apps/web` and `apps/desktop`. It must not import anything Node-specific or anything Electron-specific.

Imported as `@hms/ui`.
