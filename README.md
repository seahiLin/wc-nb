# sprig-app

The TanStack Start app that [Sprig](https://github.com/seahiLin/a001/tree/main/docs/sprig) edits.

Workers Builds deploys `main` with `npx wrangler deploy` and every other branch with `npx wrangler preview`.
There is no `package-lock.json` on purpose: installs resolve from `package.json`, so `npm install` is all you need.

```bash
npm install
npm run dev
```
