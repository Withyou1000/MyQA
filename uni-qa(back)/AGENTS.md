# Repository Guidelines

## Project Structure & Module Organization
`src/app.js` is the service entry point. Keep HTTP handlers in `src/routes`, Mongoose schemas in `src/models`, shared auth logic in `src/middleware`, database bootstrap code in `src/db`, runtime config in `src/config`, and WebSocket logic in `src/services`. Store reference material in `docs/`. Static and uploaded files are served from `public/uploads`; treat those folders as runtime assets, not core source files.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Start the API with `npm start`, which runs `node src/app.js`. Use `npm run dev` during development for `nodemon` auto-reload. There is no separate build step in this repository.

## Coding Style & Naming Conventions
This codebase uses CommonJS (`require`, `module.exports`) and semicolon-terminated JavaScript. Prefer 2-space indentation in new code and keep route handlers `async` when they perform I/O. Match existing naming patterns: route files use lowercase or camelCase names such as `customerService.js`, model files use PascalCase with a `Model` suffix such as `UserModel.js`, and exported middleware/services use descriptive verbs like `authMiddleware` or `initWebSocket`.

## Testing Guidelines
No automated test suite is configured yet, and there are no `npm test` scripts in `package.json`. For changes, run the server locally and smoke-test the affected endpoints, especially auth-protected routes, upload flows, and WebSocket notifications. If you add automated tests, keep them outside `public/` and `docs/`, and use clear names such as `auth.routes.test.js`.

## Commit & Pull Request Guidelines
Git history is not available in this workspace snapshot, so follow a simple conventional format: `feat: add customer service session filter` or `fix: validate upload mime types`. Keep commits focused on one change. Pull requests should include a short summary, impacted routes/models, required `.env` changes, and request/response examples or screenshots when API behavior or uploaded assets change.

## Security & Configuration Tips
Configure `DBHOST`, `DBPORT`, `DBNAME`, `JWT_SECRET`, and optionally `PORT` in `.env` before running locally. Do not commit real secrets or production database values. Review changes under `public/uploads` carefully; those paths may contain generated user content and should not be edited by hand unless the task explicitly requires it.
