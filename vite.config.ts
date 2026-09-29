import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When deploying to GitHub Pages under a project repository name,
// the base path must match the repo name (e.g. /my-repo/).
// For custom domains or user/org Pages root, use '/'.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const base = process.env.GITHUB_ACTIONS ? `/${repoName}/` : '/';

export default defineConfig({
  plugins: [react()],
  base,
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  publicDir: 'public'
});
