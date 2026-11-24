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

- `.github/workflows/ci.yml` roda em PR/manual: install, `bun test`, build e checagem do servidor.
- `.github/workflows/deploy.yml` roda em push na `main`: repete testes/build, publica a imagem
  `linux/amd64` no GHCR, aponta a tag do SHA no Coolify, dispara o deploy e verifica
  `https://movestop.wired.rs/healthz` + a home real.
- **Todos os jobs usam `runs-on: instabox-medium`.** Nada de `ubuntu-latest`.
- `concurrency: movestop-instabox` com `cancel-in-progress: false`: duas execuções do MOVESTOP
  entram em fila, não se matam. Se o slot único do instabox estiver ocupado por outro projeto,
  o próprio serviço deixa o job em espera; não apague a caixa de outro projeto.
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
TOK=$(cat /home/luis/backups/aither-20261110-1920/meta/coolify-token)
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
