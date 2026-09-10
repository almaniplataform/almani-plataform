# Security Checklist

## Before production

- Apply all migrations in `supabase/migrations` to the production project.
- Verify that the unique index on `(placa, cliente_id)` was created successfully.
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever shared, logged, or exposed.
- Store production secrets only in the hosting provider's secret manager.
- Confirm that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the only Supabase key present in browser bundles.
- Enable email confirmation and strong password settings in Supabase Auth.
- Enable MFA for administrator accounts in Supabase Auth.
- Confirm that the `anexos-processos` bucket is private.
- Run the isolation tests below with users belonging to different clients.

## Isolation tests

For users A and B linked to different clients:

1. A must not see B's rows in `processos`.
2. A must not see B's rows in `anexos`.
3. A must not receive a signed URL for B's file.
4. A must not upload an attachment to B's process.
5. A must not delete any attachment.
6. A must not access `/api/clientes` or `/api/processos`.
7. Only an administrator may import processes.

## Operational controls

- Use a distributed rate limiter or WAF in deployments with multiple instances.
- Scan uploaded files before making them available for download.
- Keep database and Storage backups, and test restoration periodically.
- Review audit records for imports, uploads, and deletions.
- Define retention and deletion rules for personal data under LGPD.
- Monitor repeated 401, 403, and 429 responses.