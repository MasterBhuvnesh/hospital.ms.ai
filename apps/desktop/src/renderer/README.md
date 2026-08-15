# apps/desktop/src/renderer

The React application, one module per staff role, selected at launch by configuration.

It shares components with the web application through `@hms/ui`, which is why the desktop and web surfaces look and behave alike without maintaining two component libraries.

Treat this as a browser: no Node imports, no `require`, no filesystem. Privileged work goes through the channels declared in `../preload`.
