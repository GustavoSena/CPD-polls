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
- **Membros da comunidade** entram com o seu **email**: em [/entrar](http://localhost:3000/entrar)
  escrevem o email, recebem um **código de 6 dígitos** (enviado pelo Gmail) e o dispositivo fica
  reconhecido (cookie de 400 dias) até carregarem em *Sair* ou o admin o
  revogar. Cada pessoa pode entrar em **vários dispositivos** e continua a ter
  apenas **um voto** por proposta. Os códigos expiram em 10 minutos, aceitam
  5 tentativas e cada email pode pedir no máximo 5 códigos em 30 minutos.
  Para quem não tem email, o admin pode ainda criar um **link pessoal secreto**
  (ex.: `/m/x7Kf…`); os links já distribuídos continuam a funcionar.
- **Anonimato**: a escolha de cada voto é guardada sem qualquer ligação ao
  membro. Regista-se apenas *que* o membro votou (para saber quando todos
  votaram e impedir votos duplos) — nunca *em quê*.
- Cada proposta define **quanto tempo dura**. Encerra quando todos os
  membros da lista votarem ou quando o tempo acabar — o que vier primeiro.
- Os resultados só aparecem depois de a proposta encerrar.

## Administração

Em **`/admin`** (link no rodapé) gere-se a lista de membros: adicionar e
remover pessoas, definir o email com que cada uma entra e ver ou revogar os
seus dispositivos (e criar links pessoais para quem não tem email). Revogar um link (ex.: telemóvel perdido) não
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
acompanha (incluindo o modo escuro, que segue a preferência do sistema).
As fontes (Fredoka nos títulos, Inter no texto) são carregadas em
`app/layout.tsx`. A estrutura/layout está em `app/globals.css`, e os textos estão
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
- `GMAIL_USER` e `GMAIL_APP_PASSWORD` → conta Gmail que envia os códigos de
  entrada e uma *palavra-passe de app* dessa conta
  (https://myaccount.google.com/apppasswords — precisa da verificação em
  2 passos ativa). Limite do Gmail: cerca de 500 emails por dia.
- `EMAIL_FROM` (opcional) → nome do remetente, ex.: `CPD <conta@gmail.com>`
- Alternativa com domínio próprio: `RESEND_API_KEY` (+ `EMAIL_FROM` num
  domínio verificado na [Resend](https://resend.com)). Se o Gmail estiver
  configurado, é o Gmail que envia.

## Limitações assumidas (simplicidade primeiro)

- Na página de entrada, quem escrever um email fica a saber se ele está na
  lista de membros (mensagem mais clara para uma comunidade pequena).
- Um membro pode reencaminhar um link pessoal a outra pessoa — é o
  equivalente a entregar o boletim de voto, e nenhum login impede isso.
  Se um link se perder ou fugir, revoga-se em `/admin`; os outros
  dispositivos dessa pessoa continuam a funcionar.
- Só quem está na lista de membros pode votar; visitantes sem link veem as
  propostas e as opções, mas não votam. Os residentes criam propostas com o
  `RESIDENT_CODE`.
