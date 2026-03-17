
# AtlasBurn | Institutional AI Capital Risk Engine

This is the internal control plane for AtlasBurn.

## 🚀 Publishing the Forensic SDK

The AtlasBurn SDK is located in `src/lib/sdk`. To release a new version to the NPM registry, follow these steps:

### 1. Prerequisites
- Ensure you have an active account at [npmjs.com](https://www.npmjs.com/).
- Ensure the `version` in `src/lib/sdk/package.json` is bumped (e.g., `1.3.4`) if you've made changes since the last release.

### 2. Login to NPM
Run this in your terminal and follow the browser or command-line prompts:
```bash
npm login
```

### 3. Run the Publish Script
We have provided a convenience script in the root `package.json` to handle the deployment:
```bash
npm run sdk:publish
```

---

## 🛠 Troubleshooting: HTTP 412 (Precondition Failed)

If you see a `412 Precondition Failed` error in your SDK or server logs, it means your Firestore database is missing a required composite index for collection-group queries.

### To Resolve:
1. Copy the **Setup URL** from the error message in your terminal.
2. Open it in your browser (you must be logged into the Firebase/Google Cloud console).
3. Click **Create Index**.
4. Wait ~2-5 minutes for the index to build.
5. Ingestion will begin streaming automatically once the index is active.

---

## 🛠 Project Structure
- `/src/app`: Next.js App Router (Dashboard, Ledger, Guardrails).
- `/src/lib/sdk`: The official Forensic SDK source code.
- `/src/ai/flows`: Genkit-powered forensic recovery and quality agents.
- `/src/app/api/ingest`: The high-throughput Admin SDK ingestion endpoint.
