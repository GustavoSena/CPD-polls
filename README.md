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
  Cada membro pode ter **vários links — um por dispositivo** (telemóvel,
  portátil…) e continua a ter apenas **um voto** por proposta, seja qual for
  o dispositivo. Não há contas nem palavras-passe para os membros — abrir o
  link uma vez chega para o browser ficar reconhecido.
- **Anonimato**: a escolha de cada voto é guardada sem qualquer ligação ao
  membro. Regista-se apenas *que* o membro votou (para saber quando todos
  votaram e impedir votos duplos) — nunca *em quê*.
- Cada proposta define **quanto tempo dura**. Encerra quando todos os
  membros da lista votarem ou quando o tempo acabar — o que vier primeiro.
- Os resultados só aparecem depois de a proposta encerrar.

## Administração

Em **`/admin`** (link no rodapé) gere-se a lista de membros: adicionar e
remover pessoas e, para cada uma, adicionar, copiar ou revogar os seus links
pessoais — um por dispositivo. Revogar um link (ex.: telemóvel perdido) não
afeta os outros dispositivos dessa pessoa nem os votos que já deu. A página
é protegida por utilizador e palavra-passe — `ADMIN_USER` e `ADMIN_PASSWORD`
no `.env`.

## Correr localmente

Precisas de um Postgres nesta máquina (ex.: `brew install postgresql@16`).

```bash
npm install
cp .env.example .env       # ajusta as ligações e o RESIDENT_CODE
createdb cpd_polls_dev     # cria a base de dados local
npx prisma migrate deploy  # cria as tabelas
npm run dev                # abre http://localhost:3000
```

## Mudar o design

Todo o aspeto do site (cores, tipografia, cantos, sombras) está em
**`app/theme.css`** como variáveis CSS. Muda os valores aí e o site inteiro
acompanha. A estrutura/layout está em `app/globals.css`, e os textos estão
nos ficheiros de `app/`.

## Publicar (Vercel + Vercel Postgres)

O site está publicado em **https://cpd-polls.vercel.app**, na
[Vercel](https://vercel.com), com uma base de dados Postgres (Neon) criada
pela integração *Vercel Postgres*.

O deploy é **automático**: cada push para `main` constrói e publica uma
versão nova. O `npm run build` corre `prisma migrate deploy`, por isso as
migrações são aplicadas sozinhas em cada deploy.

*Environment Variables* no projeto da Vercel:

- `POSTGRES_PRISMA_URL` e `POSTGRES_URL_NON_POOLING` → injetadas pela
  integração da base de dados; não é preciso escrevê-las à mão
- `RESIDENT_CODE` → o código secreto dos residentes
- `ADMIN_USER` e `ADMIN_PASSWORD` → credenciais da página `/admin`

## Limitações assumidas (simplicidade primeiro)

- Um membro pode reencaminhar um link pessoal a outra pessoa — é o
  equivalente a entregar o boletim de voto, e nenhum login impede isso.
  Se um link se perder ou fugir, revoga-se em `/admin`; os outros
  dispositivos dessa pessoa continuam a funcionar.
- Só quem está na lista de membros pode votar; visitantes sem link veem as
  propostas e as opções, mas não votam. Os residentes criam propostas com o
  `RESIDENT_CODE`.
