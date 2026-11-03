# GitHub Pages Deployment: adventure.sala.company

1. Repository: `jamalxcode/adventure`, branch `main`.
2. Commit the source at repository root, including `.github/workflows/pages.yml` and `public/CNAME`.
3. GitHub repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
4. Pages custom domain: `adventure.sala.company` and save.
5. Set DNS CNAME host `adventure` → `jamalxcode.github.io` (not the repo path).
6. Remove conflicting records for `adventure`; verify the domain through GitHub where available.
7. GitHub Actions workflow installs npm packages, builds Vite into `dist/`, uploads artifact and deploys it.
8. Enable **Enforce HTTPS** once GitHub provisions the certificate. Verify https://adventure.sala.company.
9. Inspect browser devtools to confirm built CSS/JS assets, model files and CNAME route correctly.

Verify DNS with `dig +short CNAME adventure.sala.company`.

Static Pages cannot execute Node services. Do not commit secrets. Vite uses `base: '/'` for the custom subdomain. A generated npm lockfile should be committed and CI changed to `npm ci` for deterministic production builds.

References:
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
