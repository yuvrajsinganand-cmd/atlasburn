# Security Policy

## Overview

AtlasBurn takes security seriously, especially because the product is designed around AI telemetry, runtime controls, and cost protection workflows.

This public repository is shared for transparency and product evaluation. Sensitive secrets, production credentials, and private infrastructure details must never be committed here.

---

## Supported Versions

AtlasBurn is currently in an early-stage active development phase.

| Version | Supported |
| ------- | --------- |
| main / latest | ✅ |
| older experimental branches | ❌ |

Only the latest version on the `main` branch should be considered supported for security-related fixes.

---

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public GitHub issue**.

Instead, report it privately by emailing:

**contact@atlasburn.com**

Include:
- A clear description of the issue
- Steps to reproduce
- Affected files, endpoints, or components
- Potential impact
- Any suggested mitigation, if known

We will review reports as quickly as possible and aim to:
- acknowledge receipt within **72 hours**
- assess severity and validity
- provide updates as appropriate
- patch confirmed vulnerabilities in a reasonable timeframe

---

## Scope

This policy applies to:
- AtlasBurn application code in this repository
- SDK-related logic published from this codebase
- Publicly exposed AtlasBurn demo environments

This policy does **not** apply to:
- third-party services or infrastructure outside AtlasBurn’s control
- vulnerabilities caused solely by local developer misconfiguration
- leaked credentials from external environments not managed by this repository

---

## Security Principles

AtlasBurn is being built with the following security principles in mind:

- **No secrets in source control**
- **Least-privilege access wherever possible**
- **Environment variables for sensitive configuration**
- **Separation between public demo code and private production infrastructure**
- **Careful handling of telemetry and API-related metadata**
- **Incremental hardening as the system matures**

---

## Sensitive Data Handling

Contributors and reviewers must never commit:
- API keys
- service account credentials
- database secrets
- access tokens
- private customer data
- internal production URLs not meant for public exposure

If any sensitive material is accidentally committed:
1. Revoke or rotate the credential immediately
2. Remove it from the codebase
3. Notify the maintainer privately at **contact@atlasburn.com**

---

## Disclosure Policy

Please allow reasonable time for investigation and remediation before publicly disclosing any confirmed vulnerability.

We appreciate responsible disclosure that helps improve AtlasBurn without putting users, systems, or infrastructure at unnecessary risk.

---

## Safe Harbor

If you act in good faith, avoid privacy violations or service disruption, and report vulnerabilities responsibly, we will view your research as a helpful contribution to AtlasBurn’s security.

---

## Current Status

AtlasBurn is an early-stage product and is still evolving. Security hardening, auditability, and trust architecture are active priorities as the system moves toward broader real-world usage.
