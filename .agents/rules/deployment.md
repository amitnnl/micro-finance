# Deployment Policy

- **Explicit Deployment Only:**
  - DO NOT run deployment, build packaging scripts (`package-hostinger.ps1`, `deploy-hostinger.ps1`), or zip production packages automatically after making changes.
  - ONLY run deployment/packaging actions when the user explicitly requests it (e.g., "deploy", "let's deploy", "package for hostinger").
  - During normal development and feature implementation, test and run locally using the dev server without initiating production builds or deployments.
