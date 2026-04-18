# Repository Guidelines

## Project Structure & Module Organization
This repository is a UniApp + Vue 3 frontend built with Vite. Application code lives in `src/`. Add pages under `src/pages/<feature>/` and register every route in `src/pages.json`. Put shared UI in `src/components/`, request wrappers in `src/api/`, app-wide styles in `src/uni.scss`, and packaged images in `static/` or `src/static/`. Keep platform settings in `src/manifest.json`, dev/build settings in `vite.config.js`, and reference material in `docs/` plus `api_documentation.md`.

## Build, Test, and Development Commands
Run `npm install` once before local work.

- `npm run dev:h5`: start the H5 dev server on port `5173`.
- `npm run dev:mp-weixin`: run the WeChat Mini Program target.
- `npm run dev:custom -- <platform>`: start another UniApp platform build.
- `npm run build:h5`: create a production H5 bundle.
- `npm run build:mp-weixin`: build the WeChat Mini Program package.

`npm run dev` exists, but `dev:h5` or an explicit platform script is clearer for day-to-day use.

## Coding Style & Naming Conventions
Prefer Vue SFCs with `<script setup>`. Match existing code, but use 2-space indentation for new JS, Vue, JSON, and config edits. Use `@/` imports for modules inside `src/`. Name components in `PascalCase` such as `GlobalNotification.vue`, page folders/files in `kebab-case` such as `profile/refund-detail.vue`, and API modules in lowercase files exporting `camelCase` members such as `questionApi`.

## Testing Guidelines
No automated test suite is configured in `package.json`. Manually verify affected flows in the target runtime before submitting, especially login, question list/detail, ask, profile, and customer-service screens. If you add tests, place them near the feature or under a dedicated test directory and use `*.spec.js` naming.

## Commit & Pull Request Guidelines
Local Git history is not available in this workspace, so repository-specific commit rules cannot be inferred. Use short imperative commits, preferably Conventional Commit style such as `feat: add refund detail empty state` or `fix: handle expired token redirect`. PRs should include a concise summary, impacted targets (`h5`, `mp-weixin`, etc.), linked issues, screenshots for UI changes, and manual verification notes.

## Configuration Tips
Keep secrets and machine-specific values in `.env`. Avoid hardcoding credentials or deploy-specific URLs in `src/api/`; update `src/api/config.js` carefully when backend endpoints change.
