# CPD Polls — A Casa do Povo

Site de votações da Comunidade Pouco Democrática.

## Como funciona

- **Residentes** submetem propostas com várias opções em [/new](http://localhost:3000/new).
  O acesso é protegido por um código partilhado (`RESIDENT_CODE` no `.env`).
  A proposta não guarda quem a criou — é anónima.
- Cada opção é uma entrada própria com **título, explicação e imagem**
  (opcionais, exceto o título). A proposta também pode ter imagem.
  As imagens (JPG, PNG, WebP ou GIF, até 4 MB cada) ficam guardadas na
  própria base de dados — não é preciso nenhum serviço de ficheiros.
- **Membros da comunidade** votam com o seu **link pessoal secreto**
  (ex.: `/m/x7Kf…`), criado na página de administração e enviado em privado.
  Não há contas nem palavras-passe para os membros — abrir o link uma vez
  chega para o browser ficar reconhecido.
- **Anonimato**: a escolha de cada voto é guardada sem qualquer ligação ao
  membro. Regista-se apenas *que* o membro votou (para saber quando todos
  votaram e impedir votos duplos) — nunca *em quê*.
- Cada proposta define **quanto tempo dura**. Encerra quando todos os
  membros da lista votarem ou quando o tempo acabar — o que vier primeiro.
- Os resultados só aparecem depois de a proposta encerrar.

## Administração

Em **`/admin`** (link no rodapé) gere-se a lista de membros: adicionar,
remover, copiar o link pessoal de cada um, ou gerar um link novo se algum
se perder. A página é protegida por utilizador e palavra-passe —
`ADMIN_USER` e `ADMIN_PASSWORD` no `.env`.

## Correr localmente

```bash
npm install
cp .env.example .env    # ajusta o RESIDENT_CODE se quiseres
npx prisma migrate dev  # cria a base de dados local (SQLite)
npm run dev             # abre http://localhost:3000
```

## Mudar o design

Todo o aspeto do site (cores, tipografia, cantos, sombras) está em
**`app/theme.css`** como variáveis CSS. Muda os valores aí e o site inteiro
acompanha. A estrutura/layout está em `app/globals.css`, e os textos estão
nos ficheiros de `app/`.

## Publicar (Vercel + Neon)

O site corre na [Vercel](https://vercel.com) (grátis) com uma base de dados
Postgres na [Neon](https://neon.tech) (grátis). Passos:

1. **Base de dados** — cria uma conta na Neon, cria um projeto e copia a
   *connection string* (começa com `postgresql://`).

2. **Trocar o Prisma para Postgres** — em `prisma/schema.prisma` muda:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

   Depois cria as tabelas na Neon (uma vez, a partir do teu computador):

   ```bash
   DATABASE_URL="postgresql://...a-tua-string..." npx prisma db push
   ```

3. **Código no GitHub** — cria um repositório e faz push desta pasta
   (o `.env` e a base de dados local nunca são enviados — já estão no
   `.gitignore`).

   ```bash
   git init && git add -A && git commit -m "CPD polls"
   git remote add origin <url-do-repo>
   git push -u origin main
   ```

4. **Vercel** — em vercel.com, "Add New Project", importa o repositório e,
   antes de fazer deploy, define as *Environment Variables*:

   - `DATABASE_URL` → a connection string da Neon
   - `RESIDENT_CODE` → o código secreto dos residentes
   - `ADMIN_USER` e `ADMIN_PASSWORD` → credenciais da página `/admin`

   Faz deploy. A Vercel dá-te um URL `https://….vercel.app` para partilhar
   com a comunidade (podes ligar um domínio próprio depois, nas definições).

Nota: para continuar a desenvolver localmente com SQLite depois do passo 2,
volta a pôr `provider = "sqlite"` — ou passa a usar a Neon também em local,
pondo a connection string no teu `.env`.

## Limitações assumidas (simplicidade primeiro)

- Um membro pode reencaminhar o seu link pessoal a outra pessoa — é o
  equivalente a entregar o boletim de voto, e nenhum login impede isso.
  Se um link se perder ou fugir, gera-se um novo em `/admin`.
- Só quem está na lista de membros pode votar; visitantes sem link veem as
  propostas mas não votam. Os residentes criam propostas com o
  `RESIDENT_CODE`.
