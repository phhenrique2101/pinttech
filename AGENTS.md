# Diretrizes e Padrões Obrigatórios do Projeto PintTech

Este documento estabelece as regras de desenvolvimento, segurança e governança de dados para todos os agentes e desenvolvedores que atuam no codebase do **PintTech**.

---

## 🔒 1. REGRA CRÍTICA: Tolerância Zero para Perda de Dados (Zero Data Loss)

> **ATENÇÃO MÁXIMA**: O banco de dados em produção/homologação contém dados vitais cadastrados e NÃO PODE sofrer perda ou corrupção de dados sob nenhuma hipótese.

### Mandamentos Obrigatórios:
1. **PROIBIDO RESETAR O BANCO**:
   - NUNCA execute `prisma migrate reset` ou `npx prisma db push --force-reset`.
   - NUNCA execute comandos SQL que contenham `DROP TABLE`, `TRUNCATE`, ou `DROP DATABASE`.
   - NUNCA utilize `deleteMany()` sem filtros restritivos de ID ou em rotinas de inicialização/seed sem trava de segurança.
2. **MIGRAÇÕES E ALTERAÇÕES DE SCHEMA SEMPRE INCREMENTAIS**:
   - Toda adição de campo nas tabelas do Prisma deve ser opcional (`?`) ou possuir um `@default(...)`.
   - Remoção ou renomeação de colunas deve ser realizada em etapas planejadas com backward-compatibility (migração de dados antes de drop).
3. **PRESERVAÇÃO DA INTEGRIDADE REFERENCIAL**:
   - Respeite sempre as chaves estrangeiras (`breweryId`, `clientId`, `orderId`, `kegId`).

---

## 📊 2. Padrão Obrigatório de Arquitetura e Business Intelligence (Power BI)

A partir da integração analítica, todo o ecossistema do PintTech segue o padrão **Star Schema + API REST + Power BI**:

1. **Sincronização Contínua das Views Analíticas (`prisma/create_powerbi_views.sql`)**:
   - Sempre que uma nova tabela de negócio, coluna ou relacionamento for criado no `schema.prisma`, a respectiva View Analítica (`vw_bi_*`) ou uma nova view dimensional/fato DEVE ser criada ou atualizada.
   - Execute `npm run db:views` (`node scripts/apply-powerbi-views.js`) para garantir que as views no PostgreSQL estejam alinhadas.
2. **Manutenção dos Endpoints Analíticos (`/api/bi`)**:
   - Novos domínios de negócio devem ser mapeados no `DATASET_VIEW_MAP` em [`src/app/api/bi/route.ts`](file:///Users/pedrocardoso/Documents/PintTech/src/app/api/bi/route.ts).
   - O isolamento multi-tenant por `breweryId` DEVE ser rigorosamente preservado em todos os retornos.
3. **Documentação e Scripts de Modelagem**:
   - Fórmulas DAX novas ou alteradas devem ser adicionadas a [`powerbi/PintTech_DAX_Measures.md`](file:///Users/pedrocardoso/Documents/PintTech/powerbi/PintTech_DAX_Measures.md).
   - Scripts Power Query M devem ser mantidos em [`powerbi/PintTech_PowerQuery_M.txt`](file:///Users/pedrocardoso/Documents/PintTech/powerbi/PintTech_PowerQuery_M.txt).
   - A Central Power BI em [`src/app/relatorios/powerbi/page.tsx`](file:///Users/pedrocardoso/Documents/PintTech/src/app/relatorios/powerbi/page.tsx) deve refletir novas opções de datasets.

---

## 🏢 3. Padrão Multi-Tenant e Segurança

1. Todo dado operacional pertence a uma organização/cervejaria através do campo `breweryId`.
2. Consultas e mutações no banco de dados devem sempre incluir o filtro `{ where: { breweryId } }`, exceto quando o usuário autenticado for expressamente `SUPER_ADMIN`.
3. Tokens de autenticação e tokens analíticos de BI devem ser validados via `verifyJwtToken`.

---

## 🛠️ 4. Qualidade de Código e Build

1. **TypeScript Estrito**:
   - Zero erros de compilação.
   - Antes de finalizar qualquer alteração, garanta que `npm run build` execute com sucesso.
2. **Next.js App Router**:
   - Utilize a estrutura de pastas do App Router (`src/app`).
   - Mantenha componentes de cliente marcados com `'use client'`.
   - Adote os padrões visuais Tailwind CSS (Dark/Slate com acentos em Amber/Emerald) consistentes com o design system do PintTech.
