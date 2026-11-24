# Deploy — MOVESTOP

## Produção

| Item | Valor |
|---|---|
| URL | https://movestop.wired.rs |
| Repositório | `luis-ota/movestop` (privado) |
| App Coolify | `movestop` — UUID `ddysqlw9mrchkehvf1qhfqyr` |
| Projeto / servidor | `sides` / `sides-a` (linux/amd64, Oracle E2) |
| Imagem | `ghcr.io/luis-ota/movestop:latest` e `:sha` |
| Healthcheck | `GET /healthz` na porta `8788` |
| DNS | `A movestop.wired.rs -> 163.176.60.23`, **proxied** (Cloudflare) |

O app é um único processo Bun: serve o `dist/` estático e o WebSocket `/ws` na mesma porta.
Salas são em memória; reiniciar o container encerra partidas em andamento.

## CI/CD (instabox)

- `.github/workflows/ci.yml` roda em PR/manual (ignorando docs): install, `bun test`, build do cliente, typecheck estrito do servidor e build da imagem Docker sem publicar.
- `.github/workflows/deploy.yml` roda em push na `main` (ou manual na `main`): repete testes/build/typecheck, publica a imagem
  `linux/amd64` no GHCR, aponta a tag do SHA no Coolify, dispara o deploy e verifica
  `https://movestop.wired.rs/healthz` + a home real.
- **Todos os jobs usam `runs-on: instabox-medium`.** Nada de `ubuntu-latest`.
- **Não há `concurrency` do GitHub**: o runner `instabox-medium` é um slot compartilhado e já
  enfileira jobs de todos os projetos. Assim um run pendente não é cancelado por outro push/PR.
  Se o slot estiver ocupado, espere; não apague a caixa de outro projeto.
- Jobs e steps têm `timeout-minutes` para não prender o slot por horas. O deploy só é aceito
  quando o Coolify marca o deployment como `finished`, a tag persistida é o SHA do commit e
  `/healthz` + a home respondem 200.
- O PATCH de deploy reaplica o healthcheck em `127.0.0.1:8788`; `localhost` no Alpine pode
  resolver para `::1`, enquanto o Bun escuta apenas IPv4.
- Para trabalho local em uma caixa instabox, use a fila compartilhada:

```sh
~/.local/bin/instabox-fila.sh add movestop '<comando>'
~/.local/bin/instabox-fila.sh list
```

## Secrets do GitHub Actions

| Secret | Uso |
|---|---|
| `COOLIFY_TOKEN` | API do Coolify (Bearer). Nunca vai para o repo. |
| `COOLIFY_APP_UUID` | `ddysqlw9mrchkehvf1qhfqyr` |

## Variáveis no Coolify

`NODE_ENV=production`, `PORT=8788`, `ALLOWED_ORIGINS=https://movestop.wired.rs`,
`TRUST_PROXY=1`, `MAX_ROOMS=200`.

`TRUST_PROXY=1` é seguro aqui porque a origem só aceita IPs da Cloudflare; o servidor prefere
`CF-Connecting-IP` e cai para o primeiro `X-Forwarded-For`. Sem isso, todos os jogadores atrás
do proxy compartilhariam o mesmo IP e o limite de 5 conexões viraria global.

## Deploy manual / rollback

Deploy normal: `git push origin main` (ou `workflow_dispatch` no GitHub Actions).

Rollback por tag:

```sh
TOK="<token-do-Coolify>"
UUID=ddysqlw9mrchkehvf1qhfqyr
SHA=<sha-anterior>
curl -X PATCH "https://coolify.wired.rs/api/v1/applications/$UUID" \
  -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d "{\"docker_registry_image_tag\":\"$SHA\"}"
curl -X POST "https://coolify.wired.rs/api/v1/deploy?uuid=$UUID&force=true" \
  -H "Authorization: Bearer $TOK"
```

Verificação:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://movestop.wired.rs/
curl -s https://movestop.wired.rs/healthz
```

## Fila de partida (jogo)

O modo online já tem fila de matchmaking: a primeira pessoa que entra em **Partida rápida** fica
em “Aguardando oponente”; a segunda entra na mesma sala. Quem chega depois abre outra sala e
aguarda o próximo oponente. “Criar sala” gera um código privado de 6 caracteres.
