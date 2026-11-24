# RONIN TRAIL — Dossiê de referência

**Status da pesquisa:** 23/11/2026
**Objeto:** *Ronin Trail* (Steam App **1606970**), de Danny Park (**@devpachi**)
**Uso:** referência de direção de arte, câmera, combate e game feel para um shooter top-down voxel em que o tempo só avança quando o jogador se move.

---

## Como ler este dossiê (importante)

Este jogo **não está lançado**. A página da Steam ainda mostra “Coming soon”, não há nota de usuários e o app principal nunca foi vendido. Portanto:

- **Não existe “nota e número de reviews”** para o jogo completo. A Steam exibe literalmente “No user reviews” ([store](https://store.steampowered.com/app/1606970/Ronin_Trail/)).
- A maior parte da análise vem de **duas demos** (uma para backers em 2022, outra pública em 28/02/2025), de **vídeos de gameplay**, das **entrevistas oficiais** e do **devlog do próprio autor**. Onde é leitura minha de imagem/vídeo, está marcado como **estimativa** ou **observado**.
- **Ronin Trail não é roguelike, não tem ondas e não é shooter.** É um RPG de ação 3D em mundo aberto, com câmera alta de terceira pessoa, combate de katana letal e elementos de sobrevivência/extração. As lições da seção 9 são **adaptações** para o nosso jogo, não mecânicas copiadas.
- A regra “o tempo só anda quando o jogador se move” é **do nosso projeto**, não do Ronin Trail. Não atribuo essa mecânica ao jogo em nenhum momento.

---

## 0. Resumo executivo

*Ronin Trail* é o projeto solo de um desenvolvedor que, à época, estudava ciência da computação e virou fenômeno de wishlist em 2022: um samurai voxel em um Japão feudal pós-guerra, visto de cima, com campos de arroz ao vento, névoa volumétrica, profundidade de campo de tilt-shift e um combate em que **dois ou três golpes matam**. A imagem vende “Ghost of Tsushima em voxel”; o sistema por baixo é mais estranho e mais interessante: **movimento pesado, katana com trajetória livre, posturas, parry por timing, desmembramento, sangue que mancha o cenário e se dilui na água**, mais sobrevivência (fome, frio, pesca, cogumelos) e, a partir de 2024, um modo de **extração** à la Tarkov.

O que ele ensina de mais valioso para nós não é o tema samurai. É a **economia de meios**: câmera alta + silhuetas minúsculas + paleta dessaturada + um único acento de violência (sangue) + HUD quase invisível. É um jogo que parece caro com pouquíssimos assets e truques baratos (vertex shader para cortar grama, decal de sangue, névoa). E é também um alerta: **mais de quatro anos de desenvolvimento, pivô de gênero, demo indisponível, silêncio e burnout**. A lição de escopo e de comunicação vale tanto quanto a de arte.

---

## 1. Ficha técnica

| Campo | Dado | Fonte / status |
|---|---|---|
| Nome | *Ronin Trail* (estilizado *Rōnin Trail*) | Steam |
| Dev / publisher | **devpachi** — Danny Park, solo | [Steam](https://store.steampowered.com/app/1606970/Ronin_Trail/), [entrevista Unreal](https://www.unrealengine.com/developer-interviews/ronin-trail-is-a-voxel-based-open-world-game) |
| Compositor | **Zhao Shen** (StormSound) | [entrevista Unreal](https://www.unrealengine.com/developer-interviews/ronin-trail-is-a-voxel-based-open-world-game), [SoundCloud](https://soundcloud.com/stormsound) |
| Engine | **Unreal Engine 4** (confirmado em 2022); FMOD; Steamworks | Entrevista Unreal 2022; SteamDB detecta Unreal Engine no demo |
| Migração para UE5 | **Não confirmado** | — |
| Gênero | RPG de ação 3D / aventura em mundo aberto, com sobrevivência e extração | Steam + devlog |
| Tags Steam (oficiais) | Action, Adventure, Indie, RPG, Early Access | Steam |
| Tags de usuário | Exploration, **Souls-like**, **Voxel**, PvP, Nature, **Swordplay**, Hack and Slash, Open World, Multiplayer, Historical, Hunting, Character Customization, Relaxing, Realistic, Immersive Sim | Steam |
| Preço | **Não anunciado**; loja sem preço. O dev afirma que o preço não mudará entre EA e 1.0 | Steam |
| Lançamento | Anunciado para **maio/2025**; **atrasado**. Em 23/11/2026 a loja segue “Coming soon” | [Kickstarter update 31/05/2025](https://www.kickstarter.com/projects/ronintrail/ronin-trail/posts/4398515), Steam |
| Demo pública | **28/02/2025**, app **2059610**; hoje usuários relatam que não baixa mais, embora a loja ainda exiba “Demo Available” | [SteamDB](https://steamdb.info/app/2059610/), [fórum Steam](https://steamcommunity.com/app/1606970/discussions/) |
| Reviews | **Nenhuma** (“No user reviews”); sem nota, sem Metacritic | Steam |
| Wishlists | **~84,1 mil** (estimativa de terceiro, SteamData.ai); ~8,3 mil seguidores | [SteamData.ai](https://steamdata.ai/en-US/game/1606970/ronin-trail) — estimativa |
| Duração | Jogo completo: **desconhecida**. Demo: **~20–45 min** para o conteúdo disponível (estimativa a partir de vídeos de 11–18 min que terminam no fim da demo) | observação |
| Plataformas | **Windows/Steam**. Mac e Linux aparecem em agregadores, mas a API da Steam marca só Windows | Steam API |
| Steam Deck | **Não confirmado** | — |
| Classificação | Violência frequente/gore, conteúdo adulto | SteamDB |
| Kickstarter | **US$ 45.014** de meta US$ 15.000 (300%), **1.627 backers**, pledge médio US$ 27,67 | [BackerKit](https://www.backerkit.com/projects/ronintrail/ronin-trail) |
| Stretch goals | US$ 30 mil: floresta de bambu (atingido); US$ 50 mil: sistema de tinturas (não atingido, mas a loja atual já anuncia tinturas) | [Denfaminico](https://news.denfaminicogamer.jp/news/220620g), Steam |
| Equipe | Solo (arte, código, level design, animação), com compositor externo; backers acima de certo tier receberam builds | devlog + Kickstarter |

### Cronologia curta

- **18/06/2022** — Kickstarter; arrecada 300% da meta.
- **2022** — demo para backers; entrevistas na Unreal e na GameGrin; vira post viral no r/gaming (~20 mil pontos).
- **2023** — devlogs semanais: duelo, posturas, mapa, clima, inventário, multiplayer por invasão.
- **02/02/2024** — **pivô para “extraction gamemode”** (Tarkov/Zero Sievert), com loot variável e atributos aleatórios de espada ([devlog](https://devpachi.wordpress.com/2024/02/02/2-2-24-changelog/)).
- **28/02/2025** — demo pública na Steam (Next Fest).
- **31/05/2025** — dev adia o lançamento, cita burnout e manda build pré-release para backers.
- **2025–2026** — sem update público; fóruns com “Dead end?”, “Proof of life”, “will the game come out?”.

---

## 2. Câmera, movimentação e combate

### 2.1 Câmera

- **Terceira pessoa em ângulo alto**, com perspectiva (não é isométrica ortográfica). Não há primeira pessoa. Pelas screenshots, a inclinação parece **~50–60°** em relação ao chão — **estimativa**.
- O personagem é **minúsculo no quadro**: em 1920×1080, o corpo ocupa algo como **90–120 px** de altura. A leitura vem da silhueta (chapéu redondo + linha da espada), não do detalhe.
- **Mouse livre**: o personagem olha para onde o cursor está; WASD move em relação à câmera. O dev experimentou rotação com o botão do meio e zoom com a roda em dezembro/2023 (“scroll wheel to zoom in while pressing middle mouse… middle mouse camera rotation”, [devlog](https://devpachi.wordpress.com/2023/12/07/12-8-23/)); no demo, porém, um jogador não conseguiu usar o botão do meio — **comportamento final não confirmado**.
- A câmera alta cria **claustrofobia** — o próprio dev diz que reativou o mini-mapa para combater isso ([devlog 11/01/2024](https://devpachi.wordpress.com/2024/01/11/1-11-24/)).
- **Profundidade de campo agressiva** (tilt-shift): o primeiro plano de grama e o fundo desfocam, deixando uma faixa nítida ao redor do personagem. É a assinatura visual e também a principal crítica técnica (ver §8). Em 2022, um jogador do ResetEra reclamou que “o filtro de blur para terreno distante ou próximo pode ser um pouco demais”.

### 2.2 Movimentação

- **WASD**, corrida com Shift, **dash/dodge com Espaço**, agachar com C; **não há salto no build da demo** (confirmado em vídeo: “you can’t jump”).
- Movimento **lento, pesado e metódico**, com aceleração e parada visíveis; a comparação de um jogador foi “pleasantly measured and stiff, like Darkwood’s”.
- **Natação** existe, mas gasta stamina e o personagem **morre afogado** quando ela acaba ([devlog 02/02/2024](https://devpachi.wordpress.com/2024/02/02/2-2-24-changelog/)). Não há escalada no build da demo (observado; não confirmado no build atual).
- Roupas, cabelo e bainha têm física secundária; a espada balança na cintura ao correr. Isso é parte do “game feel” tanto quanto o combate.

### 2.3 Kit de combate (demo de 2022 e build de 2025)

| Entrada | Ação |
|---|---|
| LMB | Ataque com a espada; segurar mantém o golpe carregado |
| RMB | Bloqueio; bloquear no timing certo = **parry** |
| RMB + LMB | **Empurrão** (push), quebra a guarda |
| LMB com espada embainhada | Postura de saque (draw stance); soltar = ataque rápido |
| Soltar LMB durante o dash | **Ataque de dash** (o favorito dos jogadores) |
| T (segurar) | Embainhar/desembainhar com animação especial |
| V / B | Trocar de **postura** (High, Middle etc.) |
| C | Agachar (stealth; dano extra em inimigo desprevenido) |
| Q | Gritar (gera ruído, atrai inimigos) |
| E / R | Itens rápidos |
| Tab | Inventário |

(Fonte dos controles: post do ResetEra com o demo de 2022, [link](https://www.resetera.com/threads/ronin-trail-kickstarter-play-a-wandering-ronin-in-edo-period-japan.597603/); o build de 2025 mantém a lógica, com prompts “press [space] to dodge” e “hold RMB + click LMB = push”.)

**Como o combate funciona de verdade:**

- **Letalidade assimétrica**: “você pode matar os inimigos tão rápido quanto eles podem te matar”. O dev queria lutas decididas em segundos, não sponges de HP ([entrevista Unreal](https://www.unrealengine.com/developer-interviews/ronin-trail-is-a-voxel-based-open-world-game)).
- **Exposure multiplier**: dano recebido é multiplicado por exposição; por isso **um erro = one-shot** em muitos casos. O próprio dev admite que isso fez playtesters desistirem da demo ([devlog 08/12/2023](https://devpachi.wordpress.com/2023/12/07/12-8-23/)).
- **Stamina** governa ataque e bloqueio; atacar ou aparar sem stamina te deixa aberto.
- **Parry**: bloqueio com timing abre o inimigo; há uma janela curta e o feedback é visual/auditivo (faísca e som metálico).
- **Trajetória livre**: ao golpear, você pode girar e mover o corpo, controlando o arco da espada — golpes curtos e controlados ou varridos amplos. Isso é raro e é o coração do “feel” ([GameGrin](https://www.gamegrin.com/articles/developer-interview-ronin-trail/)).
- **Posturas** mudam o moveset e servem para combos/adaptação; são aprendidas permanentemente e algumas vêm de bosses.
- **Duas espadas**: katana longa (alcance, pode bater em obstáculos) e wakizashi curta (curta distância/stealth).
- **Inimigos “inteligentes”**: antecipam seu ataque e bloqueiam; trocam de postura; **podem aparar ataques telegrafados**; arqueiros mantêm distância.
- **Projéteis**: flechas **não podem ser bloqueadas**, mas, segundo o tutorial in-game, podem ser **defletidas com um ataque** (observado em vídeo). Mosquetes existem, com dano alto, movimento limitado e recarga longa; bombas de papel causam AoE e **desligam a audição temporariamente com zumbido** ([devlog 20/10/2023](https://devpachi.wordpress.com/2023/10/19/10-20-23/), [27/10/2023](https://devpachi.wordpress.com/2023/10/27/10-27-23/)).

### 2.4 Inimigos e comportamentos

- **Bandidos/ronin** com espada: patrulham, sacam a espada ao detectar, circulam, telegrafam, bloqueiam e trocam de postura.
- **Arqueiros**: ficam atrás, atiram flechas (não bloqueáveis, mas defletíveis); o tutorial de mapa chega a usar uma árvore cheia de flechas e cadáveres como aviso ambiental ([devlog 13/10/2023](https://devpachi.wordpress.com/2023/10/13/10-13-23/)).
- **Lanceiros**: alcance maior, mudam o espaçamento que você precisa.
- **Mosquetes**: implementados para o jogador (dano alto, movimento limitado; recarga longa era **planejada**); o dev planejava dá-los também aos inimigos, mas isso **não está confirmado** na build pública.
- **Bosses**: ficam em **chokepoints** do mapa; o dev planejava alguns opcionais, que podem ser enfrentados depois, com mais experiência. O primeiro ronin encontrado é deliberadamente muito difícil ([devlog 13/10/2023](https://devpachi.wordpress.com/2023/10/13/10-13-23/)).
- **Fauna**: lobos, veados, pássaros, insetos, sapos, libélulas. Não são só decoração: caça, pesca e coleta alimentam a sobrevivência e o logbook.
- **Invasores (planejado)**: “bounty hunters” entram no servidor do jogador e o caçam; o dev queria uma experiência pseudo-MMO com encontros aleatórios ([devlog 01/12/2023](https://devpachi.wordpress.com/2023/12/01/12-1-23/)). **Não confirmado se está ativo** na build pública.

### 2.5 Sensação de impacto / game feel

O que está confirmado por fontes e por frames:

- **Sangue em partículas e decals persistentes**, com manchas que ficam no chão e **se diluem na água**; o personagem lavado deixa uma trilha vermelha na água ([ResetEra](https://www.resetera.com/threads/ronin-trail-kickstarter-play-a-wandering-ronin-in-edo-period-japan.597603/)).
- **Desmembramento** e **decapitação**: dá para cortar a cabeça golpeando de novo numa janela curta depois da morte ([devlog 01/12/2023](https://devpachi.wordpress.com/2023/12/01/12-1-23/)).
- **Ragdolls com peso**: os corpos reagem à física; o dev fala em “hits interact with the enemies’ physics so every hit has real weight”.
- **Distinção audiovisual entre corte normal e crítico**: mais faísca, som diferente, respingo maior ([devlog 02/02/2024](https://devpachi.wordpress.com/2024/02/02/2-2-24-changelog/)).
- **Arcos de espada** visíveis como riscos brancos/crescentes no escuro (observado em frames de gameplay).
- **Câmera contida**: não confirmei camera shake nem hitstop; o peso parece vir do sangue, do som, do ragdoll e da animação, não de tremores de tela — **não confirmado**.

### 2.6 O loop de uma “run”

Não é uma run de roguelike. O loop real, montado a partir do devlog e do demo, é:

1. **Deploy** numa região (mapa aberto) a partir de um santuário/mapa.
2. **Exploração lenta**: colher cogumelos, pescar, caçar, registrar espécies, achar santuários e pontos de interesse.
3. **Confronto**: acampar bandidos, duelar com um ronin no caminho, ou aceitar um duelo/challenge.
4. **Loot**: o que o inimigo veste é o que ele dropa; baús de acampamento só abrem quando todos morrem.
5. **Sobrevivência**: fome/sede/frio/umidade; construir fogueira, cozinhar, secar roupa, sharpening da katana.
6. **Extração/santuario**: voltar, salvar, guardar itens, subir de nível (toughness/endurance/strength/dexterity), aprender postura.
7. **Meta**: repetir duelos em dificuldades maiores (“reminisce”), farmar posturas, reputação e equipamento; desafios PvP assíncronos e invasões (planejados).

A partir de fevereiro/2024, o passo 1–6 foi reembalado como **extração**: você entra numa região, escolhe quando/onde extrair e o loot tem variação e atributos aleatórios. Isso aproxima o jogo de *Tarkov*/*Zero Sievert* e explica a tag PvP.

---

## 3. Direção de arte

### 3.1 Pipeline e escala do voxel

- Modelos feitos no **MagicaVoxel**, otimizados como low poly no **Blender**, com **normal maps suaves** para arredondar as arestas — o “**soft voxel**”. O dev chama isso de “huge breakthrough”: tira o aspecto serrilhado e deixa a cena menos poluída ([entrevista Unreal](https://www.unrealengine.com/developer-interviews/ronin-trail-is-a-voxel-based-open-world-game)).
- **Escala (estimativa):** o personagem tem algo como **25–35 voxels de altura**; pedras e troncos usam voxels grandes (2–4 px de tela por voxel); a grama **não é feita de voxels individuais**, e sim de lâminas finas com material e wind shader. O resultado é “voxel de longe, grama de perto”.
- **Folhagem**: árvores com copas em blocos, mas galhos finos e folhas em cartões; samambaias e arbustos em clusters. A paleta e a silhueta importam mais que a contagem de polígonos.
- **Truques baratos de alto impacto**: cortar grama com render target + vertex shader; decals de sangue; instanced meshes para cogumelos/insetos; LOD/dormancy de inimigos a 5.000 unidades. O dev é obcecado por custo/benefício visual.

### 3.2 Paleta (hex aproximados)

Amostrada por quantização das screenshots oficiais e de frames 1080p. JPEG, compressão e grading alteram os valores; trate como **faixas**, não como cores exatas.

| Uso | Hex aproximado | Observação |
|---|---|---|
| Verde profundo (sombra de mata) | `#2E4833` / `#25382A` | base das cenas de floresta |
| Verde médio (grama iluminada) | `#3D5133` / `#5D8152` | campo aberto, meio-dia |
| Verde claro (highlight) | `#708866` / `#869C63` | pontas de grama ao sol |
| Palha / capim seco | `#A48350` / `#AC8B54` | campos dourados, final de tarde |
| Dourado do chapéu de palha | `#B17944` / `#CD944B` | acento quente no personagem |
| Terra / cascalho | `#534538` / `#6B5849` / `#8B7F78` | trilhas, margens, pedras |
| Água / ardósia | `#485151` / `#545757` / `#5B6060` | rios e lagoas, quase sem saturação |
| Névoa / horizonte | `#919373` / `#817A77` | fog volumétrico |
| Índigo do quimono | `#3B3C4E` / `#4D516F` | roupa do jogador |
| Sangue | `#7A1F1F` – `#A32B26` | único vermelho realmente saturado |
| Susuki rosa | `#958588` / `#A08A8F` | capim-prata, outono |
| Chama / lanterna | `#F2A24A` (estimativa) | emissivo quente contra o azul da noite |

**Regra da paleta:** quase tudo é dessaturado e puxado para o oliva/azul; **o vermelho do sangue é o único acento forte**. É isso que faz o combate “saltar” sem HUD chamativo.

### 3.3 Luz, sombra e pós-processamento

- **Sol dinâmico com ciclo de 24h** (o HUD mostra relógio: 05:03, 10:15, 21:31, 22:16).
- **Fog volumétrico** denso: é o principal modelador de profundidade e de clima. O dev ajusta luz + fog por bioma para criar “mood” (campo ao vento = épico; floresta=névoa=tenso).
- **Depth of field tipo tilt-shift**: forte nos extremos, faixa nítida no personagem. É a marca registrada e o principal exagero.
- **Bloom** em emissivos: vaga-lumes, lanternas de papel, fogueiras, tochas. À noite, o jogo vira quase um “point-and-light”.
- **Vinheta** e grading por hora/bioma: dourado no entardecer, azul-petróleo na noite, verde-oliva no dia nublado, branco-azulado na neve.
- **Sombras suaves**, com dappled light no chão da floresta e contato curto sob os personagens; nada de sombra dura de voxel.
- **Forward rendering** por performance e consistência (o dev testou deferred e voltou) ([devlog 08/12/2023](https://devpachi.wordpress.com/2023/12/07/12-8-23/)).
- **Clima**: ciclo sol → nublado → chuva → tempestade, com “momentum” e transições; relâmpago como luz direcional real, não flash de tela; umidade e chuva alteram materiais; neve acumula nas faces voltadas para cima.
- **Preto e branco**: há pelo menos uma sequência monocromática (memória/intro, com velas e figura sentada) observada em vídeo; o contexto exato **não confirmado**.

### 3.4 Cenários, props, vegetação, clima

- **Japão feudal pós-guerra (início do período Edo)**, não o Japão turístico de torii e cerejeiras. O tom é **rural, úmido, abandonado**: campos de arroz, estradas de terra, aldeias de madeira, santuários, dojos, acampamentos de bandidos, campos de batalha com corpos e corvos.
- **Biomas**: tutorial/dojo, campo de batalha, pradaria, floresta, aldeia, pântano com mangues, neve ao norte; floresta de bambu era stretch goal de US$ 30 mil (atingido, já que a campanha terminou em US$ 45 mil).
- **Vegetação**: capim alto que balança e **pode ser cortado**, juncos/susuki, samambaias, musgo, árvores de copa larga, pinheiros, lótus, bambu. O capim esconde o personagem e **guarda rastro** quando você passa.
- **Propriedades/arquitetura (observado)**: casas de madeira com telhado escuro e beirais largos, paredes de reboco claro e vigas escuras; interiores com piso elevado, painéis e teto baixo; dojos com piso de madeira; santuários com torii, lanternas de pedra e escadarias; acampamentos com barracas, fogueiras e cercas improvisadas. É arquitetura **rural e modesta**, não palaciana.
- **Props**: torii, lanternas de pedra e de papel, placas de madeira, fogueiras, baús, carrinhos de mão com cadáveres, barricadas, cercas com estacas, túmulos, flechas cravadas, andaimes, interiores de casas.
- **Horas do dia**: amanhecer dourado, meio-dia verde-estourado, entardecer laranja-poeira, noite azul-preta com vaga-lumes. A noite é **muito escura** — elogio estético, problema de usabilidade (ver §8).

---

## 4. Personagens e inimigos

### Jogador

- **Silhueta**: chapéu cônico/redondo (kasa) grande + corpo estreito + linha diagonal da katana. Lido a 100 px de altura.
- **Proporções**: estilizadas, cabeça/chapéu grande, corpo curto; não é chibi, mas o chapéu domina a leitura. **Estimativa** a partir de frames.
- **Roupas**: quimono/hakama em índigo dessaturado, faixas e detalhes em vermelho escuro; pés descalços ou sandálias; bolsa, cabaça, lanterna pendurados no cinto.
- **Customização**: tom de pele, cabelo, chapéus, roupas, quimonos, cores/tinturas, katana e wakizashi; o que você equipa aparece no personagem.
- **Detalhes de movimento**: bainha balançando, tecido, cabelo, neve acumulada na roupa.

### Inimigos

| Arquétipo | Silhueta / cor | Comportamento |
|---|---|---|
| Ronin/bandido de espada | quimono **vermelho-escuro/marrom**, faixa preta, chapéu de palha; lâmina clara | saca a espada, circula, telegrafa, bloqueia, troca de postura, pode aparar |
| Arqueiro | magro, arco branco/grande, roupa escura | mantém distância, flechas não bloqueáveis mas defletíveis; pode atacar de posição elevada |
| Lanceiro | lança longa, silhueta vertical | controla espaço, obriga a dash/parry |
| Mosqueteiro (planejado) | encorpado, arma longa | dano alto, recarga lenta, fica exposto |
| Boss/ronin de duelo | único, com nome e title card | arena com névoa, música própria, moveset e postura exclusivos |
| Fauna | lobos, veados, pássaros, insetos | caça/coleta, ambiência, perigo pontual |

- **Bosses** têm nome próprio (ex.: “Ronin Jiro”) e um **title card** em serifa branca sobre faixa translúcida, sem moldura. A arena de duelo é fechada por uma **névoa suave**, justificada ficcionalmente como obrigação de honra.
- **Diferenciação de boss** era um problema assumido: “most of the bandit bosses look identical”; o dev planejava sliders de altura/magreza, cabelos e roupas ([devlog 13/10/2023](https://devpachi.wordpress.com/2023/10/13/10-13-23/)).
- **Variedade de NPCs**: viajante coreano de hanbok, missionários cristãos, mercadores chineses e holandeses (planejado), para escapar do “só samurai”.

---

## 5. Estrutura de fases, progressão e meta

**Não há ondas, não é roguelike, não há “runs” com upgrades temporários.** A estrutura é:

- **Mundo aberto em regiões** (Tutorial/Dojo → Campo de batalha → Pradaria → Floresta → Aldeia → Pântano → Neve). Mapas **feitos à mão**; o dev tentou procgen para arrozais/aldeias e abandonou porque ficava “grid-like e repetitivo” (devlog oficial de dezembro, hoje fora do ar; trecho recuperado de índice de busca).
- **Bosses em chokepoints** bloqueiam progressão; bosses opcionais ficam fora do caminho para quem quer desafio/loot.
- **Acampamentos de bandidos** com baús que só abrem após limpar todos; o dev planejava resetá-los a cada manhã/lua nova, como em BotW.
- **Duelos**: você revisita inimigos mortos (“reminisce”), escolhe local, hora e clima, e sobe **níveis de dificuldade** (NG+ like). Recompensa: **posturas** e itens. Depois de dominar, recebe a postura do boss.
- **Desafios/ELO**: sistema de desafios assíncronos entre jogadores, com rank/leaderboard planejado; **multiplayer por invasão** (bounty hunters) planejado.
- **Progressão de personagem**: atributos (toughness, endurance, strength, dexterity), posturas permanentes, equipamento (8 novos conjuntos de katana/wakizashi), reputação, dinheiro, receitas.
- **Sobrevivência**: fome, sede, temperatura (umidade + hora + roupa), sangramento, fogo, encumbrance, afogamento; fogueira, cozinha, secagem de roupa, afiação da katana.
- **Meta-coleção**: logbook de insetos, peixes, plantas/cogumelos, katanas e inimigos; fragmentos de memória para a história (planejados).
- **Extração (2024)**: entrar numa região, lootear e **extrair** em pontos específicos; loot com atributos aleatórios e “encantamentos”; o que o inimigo veste é o que dropa. Isso é o endgame de risco/recompensa.

**Implicação para nós:** o que interessa não é copiar a estrutura (é caríssima e inacabada), mas o **princípio de arena + chokepoint + duelo com nome**. Um shooter top-down pode pegar o “quarto de duelo” e o “boss que tranca a passagem” sem construir um mundo aberto.

---

## 6. HUD e UI

### HUD em jogo (observado em 1080p)

| Elemento | Posição | Descrição |
|---|---|---|
| Relógio | canto superior direito | hora do dia em branco, ex. `21:31` |
| Duas barras finas | acima do relógio | amarela e azul-esverdeada; provavelmente stamina/vida — **mapeamento exato não confirmado** |
| Dica de tecla | sob o relógio | `[tab] bag`, branco, minúsculo |
| Arma equipada | canto inferior esquerdo | ícone da katana + `x1` + `[B] swap` |
| Itens rápidos | canto inferior direito | dois slots quadrados com ícones (comida, cogumelo) + `[E] x1` |
| Vida de inimigo | acima da cabeça | barra fina branca/vermelha, sem nome |
| Cursor | centro | pequeno ponto/seta branca, sem retículo grande |
| Dica de tutorial | topo central | caixa preta translúcida, texto monoespaçado minúsculo, ex. `press [space] to dodge` |
| Pickup | à direita | ícone + nome do item (“Shiitake Mushroom”) |
| Mini-mapa | posição não visível nos frames analisados | adicionado em 2024; máscara de áreas descobertas via render target |

### Menus

- **Menu principal**: fundo preto absoluto, logotipo em serifa dourada envelhecida (“Ronin Trail”), lista pequena em serifa branca (Continue, New Save, Options, Quit). Semanticamente, parece um menu de livro, não de jogo.
- **Criação de personagem**: painel esquerdo preto com labels em serifa (“Create a new character”, “Skin Tone”, “Hair style”); sliders como **linhas finas com um losango**; preview 3D à direita, com fogueira e pedras. Zero caixas, zero bordas.
- **Inventário**: overlay full-screen; fundo do jogo desaturado/escurecido; **barra de abas superior** em serifa small caps (`< Q  Map  Challenges  Log  Bag  Status  E >` na build de 2023; `Inventory / Equipment / Online / Status` no demo de 2025); painel direito translúcido com grid de slots; labels em serifa; contraste baixíssimo.
- **Duelo**: title card com o nome do oponente em serifa branca grande, sobre uma **faixa horizontal translúcida** atravessando a tela; texto com leve profundidade/animação 3D.
- **Tipografia**: mistura de **serifa old-style** (menus, títulos, abas, nomes) com **monoespaçada/pixel** (prompts de teclado, dicas). Essa mistura é uma escolha de tom: o mundo é “livro antigo”, a interface é “terminal”.
- **Cores da UI**: branco/off-white, preto 60–80%, nenhum azul de UI, nenhum dourado além do logo, das barras e da chama. A cor só entra pelos ícones de item e pelo sangue.

**Crítica de usabilidade**: os ícones de fome/sede são minúsculos (um streamer reclamou explicitamente e procurou opção de aumentar cursor); não encontrei opção de escala de UI nos menus vistos; em 1080p os textos parecem ter 12–14 px e sofrem. O minimalismo é lindo em screenshot e hostil em sessão longa.

---

## 7. Som e música

- **Trilha original de Zhao Shen (StormSound)**, descrito em seu Bandcamp como compositor de música “orquestral, híbrida e cinematográfica”. Há previews públicos de **combate** e **ambiente** no SoundCloud, além de “Trailer Music” no YouTube.
- **FMOD** com estados: a música de combate toca **apenas em duelos**, para dar peso; fora disso, o mundo é ambiente. O dev mudou isso de propósito: “only play combat music during duels to give more intensity and meaning to each duel, rather than it being just another fight” ([devlog 13/10/2023](https://devpachi.wordpress.com/2023/10/13/10-13-23/)).
- **Transições**: a música termina de forma limpa quando o duelo acaba, via event dispatcher na morte do jogador/inimigo, não fade cego.
- **Ambiente**: cigarras ao entardecer (nostalgia), vento no capim, chuva batendo no chapéu **conforme o tipo de chapéu**, neve rangendo, passos espaciais, água, pássaros, corvos.
- **SFX de combate**: metal contra metal, corte normal vs crítico com camadas distintas, respingo de sangue, ragdoll, corpo caindo. Bomba de papel gera **zumbido/tinnitus** e abafa o áudio por alguns segundos.
- **Vozes**: não há dublagem de diálogos; as falas aparecem em popup de texto sobre o NPC (o dev trocou o overlay preto por isso).

---

## 8. O que os jogadores elogiam e criticam

### Elogios recorrentes

- **Visual e atmosfera**: “gráficamente adorable, la música acompaña, es todo sencillo, minimalista” (Steam, rikifliki). “Gorgeous” é a palavra mais repetida em Reddit/ResetEra.
- **Câmera e estilo**: “I love the way it looks like you’re controlling some tiny little guy and you’re kind of looking down from the tops of the trees” (EndsWithLey, YouTube).
- **Combate com peso**: “Landing a clean dash attack is sooooo satisfying”; movimento “slow/weighty and methodical” (ResetEra, demo 2022).
- **Detalhes diegéticos**: sangue que mancha e se dilui na água, rastro no capim, roupa/cabelo com física, decapitação, lavar o sangue do corpo.
- **Originalidade**: “voxel Ghost of Tsushima”, “Zelda meets Ghost of Tsushima”; a combinação de exploração calma com combate letal é elogiada como “cozy” e tensa ao mesmo tempo.
- **Trilha**: elogiada como parte do clima, mesmo sem ser o foco.

### Críticas recorrentes

- **Controles travados/janky e suporte parcial a controle**: “Controller support. General controls feel janky and unresponsive. 30 seconds into the game and I was stuck in a tree or rock I couldn’t see. Keybindings. FPS limit and VSync. Usual graphics settings…” (Steam, duck).
- **Geometria que prende o jogador**: relatos de ficar preso em tronco/pedra logo no início (Steam e ResetEra).
- **Noite escura demais**: “the whole world is dark i cannot see things clearly” (Steam).
- **DOF/blur excessivo**: “the blur filter for distant or close terrain may be a bit too much” (ResetEra).
- **UI minúscula**: ícones de fome/sede ilegíveis; não localizei opção de escala nos menus vistos.
- **Curva de combate mal comunicada**: o dev admite que as pessoas “did not grasp a lot of the complex combat mechanics” e largavam após tomar one-shot por exposure.
- **Demo indisponível / comunicação**: “Says ‘demo available’ but there is no demo” (Steam, ago/2025); tópicos “Dead end?”, “Proof of life”, “will the game come out?”. No YouTube: “wow i thought this game was abandonware”.
- **Atraso e silêncio**: o último update público do Kickstarter é de 31/05/2025; desde então, nada. A loja segue “Coming soon” em nov/2026.

### O que **não** existe

- **Nota de review** (Steam/Metacritic/OpenCritic). Não há nota oficial; números vistos em buscas são de outro jogo (“Rise of the Ronin”, da Team Ninja, é confundido nas buscas).
- **Contagem de reviews da demo** confiável; a API pública não retorna e a página do demo hoje redireciona para o app principal.
- **Duração oficial** ou tamanho do conteúdo final.

---

## 9. 12 lições aplicáveis ao nosso shooter top-down voxel (tempo só anda quando o jogador se move)

### 1. A câmera alta é uma assinatura — mas o DOF não pode cegar o combate
Ronin Trail usa ângulo alto + tilt-shift para transformar o mundo num diorama. Isso dá identidade instantânea, mas o desfoque nos cantos atrapalha ler inimigos que se aproximam.
**Aplicação:** mantenha a inclinação alta e o DOF, mas deixe a **faixa de foco** cobrir todo o alcance útil de tiro (ex.: 70–80% da tela). O blur deve emoldurar, não esconder ameaça.

### 2. Silhueta antes de detalhe
O jogador de Ronin Trail é lido por **chapéu redondo + linha da espada**; os inimigos, por **vermelho escuro + arma**. A 100 px de altura, detalhe é ruído.
**Aplicação:** desenhe cada arquétipo com uma **forma única** (chapéu, capacete, ombreira, lança, escudo) e uma **cor de facção**. Teste em 1/8 da resolução: se não dá para distinguir em 200 ms, refaça.

### 3. Letalidade cria tensão; o tempo congelado amplifica
Em Ronin Trail, dois ou três golpes matam — e um erro também. No nosso jogo, o tempo só anda quando você se move, então **cada passo é uma aposta**: o inimigo congela, o projétil congela, mas o seu compromisso não.
**Aplicação:** projete inimigos que morrem em 1–3 acertos e atacam em padrões de 1–2 “batidas”. O jogador deve sentir que **andar é atirar** — planejar o próximo tile é a decisão central.

### 4. Telegrafia tem que caber numa “batida”, não em 300 ms de animação
Ronin Trail telegrafa com postura, brilho na lâmina e som; o parry exige timing. No nosso caso, a telegrafia precisa ser **legível antes do próximo movimento**.
**Aplicação:** use poses-chave congeladas (silhueta de “vai atacar”), uma cor de aviso (âmbar) e um som curto. O jogador deve poder “ler” o tabuleiro parado, como em *Into the Breach*.

### 5. O recurso é o movimento, não a stamina
A stamina de Ronin Trail impede spam de ataque/bloqueio. No nosso jogo, o recurso escasso é **o próprio tempo**: cada passo avança o mundo.
**Aplicação:** dê custo de “batida” ao dash, ao bloqueio e ao tiro forte; recompense quem **não** anda sem necessidade. Isso cria o mesmo dilema de Ronin Trail (agir vs. se expor) com uma moeda diferente.

### 6. Parry/deflexão como risco com recompensa clara
O parry de Ronin Trail abre o inimigo e vira o duelo; o jogador sente o metal. É a mecânica que mais gera histórias.
**Aplicação:** um **deflect** que só funciona se o jogador estiver parado no momento do impacto (ou andando na direção exata) e que devolve o projétil/abre um crítico. Feedback: faísca voxel, som seco, um frame de congelamento — e **nada** de screen shake genérico.

### 7. Hierarquia de impacto: normal ≠ crítico
Ronin Trail separa corte normal de crítico em som, faísca e sangue; o corpo reage à física. É isso que faz o combate parecer “caro”.
**Aplicação:** três camadas — (a) hit normal: partículas pequenas; (b) crítico: explosão de voxels + som grave; (c) morte: ragdoll/dissolução em cubos. Nunca use o mesmo efeito para tudo.

### 8. O cenário é gameplay e moldura ao mesmo tempo
Capim alto esconde, junco guarda rastro, água dilui sangue, árvore com flechas avisa do arqueiro. O dev chama isso de “environmental storytelling”.
**Aplicação:** no top-down, use **capim/cones de visão** como cobertura real e **decals** como memória da luta (sangue, cápsulas, marcas de tiro). O cenário deve contar o que aconteceu sem HUD.

### 9. HUD mínimo, mas legível
Ronin Trail acerta no conceito (relógio, duas barras, dois slots, barra no inimigo) e erra na escala (ícones minúsculos, sem opção de aumentar).
**Aplicação:** mantenha só o essencial e **uma** informação nova por canto; mas inclua escala de UI, contraste mínimo e modo “safe area”. Minimalismo não pode ser desculpa para ilegibilidade.

### 10. Enquadre o duelo como evento
Névoa que fecha a arena, title card em serifa, música que só entra ali, nome do oponente. É teatro barato e memorável.
**Aplicação:** um **quarto de chefe** que se fecha, uma faixa de nome, uma paleta deslocada e uma trilha que muda de estado. Faça o jogador saber que entrou em outro regime de regras.

### 11. Detalhe diegético barato vale mais que asset caro
Cortar grama com vertex shader, sangue que mancha e dilui, chuva que bate no chapéu conforme o modelo, neve acumulada na face superior. Tudo isso é barato e vira GIF vendável.
**Aplicação:** escolha **3–4** desses detalhes e faça-os impecáveis (sangue voxel, cápsulas, fumaça, marcas no chão). Não tente ter 30.

### 12. Escopo e comunicação: o maior erro de Ronin Trail não foi artístico
O jogo chegou a **84 mil wishlists** e a uma demo elogiada, mas **mais de quatro anos de escopo crescente**, pivô para extração, demo indisponível, silêncio e burnout deixaram o lançamento parado. O dev admitiu o atraso e o burnout publicamente.
**Aplicação:** feche um **vertical slice** de 15–20 min, mantenha uma demo jogável, publique um devlog curto a cada 2–4 semanas e **não troque o gênero no meio**. A melhor direção de arte do mundo não sobrevive à ausência de build.

---

## 10. Banco de referências (25 links)

| # | Fonte | O que ver |
|---|---|---|
| 1 | [Steam — Ronin Trail](https://store.steampowered.com/app/1606970/Ronin_Trail/) | Ficha, tags, 6 screenshots oficiais, trailer, FAQ de Early Access |
| 2 | [SteamDB — Demo 2059610](https://steamdb.info/app/2059610/) | Data da demo (28/02/2025), engine detectada, SDKs (FMOD, PhysX, NvCloth) |
| 3 | [Kickstarter — Rōnin Trail](https://www.kickstarter.com/projects/ronintrail/ronin-trail) | Campanha, updates, números de arrecadação |
| 4 | [BackerKit — estatísticas](https://www.backerkit.com/projects/ronintrail/ronin-trail) | US$ 45.014, 1.627 backers, pledge médio |
| 5 | [Entrevista Unreal Engine (2022)](https://www.unrealengine.com/developer-interviews/ronin-trail-is-a-voxel-based-open-world-game) | Pipeline voxel, “soft voxel”, combate, filosofia de arte, mood |
| 6 | [Entrevista GameGrin (2022)](https://www.gamegrin.com/articles/developer-interview-ronin-trail/) | Kendo, trajetória livre da espada, influências (BotW, Sekiro, Animal Crossing) |
| 7 | [GameGrin — Kickstarter Highlight](https://www.gamegrin.com/articles/kickstarter-highlight-ronin-trail/) | Contexto histórico e promessas de combate |
| 8 | [Devlog oficial (WordPress)](https://devpachi.wordpress.com/) | Changelogs semanais: extração, duelo, UI, clima, otimização — a fonte mais técnica |
| 9 | [Devlog 02/02/2024](https://devpachi.wordpress.com/2024/02/02/2-2-24-changelog/) | Pivô para extração, atributos aleatórios, GAS, feedback de combate |
| 10 | [Devlog 11/01/2024](https://devpachi.wordpress.com/2024/01/11/1-11-24/) | Mini-mapa, clima, temperatura, logbook, diálogo diegético |
| 11 | [Devlog 13/10/2023](https://devpachi.wordpress.com/2023/10/13/10-13-23/) | Title card de duelo, névoa de arena, música só em duelo, bosses em chokepoints |
| 12 | [Post viral no r/gaming (2022)](https://www.reddit.com/r/gaming/comments/viht62/im_working_on_a_voxel_art_indie_game_about/) | Reação da comunidade e leitura de estilo |
| 13 | [ResetEra — thread do Kickstarter](https://www.resetera.com/threads/ronin-trail-kickstarter-play-a-wandering-ronin-in-edo-period-japan.597603/) | Impressões detalhadas do demo de 2022 + lista completa de controles |
| 14 | [Steam Community Hub](https://steamcommunity.com/app/1606970/discussions/) | Críticas reais: controles, escuridão, demo sumida, atraso |
| 15 | [80.lv (21/01/2025)](https://80.lv/articles/experience-the-life-of-a-samurai-in-peaceful-era-in-this-upcoming-indie-game) | Resumo ocidental, foco no clima “peaceful era”, trailer |
| 16 | [GamingBible (08/03/2025)](https://www.gamingbible.com/news/zelda-meets-ghost-of-tsushima-359758-20250303) | Como a imprensa popular posiciona o jogo (“Zelda meets Ghost of Tsushima”) |
| 17 | [YouTube — gameplay 2025 (ENFANT TERRIBLE)](https://www.youtube.com/watch?v=CmlWXOiDq6I) | 11 min de demo, HUD, noite, interlúdio monocromático |
| 18 | [YouTube — 18 min top-down (EndsWithLey)](https://www.youtube.com/watch?v=SPo5ROWZ-mc) | Câmera, menu, inventário, tutorial, combate real comentado |
| 19 | [YouTube — demo 2024 (Scyushi)](https://www.youtube.com/watch?v=3B1eaZOxNbo) | Build antiga, combate letal, comida/sede, comentários sobre o dev |
| 20 | [YouTube — trailer oficial (devpachi)](https://www.youtube.com/watch?v=M9F7ilYW62E) | 76 s de direção de arte, sem HUD, foco em atmosfera |
| 21 | [YouTube — trailer music (Zhao Shen)](https://www.youtube.com/watch?v=6W5t1shIAl4) | Amostra da trilha |
| 22 | [SoundCloud — Zhao Shen](https://soundcloud.com/stormsound) | Previews de combate e ambiente |
| 23 | [X/Twitter — @devpachi](https://x.com/devpachi) | Updates curtos e clipes; **não confirmado** se ainda ativo |
| 24 | [Screenshots oficiais (Steam CDN) — exemplo 1](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1606970/ss_9a50085ec6350fa62ddb485230f49629d38fec8e.1920x1080.jpg) | Campo dourado, personagem mínimo, DOF |
| 25 | [Screenshot oficial — combate](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1606970/ss_26650279c3db6805a5dd1ef16507666cbc4d685c.1920x1080.jpg) | Sangue, barra de vida, câmera alta |

> Observação: o site oficial `ronintrail.net` está **fora do ar** (domínio parqueado). Use o cache/entrevistas acima. O presskit antigo ainda aparece indexado em buscadores, mas não abre.

---

## 11. Resumo final (8 linhas): o que copiar de estilo e o que evitar

*Os oito pontos abaixo são princípios de design e direção — nenhum asset, personagem, nome ou som do jogo deve ser copiado.*

1. **Copie a câmera-diorama:** ângulo alto, personagem pequeno, DOF em faixa — mas com foco largo o suficiente para o combate ser legível.
2. **Copie a paleta dessaturada com um único acento:** oliva/azul/cinza + vermelho de sangue; nada de arco-íris de voxel.
3. **Copie a silhueta:** chapéu/arma/ombreira que se leem a 100 px; cada arquétipo com forma e cor de facção próprias.
4. **Copie a hierarquia de impacto:** corte normal ≠ crítico ≠ morte, com som, faísca, voxels e ragdoll distintos.
5. **Copie o detalhe diegético barato:** sangue que mancha/dilui, capim que dobra e guarda rastro, chuva no chapéu, neve na face superior.
6. **Copie o enquadramento de duelo:** arena que se fecha, title card em serifa, música que só entra ali — teatro barato e memorável.
7. **Evite o escopo e o silêncio:** não troque de gênero no meio, não deixe a demo sumir, não passe meses sem devlog; 84 mil wishlists não sobrevivem a isso.
8. **Evite os erros de usabilidade:** noite escura demais, DOF que esconde inimigo, UI de 12 px, ícones minúsculos e controles “janky” — teste em 1080p e com controle, não só no monitor do dev.

---

### Apêndice — o que não foi possível confirmar

- Versão atual da engine (UE4 vs UE5) e se o build de 2025 usa Nanite/Lumen.
- Preço final e data de lançamento.
- Se o modo de extração, invasões PvP e desafios ELO estão ativos na build pública ou só em builds de backer.
- Mapeamento exato das duas barras do HUD (vida/stamina) e existência de hitstop.
- Escala exata em voxels (a estimativa de 25–35 é visual, não documentada).
- Contagem de reviews da demo (a página do demo redireciona para o app principal; a API pública não retorna).
- Se o desenvolvimento foi retomado depois de maio/2025.
