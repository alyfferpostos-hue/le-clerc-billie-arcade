# LE CLERC BILLIE ARCADE — WEB 1.1

Arcade online com o primeiro jogo **Pong Battle** para dois jogadores. Acesse pelo navegador; o servidor fica hospedado na internet. Não é necessário comprar domínio nem instalar Python nos computadores dos jogadores.

## IMPORTANTE: o que está e não está pronto

O projeto contém o código do jogo e do servidor. **O site ainda não está publicado**: é preciso enviá-lo ao GitHub e conectar uma hospedagem. Não é possível prometer que o plano gratuito estará disponível para toda conta ou que não haverá suspensão por inatividade. A partida depende da internet e de o serviço estar ativo.

## PASSO A PASSO COMPLETO — sem comandos

### Etapa 1 — Extrair o arquivo ZIP

1. Baixe `LE_CLERC_BILLIE_ARCADE_WEB_1.1.zip`.
2. No Explorador de Arquivos do Windows, clique com o botão direito no ZIP e escolha **Extrair Tudo**.
3. Abra a pasta extraída. Dentro dela você deve encontrar **package.json**, **server.js**, **render.yaml**, **README.md** e a pasta **public**.
4. Não abra `index.html` com duplo clique: o multiplayer só funciona com o servidor online.

### Etapa 2 — Criar uma conta no GitHub

1. Abra https://github.com/ no Chrome.
2. Clique em **Sign up**, caso ainda não tenha conta. Confirme seu e-mail quando solicitado.
3. Entre na conta e clique no sinal **+** no canto superior direito → **New repository**. Alternativamente, acesse https://github.com/new.
4. Em **Repository name**, escreva `le-clerc-billie-arcade`.
5. Selecione **Private** (ou Public, se preferir). **Não** marque `Add a README file`, `.gitignore` ou licença, para manter o repositório vazio.
6. Clique em **Create repository**.

### Etapa 3 — Enviar os arquivos pelo navegador

1. Na página do repositório vazio, clique no link **uploading an existing file** (ou **Add file → Upload files**).
2. Abra no Windows a pasta extraída do projeto.
3. Selecione **os arquivos e a pasta `public` que estão DENTRO da pasta do projeto** e arraste-os para a área de upload do GitHub. **Não envie o ZIP fechado** e não coloque tudo dentro de uma pasta extra no repositório.
4. Aguarde os uploads. Se o navegador não enviar a pasta `public` corretamente, abra essa pasta e confira depois no GitHub se `public/index.html`, `public/app.js` e `public/style.css` estão presentes.
5. Na parte inferior, clique em **Commit changes** / **Commit files**.
6. Confira a raiz do repositório: `server.js`, `package.json`, `render.yaml`, `README.md` e `public/` devem aparecer juntos.

### Etapa 4 — Publicar no Render

1. Abra https://dashboard.render.com/ e faça login (pode escolher **Sign in with GitHub**).
2. Autorize o acesso ao GitHub, se solicitado. Se o repositório não aparecer, revise as permissões da integração do Render no GitHub.
3. No painel do Render, clique em **New → Blueprint**.
4. Conecte o repositório `le-clerc-billie-arcade`.
5. O Render deverá reconhecer o arquivo `render.yaml` e propor um serviço Web. Confira **runtime Node**, **build command `npm install`**, **start command `npm start`** e **plano Free**, se disponível para sua conta.
6. **Antes de confirmar, confira se o preço é zero.** Se a tela indicar cobrança ou exigir plano pago, pare e não confirme: a oferta de planos pode mudar.
7. Confirme a implantação (**Apply/Deploy Blueprint**, conforme a tela). Espere o build e o deploy concluírem. A primeira publicação pode demorar alguns minutos.
8. Abra a página do serviço. Quando o status for **Live**, procure o endereço HTTPS fornecido pelo Render, geralmente no formato `https://nome-do-servico.onrender.com`. Esse endereço é **um exemplo de formato**, não um endereço já reservado.
9. Clique no endereço e confirme que a tela **LE CLERC BILLIE ARCADE** aparece.

### Etapa 5 — Testar a partida

1. No seu PC, abra o endereço HTTPS do Render e digite um apelido.
2. Clique em **CRIAR SALA**. Um código de seis números aparecerá.
3. Clique em **COPIAR CONVITE** e envie o link ao seu amigo pelo WhatsApp, ou diga o código.
4. O amigo abre **o mesmo site** no próprio navegador, informa o apelido, digita o código (caso não tenha usado o link) e clica em **ENTRAR**.
5. Com os dois jogadores na sala, a partida começa. Use **W/S** ou **setas para cima/baixo** para controlar sua raquete.
6. Quem fizer **7 pontos** vence. É possível solicitar revanche.
7. Para verificar se realmente funciona pela internet, teste com computadores em redes diferentes (ou um computador e celular usando dados móveis). No celular há controles na tela.

### Etapa 6 — Atualizações futuras

Para atualizar o jogo, envie os arquivos alterados ao **mesmo repositório** do GitHub, preservando os caminhos. O Render normalmente fará uma nova publicação automaticamente. Aguarde o status **Live** e recarregue o navegador.

## Se algo der errado

- **Página não abre:** confira o status do serviço no Render. No plano gratuito, a inicialização após inatividade pode demorar.
- **Build failed:** abra o serviço no Render → **Logs** e copie as últimas linhas do erro.
- **Não aparece o jogo:** confirme que `public/index.html` foi enviado ao GitHub dentro da pasta `public`.
- **Sala não encontrada:** confirme os seis dígitos e se os dois abriram o mesmo endereço de site. Salas são temporárias e desaparecem quando o servidor reinicia.
- **Desconectou durante o jogo:** verifique internet e logs do Render. O servidor gratuito pode ser suspenso/reiniciado; isso encerra partidas ativas.
- **GitHub não mostra o repositório no Render:** autorize o repositório nas configurações da integração GitHub/Render.

## Segurança e limites

Não é necessário alterar roteador, abrir portas na rede do posto ou desativar o firewall. O servidor hospeda várias salas de dois jogadores, mas os códigos não são senhas fortes; compartilhe links apenas com os convidados. Não há contas, chat, banco de dados nem persistência de partidas. O serviço deve usar **uma instância** para que os jogadores encontrem a mesma sala.

## Para desenvolvedores (opcional)

Requer Node.js 20+; execute `npm install` e `npm start` e abra `http://localhost:3000`. Esta etapa **não é necessária para os jogadores**.
