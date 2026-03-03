# Project Structure Definition

> NOTE: this structure is in its final stages, only the actual code is needed with potential structural changes in the
> future.

- `vite.config.ts` serves/builds the script, comments within justifies every decision
- `tsconfig.json` is used for Typescript
- `index.html` is used for local testing the script, it's not blank html page but more content will be added for proper
  testing with ADK
- `src/` houses the actual source code
    - `core/` defines the screenshot capturer and socket manager
    - `ui/` defines the highlighter with its styling file
    - other elements can be added later when needed
- The concept of `API_KEY` is used in consideration for potential future need for authorization

> The use the script when review/test, run the commands then you can open index.html and check Devtools

```
npm install
npm run build
```

> Script to be hosted either via Cloudflare or Firebase CDN.

# Process Followup

- [x] Define screenshot capturer with redaction, to be tightened up better later (for example: user can tag any element
  with a class name to be redacted, as for now, only password inputs are considered in redaction)