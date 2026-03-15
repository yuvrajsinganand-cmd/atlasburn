# AtlasBurn | Institutional AI Capital Risk Engine

This is the internal control plane for AtlasBurn.

## 🚀 Publishing the Forensic SDK

The AtlasBurn SDK is located in `src/lib/sdk`. To release a new version to the NPM registry, follow these steps:

### 1. Prerequisites
- Ensure you have an active account at [npmjs.com](https://www.npmjs.com/).
- Ensure the `version` in `src/lib/sdk/package.json` is bumped (e.g., `1.3.1`) if you've made changes since the last release.

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

This command will:
1. Navigate to the SDK distribution folder.
2. Publish the package as `@atlasburn/sdk` with public access.

---

## 🛠 Project Structure
- `/src/app`: Next.js App Router (Dashboard, Ledger, Guardrails).
- `/src/lib/sdk`: The official Forensic SDK source code.
- `/src/ai/flows`: Genkit-powered forensic recovery and quality agents.
- `/src/app/api/ingest`: The high-throughput Admin SDK ingestion endpoint.
