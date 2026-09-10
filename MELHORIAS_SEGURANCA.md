# Documento de melhorias de segurança e vulnerabilidade

Este documento consolida as melhorias de segurança e mitigação de vulnerabilidades implementadas no projeto desde 04/09 até 10/09/2026.

## 1. Autenticação e autorização reforçadas

### O que foi implementado
- Validação de token Bearer em todas as rotas sensíveis por meio de [src/lib/server-auth.ts](src/lib/server-auth.ts).
- Requisição com token ausente ou inválido agora retorna erro HTTP 401.
- Centralização da verificação de usuários administradores com base em e-mails configurados na variável de ambiente `ALMANI_ADMIN_EMAILS`.
- Controle de acesso explícito para rotas administrativas com `requireAdmin`.

### Impacto
- Redução do risco de acesso não autorizado a endpoints sensíveis.
- Garante que somente usuários autenticados possam consumir recursos protegidos.

---

## 2. Controle de acesso por cliente e processo

### O que foi implementado
- Políticas de segurança em [supabase/migrations/20260904000000_security_policies.sql](supabase/migrations/20260904000000_security_policies.sql) passaram a restringir acesso a dados por vínculo entre usuário e cliente.
- O RLS foi habilitado em tabelas críticas, incluindo:
  - `usuarios_cliente`
  - `clientes`
  - `processos`
  - `anexos`
- Acesso ao bucket de armazenamento também foi restrito ao cliente relacionado ao processo.
- Função `canAccessProcess` em [src/lib/server-auth.ts](src/lib/server-auth.ts) valida se o usuário tem permissão para operar sobre um processo específico.

### Impacto
- Evita vazamento de dados entre clientes.
- Reduz o risco de acesso cruzado ou uso indevido de dados de terceiros.

---

## 3. Proteção de uploads de anexos

### O que foi implementado
- Validação robusta no endpoint de upload em [src/app/api/anexos/upload/route.ts](src/app/api/anexos/upload/route.ts).
- Limites aplicados:
  - tamanho máximo de 10 MB
  - tipos permitidos: PDF, JPG, PNG e TXT
  - rejeição de arquivos vazios
  - validação obrigatória de `processoId` e `clienteId`
- Verificação de que o processo informado pertence ao cliente correto antes do upload.
- Nome do arquivo no storage gerado com `crypto.randomUUID()` para reduzir risco de colisão e manipulação do identificador.
- Configuração do bucket de anexos como privado em [supabase/migrations/20260831000001_add_processo_anexos.sql](supabase/migrations/20260831000001_add_processo_anexos.sql).
- Remoção automática do arquivo no storage em caso de falha no registro no banco.

### Impacto
- Reduz o risco de upload de arquivos maliciosos ou inválidos.
- Garante melhor segregação de dados e maior confiabilidade no processo de anexação.

---

## 4. Rate limiting para mitigar abuso e brute force

### O que foi implementado
- Função `checkRateLimit` criada em [src/lib/server-auth.ts](src/lib/server-auth.ts).
- Aplicação em rotas críticas:
  - upload de anexos: 20 tentativas por hora
  - importação de processos: 10 tentativas por minuto
- Limite calculado por IP/forwarded header, reduzindo abuso por repetição massiva de requisições.

### Impacto
- Diminui a chance de ataques automatizados, abuso de endpoints e tentativas repetidas de execução de ações sensíveis.

---

## 5. Validação rigorosa da importação de processos

### O que foi implementado
- Endpoint de importação reforçado em [src/app/api/processos/importar/route.ts](src/app/api/processos/importar/route.ts).
- Validações adicionadas:
  - payload JSON válido
  - lista com pelo menos 1 item e no máximo 500 itens
  - tipos e tamanhos máximos de campos
  - formato de `cliente_id` e `placa`
  - consistência de todos os processos no mesmo cliente
- Rejeição de dados inválidos com resposta HTTP 400 antes da execução da operação.

### Impacto
- Reduz risco de inconsistência de dados e entrada maliciosa no processo de importação em massa.
- Garante maior confiabilidade do fluxo administrativo.

---

## 6. Prevenção de duplicidade e integridade dos dados

### O que foi implementado
- Migração de unicidade em [supabase/migrations/20260904000001_security_audit_and_uniqueness.sql](supabase/migrations/20260904000001_security_audit_and_uniqueness.sql).
- Criação do índice único em `public.processos (placa, cliente_id)` para impedir persistência duplicada de processos dentro do mesmo cliente.
- Criação da tabela `public.auditoria_acessos` para registrar eventos relevantes.
- Criação de índice em data/hora para facilitar consultas e auditoria.

### Impacto
- Melhora a integridade dos dados.
- Evita registros duplicados que poderiam afetar operação, relatórios e controles internos.

---

## 7. Auditoria de acessos e ações críticas

### O que foi implementado
- Criação da tabela `auditoria_acessos` em [supabase/migrations/20260904000001_security_audit_and_uniqueness.sql](supabase/migrations/20260904000001_security_audit_and_uniqueness.sql).
- Registro de eventos em [src/lib/server-auth.ts](src/lib/server-auth.ts) e nos endpoints de anexos/importação.
- Campos capturados:
  - `user_id`
  - `email`
  - `acao`
  - `entidade`
  - `entidade_id`
  - `criado_em`

### Impactos
- Permite rastrear ações críticas de usuários.
- Apoia investigações, auditoria interna e resposta a incidentes.

---

## 8. Segurança do armazenamento de anexos

### O que foi implementado
- Criação da tabela `anexos` em [supabase/migrations/20260831000001_add_processo_anexos.sql](supabase/migrations/20260831000001_add_processo_anexos.sql).
- Relacionamentos com `processos` e `clientes` com `on delete cascade`.
- Validação de `tamanho_bytes >= 0`.
- Política de acesso ao storage via RLS em [supabase/migrations/20260904000000_security_policies.sql](supabase/migrations/20260904000000_security_policies.sql).

### Impacto
- Garante que apenas usuários autorizados acessem arquivos do bucket de anexos.
- Reduz risco de vazamento de arquivos privados e acesso indevido ao armazenamento.

---

## 9. Resumo executivo

As melhorias implementadas reforçaram os pilares fundamentais de segurança:
- autenticação adequada
- autorização granular por cliente
- proteção contra abuso e automação
- validação rigorosa de entradas e arquivos
- segregação de dados no storage
- prevenção de duplicidade
- rastreabilidade por auditoria

Em conjunto, essas ações reduziram significativamente a superfície de ataque do sistema e fortaleceram a governança de dados, segurança da aplicação e confiabilidade operacional.

## 10. Arquivos principais relacionados

- [src/lib/server-auth.ts](src/lib/server-auth.ts)
- [src/app/api/anexos/upload/route.ts](src/app/api/anexos/upload/route.ts)
- [src/app/api/processos/importar/route.ts](src/app/api/processos/importar/route.ts)
- [supabase/migrations/20260831000001_add_processo_anexos.sql](supabase/migrations/20260831000001_add_processo_anexos.sql)
- [supabase/migrations/20260904000000_security_policies.sql](supabase/migrations/20260904000000_security_policies.sql)
- [supabase/migrations/20260904000001_security_audit_and_uniqueness.sql](supabase/migrations/20260904000001_security_audit_and_uniqueness.sql)

