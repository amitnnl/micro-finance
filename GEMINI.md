# Project Guidelines & Preferences

## Deployment & Packaging Rules
- **Explicit Deployment Only:**
  - DO NOT run production packaging or deployment scripts (`package-hostinger.ps1`, `deploy-hostinger.ps1`, `hostinger-deploy.zip`) automatically after code changes or feature updates.
  - ONLY deploy or package when the user explicitly requests it (e.g., "deploy", "let's deploy", "package this").
  - Work strictly in the local development environment (`c:\xampp\htdocs\micro-fin`, Vite dev server, local Apache/MySQL).
