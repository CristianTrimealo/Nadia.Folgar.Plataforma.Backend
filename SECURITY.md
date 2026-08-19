# Security

## Secret handling
- Keep real credentials only in local `.env` files or in the deployment secret manager.
- Do not commit `.env`, `.env.local`, `.env.production`, dumps, logs, or screenshots containing credentials.
- Use `.env.example` only for safe placeholders or local non-secret defaults.
- Run `npm run security:secrets` before committing if you changed configuration files.

## Local protection
This repo uses a local Git hook in `.githooks/pre-commit` that runs `scripts/guard-secrets.ps1` against staged files.

Enable it after cloning:

```bash
git config core.hooksPath .githooks
```

## If a secret was shared
1. Create a replacement key/password in the provider.
2. Update the local `.env` and deployment environment variables.
3. Revoke the old key/password.
4. Confirm the old value is not present in Git history or tracked files.
