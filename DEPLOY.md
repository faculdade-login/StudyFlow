# Deploy StudyFlow — Vercel + Supabase

## Estrutura do projeto

```
StudyFlow/
├── index.html              # entrada da aplicacao
├── vercel.json             # configuracao do deploy na Vercel
├── package.json            # scripts locais (opcional)
├── .env.example            # modelo de variaveis (nao commitar .env)
├── .gitignore
├── css/
│   └── styles.css
├── js/
│   ├── app.js              # UI principal
│   ├── storage.js          # persistencia local (trocar por Supabase)
│   ├── finance-storage.js
│   ├── finance-ui.js
│   ├── finance.js
│   ├── utils.js
│   └── config.example.js   # copiar para config.js com credenciais
├── logos/
│   ├── iconlogo.png
│   └── logogrande.png
└── supabase/
    └── schema.sql          # tabelas, RLS e triggers
```

Hoje o app usa **localStorage**. Para producao, a Vercel hospeda os arquivos estaticos e o **Supabase** guarda usuarios e dados na nuvem.

---

## 1. Subir na Vercel (frontend)

### Opcao A — pelo site

1. Crie um repositorio no GitHub com esses arquivos.
2. Acesse [vercel.com](https://vercel.com) → **Add New Project**.
3. Importe o repositorio.
4. Configuracoes:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** deixe vazio
   - **Output Directory:** `./`
5. Clique em **Deploy**.

### Opcao B — pela CLI

```bash
npm i -g vercel
cd StudyFlow
vercel
```

Siga o assistente. Na primeira vez escolha o projeto; depois use `vercel --prod` para producao.

### Testar localmente

```bash
npm run dev
# abre em http://localhost:3000
```

---

## 2. Configurar o Supabase (banco + auth)

### Criar projeto

1. [supabase.com](https://supabase.com) → **New Project**.
2. Anote em **Project Settings → API**:
   - `Project URL`
   - `anon public` key

### Criar tabelas

1. No painel: **SQL Editor** → New query.
2. Cole o conteudo de `supabase/schema.sql`.
3. Execute.

Isso cria tabelas, politicas de seguranca (RLS) e o trigger que cria o perfil ao cadastrar usuario.

### Auth (cadastro/login)

No Supabase, em **Authentication → Providers**, mantenha **Email** habilitado.

O fluxo futuro no app:

- `signUp` → Supabase Auth cria usuario em `auth.users`
- Trigger cria linha em `profiles` e `finance_settings`
- `signIn` → sessao JWT gerenciada pelo Supabase
- Dados de cursos/financas via `@supabase/supabase-js`

---

## 3. Variaveis de ambiente

Copie `.env.example` para `.env` (apenas local):

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Na **Vercel** → projeto → **Settings → Environment Variables**, adicione as mesmas chaves para Production.

Para o frontend estatico, copie `js/config.example.js` para `js/config.js`:

```js
export const config = {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: 'sua_chave_anon'
};
```

O `config.js` esta no `.gitignore` para nao expor chaves no Git.

---

## 4. Migrar de localStorage para Supabase

Ordem sugerida:

| Etapa | O que fazer |
|-------|-------------|
| 1 | Instalar cliente: `npm install @supabase/supabase-js` |
| 2 | Criar `js/supabase-client.js` com `createClient(config.supabaseUrl, config.supabaseAnonKey)` |
| 3 | Trocar `loginUser` / `registerUser` por `supabase.auth.signInWithPassword` e `signUp` |
| 4 | Trocar `storage.js` (CRUD) por queries `.from('courses').select()` etc. |
| 5 | Manter `finance-storage.js` com as mesmas tabelas `finance_*` |
| 6 | Remover senha em texto plano — o Supabase Auth cuida disso |
| 7 | Ranking: `select * from ranking` (view no schema) |

Exemplo minimo do cliente:

```js
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
```

---

## 5. Checklist antes de ir ao ar

- [ ] Repositorio no GitHub sem `.env` nem `js/config.js`
- [ ] `schema.sql` executado no Supabase
- [ ] RLS ativo (ja esta no schema)
- [ ] Deploy na Vercel funcionando
- [ ] Cadastro real testado com Supabase Auth
- [ ] Financas: cada usuario so ve os proprios dados (RLS)

---

## Observacoes

- **Ranking:** perfis sao publicos para leitura; financas nunca sao compartilhadas.
- **Senhas:** nao armazene senha no `localStorage` em producao — use Supabase Auth.
- **Dominio:** na Vercel, em **Settings → Domains**, voce pode apontar um dominio proprio.
