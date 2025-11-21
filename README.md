# Dante Flows Calculator

React + Vite app that estimates Dante transmit/receive flow usage for unicast and multicast routes.

## Local dev

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Commit and push to a repo named **dante-flows-calculator** (or any name you prefer).
2. If you change the repo name, also change the `base` in `vite.config.ts` to `'/<your-repo-name>/'`.
3. Build and publish:
   ```bash
   npm run deploy
   ```
4. Your site will be available at:
   `https://<your-username>.github.io/<your-repo-name>/`

Notes:
- Tailwind is loaded via CDN to avoid extra build steps.
- Multicast: 1 Tx flow total; 1 Rx flow per subscriber.
- Unicast: ceil(channels/4) flows per receiver on both Tx and Rx sides.
