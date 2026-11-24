# Duelo online 1v1 — servidor autoritativo

Protótipo anônimo de duelo: o navegador envia apenas **intenções** (entrar, mover, mirar, ações e ping); o servidor simula a partida e envia snapshots. Não há conta, ranking, persistência, chat, espectador nem compras neste modo.

Este documento descreve o que existe, o modelo de confiança e o que **não** está protegido. Ele não afirma que o modo é “100% seguro”.

## Arquitetura

```
navegador (Vite/Three)
  │  HTTPS (proxy) / WSS
  ▼
Bun.serve  ── /            → dist/ (SPA + headers de segurança)
           ── /healthz     → status operacional
           ── /ws          → upgrade + protocolo do duelo
                                   │
                                   ▼
                              Map<code, DuelRoom>
                              simulação 30 Hz por sala
                              snapshots ~60 Hz
```

- `server/index.ts`: HTTP, estáticos, upgrade, limites, heartbeat, ciclo das salas.
- `server/security.ts`: allowlist de Origin, IP confiável, CSP e headers.
- `server/duel-room.ts`: simulação autoritativa de uma sala (2 jogadores).
- `src/shared/duel.ts`: contrato compartilhado de mensagens e regras.
- `src/multiplayer/duel-client.ts`: transporte do navegador (só envia intents, valida o que recebe).

O estado das salas vive **em memória, em um único processo**. Reiniciar o servidor encerra todas as partidas.

## Protocolo resumido

Transporte: WebSocket de texto, uma mensagem JSON por frame. O servidor não aceita binário.

### Cliente → servidor

| Mensagem | Campos | Regras no servidor |
|---|---|---|
| `join` | `name?`, `skin?`, `room?`, `create?` | `room` deve ter exatamente 6 caracteres `A-Z0-9` e existir. Sem `room`, faz quick match (entra na sala pública mais antiga esperando 1 jogador; se não houver, cria). `create: true` sempre cria uma sala nova e devolve o código; ela é privada e nunca é preenchida por quick match. `name` passa por `sanitizeName`; `skin` precisa casar `skin-[a-z0-9-]` e cai em `skin-ronin` se inválida. |
| `input` | `seq`, `move: [x,z]`, `aim: [x,z]` | `seq` inteiro seguro ≥ 0; vetores finitos e com componentes ≤ 10.000 em módulo. A sala normaliza/clampa `move`, normaliza `aim` e descarta `seq` repetido/regressivo. |
| `action` | `id`, `a` | `id` inteiro seguro ≥ 0; `a` inteiro de 0 a 31. A sala deduplica por `id`, exige estado `live`, jogador vivo, cooldown e orçamento de 50 ms entre pacotes. |
| `ping` | `ts` | Responde `pong` com o mesmo `ts` (ou `0`). Antes do join, responde diretamente; depois, via `DuelRoom.ping`. |
| `leave` | — | Remove o jogador; o oponente recebe `end` com forfeit; a sala vazia fecha. |
| `ready` | — | Reservado para uma revanche direta na mesma sala; hoje é um no-op. |

Mensagens desconhecidas, JSON inválido, texto acima de 1.024 bytes ou binário encerram a conexão (1008/1009).

### Servidor → cliente

| Mensagem | Conteúdo |
|---|---|
| `welcome` | `id`, `room`, `side`, `name` — confirma a entrada. |
| `queue` | `room`, `players` (1 ou 2). |
| `matched` | `room`, `side`, `opponent`, `tick` — partida começou. |
| `snapshot` | Estado completo autoritativo: tick, round, placar, estado, jogadores (id, lado, nome, skin, posição, vida, munição, foco, cooldowns) e projéteis. |
| `event` | Efeitos: `shot`, `hit`, `parry`, `slash`, `special`, `dash`, `round`, `spawn`, `match`. |
| `end` | `winner`, `score`, `reason` — fim de partida/forfeit. |
| `pong` | `ts` do ping. |
| `error` | `code` e mensagem em português para exibir na UI. |

### Códigos de erro da aplicação

`ALREADY_IN_ROOM`, `BAD_JOIN`, `BAD_ROOM_CODE`, `ROOM_NOT_FOUND`, `ROOM_FULL`, `ROOM_IN_PROGRESS`, `SERVER_FULL`, `NOT_IN_ROOM`, `BAD_INPUT`, `BAD_ACTION`.

Um erro de join **não fecha** a conexão: o cliente pode enviar outro `join`. O `DuelClient` atual, porém, mantém `joinSent` após um erro; até isso ser ajustado no cliente, a UI deve descartar a conexão e reconectar para tentar outro código.

### “Criar sala” e “Partida rápida”

- **Partida rápida**: entra na sala pública mais antiga que está esperando um jogador; se não houver, cria uma sala pública.
- **Criar sala**: envia `create: true`, cria uma sala privada nova e mostra o código. Quick match nunca preenche salas privadas; o segundo jogador precisa do código.
- **Entrar com código**: abre exatamente a sala indicada, se ela existir, estiver esperando e não estiver cheia.

A UI e o `DuelClient` já enviam `create: true`; o servidor recusa `create` junto com `room` para evitar ambiguidade.


## Modelo de confiança

O servidor é a única autoridade:

- posição, velocidade, vida, munição, foco, dano, cooldowns, rounds, placar e vencedor nascem no `DuelRoom`;
- o cliente não escolhe lado, sala ativa, início de partida nem resultado;
- campos extras em pacotes de input/action são ignorados;
- códigos de sala são gerados com `crypto.getRandomValues` (alfabeto de 36 símbolos, 6 posições);
- nomes são sanitizados e limitados a 16 caracteres;
- nenhuma URL fornecida pelo cliente é aberta, buscada ou executada; não há `eval`;
- o servidor não confia em `room name` do cliente: `room` só pode apontar para um código já emitido por ele.

O cliente recebe snapshots completos dos dois jogadores e dos projéteis. Isso é necessário para renderizar o duelo, mas significa que **wallhack não é totalmente evitável** por um cliente modificado. Não há fog-of-war, oclusão de informação por parede nem anti-cheat comportamental.

## Limites e defesas implementadas

| Defesa | Valor |
|---|---|
| Conexões simultâneas por IP | 5; a 6ª recebe HTTP 429 antes do upgrade |
| Salas ativas | 200 (`MAX_ROOMS`, teto rígido) |
| Jogadores por sala | 2 (o terceiro recebe `ROOM_FULL` antes de entrar) |
| Frame WebSocket | 1.024 bytes, somente texto; binário rejeitado |
| Rate limit por conexão | 60 mensagens em janela móvel de 1 s; excesso fecha com 1008 |
| Tentativas de join | 15 falhas na mesma conexão fecham com 1008 |
| Heartbeat | ping de protocolo a cada 20 s; sem pong/atividade por 45 s fecha com 1001 |
| Backpressure | 1 MiB por socket; acima disso a conexão é fechada |
| Corpo HTTP | 64 KiB (o servidor só aceita GET/HEAD nas rotas estáticas) |
| Desligamento | `SIGTERM`/`SIGINT` fecham salas e sockets |

O heartbeat usa frames **ping/pong do WebSocket**: o navegador responde automaticamente, mesmo que o JavaScript esteja ocupado. Qualquer mensagem do cliente também conta como atividade. O `ping` de aplicação (`{t:'ping'}`) continua disponível para medir RTT na UI.

### Origem no upgrade

Antes de qualquer upgrade:

1. `ALLOWED_ORIGINS` (lista exata, separada por vírgula) é verificada;
2. a origem do próprio host que atende a requisição é aceita (compara `Origin` com `Host`; usa `X-Forwarded-Host` apenas com `TRUST_PROXY=1`);
3. em desenvolvimento (`NODE_ENV` diferente de `production`), `localhost`, `127.0.0.1` e `[::1]` em qualquer porta são aceitos;
4. origem ausente é aceita **somente** fora de produção.

Caso contrário, o servidor responde HTTP 403 antes do upgrade. Wildcards (`*`) não são suportados.

Origin não é autenticação: um cliente nativo pode falsificar o cabeçalho. Ela serve para impedir que uma página de outra origem abra o WebSocket usando o navegador da vítima.

### IP e proxy

Por padrão o IP vem do endereço do socket aceito pelo Bun (`server.requestIP`), que o cliente não consegue falsificar.

`TRUST_PROXY=1` faz o servidor usar, nesta ordem, `CF-Connecting-IP` (quando presente e válido, como no Cloudflare) e o **primeiro** valor de `X-Forwarded-For`; `X-Forwarded-Host` também é lido. Só habilite se houver um proxy reverso confiável e, no caso do Cloudflare, se a origem só aceitar IPs da Cloudflare (como nesta infra). Se um cliente direto puder alcançar a origem, ele consegue falsificar esses cabeçalhos e furar o limite de conexões.

Sem `TRUST_PROXY`, atrás de um proxy todos os jogadores compartilham o IP do proxy e o limite de 5 conexões passa a ser global. Em produção na infra do Luis (Traefik + Cloudflare, origem fechada para IPs da Cloudflare), use `TRUST_PROXY=1`: o servidor prefere `CF-Connecting-IP` e cai para o primeiro `X-Forwarded-For` em outros proxies confiáveis.

## HTTP estático e headers

O servidor serve `dist/` quando o build existe:

- `/` e rotas sem extensão → `index.html` (fallback SPA);
- `/assets/*` e `/fonts/*` inexistentes → 404, nunca HTML disfarçado;
- `.js`, `.css`, `.json`, `.woff2`, imagens, áudio etc. com MIME explícito;
- `Cache-Control: public, max-age=31536000, immutable` para `/assets/*` (nomes com hash do Vite);
- fontes sem hash: 7 dias; `index.html` e fallback SPA: `no-cache`;
- apenas GET/HEAD; outros métodos recebem 405;
- path traversal e dotfiles são rejeitados; arquivos são servidos somente se `lstat` confirmar arquivo regular dentro de `dist/`.

O build usa `base: './'`, então o fallback SPA funciona para rotas sem extensão, mas **rotas aninhadas com assets relativos** (ex.: `/sala/ABC123` servindo `./assets/...`) não são confiáveis. Use `/` ou rotas em hash até o `base` do Vite mudar.

Headers aplicados a todas as respostas HTTP:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy` negando câmera, microfone, geolocalização, pagamento, USB etc.
- `Cross-Origin-Opener-Policy: same-origin`
- CSP: `default-src 'self'`; scripts apenas self (sem inline/eval); estilos self + `'unsafe-inline'` (a UI usa estilos inline); imagens self/data/blob; fontes self; `connect-src 'self' ws: wss:`; `worker-src 'none'`; frames/objects negados; `base-uri`/`form-action` self.

Se o app passar a usar recurso externo (CDN, analytics, iframe de checkout), a CSP precisa ser ajustada de propósito. Não remova `nosniff`/`frame-ancestors` sem revisar o modelo de ameaça.

O server não comprime HTTP; deixe gzip/brotli no proxy. Ele também não define HSTS: configure no terminador TLS.

## Variáveis de ambiente

| Variável | Padrão | Efeito |
|---|---|---|
| `PORT` | `8788` | Porta HTTP/WS em `0.0.0.0`. |
| `ALLOWED_ORIGINS` | vazio | Origens exatas adicionais, separadas por vírgula. Sem wildcard. |
| `MAX_ROOMS` | `200` | Salas simultâneas; valores acima de 200 são recusados e o padrão é usado. |
| `TRUST_PROXY` | `0` | `1` confia em `CF-Connecting-IP`/primeiro `X-Forwarded-For` e `X-Forwarded-Host`. Ver aviso acima. |
| `NODE_ENV` | não definido | `production` exige Origin e remove atalhos de desenvolvimento. O Dockerfile define `production`. |

`PORT`, `MAX_ROOMS` e `TRUST_PROXY` inválidos geram aviso e voltam ao padrão. Entradas inválidas de `ALLOWED_ORIGINS` são ignoradas (com contagem no log, sem imprimir os valores).

## Como rodar

### Build + servidor único

```bash
bun install --frozen-lockfile
bun run build
# O tsc do projeto cobre apenas src/; isto valida sintaxe/imports do servidor:
bun build server/index.ts --target=bun --outdir=/tmp/movestop-server-check
bun run server          # ou: PORT=8788 bun server/index.ts
```

Abra `http://localhost:8788`. Sem `NODE_ENV=production`, o modo é desenvolvimento (Origin ausente e localhost liberados).

Health check e headers:

```bash
curl -i http://localhost:8788/healthz
curl -I http://localhost:8788/
```

### Desenvolvimento com Vite

O `vite.config.ts` faz proxy de `/ws` para o servidor. O target do proxy e o default do servidor estão alinhados em `ws://localhost:8788`.

```bash
PORT=8788 bun run server   # terminal 1, casando com o proxy atual
bun run dev                # terminal 2 (Vite em :5173)
```

Abra `http://localhost:5173`. O proxy encaminha `Host`/`Origin` de `localhost:5173`, então o mesmo-host é aceito; em desenvolvimento, localhost também é liberado independentemente da porta.

Teste rápido pelo console do navegador (na página servida pelo mesmo host):

```js
const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
ws.onmessage = (event) => console.log(JSON.parse(event.data));
ws.onopen = () => ws.send(JSON.stringify({ t: 'join', name: 'Teste' }));
```

Para testar quick match, abra duas abas e clique em “Partida rápida” nas duas. Para sala por código, use o código exibido na fila.

Testes existentes da simulação:

```bash
bun test
```

### Docker

```bash
docker build -t movestop-online .
docker run --rm -p 8788:8788 \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS=https://movestop.example.com \
  movestop-online
```

O estágio final roda como UID/GID `10001`, expõe `8788` e tem healthcheck em `/healthz`. O cliente é buildado no primeiro estágio; o runtime contém apenas `dist/`, `server/`, `src/shared/` e `package.json`.

**Não há `node_modules` no runtime** porque o servidor importa somente módulos nativos do Bun e TypeScript local. Se você adicionar uma dependência npm ao servidor, copie `node_modules` de produção (ou faça bundle com `bun build --target=bun`) e ajuste o Dockerfile.

## Checklist de deploy

- [ ] `bun install --frozen-lockfile && bun run build` (ou build Docker) sem erros.
- [ ] `NODE_ENV=production` definido no processo.
- [ ] `ALLOWED_ORIGINS` com os domínios reais (inclua `www` se usado).
- [ ] TLS terminado no proxy; o público acessa somente `https://` / `wss://`.
- [ ] Porta `8788` exposta apenas na rede interna; nunca direto na internet.
- [ ] Proxy encaminha `Upgrade`/`Connection` e tem `proxy_read_timeout` maior que 45 s (ex.: 75 s).
- [ ] `TRUST_PROXY=1` somente atrás de proxy confiável; no Cloudflare, confirme que a origem só aceita IPs da Cloudflare e que `CF-Connecting-IP` chega ao processo.
- [ ] HSTS, limite de requisições HTTP, limite de corpo e proteção DDoS no proxy/CDN.
- [ ] Healthcheck em `/healthz`; logs do processo coletados.
- [ ] Teste de origem: abrir o WS a partir de outro domínio deve retornar 403.
- [ ] Teste de carga/limites: 6ª conexão do mesmo IP → 429; 61 mensagens/s → 1008.
- [ ] CSP verificada no console do navegador (index, JS, CSS, fontes e favicon data:).
- [ ] Uma única réplica, ou estado de salas compartilhado antes de escalar horizontalmente.
- [ ] Nenhum segredo no repositório ou em `.env` commitado.

Exemplo de proxy nginx (TLS no nginx, app local):

```nginx
location /ws {
  proxy_pass http://127.0.0.1:8788;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  # Sobrescreve, não anexa: seguro para TRUST_PROXY=1 com um único proxy.
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_read_timeout 75s;
}

location / {
  proxy_pass http://127.0.0.1:8788;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Se houver CDN/Cloudflare ou múltiplos proxies, ajuste a extração de IP e a allowlist; o primeiro valor de `X-Forwarded-For` pode não ser o cliente real.

## Limitações conhecidas (explícitas)

- **Sem contas, autenticação, ranking, histórico ou persistência.** IDs de jogador e salas são efêmeros; reinício derruba tudo.
- **Revanche não preserva a partida.** O botão volta para quick match e cria uma sala nova; `ready` continua reservado. Não há histórico, placar acumulado nem reconexão com o mesmo oponente.
- **Wallhack não é totalmente evitável**: snapshots incluem ambos os jogadores e projéteis. Não há oclusão/fog of war.
- **Aimbot, triggerbot, macro e lag switch** não são detectados. O servidor impede trapaça de estado (vida, posição, munição, dano), não a qualidade da intenção humana.
- **Rate limit é local ao processo e por IP.** NAT/CGNAT agrupa jogadores; IPv6 permite variar endereços; não substitui rate limit distribuído nem proteção DDoS.
- **Códigos de sala são bearer tokens curtos** (36⁶ ≈ 2,2 bilhões). Não são secretos criptográficos fortes; limitação de tentativas e de conexões reduz, mas não elimina, brute force. Não há log de tentativas por IP.
- **Sem reconexão/resume.** Cair a conexão durante a partida = forfeit para o oponente.
- **Sem timeout de lobby.** Uma conexão que responde ao heartbeat pode manter uma sala de espera; o teto de 200 salas é a defesa contra acúmulo. Não há expiração por tempo de espera.
- **Sem espectadores, chat, matchmaking por habilidade, torneios ou Anti-Cheat dedicado.**
- **Sem compras/entitlements no modo online.** O checkout do jogo é um fluxo separado/demo. Compra real exige webhook assinado e verificação de entitlement no servidor; isso **não está implementado** aqui.
- **Escala horizontal não é suportada.** Salas vivem no processo. Duas réplicas atrás de um load balancer fariam o código de sala falhar na réplica errada; seria necessário registro compartilhado/roteamento por sala.
- **Capacidade:** até 200 salas, cada uma com timer de 30 Hz. Monitorar CPU, memória e conexões; snapshots de 200 salas são carga relevante para um único processo.
- **Logs não contêm nomes, códigos de sala, IPs nem corpos de mensagem.** Para investigação de abuso, use os logs do proxy/CDN.
- **`/healthz` é público** e informa contagens agregadas; restrinja no proxy se isso for sensível.
- **CSP usa `connect-src ws: wss:`** (qualquer host WebSocket), como especificado. Em produção, pode ser endurecida para o domínio real.
- **Sem TLS no processo Bun.** O modo seguro depende de HTTPS/WSS no proxy; `ws://` em produção expõe o tráfego a quem estiver na rede.

Em resumo: a autoridade de jogo e os controles de borda são reais, mas isto é uma base de protótipo. Não é um sistema completo de anti-cheat, anti-DDoS, autenticação ou pagamentos.
