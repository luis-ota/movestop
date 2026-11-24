# devpachi e RONIN TRAIL — dossiê de pesquisa

**Objeto:** criador @devpachi (Danny Park) e o jogo *Ronin Trail* (Steam app **1606970**)
**Data da coleta:** 23/11/2026
**Uso:** insumo para o playbook de lançamento de um jogo web voxel com mecânica de time-stop.

---

## 0. Método, fontes e limites (leia antes dos números)

- **TikTok bloqueou acesso direto** (WAF/Cloudflare challenge no perfil e nos vídeos). Os dados de perfil, contagem de views por vídeo, títulos e links vieram do **espelho de leitura** (`r.jina.ai`) sobre a página pública do perfil, mais snippets indexados do próprio TikTok (DuckDuckGo/Bing). Ou seja: são dados públicos, mas lidos por via indireta.
- **Datas de publicação** foram derivadas do **ID numérico do vídeo** do TikTok (o timestamp fica nos 32 bits altos do ID). O método é confiável ao nível de dia e foi validado contra datas conhecidas (ex.: o clipe do Kickstarter cai em 18/06/2022, dia do lançamento da campanha).
- **Views e likes são "como exibidos"** pela plataforma (ex.: `50.4K`), não contagens exatas. Likes por vídeo só existem para os poucos casos em que o snippet indexado trazia o par likes/views.
- **Números de wishlist e seguidores Steam** vêm de agregadores de terceiros (SteamData.AI, AppInsider) e são **estimativas**, não dados oficiais da Valve.
- O jogo **não foi lançado** até a data da coleta: a página está em "Coming soon / Early Access", sem reviews. Portanto **não existem dados de vendas** — qualquer "venda estimada" aqui é cenário aritmético, não medição.
- Nada neste relatório foi copiado de código do projeto; é pesquisa isolada.

---

## 1. Quem é devpachi

| Item | Dado | Fonte |
|---|---|---|
| Nome | Danny Park | Entrevista Unreal Engine (12/10/2022) |
| Base | McLean, Virgínia, EUA ("based in Virginia") | Unreal Engine / Kickstarter |
| Formação | Ciência da Computação, University of Michigan (à época da entrevista) | Unreal Engine |
| Credencial de nicho | praticante de **kendo**; anima stances a partir de kenjutsu real | GameGrin (20/07/2022) |
| Papel | solo dev de *Ronin Trail*: arte, animação, programação, SFX, publicação | Kickstarter |
| Engine/arte | Unreal Engine 4 + **MagicaVoxel** + Blender; áudio com FMOD/Audacity | Kickstarter / Unreal |
| Colaborador | **Zhao Shen** (trilha original, shakuhachi/koto/shamisen) | Kickstarter |
| Início | projeto começa por volta de 2020 (primeiros TikToks em **15/11/2020**) | TikTok |
| Antecedente | queria fazer um "MMORPG 3D" e migrou para cena voxel + samurai | Unreal Engine |

**Leitura curta:** não é "um dev de TikTok". É um dev solo tecnicamente forte, com uma **vantagem de autenticidade** (kendo real) e uma **vantagem estética** (voxel suave + depth of field + tilt-shift). O TikTok foi o canal que transformou essa estética em audiência antes de existir produto vendável.

---

## 2. Presença e números públicos por plataforma

Coleta em 23/11/2026, salvo indicado.

| Plataforma | Métrica | Valor | Natureza |
|---|---|---|---|
| TikTok @devpachi | Seguidores | **54,6 mil** (snippet indexado: 55,9 mil) | público |
| TikTok | Curtidas totais | **615,2 mil** (snippet: 613,3 mil) | público |
| TikTok | Bio | "Wishlist Ronin Trail on Steam now!" + link `bit.ly/RoninTrailSteam` | público |
| TikTok | Vídeos visíveis no perfil | **36** (nov/2020 → nov/2023) | público |
| TikTok | Views somadas dos 36 vídeos | **≈ 5,0 milhões** | cálculo próprio |
| TikTok | Média / mediana de views | **≈ 139 mil / ≈ 52,9 mil** | cálculo próprio |
| X/Twitter @devpachi | Seguidores | **≈ 24,5 mil** | públicos (Nitter/tweetlook) |
| X | Últimos posts visíveis | **nov/2024** | público |
| Instagram @devpachi | Seguidores / posts | **2.732 / 22** | público |
| YouTube @DevPachi | Trailer do Kickstarter | **29 mil views, 414 likes** | público |
| Discord "Rōnin Trail" | Membros / online | **1.503 / 284** | API pública de convite |
| Kickstarter | Arrecadado | **US$ 45.014** (meta US$ 15.000 = **300%**) | público |
| Kickstarter | Backers / ticket médio | **1.627 / US$ 27,67** | público |
| Steam | Wishlists | **≈ 87,0 mil** | **estimativa** SteamData.AI |
| Steam | Seguidores | **8,4 mil** (+33 na semana) | **estimativa** AppInsider |
| Steam | Reviews | **0** (não lançado) | público |

**Concentração:** 3 clipes (8% do acervo) somam **2,31 milhões de views = 46% de todas as views**. Isso não é um canal de alcance médio alto; é um canal de **três picos e cauda longa**.

---

## 3. Anatomia do conteúdo (formatos, edição, som, CTA)

### 3.1 Formato-base

- **Vertical 9:16**, captura de tela do jogo em close, câmera baixa e lenta, **sem rosto e sem narração**. O áudio é o som do próprio jogo ("original sound - devpachi" na maioria dos posts).
- **Duração curta.** No espelho do X os mesmos cortes aparecem com **0:12, 0:13, 0:15, 0:22, 0:34, 0:38**. No TikTok o padrão é a mesma faixa (10–30 s); é **inferência** a partir dos cortes espelhados, não medição direta.
- **Legenda queimada curta em inglês**, quase sempre funcional e não explicativa: "Combat Gameplay ⚔️", "BONFIRE LIT", "did i make this game too hard...". Não é closed caption do áudio — é **título de capa**.
- **Hashtags:** 5–7 por post, sempre o mesmo núcleo — `#gamedev #indiegame #indiedev #gaming #pcgaming #indiegames`, mais tags de ocasião (`#fyp`, `#screenshotsaturday`).
- **Edição:** corte seco, sem transição chamativa. O "efeito" é **de jogo**, não de edição: depth of field, tilt-shift, partículas, sangue interagindo com folhagem e água, câmera lenta em impactos.
- **Thumbnail/capa:** frame do próprio jogo, vertical, com a frase curta por cima. Nunca rosto, nunca seta vermelha, nunca "GAME OF THE YEAR?".
- **Música:** mistura de som original do jogo com **faixas licenciadas de terceiros** — Nujabes ("Counting Stars") e um cover de "Korok Forest" (Zelda) por daigoro789. Barato e eficaz; **juridicamente arriscado** (ver §8).
- **CTA:** praticamente só na **bio** ("Wishlist Ronin Trail on Steam now!") e em algumas legendas ("link in bio", "Follow my twitter for more updates and demo releases"). **Nunca** CTA falado, nunca CTA no meio do vídeo.

### 3.2 Frequência (a curva real)

| Período | Ritmo | Resultado |
|---|---|---|
| nov/2020 – abr/2021 | ~1 post a cada 3–5 dias | construção do canal; 25–40 mil views por post |
| abr/2021 | **pico** (1,4 M + 509,8 mil em dois dias) | canal vira "grande" no nicho |
| mai/2021 – jul/2022 | cai para ~1–2 posts/mês | views caem para 20–80 mil |
| jul/2022 | pico secundário durante o Kickstarter (402,3 mil) | caixa da campanha |
| ago/2022 – nov/2023 | quase silêncio | 1 post em nov/2023 (50,4 mil) |
| **dez/2023 – hoje** | **zero posts** | canal congelado há ~3 anos |

**Ponto central:** o canal não morreu por algoritmo. Morreu por **parada**. O último vídeo é de **22/11/2023**.

---

## 4. O que viralizou e por quê

### 4.1 Ranking real (views exibidas)

| # | Data | Views | Clipe | Mecânica do gancho |
|---|---|---|---|---|
| 1 | 08/04/2021 | **1,4 M** | "Chopping bamboo 🎋" | destruição física de bambu, som seco, ritmo de corte, zero contexto necessário |
| 2 | 07/04/2021 | **509,8 mil** | "Made some combat improvements" | troca de stance + impacto com peso; "skill flex" |
| 3 | 02/07/2022 | **402,3 mil** | "Algae bloom taking over the rice fields 🤢" | contraste nojento/bonito: água verde tomando a plantação |
| 4 | 07/12/2020 | **370,5 mil** | "Tilt shift effect…" | identidade visual "diorama/miniatura" — o post mais "compartilhável" |
| 5 | 29/08/2021 | **224,8 mil** | (sem título, só hashtags) | combate + estética, confiança total na imagem |
| 6 | 14/07/2022 | **223,5 mil** | "Added two-sword stances… 3 days left for the Kickstarter!!" | novidade mecânica + urgência de campanha |
| 7 | 29/08/2021 | **196,6 mil** | "New blood system that interacts with foliage and water" | proeza técnica + gore "bonito" |
| 8 | 09/03/2021 | **150,3 mil** | "Added caustics and other effects to the water" | água/caustics, ASMR visual |
| 9 | 08/02/2021 | **146,7 mil** | "Standoff with an enemy samurai" | tensão de duelo, cara a cara, "POV cinematográfico" |
| 10 | 29/04/2021 | **145,6 mil** | "More combat" | combate puro |
| 11 | 22/04/2021 | **105,2 mil** | "Some kenjutsu stances in my voxel samurai game" | autoridade (kendo) → comentário técnico |
| 12 | 03/01/2021 | **96,6 mil** | "Early multiplayer combat test" | promessa de PvP (nunca entregue) |

Referência de engajamento (pares likes/views colhidos em snippets indexados, em momentos diferentes):

- caustics: **23,6 mil likes / 150,3 mil views ≈ 15,7%**
- duelo multiplayer: **6.671 / 46,7 mil ≈ 14,3%**
- casa abandonada: **3.710 / 31 mil ≈ 12,0%**
- combate inicial: **4.883 / 42,8 mil ≈ 11,4%**
- sistema de interação: **2.387 / 24 mil ≈ 9,9%**
- agregado do perfil: **615,2 mil likes / 5,0 M views ≈ 12,3%**

Isso é **2–3× a taxa típica de like do TikTok** (~4–5%). Tradução: audiência **pequena e densa**, não audiência massiva e morna.

### 4.2 Por que esses clipes funcionaram (padrões, não sorte)

1. **A mecânica é o roteiro.** Nenhum clipe precisa de explicação. "Cortar bambu" é compreensível em 0,3 s em qualquer idioma — o critério mais importante para TikTok.
2. **Satisfação física.** Destruição, impacto, sangue na folhagem, caustics. O vídeo entrega **recompensa sensorial** antes de pedir qualquer coisa.
3. **Contraste de tom.** O mesmo jogo é "fofo" (voxel, tilt-shift, libélulas) e "brutal" (desmembramento). O contraste gera comentário ("é Ghost of Tsushima de voxel?").
4. **Proeza técnica visível.** "O sangue interage com a água" é um argumento de dev que o leigo entende como mágica. Funciona como prova de competência.
5. **Autoridade de nicho.** Stances de kenjutsu geram debate de praticantes — comentário de qualidade, que o algoritmo premia.
6. **Progressão de devlog sem narração.** A sequência "primeira cena → tilt-shift → combate → sangue → água → multiplayer" funciona como **série**, e série cria retorno.
7. **Anúncio dentro do clipe, não antes.** O pedido ("3 days left for the Kickstarter") aparece **depois** de entregar o valor. Nunca abriu com "apoie meu jogo".

### 4.3 O que **não** funcionou

- Posts de **processo sem gancho visual**: "evening stroll" (21,4 mil), "fishing creek" (29,6 mil), "day and night cycle" (26,2 mil).
- **Map-making / bastidores** no X: "making maps is a lot of work" = 12,5 mil views (vs. 85,1 mil de "gun to a knife fight").
- Qualquer coisa que exija **ler** para entender. O canal só performa quando a imagem resolve sozinha.

---

## 5. Da audiência ao dinheiro: o funil completo

Não existe atribuição pública. O que existe é **sequência temporal e coerência de funil**:

```
TikTok (5,0 M views, 54,6 mil seguidores)
   └─ bio: bit.ly/RoninTrailSteam  ─────────────►  Steam wishlist (≈87 mil, estimativa)
   └─ "link in bio" / "3 days left" ────────────►  Kickstarter (US$ 45.014, 1.627 backers)
   └─ "Demos and discord on my patreon" ────────►  Patreon / Discord (1.503 membros)
   └─ X/Twitter (24,5 mil) ─────────────────────►  devlog, GIFs, demo
        └─ Reddit (r/gaming: 20.266 upvotes; r/IndieGaming: 875) ──► pico da campanha
```

### Linha do tempo do funil

| Data | Evento | Efeito |
|---|---|---|
| 15/11/2020 | primeiros TikToks | 25–31 mil views/post |
| 07/12/2020 | tilt-shift viraliza (370,5 mil) | define a identidade visual do jogo |
| 08/04/2021 | **1,4 M** (bambu) + 509,8 mil | audiência construída **14 meses antes** de pedir dinheiro |
| 18/06/2022 | **Kickstarter aberto** (meta US$ 15 mil) | demo do tutorial liberada **só para backers** (update #1) |
| 22/06/2022 | post no r/gaming | **20.266 upvotes, 471 comentários** |
| 02–14/07/2022 | clipes de reta final (402,3 mil e 223,5 mil) | caixa da campanha |
| ~18/07/2022 | campanha fecha | **US$ 45.014 / 1.627 backers / 300%** |
| 18/06/2022 → 2023 | stretch goals | US$ 30 mil (vila de bambu) e US$ 40 mil (pets) desbloqueados; **US$ 50 mil (tinturaria + controller) NÃO** |
| 12/2023 | app de **Playtest** na Steam (2741810) | pico de 2 jogadores simultâneos; depois 0 |
| 22/11/2023 | **último TikTok** | fim da aquisição orgânica |
| 28/11/2023 | devlog: "ainda em desenvolvimento" | — |
| 03/12/2024 | Kickstarter update #10: **lançamento em meados/fim de maio de 2025** | expectativa pública criada |
| 21/01/2025 | 80.lv publica "Early Access em maio" | imprensa ecoa a data |
| **27/02/2025** | **demo pública na Steam** (app 2059610, grátis, só Windows) | cai na janela do **Steam Next Fest (24/02–03/03/2025)** — participação no evento não confirmada |
| 30/05/2025 | Kickstarter update #11: **atraso + burnout**; build pré-release enviada a backers "Player"+ | data perdida |
| 23/11/2026 | página segue "Coming soon", 0 reviews, ~87 mil wishlists | **estoque de desejo parado** |

### O que ele fez bem no funil

1. **Pediu depois de dar.** 14 meses de valor antes do primeiro pedido.
2. **Um destino só.** Toda CTA ia para o mesmo lugar (Steam wishlist / Kickstarter), com link curto `bit.ly`.
3. **Demo como moeda.** No Kickstarter, a demo era recompensa de **US$ 1** — barreira mínima para transformar espectador em cadastro.
4. **Comunidade fora da rede social.** Discord com 1.503 membros é ativo que o algoritmo não leva.
5. **Imprensa de nicho.** Unreal Engine, 80.lv, GameGrin, GamingOnLinux — cobertura desproporcional ao tamanho do estúdio, porque a estética é "printable".

### O que ele fez mal no funil

1. **Nenhuma captura de e-mail.** Toda a audiência mora em plataformas de terceiros.
2. **Zero comunicação de 2024 a 2026 no TikTok.** Quando voltou a falar (dez/2024, e só no X), a audiência do vídeo curto já tinha esfriado.
3. **Duas datas públicas perdidas** (Q4/2023 no presskit; maio/2025 no Kickstarter).
4. **Atrito na demo:** a demo é **restrita na Alemanha** e há relatos na Steam Community de "diz que tem demo, mas não tem demo" (ago/2025) — o ativo mais importante do funil ficou invisível para parte do público.
5. **Wishlists sem evento de conversão.** ~87 mil wishlists paradas envelhecem: a conversão por wishlist caiu de 0,45 para **0,22 cópias no primeiro mês** entre lançamentos de 2020–22 e 2023–25 (Zukowski, out/2026).

---

## 6. Diagnóstico: por que o caso é ao mesmo tempo inspirador e um alerta

**Inspirador:** um dev solo, sem publisher, sem verba, construiu 5 milhões de views, 87 mil wishlists e US$ 45 mil de crowdfunding **antes do lançamento**, com uma pilha de clipes de 30 segundos e uma estética própria.

**Alerta:** três anos depois do último vídeo, o jogo ainda não saiu, a página não tem uma review, e a comunidade pergunta "o jogo morreu?" (r/ronintrail, mar/2026). A audiência foi construída, mas **não foi convertida em produto** — e audiência parada apodrece.

A lição central não é "faça TikTok". É: **TikTok compra atenção; só o lançamento compra receita.** O intervalo entre uma coisa e outra é onde projetos morrem.

---

## 7. Playbook replicável — jogo web voxel com time-stop

Contexto diferente do caso original: **jogo web** pode converter direto ("jogue agora"), sem passar por wishlist. Isso muda a estratégia: o TikTok deixa de ser "aquisição de wishlist" e passa a ser **aquisição de sessão jogada**. Wishlist/Steam entram depois, como segundo andar.

### 7.1 Posicionamento em uma frase

> "Um jogo de ação voxel onde você **para o tempo**, desenha a sequência de golpes no ar e solta tudo de uma vez."

A mecânica de time-stop é o melhor ativo de conteúdo possível, porque ela é **visual, explicável em 1 segundo e gera pergunta** ("como assim ele planejou tudo?"). Explore isso até cansar.

### 7.2 10 formatos de clipe prontos para gravar

Todos verticais 9:16, 8–25 s, som do jogo em primeiro plano, sem narração. Legenda queimada de 3–6 palavras.

| # | Formato | Estrutura beat-by-beat | Duração | Por que funciona |
|---|---|---|---|---|
| 1 | **O freeze e a cadeia** | 0–1 s: ação já em curso → 1 s: tempo congela (som corta, só heartbeat) → 2–4 s: 3 linhas de trajetória aparecem → 4–6 s: solta, 4 inimigos caem em 1,2 s | 10–12 s | É o "chopping bamboo" da sua mecânica: satisfação pura, zero contexto |
| 2 | **POV: você é a flecha** | câmera presa ao projétil congelado no ar; orbita em volta dele; volta ao normal e ele acerta o alvo | 8–10 s | novidade de câmera = compartilhamento |
| 3 | **1 segundo congelado = 8 segundos de plano** | split-screen: à esquerda o plano parado com marcações, à direita a execução em tempo real | 12–15 s | ensina a mecânica e faz o cérebro "clicar" |
| 4 | **Quanto tempo você consegue parar?** | barra de recurso enchendo, tentativa de 1 s → 2 s → 3 s → falha cômica | 15–20 s | formato de desafio, convida comentário ("eu cheguei a 2,4 s") |
| 5 | **Speedrun de sala em 3 congelamentos** | timer no canto, contagem de freezes, "3/3", tela de tempo | 20–25 s | retenção até o fim (o número só aparece no final) |
| 6 | **O inimigo que aprende seu padrão** | ele repete o mesmo truque 2× e funciona; na 3ª o inimigo "lembra" e bloqueia | 15–20 s | narrativa em 3 atos dentro de 20 s; gera raiva boa |
| 7 | **Antes / depois do shader** | 3 estágios: blocos crus → iluminação → tilt-shift + DOF | 10–12 s | o formato "progression" é o mais replicado em gamedev (ver Mortal Rite) |
| 8 | **Reagi ao meu próprio nível ser quebrado** | gravação de um jogador quebrando o puzzle + sua reação em picture-in-picture | 20–30 s | rosto/voz humana aumenta retenção; prova social |
| 9 | **Tempo parado, som não** | congela o vídeo, mas o áudio continua (vento, cigarra, heartbeat); 6–8 s só disso | 6–8 s | ASMR de game audio; barato e altamente salvável |
| 10 | **"Isso é trapaça ou é o jogo?"** | jogador usa o freeze para "quebrar" uma regra aparente (atravessar parede, matar chefe em 1 golpe) | 12–18 s | clickbait honesto: a resposta está no próprio clipe |

**Bônus de catálogo:** para cada formato, grave **3 variações** (mesma estrutura, nível diferente). O algoritmo testa o mesmo esqueleto com públicos diferentes; você reaproveita 70% do trabalho.

### 7.3 5 hooks de texto (PT + EN)

O público de gamedev/devlog no TikTok é majoritariamente anglófono. Publique em inglês e use o PT para as outras redes.

1. **PT:** "Parei o tempo por 3 segundos. Deu pra matar cinco."
   **EN:** "I froze time for 3 seconds. Killed five of them."
2. **PT:** "O jogo te dá 1 segundo. Você tem que usar 8."
   **EN:** "The game gives you 1 second. You have to make it last 8."
3. **PT:** "Isso é trapaça ou é a mecânica?"
   **EN:** "Is this cheating, or is it the mechanic?"
4. **PT:** "Ninguém faz voxel assim. Então eu fiz."
   **EN:** "Nobody makes voxel look like this. So I did."
5. **PT:** "Errar aqui é quase impossível — se você parar o tempo."
   **EN:** "It's almost impossible to miss here — if you stop time."

Regra dos hooks: **máximo 5 palavras na tela**, verbo no passado ou pergunta. Nunca "confira meu jogo", nunca "link na bio" no primeiro frame.

### 7.4 Calendário de 30 dias

Cadência: **1 clipe/dia** (30 no total) + 2–3 stories/dia + 1 vídeo longo por semana (YouTube Shorts/TikTok longo) + cross-post em X, Instagram Reels e Reddit (1×/semana, com ângulo diferente).

| Semana | Foco | Seg | Ter | Qua | Qui | Sex | Sáb | Dom |
|---|---|---|---|---|---|---|---|---|
| **1 — Fundação** | provar que o loop é bom | #1 O freeze e a cadeia | #2 POV flecha | #3 1s=8s | #8 reação (1ª) | #9 tempo parado, som não | #6 inimigo aprende | #4 desafio de tempo |
| **2 — Mecânica** | ensinar o sistema | #5 speedrun | #10 trapaça? | #1 variação B | #3 variação B | #6 variação B | #7 antes/depois | #2 variação B |
| **3 — Prova social** | trazer o "outro" | #8 reação (2ª) | clipe de comentário respondido | #4 variação B | #10 variação B | #5 variação B | compilado da semana | #9 variação B |
| **4 — Conversão** | pedir | #7 variação B | anúncio de playtest aberto | #1 variação C | #8 reação (3ª) | **lançamento/atualização grande** | clipe de lançamento | bastidores + próximo passo |

Marcos de conversão dentro dos 30 dias:

- **Dia 1:** bio com um destino único + link com UTM (`?utm=tiktok`). Sem isso, você não mede nada.
- **Dia 7:** primeira CTA explícita ("joga no navegador, sem download") em 1 de 7 posts.
- **Dia 15:** abre **playtest fechado** por link (não por convite manual) e pede e-mail dentro do jogo.
- **Dia 22:** responde publicamente os 3 melhores comentários com clipes.
- **Dia 30:** "lançamento" ou atualização com data curta (≤7 dias). Data curta é compromisso; data longa é promessa.

### 7.5 Métricas e metas (com matemática explícita)

**Por clipe (medir todo dia, planilha de 30 linhas):**

| Métrica | Piso aceitável | Bom | Excelente |
|---|---|---|---|
| Retenção em 3 s | > 55% | > 70% | > 80% |
| Tempo médio assistido | > 60% | > 80% | > 95% |
| Conclusão (watch full) | > 25% | > 40% | > 55% |
| Shares+saves por 1.000 views | > 5 | > 15 | > 30 |
| Comentários por 1.000 views | > 3 | > 8 | > 15 |
| Cliques no link / views | 0,3% | 1% | 2% |

**Por funil (30 dias):**

| Etapa | Pessimista | Base | Otimista |
|---|---|---|---|
| Views totais | 100 mil | 500 mil | 2 M |
| Seguidores ganhos | 500 | 2.500 | 10 mil |
| Cliques no link (1% / 2%) | 1.000 | 5.000–10.000 | 20.000–40.000 |
| Sessões jogadas (30–50% do clique) | 300 | 2.000–5.000 | 8.000–16.000 |
| Wishlists Steam (se houver página) | 100 | 500–1.000 | 3.000 |

**Referência externa para calibrar (não é meta, é teto):** o case *Mortal Rite* reportou **126,1 M de views no TikTok → 61.749 wishlists** — cerca de **1 wishlist por 2.000 views (0,05%)**. O *Ronin Trail* chegou a **≈87 mil wishlists com ≈5 M de views** (≈1 por 57 views), mas isso inclui Reddit, imprensa e Kickstarter — ou seja, **view de TikTok não é a variável; página e oferta são**.

**Conversão wishlist → venda (benchmarks 2026, para não se enganar):**

| Janela | Vendas por wishlist | Fonte |
|---|---|---|
| 1º mês, lançamentos 2023–25 | **0,22×** | Zukowski, 160 jogos |
| 1º mês, lançamentos 2020–22 | 0,45× | Zukowski |
| 1ª semana, 25 mil+ wishlists | 0,15× (0,10× acima de US$ 10) | GameDiscoverCo, out/2025 |

Exemplo aritmético (não previsão): 87 mil wishlists × 0,22 ≈ **19 mil cópias no 1º mês**; a US$ 20, ≈ **US$ 380 mil brutos** antes de taxa de plataforma, impostos e reembolsos. É o tamanho do bolo que o *Ronin Trail* deixou na mesa ao não lançar.

### 7.6 Ativos mínimos antes do dia 1

- [ ] Página de jogo jogável em **< 3 s no celular** (o tráfego do TikTok é mobile).
- [ ] **Sem download, sem login** para a primeira partida (login só para salvar).
- [ ] Um **loop de 20 s** que caiba inteiro em um clipe: freeze → plano → execução → recompensa.
- [ ] Botão "jogar de novo" com variação (novo nível/puzzle) para reter a sessão.
- [ ] **Captura de e-mail** dentro do jogo, com promessa clara ("aviso quando sair nível novo").
- [ ] Link com **UTM por rede** e um painel simples de cliques → sessões → retenção D1.
- [ ] Steam page criada **no dia 1** (mesmo sem demo), porque wishlist acumulada envelhece melhor que seguidor de rede social.
- [ ] Discord aberto **desde o primeiro clipe** (o *Ronin Trail* levou 1.503 pessoas para um servidor sem jogo lançado — isso é replicável).

---

## 8. Análise crítica — o que **não** copiar

1. **Não anuncie data antes de ter build jogável.** O *Ronin Trail* prometeu Q4/2023 (presskit) e maio/2025 (Kickstarter). Duas promessas quebradas custam mais que qualquer campanha de marketing.
2. **Não pare de postar.** Três anos de silêncio destruíram o ativo. Se for parar, avise e deixe um canal alternativo (e-mail/Discord) segurando a audiência.
3. **Não dependa só de som licenciado.** Nujabes e cover de Zelda funcionam até o dia em que o áudio é mutado ou o vídeo derrubado. Grave sempre uma versão com som original do jogo.
4. **Não esconda o dev para sempre.** 54 mil seguidores seguiam *um jogo*, não *uma pessoa*. Sem rosto/voz, não há vínculo para sustentar atraso. Um rosto por semana já muda a equação.
5. **Não use "é difícil demais?" como posicionamento central.** O clipe de dificuldade rendeu 50,4 mil views — 28× menos que o bambu. Dificuldade afasta o público casual que compra jogo bonito de voxel.
6. **Não abra escopo.** O jogo anunciou mundo aberto, sobrevivência, pesca, insetos, crafting, dojos, PvP multiplayer, pets e tinturaria — solo. O resultado está documentado: burnout declarado no update #11.
7. **Não empilhe recursos condicionais.** O stretch goal de US$ 50 mil (tinturaria + suporte total a controle) **não foi atingido**; a feature foi anunciada como "prioridade se bater a meta". Isso gera expectativa ambígua em 1.627 backers.
8. **Cuidado com gore em plataforma de conteúdo.** Sangue/desmembramento é o que fez 196 mil views, mas é exatamente o tipo de conteúdo que recebe **restrição de idade** — e conteúdo restrito circula menos. Não foi possível confirmar restrição nos posts do criador; trate como **risco plausível de distribuição**, não como fato observado.
9. **Não confunda views com demanda.** 5 M de views e 87 mil wishlists não impediram "o jogo morreu?" no subreddit. A pergunta que importa não é "quantas views", é "quantas sessões jogadas nesta semana".
10. **Não copie o "silêncio bonito".** A ausência de legenda falada e de CTA explícito funcionou em 2021, com menos concorrência. Em 2026, com dezenas de milhares de devlogs por mês, o clipe precisa de **hook verbal ou texto na tela** além da estética.

**Saturação:** o nicho "voxel + samurai + estética bonita" hoje está cheio (o próprio *Ronin Trail* virou referência citada em dezenas de vídeos e páginas de agregadores). Time-stop é uma vantagem: é **mecânica**, não tema — mecânica é mais difícil de imitar do que paleta de cor.

---

## 9. Fontes

**Primárias (criador / campanha)**
- TikTok @devpachi (perfil e vídeos, leitura via espelho): https://www.tiktok.com/@devpachi
- Kickstarter *Rōnin Trail*: https://www.kickstarter.com/projects/ronintrail/ronin-trail
- Kickstarter — updates (inclui #10, data de maio/2025 em 03/12/2024, e #11, atraso + burnout em 30/05/2025): https://www.kickstarter.com/projects/ronintrail/ronin-trail/posts
- Site oficial: https://www.ronintrail.net/ · Presskit: https://www.ronintrail.net/presskit · Devlog: https://www.ronintrail.net/devlog
- X/Twitter @devpachi (espelhos): https://nitter.rdrama.net/devpachi · https://tweetlook.com/devpachi
- YouTube (trailer do Kickstarter): https://www.youtube.com/watch?v=M9F7ilYW62E
- Reddit r/gaming (20.266 upvotes): https://www.reddit.com/r/gaming/comments/viht62/
- Reddit r/IndieGaming (875 pontos): https://www.reddit.com/r/IndieGaming/comments/vfkhg9/
- Reddit r/ronintrail ("Where is Ronin Trail?"): https://www.reddit.com/r/ronintrail/comments/z1i9df/

**Steam / dados**
- Steam store (app 1606970): https://store.steampowered.com/app/1606970/Ronin_Trail/
- Steam Community (relatos sobre demo/controles): https://steamcommunity.com/app/1606970
- SteamDB — demo (app 2059610, 27/02/2025, restrita na DE): https://steamdb.info/app/2059610/info/
- SteamBase — playtest (app 2741810): https://steambase.io/games/ronin-trail-playtest/steam-charts
- SteamData.AI (wishlists ≈ 86,99 mil — estimativa): https://steamdata.ai/game/1606970/ronin-trail
- AppInsider (seguidores 8,4 mil — estimativa): https://appinsider.io/steam/game/1606970-ronin-trail
- BackerTracker: https://www.backerkit.com/projects/ronintrail/ronin-trail

**Imprensa e entrevistas**
- Unreal Engine — entrevista com Danny Park (12/10/2022): https://www.unrealengine.com/developer-interviews/ronin-trail-is-a-voxel-based-open-world-game
- GameGrin — entrevista (20/07/2022): https://www.gamegrin.com/articles/developer-interview-ronin-trail/
- 80.lv (21/01/2025): https://80.lv/articles/experience-the-life-of-a-samurai-in-peaceful-era-in-this-upcoming-indie-game
- GamingOnLinux — Steam Next Fest fev/2025 (24/02–03/03): https://www.gamingonlinux.com/2025/02/steam-next-fest-february-2025-is-live-with-tons-of-demos/

**Benchmarks de marketing (para o playbook)**
- GameDiscoverCo — case Mortal Rite (126 M views → 61.749 wishlists): https://newsletter.gamediscover.co/p/this-game-used-tiktok-to-get-120m
- Game Developer — case Sword of Symphony: https://www.gamedeveloper.com/design/behind-the-smash-tiktok-sensation-sword-of-symphony
- Zukowski / wishlist inflation (out/2026), resumo: https://gamedevreports.substack.com/p/how-to-market-a-game-steam-wishlists
- GameDiscoverCo / conversão 1ª semana (out/2025), compilado: https://rocketbrush.com/blog/steam-wishlist-conversion-rate

---

## 10. Resumo executivo (8 linhas)

1. devpachi (Danny Park) é um dev solo de Virgínia, praticante de kendo, que construiu *Ronin Trail* em Unreal 4 com voxel + tilt-shift e uma trilha original de Zhao Shen.
2. No TikTok fez **54,6 mil seguidores, 615,2 mil likes e ~5,0 M de views em 36 vídeos** (nov/2020–nov/2023), com pico em abr/2021: um clipe de cortar bambu passou de **1,4 M** de views.
3. O formato vencedor é rígido e replicável: vertical, 10–30 s, **sem rosto e sem voz**, som do jogo, legenda queimada de 3–6 palavras, 5–7 hashtags fixas, CTA só na bio.
4. Viralizaram **mecânica destrutiva** (bambu, 1,4 M), **contato/impacto** (combate, 509,8 mil), **estranheza bonita** (algae bloom, 402,3 mil) e **identidade visual** (tilt-shift, 370,5 mil); posts de processo sem gancho ficaram em 20–30 mil.
5. Monetização: **Kickstarter de US$ 45.014 com 1.627 backers (300% da meta)**, demo como recompensa de US$ 1, Discord com **1.503 membros**, **~87 mil wishlists** na Steam (estimativa) e demo pública em 27/02/2025.
6. O funil quebrou no fim: duas datas prometidas e perdidas (Q4/2023 e maio/2025), **zero posts no TikTok desde nov/2023**, atraso admitido com burnout em 30/05/2025 — e o jogo segue "Coming soon", com 0 reviews, em nov/2026.
7. Para um jogo web voxel de time-stop, o playbook é: 10 formatos de clipe centrados no freeze (freeze→plano→execução), 5 hooks de ≤5 palavras, 30 clipes em 30 dias, CTA única com UTM e playtest aberto no dia 15.
8. Metas realistas por 30 dias: 500 mil views, 2,5 mil seguidores, 5–10 mil cliques, 2–5 mil sessões jogadas; e lembre que **1 wishlist hoje vale ~0,22 venda no 1º mês** — atenção sem lançamento é estoque parado, não receita.
