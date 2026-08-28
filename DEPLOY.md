# 🚀 Guia de Hospedagem Gratuita - PintTech (Vercel + Neon)

Este guia ensina como colocar o **PintTech** no ar em produção **100% de graça** usando **Vercel** (Hospedagem Next.js) e **Neon** (PostgreSQL Serverless gratuito).

---

## 📋 Pré-requisitos
1. Uma conta no [GitHub](https://github.com)
2. Uma conta no [Vercel](https://vercel.com) (login gratuito com GitHub)
3. Uma conta no [Neon](https://neon.tech) (login gratuito com GitHub)

---

## 🗄️ Passo 1: Criar o Banco de Dados PostgreSQL Gratuito no Neon

1. Acesse **[neon.tech](https://neon.tech)** e faça login com sua conta GitHub.
2. Clique em **"New Project"** (Novo Projeto).
3. Defina o nome do projeto (ex: `pinttech-db`) e selecione a região mais próxima (ex: *US East / Ohio* ou *São Paulo* se disponível).
4. Clique em **"Create Project"**.
5. No painel inicial do Neon, você verá a caixa **"Connection Details"**:
   - Mantenha selecionado **Prisma** ou **Direct Connection**.
   - Copie a string de conexão completa que começa com `postgresql://...`.
   - Exemplo: `postgresql://alex:senha123@ep-exemplo-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`

---

## ⚡ Passo 2: Inicializar as Tabelas e Dados no Banco Remoto

No seu computador local, abra o terminal na pasta do projeto e configure temporariamente o seu arquivo `.env` com a URL do Neon:

1. Abra o arquivo `.env` e atualize a linha `DATABASE_URL`:
   ```env
   DATABASE_URL="sua_string_de_conexao_copiada_do_neon"
   ```

2. Execute no terminal para criar todas as tabelas no Neon:
   ```bash
   npx prisma db push
   ```

3. Execute o script de seed para criar os usuários e dados de demonstração:
   ```bash
   npm run db:seed
   ```

*(Pronto! Seu banco de dados em nuvem já está 100% criado e populado).*

---

## 🐙 Passo 3: Enviar o Código para o GitHub

1. No terminal do projeto, inicialize o Git e faça o primeiro commit:
   ```bash
   git init
   git add .
   git commit -m "feat: configuracao para deploy gratuito em producao"
   ```

2. Crie um novo repositório no seu [GitHub](https://github.com/new) (pode ser público ou privado), chamado `pinttech`.

3. Vincule e envie o código:
   ```bash
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/pinttech.git
   git push -u origin main
   ```

---

## 🌐 Passo 4: Fazer o Deploy na Vercel

1. Acesse **[vercel.com](https://vercel.com)** e faça login com o GitHub.
2. No painel (Dashboard), clique em **"Add New..."** ➔ **"Project"**.
3. Localize o repositório `pinttech` na lista e clique em **"Import"**.
4. Na tela de configuração:
   - **Framework Preset**: Deixe `Next.js`.
   - **Root Directory**: `./` (padrão).
5. Expanda a seção **"Environment Variables"** (Variáveis de Ambiente) e adicione:
   
   | Nome da Variável | Valor |
   | :--- | :--- |
   | `DATABASE_URL` | *(Cole a string do Neon que você copiou no Passo 1)* |
   | `JWT_SECRET` | *(Digite uma frase ou hash seguro, ex: `pinttech-jwt-prod-2026-xyz`)* |
   | `NEXTAUTH_SECRET` | *(Digite uma frase secreta, ex: `pinttech-nextauth-prod-2026`)* |

6. Clique no botão **"Deploy"**.

---

## 🎉 Pronto!

A Vercel levará cerca de 1 a 2 minutos para compilar e publicar a aplicação.
Ao final, você receberá um link gratuito com certificado SSL HTTPS (ex: `https://pinttech.vercel.app`).

### Credenciais de Acesso em Produção:
* **Proprietário SaaS (Super Admin):** `owner@pinttech.com` | Senha: `admin123`
* **Admin da Cervejaria:** `admin@pinttech.com` | Senha: `admin123`
* **Mestre Cervejeiro:** `mestre@pinttech.com` | Senha: `admin123`
* **Entregador (Scanner QR):** `entregas@pinttech.com` | Senha: `admin123`
