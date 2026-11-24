# MOVESTOP — Guia de Direção de Arte Implementável

**Versão:** 1.0  
**Data:** 2026-11-23  
**Escopo:** shooter top-down 3D voxel em Three.js, tempo condicionado ao movimento (estilo SUPERHOT), estética de voxel samurai inspirada em *Ronin Trail* sem copiar assets.  
**Público:** dev de gameplay, tech art, UI, áudio e QA visual.  
**Status:** documento de arte; nenhum código foi alterado.

---

## 0. Como ler este documento

Este guia é normativo. Quando houver conflito entre “bonito” e “legível”, **legibilidade vence**. O jogo é um shooter de decisão rápida: o jogador precisa ler silhuetas, cores e telegraphs em menos de 500 ms, com o tempo parado ou em slow motion.

Unidades usadas daqui em diante:

| Símbolo | Significado | Equivalência |
|---|---|---|
| **u** | unidade de mundo = 1 célula da grade | 1,82 m (1 ken) |
| **v** | voxel de construção | 0,1 u = 18,2 cm |
| **célula** | célula jogável da grade | 1 u × 1 u |
| **arena 17×13** | grade total, incluindo borda | 30,94 m × 23,66 m |
| **interior 15×11** | células jogáveis | 27,30 m × 20,02 m |

Regra de escala: **1 célula = 1 ken = 1,82 m**. Um tatame padrão tem 0,91 × 1,82 m, ou seja, **2 tatames por célula**. Isso permite construir shoji, tatame, telhados e cercas em módulos coerentes sem “inventar” proporções.

> **Não altere a escala do gameplay existente sem medir o impacto em colisão, velocidade de bala e câmera.** Este documento assume que 1 u de gameplay continua sendo 1 célula. Se o código atual usa outra escala, mantenha a razão e converta os valores.

---

## 1. Norte estético: o que estudar e o que roubar

### 1.1 Ronin Trail — fatos verificados

Fontes: página oficial na Steam (app 1606970), entrevista ao Unreal Engine publicada em 12/10/2022 e entrevista ao GameGrin publicada em 20/07/2022. Acesso em 2026-11-23.

Fatos confirmados pelo desenvolvedor:

- Jogo solo de **Danny Park / @devpachi**, feito em **Unreal Engine**, com modelos feitos em **MagicaVoxel**.
- Os modelos exportados do MagicaVoxel eram otimizados no **Blender** como low poly.
- O desenvolvedor descreve um look de **“soft voxel”** obtido com **normal maps de sombreamento suave**, para tirar o aspecto de aresta dura e deixar a cena menos ocupada.
- **Depth of Field** foi usado para criar uma atmosfera “cozy” de diorama.
- **Volumetric fog**, iluminação e mudanças de clima/hora do dia criam os climas (ex.: campo dramático ao vento, floresta enevoada).
- O personagem é um rōnin com **chapéu de palha** (kasa), e a escolha do cenário veio de filmes de Kurosawa, *O Último Samurai*, *Samurai Champloo* e do mangá *Vagabond*.
- A direção de combate é **hardcore/realista**: poucos golpes matam, há sangue que mancha o ambiente e desmembramento.
- A página da Steam, na data de acesso, mostra o jogo como **“Coming soon”**, com plano de Early Access e demo disponível. Não há reviews de usuário na página.

Observações visuais a partir dos **screenshots oficiais da Steam** (não são afirmações sobre o pipeline interno):

- Personagem minúsculo diante de campos densos de grama voxel alta; a câmera é alta e levemente inclinada, com forte **tilt-shift/DOF** nas bordas.
- Paleta ao ar livre: verdes de grama em 3–4 tons, terra dessaturada, névoa quente; contraste geral baixo, com o personagem e o sangue puxando a saturação.
- Kasa com **anéis empilhados** (cone escalonado), silhueta circular muito legível de cima; kimono azul-escuro; espada fina e comprida.
- HUD mínimo: barra de vida pequena, crosshair fino, sem poluição.
- Sangue como respingos vermelhos saturados no chão e nas folhas.

**O que roubar (princípios, não assets):**

1. Silhueta de chapéu largo como assinatura de leitura top-down.
2. “Soft voxel”: normais suaves, luz hemisférica, sombra macia, névoa; não aresta dura em tudo.
3. Diorama: câmera telefoto, DOF sutil nas bordas, base de mesa/papel.
4. Contraste de escala: personagem pequeno em cenário grande, mas com acento de cor que o destaca.
5. Paleta de ambiente dessaturada + acentos saturados reservados a gameplay.

**O que NÃO copiar:**

- Logo, tipografia dourada com katana, personagem, construções, texturas, composições de screenshot, nome, HUD ou qualquer asset.
- A escala “realista” de grama e árvores: em MOVESTOP a arena é compacta e precisa de leitura de cover; grama alta esconde gameplay.
- O ritmo de exploração e a paleta sazonal contínua: aqui cada arena é um diorama fechado com tema próprio.

### 1.2 Ukiyo-e — o sistema de cor

Fatos úteis:

- A xilogravura ukiyo-e usa **bokashi**, gradiente aplicado à mão no bloco, usado para céu, água e profundidade.
- O **azul da Prússia** (bero-ai) foi um pigmento importante em paisagens de Hokusai e Hiroshige; aparece em céus e água.
- A **keyblock** imprime o desenho/contorno; a cor é aplicada em blocos separados. Isso produz contorno de tinta e áreas de cor chapada, com registro levemente imperfeito.
- A paleta tradicional japonesa oferece nomes e HEX confiáveis (ver §13). Use-a como vocabulário, não como filtro automático.

**Tradução para o jogo:** céu/fog com gradiente vertical suave (bokashi); contorno escuro fino em personagens e props de gameplay; áreas de cor chapada, sem gradiente nos objetos; pequenas imperfeições de registro (1 v de desalinhamento) para charme artesanal.

### 1.3 Akira Kurosawa — composição e clima

Fatos úteis:

- Kurosawa é associado a **wipes** como transição, **clima** como ferramenta dramática (chuva, vento, poeira), **telefoto** com compressão de planos e **deep focus**, além de encenação em múltiplos planos.
- A composição frequentemente usa primeiro plano escuro em silhueta, plano médio de ação e fundo atmosférico.

**Tradução para o jogo:**

- Câmera telefoto (FOV 36) para comprimir o diorama; não usar grande angular.
- Primeiro plano de prop desfocado/escuro na borda inferior, quando possível, para enquadrar a arena.
- Clima por tema: pétalas (outono), névoa (bambu), fumaça/brasas (noite), “paper dust” (washi), vapor/neon haze (neon).
- Transições de tela por **wipe horizontal** de 240 ms, com borda de tinta, não por fade genérico.
- Vento constante em bandeiras, noren, bambu e pétalas; o vento para quando o tempo para (ver §9).

### 1.4 Washi — material e textura

Fatos úteis:

- Washi é feito de fibras longas de kozo; as fibras se distribuem aleatoriamente, o que dá resistência e uma superfície com fibras visíveis, bordas macias e leve translucidez.
- A cor natural é quente, fora do branco puro; a luz atravessa e cria um “glow” suave.

**Tradução para o jogo:**

- Papel base `#F1EEE4`, nunca `#FFFFFF`.
- Grão de fibra em duas escalas: tile de 220 px a 3–5% de opacidade (UI) e ruído fino a 2% (mundo).
- Bordas “deckled” (irregulares) só em modais e cartões de destaque; não em todos os cards.
- Sombras de papel: offset duro de 4 px, cor de tinta, sem blur.

### 1.5 Diorama e “soft voxel”

Princípios:

- O mundo é uma **maquete**: base de papel/tatame, borda visível, sombra projetada para fora, atmosfera contida.
- Voxels são cubos, mas a luz não precisa ser dura: hemisférica + direcional suave + névoa + grão.
- A câmera fica alta o suficiente para ler o chão e baixa o suficiente para ver volumes (55°).
- A escala é estilizada: cabeça e chapéu maiores, pernas curtas, ombros largos. Isso melhora a leitura a 80 px.

### 1.6 SUPERHOT — a gramática do tempo

Fatos úteis:

- O jogo usa paleta limitada (branco/cinza/preto) com inimigos e projéteis em vermelho vivo, para que o perigo seja inconfundível.
- O tempo só avança quando o jogador se move; o mundo congelado é uma pausa de leitura.

**Tradução para o jogo:**

- Não copiar o minimalismo branco total. Copiar a **hierarquia**: ambiente neutro, perigo vermelho, jogador frio, feedback dourado.
- Quando o tempo está parado, a cena perde 35% de saturação e ganha um leve véu frio; quando o jogador se move, a saturação e o áudio “abrem”.
- O jogador deve ser a única silhueta com **rim ciano**; inimigos, a única família com **vermelho vivo**.

### 1.7 Pranchas de referência (o que olhar, não copiar)

| Referência | O que observar | O que levar para MOVESTOP | O que não copiar |
|---|---|---|---|
| *Ronin Trail* (screenshots oficiais) | kasa escalonado, escala minúscula, grama densa, DOF, névoa quente | silhueta de hat, diorama, “soft voxel” | assets, logo, personagem, composições |
| Niklas Mäckle / @knosvoxel (citado pelo dev de *Ronin Trail*) | construção japonesa em voxel, telhados, paleta | módulos de telhado e torii | modelos ou paletas específicas |
| Hokusai, *A Grande Onda de Kanagawa* | bokashi, azul da Prússia, contorno de tinta | céu/fog em gradiente, contorno escuro | composição literal |
| Hiroshige, *Chuva Repentina sobre a Ponte Shin-Ōhashi* | linhas de chuva, planos comprimidos, silhuetas | clima como camada visual, chuva em linhas | cena ou enquadramento |
| Kurosawa, *Sete Samurais* / *Yojimbo* / *Ran* | vento, poeira, wipes, teleobjetiva, deep focus | transições por wipe, clima, câmera comprimida | planos e personagens |
| *SUPERHOT* (2016) | hierarquia branco/cinza + vermelho, tempo como pausa | reserva de cor, leitura de perigo | estética minimalista branca |
| *Paper Mario* (série) | papel chapado, contorno, diorama de teatro | papel como linguagem, não textura fotorrealista | personagens e interface |
| *Tearaway* (2013) | papercraft, dobras, costura, escala de maquete | charme artesanal, bordas cortadas | estilo de personagem |

Regra: a prancha serve para extrair **princípios** (contraste, silhueta, clima, material). Qualquer semelhança 1:1 com asset existente é rejeitada no checklist §12.8.

---

## 2. Câmera, enquadramento e base do diorama

### 2.1 Câmera

| Parâmetro | Valor | Justificativa |
|---|---|---|
| Tipo | PerspectiveCamera | Necessária para volumes e sombras; ortho achata demais |
| FOV vertical | **36°** | Telefoto; comprime o diorama |
| Pitch | **55°** acima da horizontal | Lê chão + fachadas |
| Distância ao alvo | **23 u** | Arena 17×13 cabe com margem |
| Altura | **18,8 u** | `23 × sin(55°)` |
| Recuo Z | **13,2 u** | `23 × cos(55°)` |
| Alvo | jogador + 2,2 u na direção do olhar | Evita que o jogador fique no centro exato |
| Visible height no chão | ~14,95 u | 13 u de arena + 1,95 u de margem |
| Visible width 16:9 | ~26,6 u | 17 u de arena + margens laterais para HUD |
| Personagem em 1080p | **~79 px** de altura | Suficiente para ler kasa e arma |

Movimento de câmera: seguir o jogador com amortecimento `1 - exp(-6·dt)`; nunca rotacionar; shake máximo de 6 px e 300 ms; em dash, **não** fazer FOV punch acima de 2°.

### 2.2 Base do diorama

- A arena repousa sobre uma **base de washi** de 21×17 u, 0,35 u de espessura, com borda deckled de 0,08 u.
- A base projeta sombra no “vazio” (plano de papel infinito ou fundo do tema) deslocada 0,25 u.
- O chão jogável tem 0,12 u de espessura; paredes, 1,1 u de altura (2,0 m) e 0,2 u de espessura.
- Fora da base, nada de props; o vazio é atmosfera (fog) e papel.
- Linhas de grade: 1 px a 8% de opacidade a cada 1 u; não usar grid técnico visível em gameplay.

### 2.3 Regra de composição

A cada arena, reserve:

- **1 ponto focal** vertical (torii, árvore ou telhado) no terço de fundo.
- **2 planos de cover** em primeiro plano, um à esquerda e um à direita, para enquadrar.
- **1 área de respiro** sem props, com pelo menos 3×3 células, para o jogador ler bullets.
- **1 linha de fuga** visual (caminho de pedra, tatame, água) que atravessa a arena na diagonal.

---

## 3. Paleta mestra

### 3.1 Núcleo semântico fixo (não muda por tema)

Estas cores são **reservadas**. Nenhum prop decorativo, parede, roupa de inimigo comum ou tile de UI pode usá-las como cor dominante.

| Token | HEX | Uso | Regra |
|---|---|---|---|
| `PLAYER_CORE` | `#F2FFFB` | núcleo do jogador, hat rim interno | sempre presente |
| `PLAYER_CYAN` | `#19D3C5` | rim, trail, dash, marker | exclusivo do jogador |
| `PLAYER_DARK` | `#063B3C` | contorno do jogador em fundo claro | 1 v de espessura |
| `ENEMY_BASE` | `#E23B2E` | corpo de inimigo | exclusivo de inimigo |
| `ENEMY_DARK` | `#5E100B` | contorno/sombras de inimigo | 1 v |
| `ENEMY_WARN` | `#FF8A1F` | carga/telegraph | só durante windup |
| `ENEMY_SPECIAL` | `#FF3D9A` | sniper/elite | 1 arquétipo |
| `FEEDBACK_GOLD` | `#F2B51C` | parry, moeda, conquista | nunca em inimigo |
| `FEEDBACK_WHITE` | `#FFF6E8` | flash de impacto | ≤ 80 ms |
| `DAMAGE` | `#FF2B1F` | dano no jogador, vinheta | ≤ 180 ms |
| `HEAL` | `#8DB255` | cura, checkpoints | não usar em props |
| `INK` | `#141317` | texto, contorno, sombra | nunca `#000000` |
| `PAPER` | `#F1EEE4` | fundo claro, cartões | nunca `#FFFFFF` |

**Regra dura:** o jogador nunca pode ser vermelho vivo. O skin `RONIN` atual usa accent `#D83B2C`; a direção de arte pede migrar o accent do jogador para `PLAYER_CYAN` ou branco quente, mantendo o vermelho apenas como detalhe histórico pequeno (ex.: cordão de 1 v) e nunca como silhueta. Isso é uma mudança de arte, não deste ticket.

### 3.2 Matriz dos 5 temas

Cada tema tem 14 papéis. Use os valores como `THREE.Color` (hex numérico) e como CSS var. Onde a coluna não fizer sentido, use o valor do papel vizinho.

| Papel | WASHI / PAPEL | NOITE | NEON | OUTONO | BAMBU |
|---|---|---|---|---|---|
| `bg` (fora da arena) | `#F1EEE4` | `#0C0E16` | `#06070D` | `#D8BD9A` | `#B9C7AC` |
| `paper` (cartão/UI) | `#FAF7EE` | `#141724` | `#0E1420` | `#E4CFB0` | `#CBD6BD` |
| `floorA` | `#E9E2D2` | `#171B2A` | `#0C1120` | `#D3B894` | `#B3C2A4` |
| `floorB` (xadrez sutil) | `#DED5C1` | `#1D2233` | `#111A2E` | `#C5A67F` | `#A5B596` |
| `wall` | `#1A191E` | `#333A4E` | `#1B2740` | `#46301F` | `#2F3D28` |
| `wallEdge` | `#F6F1E4` | `#8FA3C4` | `#31405E` | `#E8D4B4` | `#E6F0DC` |
| `wood` | `#C9A46A` | `#6B4A2E` | `#3A2E2A` | `#8A5A33` | `#7A5A36` |
| `stone` | `#A8A294` | `#5A6070` | `#2A3346` | `#9A8B74` | `#8E9480` |
| `foliage` | `#7C8F55` | `#35503A` | `#1F3B34` | `#6E7A45` | `#6B8A44` |
| `fog` | `#F1EEE4` | `#0C0E16` | `#06070D` | `#D8BD9A` | `#B9C7AC` |
| `sky` | `#EFE9DA` | `#1B2340` | `#121A33` | `#FFE9C9` | `#E6F0DC` |
| `ground` (fora) | `#C9C2AF` | `#07080D` | `#04050A` | `#A98A63` | `#8D9D7D` |
| `accent` (UI) | `#9D3A2E` | `#FFB35C` | `#FFB84D` | `#2C3F63` | `#D95C2B` |
| `ink` | `#141317` | `#05060A` | `#030407` | `#2A1C12` | `#1C2418` |

Mapeamento para o `ThemeDef` existente: IDs `theme-washi`, `theme-noite`, `theme-neon`, `theme-outono`, `theme-bambu`; `crate` usa `wood`; `wallEdge` é o topo/aresta da parede; `css.bg/floor/floor2/wall/accent` derivam de `bg/floorA/floorB/wall/accent`. Não crie campo novo sem necessidade.

Notas por tema:

**WASHI / PAPEL**

- Luz: dia alto, sol difuso, sombras curtas e macias.
- Proporção: 70% papel/creme, 20% madeira/pedra, 10% acento.
- Props: madeira clara, laca vermelha **só** em torii distante e detalhes; nunca em cover.
- Evitar: branco puro, contraste duro, preto chapado em área grande.
- Assinatura: grão de fibra visível, borda deckled, tinta `#141317`.

**NOITE**

- Luz: lua fria + lanternas quentes; sombras longas e azuladas.
- Proporção: 60% azul-noite, 30% pedra/madeira escura, 10% âmbar.
- Props: pedra fria, madeira quase preta, shoji com papel âmbar emissivo.
- Evitar: preto absoluto; azul elétrico saturado; bloom em tudo.
- Assinatura: silhueta recortada contra névoa azul; pontos de âmbar.

**NEON**

- Luz: noite artificial, letreiros emissivos, chão molhado (reflexo sutil, não espelho).
- Proporção: 65% azul-petróleo, 25% estrutura escura, 10% emissivo.
- Emissivos permitidos: violeta `#7B4DFF` e âmbar `#FFB84D`. **Ciano é do jogador; magenta é do sniper.** Não use esses dois em letreiro.
- Evitar: arco-íris, gradiente roxo-rosa, chromatic aberration, reflexo PBR de carro.
- Assinatura: 3–5 letreiros por arena, cada um com no máximo 2 cores; o resto é escuro.

**OUTONO**

- Luz: fim de tarde dourado, névoa quente, pétalas.
- Proporção: 55% terra/creme, 30% musgo, 15% momiji.
- Vermelho de folhagem máximo: `#B23A2A`, e **nunca** em cover ou em área de tiro. O vermelho de inimigo é mais claro, emissivo e tem contorno escuro.
- Acento de UI: indigo `#2C3F63`, para não competir com o perigo.
- Evitar: laranja saturado em tudo; folhas cobrindo o chão jogável.

**BAMBU**

- Luz: manhã verde, névoa de bambuzal, luz filtrada.
- Proporção: 60% verde dessaturado, 25% madeira/pedra, 15% creme.
- Props: bambu em 3 tons, nós mais escuros, folhas em planos quebrados.
- Evitar: verde neon, grama alta que esconde bullets, saturação uniforme.
- Assinatura: colunas verticais de bambu criando ritmo e oclusão parcial.

### 3.3 Regras de contraste

1. **Valor antes de matiz.** Construa a cena em escala de cinza; se não funcionar, a cor não salva.
2. **Silhueta de gameplay ≥ 3:1** de contraste WCAG contra o fundo imediato (3 u ao redor). UI de texto ≥ 4,5:1; texto grande ≥ 3:1.
3. **ΔL\* ≥ 25** entre a **massa do corpo** do inimigo e o piso; para o jogador, **ΔL\* ≥ 20** na massa do corpo **ou** contraste ≥ 3:1 garantido por contorno/rim. Meça em CIELAB, não “no olho”; o núcleo branco é luz, não silhueta.
4. **Saturação:** ambiente ≤ 45% HSL; inimigos ≥ 70%; jogador ≥ 75% no acento. Nada de ambiente tão saturado quanto o perigo.
5. **60/30/10:** 60% neutro dominante, 30% secundário, 10% acento. O acento inclui inimigos, player, UI e VFX; se a tela passa de 10% de acento, corte.
6. **Máximo 3 famílias de matiz** por tema + neutros. Ex.: Washi = creme, indigo, vermelho; Outono = terra, musgo, momiji.
7. **Nunca use vermelho vivo em prop.** Vermelho de cenário só em tons quebrados (`#9D3A2E`, `#B23A2A`) e nunca em cover.
8. **Nunca use ciano em prop.** Ciano é jogador e feedback de tempo.
9. **Nunca use dourado em inimigo.** Dourado é recompensa/parry.
10. **Não dependa de matiz.** Teste em deuteranopia; cada arquétipo precisa de forma e padrão próprios.
11. **Fundo claro:** o jogador precisa de contorno escuro (`PLAYER_DARK`) + núcleo branco; o ciano sozinho não passa em Washi/Outono/Bambu.
12. **Fundo escuro:** o jogador pode usar ciano emissivo, mas o núcleo branco continua.
13. **Flashes:** no máximo 3 por segundo; nenhum flash de tela cheia acima de 80 ms.
14. **Fog não pode lavar o gameplay:** a 20 u, a perda de contraste do inimigo deve ser ≤ 15%.

### 3.4 Objetos Three.js sugeridos (referência, não aplicar agora)

```ts
// Exemplo de estrutura; os valores devem ser validados no jogo.
export const PALETTE = {
  washi: {
    bg: 0xf1eee4, paper: 0xfaf7ee, floorA: 0xe9e2d2, floorB: 0xded5c1,
    wall: 0x1a191e, wallEdge: 0xf6f1e4, wood: 0xc9a46a, stone: 0xa8a294,
    foliage: 0x7c8f55, fog: 0xf1eee4, sky: 0xefe9da, ground: 0xc9c2af,
    accent: 0x9d3a2e, ink: 0x141317,
  },
  noite: { /* ... */ },
  neon: { /* ... */ },
  outono: { /* ... */ },
  bambu: { /* ... */ },
} as const;

export const SEMANTIC = {
  playerCore: 0xf2fffb, playerCyan: 0x19d3c5, playerDark: 0x063b3c,
  enemyBase: 0xe23b2e, enemyDark: 0x5e100b, enemyWarn: 0xff8a1f, enemySpecial: 0xff3d9a,
  feedbackGold: 0xf2b51c, feedbackWhite: 0xfff6e8, damage: 0xff2b1f,
  heal: 0x8db255, ink: 0x141317, paper: 0xf1eee4,
} as const;
```

---

## 4. Kit de cenário: 25 props voxel

### 4.1 Regras de construção

- **Voxel base:** 0,1 u. Detalhes de personagem podem usar 0,05 u; props e cenário **não**.
- **Sem mixels:** um objeto usa uma única grade. Exceção: detalhe funcional (mira, chama, papel) em 2:1.
- **Paleta por prop:** 4–6 cores, sendo 3 valores do mesmo material (base, sombra, luz).
- **Sem gradiente em cubo:** variação é por voxel, não por shader.
- **Assimetria obrigatória:** 1 peça quebrada, 1 folha fora de lugar, 1 slat torto; nada perfeito.
- **Topo mais claro (+8%), laterais base, base mais escura (−12%)**: via vertex color, não via luz por face.
- **Cantos lascados:** remova 1–2 voxels de quinas expostas; não arredonde.
- **Sujeira:** 1–2 voxels de musgo/ferrugem na base, nunca no topo.
- **Colisão:** círculo/cápsula para orgânico, caixa para arquitetura; nunca trimesh.
- **Colisão de tiro é por volume de gameplay, não por altura visual.** Caixote, baú, fardo, cercas, barris, carroça, poço e hokora bloqueiam tiro; noren, nobori, ponte, tatame e telhado não. A altura visual (0,4–1,1 u) só comunica o tipo de cover, não simula balística.
- **Sombras:** só props M/H projetam; L recebe sombra, não projeta.
- **LOD:** acima de 12 u do centro da câmera, folhagem usa versão 50%; acima de 22 u, cull.
- **Instancing:** repita tatame, cerca, caixote, bambu, pedra e bandeira com `InstancedMesh`; props únicos viram geometria mesclada por material.
- **Variações:** 4 rotações (0/90/180/270) + espelhamento; escala orgânica 0,95–1,05; nunca o mesmo prop com mesma rotação duas vezes na mesma arena.

### 4.2 Tabela dos 25 props

Legenda de custo: **L** ≤ 800 tris; **M** 800–2.000; **H** 2.000–3.500. Valores de tris são estimativas de geometria mesclada com faces internas removidas; validar com `renderer.info.render.triangles`.

| # | Prop | Pegada (v) | Altura (v) | Mundo W×D×H (u) | Colisão | Tris aprox. | Custo | Regra de uso |
|---:|---|---:|---:|---|---|---:|---|---|
| 1 | **Torii** | 28×6 | 30 | 2,8×0,6×3,0 | 2 cilindros r=0,18 | 2.800 | H | Máx. 1; na borda/fundo; nunca no meio de lane; posts são cover |
| 2 | **Lanterna de pedra (tōrō)** | 5×5 | 10 | 0,5×0,5×1,0 | círculo r=0,25 | 600 | L | Par de flanco ou marco de canto; luz emissiva, sem PointLight |
| 3 | **Lanterna de papel (chōchin)** | 4×4 + poste 1×1 | 7 + 12 | 0,4×0,4×1,2 | círculo r=0,12 no poste | 300 | L | Pendurada em telhado/varanda; 2–4 por arena; âmbar |
| 4 | **Painel shoji** | 10×1 | 11 | 1,0×0,1×1,1 | parede de 1 u | 320 | L | Cover total; papel translúcido; nunca em lane estreita |
| 5 | **Tatame** | 5×10 | 1 | 0,5×1,0×0,1 | nenhuma | 40 | L | 2 por célula, rotação alternada; merge no piso |
| 6 | **Touceira de bambu** | 12×12 | 32 | 1,2×1,2×3,2 | círculo r=0,45 | 1.800 | M | Oclusão parcial; 8 hastes, 3 tons; balanço 1,5° |
| 7 | **Cerejeira** | 18×18 | 28 | 1,8×1,8×2,8 | tronco r=0,35 | 3.200 | H | Máx. 1; copa em balanço; pétalas; não cobrir lane |
| 8 | **Pinheiro negro (matsu)** | 14×14 | 26 | 1,4×1,4×2,6 | tronco r=0,30 | 2.400 | H | Máx. 1; silhueta horizontal; contraste com cerejeira |
| 9 | **Telhado (módulo)** | 12×8 | 4 | 1,2×0,8×0,4 | nenhuma (acima) | 520 | M | 4–8 módulos por edificação; 2 tons + cumeeira |
| 10 | **Cerca de bambu** | 10×1 | 8 | 1,0×0,1×0,8 | caixa 1,0×0,1 | 300 | L | Cover baixo; bloqueia movimento e tiro; 6–10 segmentos |
| 11 | **Cerca de madeira** | 10×1 | 9 | 1,0×0,1×0,9 | caixa 1,0×0,1 | 280 | L | Delimita arena; 1 tom + base escura |
| 12 | **Carroça de mão** | 12×20 | 9 | 1,2×2,0×0,9 | caixa 1,2×2,0 | 1.100 | M | Cover total; 2 rodas; eixo quebrado em 1 variante |
| 13 | **Baú** | 6×4 | 4 | 0,6×0,4×0,4 | caixa 0,6×0,4 | 180 | L | Cover baixo; 1–2 por arena; ferragens escuras |
| 14 | **Barril de pólvora** | 5×5 | 6 | 0,5×0,5×0,6 | círculo r=0,25 | 240 | L | Máx. 3; faixa amarela/preta; explosão r=1,6 u; longe do spawn |
| 15 | **Bandeira nobori** | poste 1×1; pano 5×1 | 18; pano 10 | 0,5×0,1×1,8 | círculo r=0,08 | 280 | L | 2–4 por arena; pano balança 2°; cor de família, nunca vermelho vivo |
| 16 | **Poço** | 8×8 | 9 | 0,8×0,8×0,9 | círculo r=0,40 | 520 | M | Cover total; água escura emissiva 0,1 |
| 17 | **Hokora (santuário)** | 8×6 | 11 | 0,8×0,6×1,1 | caixa 0,8×0,6 | 700 | M | Ponto focal; dourado só no detalhe; não é cover de tiro |
| 18 | **Noren** | 10×1 | 8 | 1,0×0,1×0,8 | nenhuma | 140 | L | Entrada/portal; 3 panos, balanço; nunca bloqueia tiro |
| 19 | **Ponte** | 24×10 | 5 | 2,4×1,0×0,5 | caminhável (sem collider) | 1.000 | M | Vence água/vala de 2 células; corrimão decorativo |
| 20 | **Caixote** | 4×4 | 4 | 0,4×0,4×0,4 | caixa 0,4×0,4 | 120 | L | Cover baixo; empilhar no máx. 2; marcação carimbada |
| 21 | **Barril de saquê** | 5×5 | 6 | 0,5×0,5×0,6 | círculo r=0,25 | 220 | L | 3–5 por arena; 3 faixas; nunca vermelho vivo |
| 22 | **Rack de armas** | 12×4 | 11 | 1,2×0,4×1,1 | caixa 1,2×0,4 | 460 | M | Decoração de cover; katanas/yari sem vermelho |
| 23 | **Fardo de palha** | 8×6 | 5 | 0,8×0,6×0,5 | caixa 0,8×0,6 | 260 | L | Cover baixo; 2 tons de palha; queimado em 1 variante |
| 24 | **Pedras** | 10×8 | 5 | 1,0×0,8×0,5 | círculo r=0,40 | 380 | L | 3–5 pedras; 2 cinzas + musgo; nunca na lane principal |
| 25 | **Haka / estela** | 4×3 | 10 | 0,4×0,3×1,0 | caixa 0,4×0,3 | 220 | L | Atmosfera; 1–3; sem vermelho; respeito visual (sem caveira) |

### 4.3 Orçamento de cenário por arena

| Item | Alvo | Limite duro |
|---|---:|---:|
| Props únicos colocados | 12–18 | 22 |
| Tipos diferentes de prop | 8–12 | 16 |
| Props H (torii, árvore) | 1–2 | 2 |
| Props M | 4–6 | 8 |
| Tris de cenário | 15–25 k | 35 k |
| Draw calls de cenário | 8–14 | 20 |
| Instâncias de tatame | 30–60 | 110 |
| Instâncias de cerca | 8–16 | 24 |
| Partículas ambiente | 40–80 | 120 |

### 4.4 Receita de construção de 3 props-chave

**Torii (28×6×30 v)**

- 2 hashira (posts) de 4×4×26 v, afunilados no topo em 3×3.
- 1 kasagi (travessa superior) de 28×4×3 v, com pontas levantadas 1 v.
- 1 nuki (travessa inferior) de 24×3×2 v, 2 v abaixo do kasagi.
- 1 gakuzuka (centro) de 3×6×2 v com placa `#E8DCC4` e kanji gravado por voxels (não textura).
- Base de pedra 6×6×2 v em cada post.
- Cores: laca `#9D3A2E` (Washi/Outono), madeira `#6B4A2E` (Noite), pedra `#A8A294`.
- Detalhe: 1 tábua torta, 1 lasca faltando no kasagi.

**Cerejeira (18×18×28 v)**

- Tronco 4×4×18 v, inclinado 2 v para um lado; 2 galhos principais de 3×3×10 v.
- Copa em 5 clusters de 8×8×6 v, cada um deslocado 2–4 v; 3 tons de rosa (`#F2C7C0`, `#E8A9A4`, `#C97F7C`) + 1 sombra `#8E5A58`.
- 12–20 pétalas soltas em voxels de 1 v, animadas por shader simples.
- Base com musgo `#6E7A45` em 6–10 voxels.
- Colisão só no tronco; copa não bloqueia tiro.
- Custo: 3.200 tris; usar só 1 por arena; nunca no centro.

**Telhado (módulo 12×8×4 v)**

- 2 planos inclinados de 12×4×1 v, um de cada lado, com 4–5 ripas de 1 v.
- Cumeeira 12×1×1 v, 1 tom mais escuro.
- Beiral com 1 v de espessura e 1 v de sombra pintada.
- Cores: telha `#3A3F45` + `#2A2E33`, madeira `#6B4A2E`, musgo `#5E6B3E`.
- Tiling: 4–8 módulos; variar 1 módulo com telha faltando.

---

## 5. Personagem: rōnin voxel top-down

### 5.1 Escala e proporções

| Medida | Valor | Equivalência | Observação |
|---|---:|---|---|
| Altura total (sem hat) | 11 v | 1,10 u / 2,00 m | 3,7 “cabeças” |
| Altura com kasa | 12 v | 1,20 u / 2,18 m | hat é o topo da silhueta |
| Largura de ombros | 7 v | 0,70 u / 1,27 m | exagero de leitura |
| Diâmetro do kasa | 7 v | 0,70 u / 1,27 m | exagero ~1,8× o real |
| Comprimento da katana | 10 v | 1,00 u | diagonal no quadril |
| Comprimento do tanegashima | 12 v | 1,20 u | horizontal na mão |
| Raio de colisão | 0,34 u | 0,62 m | cápsula |

> As proporções são de **leitura top-down**, não antropométricas. O hat e os ombros são deliberadamente grandes para funcionarem a 80 px. **A colisão continua 0,34 u**: hat, ombros e arma são visuais e não hitbox. Se o visual crescer, não aumente a hitbox sem rebalancear tiro, dash e parry.

### 5.2 Blueprint de voxels

Origem nos pés, +Y para cima, +Z para frente. Todas as medidas em v.

| Parte | Tamanho (W×H×D) | Posição (x,y,z) | Cor | Nota |
|---|---|---|---|---|
| Pé esquerdo | 2×1×2 | (−1,5, 0,5, 0) | `INK` | base |
| Pé direito | 2×1×2 | (+1,5, 0,5, 0) | `INK` | base |
| Perna esq. | 3×4×3 | (−1,5, 3, 0) | hakama | 1 v de dobra clara |
| Perna dir. | 3×4×3 | (+1,5, 3, 0) | hakama | 1 v de dobra clara |
| Torso | 7×4×4 | (0, 6, 0) | kimono | 2 tons + 1 acento |
| Faixa/obi | 7×1×4 | (0, 4,5, 0) | acento | 1 v de nó atrás |
| Ombros | 7×1×4 | (0, 8,5, 0) | escuro | 1 v mais largo |
| Braço esq. | 2×4×2 | (−4, 6,5, 0) | kimono | mão 2×2×2 |
| Braço dir. | 2×4×2 | (+4, 6,5, 0) | kimono | mão 2×2×2 |
| Pescoço | 2×1×2 | (0, 8,5, 0) | pele | escondido |
| Cabeça | 3×3×3 | (0, 9,5, 0) | pele/máscara | sem rosto detalhado |
| Faixa dos olhos | 3×1×0,5 | (0, 10, 1,5) | `INK` | leitura de direção |
| Kasa anel 1 | 7×1×7 | (0, 11, 0) | palha | anel externo |
| Kasa anel 2 | 5×1×5 | (0, 11,5, 0) | palha | anel médio |
| Kasa topo | 3×1×3 | (0, 12, 0) | palha escura | cone |
| Katana | 1×1×10 | (−2, 5, 0) | `#E8E4D8` | diagonal 30° |
| Tsuba | 2×1×2 | (−2, 5, 2) | `FEEDBACK_GOLD` | 1 v de guarda |
| Tanegashima | 2×2×12 | (+3, 6, 0) | madeira/metal | horizontal |
| Boca do cano | 1×1×1 | (+3, 6, 6) | `ENEMY_WARN` | emissivo, apaga fora do tiro |

**Silhueta top-down:** círculo do kasa (7 v) + ombros (7 v) + linha da katana (10 v) ou do fuzil (12 v). O hat é a assinatura; a arma diz o estado.

### 5.3 Materiais e leitura

- `MeshStandardMaterial` com `roughness: 0.85`, `metalness: 0.0` para tecido/palha; `roughness: 0.45`, `metalness: 0.15` para lâmina.
- Sem normal map em personagem; a suavidade vem da luz + vertex color.
- Contorno: 1 v de espessura em `PLAYER_DARK` no fundo claro; no escuro, usar rim ciano.
- Núcleo branco `PLAYER_CORE` no topo do kasa e nas mãos: é o que garante leitura em Washi.
- Emissivo do rim ciano: `emissiveIntensity` 0,8–1,2; nunca acima de 1,5 (bloom estoura).
- O corpo não pode ter mais de 6 cores; o acento do skin entra em 1–2 lugares (obi, forro do hat, bainha).
- A face é uma faixa escura; não modele olhos, boca ou nariz. A leitura vem da direção da faixa.

### 5.4 Animações

| Estado | Duração | O que move | Regra |
|---|---:|---|---|
| Idle | 1,6 s loop | respiração 0,02 u, hat 1° | quase parado; o tempo do jogo está parado |
| Walk | 8 frames, 10,5 rad/s | pernas 0,8 rad, braço oposto 0,55 rad, bob 0,04 u | hat atrasa 1 frame |
| Dash | 180 ms | inclinação 8°, ghost 6 cópias | sem bob |
| Shoot | 120 ms | recuo 2 v no braço, 1 v no torso | muzzle flash 60 ms |
| Parry | 160 ms | braço varre 120°, katana 90° | hitstop 70 ms |
| Hurt | 180 ms | torso −6°, flash branco | vinheta vermelha |
| Death | 900 ms | 26 cubos, timeScale 0,2→0 | sem ragdoll |

### 5.5 Cinco variações de personagem

Todas mantêm o **rim ciano** e o **núcleo branco**; mudam silhueta, cor e detalhe. Nenhuma usa vermelho vivo como cor dominante.

| Skin | Fantasia | Primária | Secundária | Acento | Silhueta no topo | Chave de valor | Leitura a 40 px | Perk existente |
|---|---|---|---|---|---|---|---|---|
| **RONIN** | andarilho | `#2B4A6F` indigo | `#E8E4D8` creme | `#C9A46A` palha | kasa plano 7 v | escuro/médio | “disco de palha com corpo azul” | KABUTO (+1 HP) |
| **KITSUNE** | raposa | `#C9622A` laranja queimado | `#F0E6D2` creme | `#F2B51C` dourado | 2 orelhas 2 v + cauda 3 v | médio/quente | “cunha laranja com duas pontas” | HAYAI (dash) |
| **ONI** | demônio azul | `#3B6B7A` azul-petróleo | `#22201F` carvão | `#D9A441` chifres | 2 chifres 2 v, ombros 8 v | escuro/frio | “bloco largo com chifres dourados” | UKAESHI (parry) |
| **YUREI** | fantasma | `#DDE8E4` branco-gelo | `#8FE8DC` ciano pálido | `#6E5A8E` violeta | sem hat; véu 6 v; flutua 0,15 u | claro/frio | “diamante branco flutuante” | UKAESHI (parry) |
| **DAIMYO** | senhor | `#4A2440` ameixa | `#EFE3C8` marfim | `#D9A441` ouro | eboshi alto 4 v + crista | escuro/quente | “torre com crista dourada” | KOBAN (moedas) |

Regras adicionais:

- **KITSUNE** e **DAIMYO** são os únicos com dourado no corpo; ainda assim, o dourado é detalhe, não silhueta.
- **ONI** usa azul-petróleo dessaturado, não ciano; o rim ciano continua sendo o marcador de jogador.
- **YUREI** não tem pernas; o corpo termina em 3 pontas de tecido. A colisão continua 0,34 u.
- **DAIMYO** é 1 v mais alto; não aumente a colisão.
- Em sombra (Noite), todos precisam do rim ciano; em luz (Washi), todos precisam do contorno `PLAYER_DARK`.

---

## 6. Cinco arquétipos inimigos

### 6.1 Gramática de telegraph

Todo ataque tem 3 estágios, com a mesma linguagem visual:

1. **AIM (0–30% do windup):** anel no chão (0,55 u de raio) + linha fina na direção do tiro; opacidade 0→0,25.
2. **CHARGE (30–85%):** emissivo sobe de 0,6 para 2,5; geometria de mira cresce 1,0→1,12; som sobe de pitch.
3. **RELEASE (85–100%):** flash branco de 60 ms; anel colapsa; projétil/ataque sai.

Regras:

- O anel é sempre **vermelho/laranja**; nunca ciano, dourado ou branco permanente.
- A linha de mira tem 0,015–0,02 u de espessura; não pode cobrir a tela.
- O flash de release é branco quente `#FFF6E8`, 60 ms, e nunca maior que a silhueta do inimigo.
- Cada arquétipo tem um **som** e uma **forma** próprios; cor é reforço, não único canal.
- Windups vêm de `ENEMY_DEFS` (0,62 / 0,55 / 1,5 / 0,7 / melee). Não invente novos tempos sem atualizar o gameplay.

### 6.2 Tabela dos arquétipos

| Arquétipo (code) | Silhueta | Altura | Cores | Arma | Telegraph | Ataque | Contra-jogo | Som |
|---|---|---:|---|---|---|---|---|---|
| **ASHIGARU** (`gunner`) | esguio, jingasa cônico 4 v, fuzil horizontal 12 v | 10 v | `#E23B2E` / `#5E100B` / boca `#FFD08A` | tanegashima | 0,62 s; brasão/fuzil levanta; linha 0,015 u a 40% | 1 tiro preciso, 6,4 u/s | strafe, cover, matar antes do release | clique seco “tan” |
| **RAJADA** (`burster`) | largo 8 v, 2 canos ou caixa de munição, base pesada | 11 v | `#FF7A1A` / `#7A2E08` | 2 canos | 0,55 s; 3 pips âmbar acima da cabeça, corpo abaixa 1 v | rajada de 3, 0,14 s entre tiros | quebrar LOS, dash lateral | 3 cliques ascendentes |
| **YUMI** (`sniper`) | alto e fino 12 v, arco vertical 14 v, faixa magenta | 12 v | `#FF3D9A` / `#6B0F3E` | arco longo | 1,5 s; linha magenta 0,02 u; arco abre; olho acende | tiro rápido 15,5 u/s | cover total, flanquear, parry | assobio senoidal subindo |
| **TATE** (`shield`) | baixo e largo, escudo 6×8 v na frente, olho único | 11 v | `#D63A2A` / `#7F2A22` | escudo + sabre curto | 0,7 s; escudo crava no chão; 120° frontais faíscam | investida/ataque frontal | flanquear, parry, tiro nas costas | thud de madeira + metal |
| **KAGE** (`hunter`) | baixo 9 v, agachado, 2 lâminas 8 v, sem arma de fogo | 9 v | `#FF9A1F` / `#CC5F0E` | 2 wakizashi | 0,35 s; agacha, linha 0,02 u no chão, som de lâmina | lunge 2,2 u/s | dash perpendicular, parry | sussurro + “shing” |

### 6.3 Regras de leitura

- **Largura e altura** são os principais diferenciadores: 9 / 10 / 11 / 11 / 12 v; o jogador deve identificar pelo contorno, não pela cor.
- **Topo da cabeça:** cone (ASHIGARU), caixa (RAJADA), arco (YUMI), escudo (TATE), capuz (KAGE).
- **Cor de base** sempre na família vermelha; o acento muda (âmbar, magenta, laranja).
- **Nenhum inimigo usa ciano, dourado ou branco como cor dominante.**
- **Nenhum prop usa o vermelho vivo dos inimigos.**
- Contorno `ENEMY_DARK` de 1 v em todos; em fundo escuro, adicione 0,3 de emissivo no contorno para separar.
- Em Washi, o inimigo precisa de sombra de contato (disco 0,5 u, opacidade 0,18) para não “flutuar”.
- Em Neon, o contorno pode receber 0,15 de emissivo, mas nunca bloom forte.
- Escala do boss: 1,5× (16 v), silhueta com chifres/crista, dourado permitido **só no boss** e **só como detalhe**.

### 6.4 Ficha de implementação de telegraph (referência)

```ts
// Valores de arte; os tempos reais vêm de ENEMY_DEFS.
type Telegraph = {
  ringRadius: number;      // 0.55 u
  ringOpacity: number;     // 0 -> 0.25 -> 0.55
  aimWidth: number;        // 0.015 u (gunner) / 0.02 u (sniper, hunter)
  aimColor: number;        // ENEMY_WARN ou ENEMY_SPECIAL
  emissiveMax: number;     // 2.5
  releaseFlashMs: number;  // 60
  releaseColor: number;    // FEEDBACK_WHITE
};
```

---

## 7. Iluminação e pós-processamento no Three.js

### 7.1 Configuração de renderer

```ts
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,          // true só no perfil low, sem post
  alpha: false,
  stencil: false,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; // Washi/Outono/Bambu
// Noite/Neon: THREE.AgXToneMapping
renderer.toneMappingExposure = 1.0;              // Noite/Neon: 1.05
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // low: BasicShadowMap
```

Por que `NeutralToneMapping`: preserva a paleta chapada e não lava o papel claro como ACES. `AgX` é melhor para neon e altas luzes, mas dessatura; use só nos temas escuros.

### 7.2 Luzes

| Luz | High | Low | Observação |
|---|---|---|---|
| `HemisphereLight(sky, ground)` | intensidade **1,15** | **0,95** | sky = `theme.sky`; ground = `theme.ground` |
| `DirectionalLight` principal | **2,4**, cor `#FFE7C4` | **1,9** | posição `(9, 15, 7)`; alvo `(0,0,0)` |
| `DirectionalLight` de preenchimento | **0,35**, cor `#8FB7D9` | **0,25** | posição `(-8, 9, -6)`; **sem sombra** |
| `AmbientLight` | **0** | **0** | não use; hemisphere já resolve |
| PointLights | **máx. 4** | **máx. 2** | só boss/lanterna especial; distância 4, decay 2 |

Sombras da direcional principal:

```ts
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);   // low: 1024
dir.shadow.camera.left = -14;
dir.shadow.camera.right = 14;
dir.shadow.camera.top = 12;
dir.shadow.camera.bottom = -12;
dir.shadow.camera.near = 2;
dir.shadow.camera.far = 40;
dir.shadow.bias = -0.0004;
dir.shadow.normalBias = 0.02;
// PCFSoft não usa shadow.radius; se precisar de blur controlável, avalie VSM.
```

Regras:

- Todas as sombras apontam para a mesma direção; nunca duas direções conflitantes.
- O chão recebe sombra; paredes recebem; props H/M projetam; props L não.
- Personagens sempre projetam; inimigos também.
- Em Low, desligue `castShadow` de folhagem e props L; mantenha o disco de contato.
- Não use `ShadowMaterial` em cima do piso; o piso padrão já recebe.
- Evite shadow acne com `normalBias`, não com bias grande (cria “peter-panning”).

### 7.3 Fog e atmosfera

| Tema | Fog | Near/Far (high) | Near/Far (low) |
|---|---|---|---:|
| Washi | `THREE.Fog(fog, 22, 60)` | 22 / 60 | 18 / 42 |
| Noite | `THREE.Fog(fog, 18, 52)` | 18 / 52 | 16 / 40 |
| Neon | `THREE.FogExp2(fog, 0.010)` | — | 0.008 |
| Outono | `THREE.Fog(fog, 20, 56)` | 20 / 56 | 17 / 42 |
| Bambu | `THREE.Fog(fog, 16, 46)` | 16 / 46 | 14 / 36 |

- O fog começa **depois** da arena (≥ 18 u); nunca antes de 14 u.
- A névoa não pode reduzir o contraste do inimigo a 20 u em mais de 15%.
- Em Neon, adicione um “haze” de 2–3 planos transparentes com gradiente, não um volume caro.
- Em Bambu, a névoa é mais próxima (16 u) para dar profundidade, mas o chão jogável fica limpo.

### 7.4 Pós-processamento

Cadeia high:

```text
RenderPass
  → UnrealBloomPass(resolução, strength 0.38, radius 0.55, threshold 0.85)
  → ShaderPass (vinheta + dessaturação de tempo; grão fino opcional)
  → SMAAPass
  → OutputPass
```

`SMAAPass` opera em linear-sRGB e **precisa vir antes** do `OutputPass` (a doc da classe no r187 é explícita). `FXAAPass`, que precisa de sRGB, viria depois do `OutputPass`. O grão de papel principal deve ser o overlay CSS `body::after`; o shader só cuida de vinheta/tempo.

Cadeia low:

```text
RenderPass → OutputPass (sem bloom/SMAA; antialias: true no renderer)
```

Esqueleto de referência (Three.js r187; `SMAAPass` não recebe tamanho nesta versão):

```ts
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const composer = new EffectComposer(renderer);
const grainPass = new ShaderPass(GrainShader); // { uniforms, vertexShader, fragmentShader }
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.38,  // strength
  0.55,  // radius
  0.85,  // threshold
);
composer.addPass(bloom);
composer.addPass(grainPass);        // vinheta/tempo em linear; grão fino opcional
composer.addPass(new SMAAPass());   // linear-sRGB; antes do OutputPass
composer.addPass(new OutputPass()); // tone mapping + sRGB; último
```

Regras:

- `OutputPass` é **sempre o último**; `SMAAPass` vem antes dele porque opera em linear-sRGB. Não coloque efeitos que esperam sRGB antes do `OutputPass`.
- Bloom só em emissivos acima de 1,0: boca do fuzil, olhos, letreiros, janelas, parry.
- **Nunca** bloom no piso, na grama, no papel ou no corpo inteiro do inimigo.
- `strength` 0,35–0,45; `radius` 0,5–0,65; `threshold` 0,82–0,9.
- Grão: ruído de luminância 0,025–0,04 no overlay CSS, animado a **12 fps**, não 60; escala com DPR. Se for shader, ele entra antes do `OutputPass` e será tone-mapped; compense a intensidade.
- Vinheta: 0,16–0,22 no Washi/Outono; 0,26–0,32 no Noite/Neon; multiplicada por `INK`.
- Dessaturação do tempo: `mix(sat, 1.0, 0.65)` quando parado; volta em 180 ms ao mover.
- Tilt-shift/DOF: **opcional high**, `BokehPass` com foco 23, aperture 0,00012, maxblur 0,006; nunca borrar o centro (raio de 35% da tela).
- Sem chromatic aberration, sem lens flare, sem lens dirt, sem “film look” pesado.

### 7.5 DPR e performance

| Perfil | DPR | Shadow | Bloom | SMAA | Partículas | Draw calls | Tris |
|---|---:|---|---|---|---:|---:|---:|
| **High** (desktop 1080p) | `min(devicePixelRatio, 2)` | 2048 | sim | sim | 512 | ≤ 80 | ≤ 90 k |
| **Medium** (notebook) | `min(devicePixelRatio, 1.5)` | 1536 | sim (0.25 res) | não | 320 | ≤ 60 | ≤ 65 k |
| **Low** (mobile/integrado) | `1` | 1024 ou off | não | não | 160 | ≤ 40 | ≤ 45 k |

- Dynamic resolution: se o frame médio passar de 20 ms por 2 s, reduza a escala interna em 0,85×; nunca abaixo de 0,75×.
- Não realoque geometria/materiais por frame; pool de partículas e de balas.
- `renderer.info` é a fonte da verdade; os números acima são alvo, não desculpa.
- Texturas: ≤ 512×512, no máximo 32 MB; ruído de papel pode ser 256×256.
- Shader compile: ≤ 300 ms no primeiro frame; pré-aqueça materiais no boot.
- Em Low, `MeshLambertMaterial` é aceitável para cenário; mantenha `MeshStandardMaterial` no jogador/inimigos.

### 7.6 Config de referência

```ts
export const QUALITY = {
  high: {
    dpr: Math.min(window.devicePixelRatio, 2),
    shadowMap: 2048,
    bloom: true,
    smaa: true,
    fogNear: 22,
    fogFar: 60,
    maxParticles: 512,
    anisotropy: 4,
  },
  medium: {
    dpr: Math.min(window.devicePixelRatio, 1.5),
    shadowMap: 1536,
    bloom: true,
    smaa: false,
    fogNear: 20,
    fogFar: 52,
    maxParticles: 320,
    anisotropy: 2,
  },
  low: {
    dpr: 1,
    shadowMap: 1024,
    bloom: false,
    smaa: false,
    fogNear: 18,
    fogFar: 42,
    maxParticles: 160,
    anisotropy: 1,
  },
} as const;
```

---

## 8. UI / HUD

### 8.1 Princípio

**Brutalismo de papel:** grade exposta, bordas de 2 px, cantos retos, sombra dura, tipografia grande, muito espaço negativo. O washi entra como textura e cor, não como “cartão fofinho”. Nada de glassmorphism, gradiente rosa-azul, cantos de 16 px ou sombra difusa.

### 8.2 Tipografia

| Papel | Fonte | Licença | Pesos | Uso |
|---|---|---|---|---|
| Display | **Archivo Black** | OFL | 400 | marca, números gigantes, títulos de tela |
| Serif japonês | **Zen Old Mincho** | OFL | 700/900 | kanji, nomes de ato, subtítulos, loja |
| Texto | **Space Grotesk** | OFL | 400/500/600/700 | corpo, botões, HUD |
| Mono | **Space Mono** | OFL | 400/700 | micro-labels, coordenadas, metadados |

Regras:

- No máximo **3 famílias visíveis por tela** (display + texto + uma de acento).
- `Zen Old Mincho` só para japonês e títulos de ato; não use para corpo.
- Faça subset de japonês com apenas os glifos usados; um woff2 completo de CJK é pesado.
- `--mono` atual aponta para Space Mono, mas o arquivo não está carregado; carregue ou remova a variável. Não deixe fallback silencioso.
- Nunca use fonte “oriental” decorativa de banco de imagens; Zen Old Mincho é uma mincho real, livre e legível.
- Não use texto em japonês aleatório. Cada kanji precisa de tradução e função (ver §8.7).

### 8.3 Escala tipográfica

| Token | Tamanho | Line-height | Letter-spacing | Uso |
|---|---:|---:|---:|---|
| `display-xl` | `clamp(74px, 13.5vw, 196px)` | 0,79 | −0,04em | título MOVESTOP |
| `display-l` | `clamp(44px, 6.4vw, 76px)` | 0,86 | −0,03em | título de tela |
| `display-m` | `clamp(36px, 5.4vw, 76px)` | 0,85 | −0,03em | página/loja |
| `h2` | `clamp(20px, 2vw, 26px)` | 0,95 | −0,02em | nome de card |
| `body` | `14–18px` | 1,45–1,55 | 0 | texto |
| `body-s` | `12–13px` | 1,45 | 0 | descrição de card |
| `label` | `9–11px` | 1,2 | +0,14em | eyebrows, metadados |
| `micro` | `8px` | 1,2 | +0,16em | carimbos, versão |
| `hud-num` | `40px` | 0,95 | −0,02em | munição, HP |
| `button` | `13–17px` | 1 | +0,06em | CTA |

### 8.4 Paleta de UI

| Token | Claro (Washi/Outono/Bambu) | Escuro (Noite/Neon) |
|---|---|---|
| `--ui-bg` | `#F1EEE4` | `#0C0E16` |
| `--ui-surface` | `#FAF7EE` | `#141724` |
| `--ui-ink` | `#141317` | `#F2EFE6` |
| `--ui-muted` | `#6B665C` | `#9AA0B4` |
| `--ui-line` | `rgba(20,19,23,0.18)` | `rgba(242,239,230,0.18)` |
| `--ui-accent` | `#9D3A2E` | `#FFB35C` |
| `--ui-gold` | `#F2B51C` | `#F2B51C` |
| `--ui-cyan` | `#0E8F86` | `#19D3C5` |
| `--ui-danger` | `#E23B2E` | `#FF4D42` |

Regras:

- Texto principal sempre `--ui-ink`; não use vermelho para texto longo.
- Vermelho de UI é destrutivo/erro; dourado é moeda/conquista; ciano é tempo/jogador.
- Em Outono, o acento de UI é indigo `#2C3F63`; em Bambu, persimmon `#D95C2B`; em Neon, âmbar `#FFB84D`.
- Contraste mínimo 4,5:1 para corpo; 3:1 para display grande e ícones.
- A marca pode usar vermelho; no HUD, vermelho é **dano/perigo**. O CTA primário é tinta, não vermelho. Nunca use `#E23B2E` em botão de ação segura (JOGAR, COMPRAR, CONTINUAR).

### 8.5 Componentes

**Cartão (level, item, shop)**

- Fundo `--ui-surface`, borda 2 px `--ui-ink`, raio 0, sombra `4px 4px 0 rgba(20,19,23,0.16)`.
- Padding 16–18 px; gap interno 10–12 px.
- Textura washi 3–4% em `multiply`; não em cada card se houver 6+ na tela.
- Preview 16:9 no topo; número gigante `70–104px` em `Archivo Black`.
- Estado locked: número em outline 2 px, opacidade 0,55, cadeado desenhado em SVG 1,5 px.
- Estado “próximo”: borda 3 px, flag no canto, rotação 0 (não incline cards inteiros).
- Hover: translate(−2px,−2px), sombra 6 px; active: translate(1px,1px), sombra 2 px.
- Nunca use blur, vidro, gradiente ou borda arredondada.

**Botão**

- Altura mínima 48 px; `lg` 56 px; `sm` 38 px.
- Borda 2 px; sombra 3–4 px dura; raio 0.
- Texto uppercase, 13–17 px, letter-spacing 0,06em.
- Primário: fundo `--ui-ink`, texto `--ui-bg`; perigo: `--ui-danger`; ouro: `--ui-gold`.
- Disabled: opacidade 0,4, sem sombra, cursor not-allowed.
- Focus: outline 3 px `--ui-cyan`, offset 2 px.
- Touch: ≥ 44×44 px; nada de hover-only.

**Pill de moeda**

- Altura 40 px, borda 2 px, fundo `--ui-surface`, número tabular.
- Ícone de koban desenhado em SVG (não emoji), 16 px.
- Não use dourado como fundo do pill inteiro; só no ícone/valor.

**Carimbo (hanko)**

- Quadrado 44–56 px, borda 2 px `--ui-danger`, texto vertical ou kanji, rotação −4°.
- Use no máximo 1 por tela; é assinatura, não decoração.

### 8.6 Layout e telas

**Grid:** 12 colunas, largura máxima 1180 px, gutter 16/24 px, margem segura 24 px (mobile 16 px).

**Boot:** marca `M` + ponto vermelho, label “carregando o tempo”, barra de 2 px. Duração mínima 600 ms; sem spinner genérico.

**Menu:** hero com título 196 px, tagline 18 px, 2 CTAs (JOGAR primário, LOJA ghost), rodapé com controles e versão. Washi ocupa 60%; um prop 3D (torii) entra no canto inferior direito, 30% da altura, recortado pela borda.

**Mapa/atos:** 3 colunas de cards; cada ato tem número gigante, nome em 2 linhas, descrição 12 px, 3 estrelas, melhor tempo. Fundo com linha de tinta diagonal; sem mapa-múndi fake.

**Briefing:** card central 590 px, kicker 10 px, título 44–76 px, subtítulo 14–16 px, grid de 3 métricas (AMMO/PAR/PRÊMIO), controles em pills, CTA full width. Entrada por wipe de 240 ms.

**HUD:** 
- topo esquerdo: munição (40 px) + pips; abaixo, HP em células de 16×7 px.
- topo centro: objetivo em pill, máx. 46vw, 11–13 px.
- topo direito: moedas + pause (40×40 px).
- inferior centro: dicas de controle 9 px, opacidade 0,6; desaparecem após 8 s.
- inferior direito: cooldowns de parry/dash em arcos de 2 px; sem números decimais.
- crosshair: 2 linhas de 1 px, 8 px de comprimento, gap 4 px; muda para ciano no parry e vermelho quando sem munição.
- Não cubra a arena com painéis; HUD é borda, não moldura pesada.

**Loja:** grid 3/2/1; header com saldo e filtros (TODOS/SKINS/TEMAS/TRAILS); cards com preview 3D em washi, nome, descrição curta, preço e CTA. Itens owned recebem carimbo “ADQUIRIDO” −4°. Pack de moedas tem borda dourada e “MELHOR VALOR” em pill, sem glitter.

**Resultado:** título grande, 3 métricas, estrelas, botões PRÓXIMO / REPETIR / LOJA. Sem confete; use 12 pétalas ou 12 fragmentos de papel.

**Settings:** linhas de 56 px, label à esquerda, controle à direita; sliders de 2 px com thumb quadrado 12 px; toggles de 40×22 px com borda 2 px.

### 8.7 Japonês com função

Use apenas termos que o jogador entende pelo contexto, sempre com tradução na primeira aparição:

| Termo | Leitura | Uso |
|---|---|---|
| 侍 | samurai | marca/ subtítulo, não botão |
| 旅 | tabi (viagem) | nome de ato/mapa |
| 一騎 | ikki | modo/desafio, se existir |
| 間 | ma (intervalo) | medidor de tempo parado |
| 札 | fuda | cartões/itens |
| 店 | mise | loja |
| 巻物 | makimono | coleção/campanha |

Proibido: kanji aleatório, frases longas sem revisão, “gibberish asiático”, carimbo com ideograma inventado.

### 8.8 Microdetalhes

- Grão de papel no body em 0,14–0,18 de opacidade, `multiply`; **não** cubra texto pequeno com grão forte.
- Bordas deckled apenas em modais (mask SVG), não em botões.
- Sombra de texto: só 2 px dura em títulos sobre imagem; nunca blur.
- Ícones: SVG 24×24, stroke 1,5 px, cantos retos; nada de emoji.
- Animação de UI: 120–180 ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`; sem bounce.
- Toque: 44 px; HUD não pode ficar sob notch/safe-area.

---

## 9. VFX

### 9.1 Regras gerais

- Um pool único de partículas (512 high / 160 low), com `InstancedMesh` por tipo (cubo, quad, anel).
- Nada de `new` por frame; reciclar.
- Partículas de sangue/impacto usam blending normal; faíscas usam additive.
- Todo VFX tem versão low: metade das partículas, sem luz, sem bloom.
- Duração máxima de tela cheia: 80 ms; shake máximo: 6 px/300 ms.
- Nenhum flash acima de 3 Hz (fotossensibilidade).
- O VFX não pode esconder a silhueta do inimigo por mais de 100 ms.

### 9.2 Receitas

| Evento | Geometria | Contagem | Duração | Velocidade | Gravidade | Blend | Cor | Áudio |
|---|---|---:|---:|---|---:|---|---|---|
| **Muzzle flash** | 1 quad 0,12 u + 6 cubos 0,03 u | 7 | 60 ms | 2–4 u/s | 0 | additive | `#FFD08A` / `#FFF6E8` | shoot |
| **Tracer** | 1 box esticado 0,04×0,04×0,6 u | 1 | 80 ms | segue bala | 0 | additive | `PLAYER_CYAN` / `ENEMY_WARN` | — |
| **Impacto em parede** | 10 cubos 0,03–0,06 u + 1 decal 0,08 u | 11 | 180 ms / decal 6 s | 2–5 u/s radial | −8 | normal | `stone` + `#FFF6E8` | tick |
| **Sangue** | 16 cubos 0,04–0,08 u + 1 decal | 17 | 450 ms / decal 8 s | 1,5–4 u/s | −10 | normal | `#B01818` / `#7A0F0F` | hit |
| **Morte de inimigo** | 22 cubos + 1 anel 0,7 u | 23 | 600 ms | 1–3 u/s | −9 | normal | corpo + `ENEMY_DARK` | kill |
| **Parry** | 12 fragmentos + 1 anel 0,9 u | 13 | 220 ms | 3–6 u/s radial | 0 | additive | `FEEDBACK_GOLD` + branco | parry |
| **Dash** | 6 ghosts + 10 linhas | 16 | 180 ms | segue o player | 0 | additive | `PLAYER_CYAN` | dash |
| **Spawn** | 18 cubos subindo + 1 anel 0,6 u | 19 | 500 ms | 0,5–1,5 u/s Y | 0 | normal | `ENEMY_BASE` | spawn |
| **Boss** | 60 fragmentos + 3 anéis | 63 | 1,2 s | 3–8 u/s | −4 | additive | `ENEMY_SPECIAL` + dourado | boss |
| **Morte do player** | 26 cubos + vinheta | 26 | 900 ms | 1–3 u/s | −9 | normal | player + `DAMAGE` | lose |
| **Moeda** | 5 faíscas + pop de UI | 5 | 200 ms | 1–2 u/s | −5 | additive | `FEEDBACK_GOLD` | coin |
| **Tempo parado** | screen-space: sat 0,65 + vinheta +0,08 | 0 | 250 ms | — | — | — | — | clock tick |
| **Tempo voltando** | sat 1,0 + grão +0,02 | 0 | 180 ms | — | — | — | — | whoosh |

### 9.3 Detalhes por evento

**Parry (o mais importante)**

- Hitstop de 70 ms; `timeScale` 0,15 por 80 ms; depois volta.
- 12 fragmentos em leque de 120°, 3–6 u/s, vida 220 ms, cor dourada com núcleo branco.
- Anel de 0,9 u expandindo de 0,2→1,0 em 180 ms, opacidade 0,8→0.
- Bloom pulse de +0,12 por 120 ms; **não** faça flash de tela cheia.
- Áudio: sino + metal; duck da música em 3 dB por 250 ms.
- Se o parry matar, adicione 1 anel branco de 0,6 u e 8 cubos de sangue.

**Dash**

- 6 cópias do avatar a cada 30 ms, opacidade 0,35→0, vida 180 ms; não use afterimage de tela cheia.
- 10 linhas de 0,3 u alinhadas ao movimento, additive, 120 ms.
- Poeira no pé: 4 cubos, 200 ms, cor do piso.
- Não deixe rastro permanente; o jogador precisa saber onde está.

**Morte**

- 22–26 cubos com cores do corpo (não só vermelho), 600–900 ms.
- Decal de sangue no chão: forma irregular de 7–12 blobs, 0,5–1,2 u, fade em 8 s (não permanente).
- Inimigo: tomba 90° em 180 ms antes de estilhaçar; não exploda instantaneamente.
- Player: câmera não gira; vinheta `DAMAGE` 0,35; `timeScale` cai para 0,2 e depois 0.

**Spawn**

- 18 cubos sobem do chão em 500 ms, com 1 v de atraso por cubo; anel vermelho 0,6 u.
- O anel é telegraph, não dano; não empurre o jogador.
- Nos primeiros 300 ms, o inimigo é invulnerável e pisca 2 vezes; depois, normal.
- Nunca spawn a menos de 5 u do jogador; entre 5 e 6 u, o telegraph precisa de ≥ 1,0 s.

**Boss**

- Entrada: 60 fragmentos, 3 anéis, 1,2 s, shake 6 px/300 ms, bloom 0,6 por 400 ms.
- Ataque: telegraph de 1,2 s com linha dupla e 3 anéis concêntricos; não use só cor.
- Fase 2: paleta ganha `ENEMY_SPECIAL`, mas mantém o corpo vermelho; o dourado é detalhe.
- Morte: 60 cubos + 3 anéis + 1,5 s de slow motion; sem confete.

---

## 10. Áudio procedural

### 10.1 Cadeia e níveis

```text
source → gain → filter → panner → bus (sfx/music/ui) → compressor → master → destination
```

| Barramento | Ganho | Conteúdo |
|---|---:|---|
| master | 0,70 | tudo; mute zera |
| sfx | 0,85 | tiros, impactos, parry, dash |
| music | 0,12 | taiko, shamisen, flauta, drone |
| ui | 0,50 | cliques, compra, moeda |

Compressor master: `threshold −12 dB`, `knee 6`, `ratio 4`, `attack 0,003 s`, `release 0,25 s`. Nada de clipping; pico alvo −1 dBFS.

### 10.2 Receitas de timbre

| Som | Camadas | Frequências | Duração | Ganho | Observação |
|---|---|---|---|---:|---|
| **Taiko (don)** | sine + noise + triangle | 96→42 Hz; noise LP 180 Hz; 220 Hz | 120 / 90 / 40 ms | −8 dB | ataque 4 ms; variar ±3% por golpe |
| **Taiko (ka)** | noise + sine | BP 900 Hz; 180 Hz | 40 / 60 ms | −14 dB | borda do tambor |
| **Shamisen** | saw + triangle detune 3 cents | fundamental D4 293,66 Hz; BP 1,2 kHz Q2 | 4 ms attack / 350 ms decay | −14 dB | “bachi”: noise HP 4 kHz 15 ms |
| **Flauta** | sine + 2º harmônico + breath | D4; vibrato 5,2 Hz / 8 cents; noise BP 2,5 kHz | attack 80 ms / sustain | −16 dB | frases longas, legato |
| **Sino** | 4 parciais | 1 / 2,76 / 5,40 / 8,93 × f0 | 1,8 / 1,2 / 0,8 / 0,5 s | −16 dB | f0 440–660 Hz; strike noise 10 ms |
| **Vento** | noise | LP 400 Hz, LFO 0,1 Hz | loop | −24 dB | corta quando o tempo para |
| **Cigarra** | noise | BP 5 kHz, AM 40 Hz | loop | −26 dB | só Noite/Outono |
| **Relógio parado** | sine | 1.200 Hz | 15 ms a cada 1 s | −30 dB | quase subliminar |
| **Whoosh de movimento** | noise | BP 600 Hz | 120 ms | −20 dB | dispara ao voltar a mover |

Escala: **hirajoshi** em D (D, E, F, A, Bb). Alternativa aceitável: **miyako-bushi** em D (D, Eb, G, A, Bb), a sonoridade de “Sakura Sakura”. Use uma das duas para shamisen/flauta; não misture com maior/menor ocidental para “japonês genérico”.

### 10.3 Restrições WebAudio

- `AudioContext` só após gesto do usuário; `resume()` em `visibilitychange` e no primeiro clique.
- Não use `setInterval` para ritmo musical; use scheduler com lookahead de 25 ms e horizonte de 100 ms.
- Limite de 32 vozes simultâneas; rate limit de 30–50 ms por evento (evita “metralhadora de áudio”).
- Reutilize um `AudioBuffer` de ruído de 1,2 s; não crie buffer por tiro.
- Pan: `StereoPannerNode` com `x/12` limitado a ±0,8; distância: `1/(1+d/6)`.
- Mute real: `master.gain → 0` em 30 ms; não destrua o contexto.
- Aba oculta: `suspend()`; ao voltar, `resume()` sem replay de sons atrasados.
- Sem arquivos externos; tudo procedural. CPU alvo < 5%.
- `timeScale` controla o filtro da música: `cutoff = 300 + 2700 * timeScale`; ganho `0.10 + 0.06 * timeScale`.
- Quando o tempo para: taiko e shamisen mudos, drone LP 300 Hz, relógio entra.
- Quando o jogador se move: filtro abre em 180 ms, taiko volta, whoosh sutil.
- Teste em mono: nada essencial pode depender só de pan.
- Não use sons “épicos” de trailer; o jogo é íntimo e percussivo.

### 10.4 Mix por momento

| Momento | Música | SFX | Ambiente |
|---|---|---|---|
| Menu | shamisen + flauta, −18 dB | UI | vento leve |
| Tempo parado | drone 300 Hz, sem taiko | relógio, passos | vento baixo |
| Movimento | taiko + shamisen, −14 dB | passos, tiros | vento normal |
| Combate | taiko mais denso, −12 dB | tudo | cigarra/vento |
| Parry | duck 3 dB por 250 ms | sino + metal | — |
| Morte | silêncio 400 ms, depois drone | impacto | vento |
| Vitória | shamisen ascendente + sino | UI | pétalas |

---

## 11. Regras de “não fazer” (anti asset flip / anti AI slop)

1. **Não copie** logo, personagem, construções, HUD, tipografia dourada, composições ou qualquer asset de *Ronin Trail*. Use só princípios visuais.
2. **Não use** “low poly genérico” com triângulos facetados, cristais flutuantes, ilhas flutuantes ou palmeiras.
3. **Não use** PBR de vitrine: chrome, vidro, reflexo de environment map, metal espelhado.
4. **Não use** gradiente roxo-azul de IA, “aurora” no céu, partículas de poeira dourada em tudo.
5. **Não use** bloom global, chromatic aberration, lens flare, lens dirt, vinheta pesada em todas as telas.
6. **Não use** mixels (voxels de tamanhos diferentes no mesmo objeto) sem regra 2:1.
7. **Não use** textura fotorrealista ou photo-scan em prop voxel.
8. **Não use** mais de 6 cores por prop; mais de 3 famílias de matiz por tema.
9. **Não use** kanji aleatório, frases em japonês sem revisão ou “gibberish” decorativo.
10. **Não use** emoji como ícone; desenhe SVG 1,5 px.
11. **Não use** cards arredondados, glassmorphism, sombra difusa, botão pill, gradiente SaaS.
12. **Não use** fonte script “oriental” de banco de imagens; use Zen Old Mincho.
13. **Não use** vermelho vivo em prop, parede, roupa de NPC ou UI comum.
14. **Não use** ciano em prop ou inimigo.
15. **Não use** dourado em inimigo comum.
16. **Não use** simetria perfeita; todo prop precisa de 1 imperfeição.
17. **Não use** o mesmo prop com a mesma rotação duas vezes na mesma arena.
18. **Não use** grama alta ou folhagem que esconda bullets, telegraphs ou o jogador.
19. **Não use** mais de 2 telas com o mesmo layout; varie a composição.
20. **Não invente** precisão histórica: é Edo estilizado, não documentário. Marque licenças poéticas.
21. **Não adicione** sistema novo (clima dinâmico, dia/noite, física de destruição) sem orçamento de arte e performance.
22. **Não deixe** placeholder de asset no build: cubo cinza, texto “TODO”, ícone quebrado.
23. **Não use** flash de tela cheia, shake longo ou strobe; respeite fotossensibilidade.
24. **Não use** “voz de trailer” ou música épica genérica; o áudio é percussivo e íntimo.
25. **Não sacrifique** leitura por beleza: se o teste de 80 ms falhar, simplifique.

---

## 12. Checklist de aceitação visual — arena 17×13

### 12.1 Geometria e composição

- [ ] A grade tem exatamente **17×13** células; a borda é parede de 1 célula; o interior jogável é **15×11**.
- [ ] A arena mede **30,94 × 23,66 m**; o interior, **27,30 × 20,02 m**.
- [ ] A câmera está a **23 u**, FOV **36°**, pitch **55°**; a arena inteira cabe com margem de 1,5 u nas laterais e 1 u no topo/base.
- [ ] O jogador aparece com **~79 px** de altura em 1080p.
- [ ] Há **1 ponto focal** vertical no terço de fundo (torii, árvore ou telhado).
- [ ] Há **2 planos de cover** em primeiro plano, um de cada lado.
- [ ] Há **1 área de respiro** de pelo menos 3×3 células, sem props.
- [ ] Há **1 linha de fuga** visual (pedra, tatame, água) atravessando a arena.
- [ ] O spawn do jogador tem linha de visão para ≥ 60% da arena.
- [ ] Nenhum spawn de inimigo fica a menos de **5 u** do jogador; abaixo de **6 u**, exige telegraph ≥ 1,0 s.

### 12.2 Props e colisão

- [ ] 12–18 props colocados; 8–12 tipos diferentes.
- [ ] No máximo **2 props H** (torii/árvore) e **6 M**.
- [ ] Nenhum prop decorativo usa vermelho vivo, ciano ou dourado.
- [ ] Todo prop tem collider compatível (círculo/caixa), nunca trimesh.
- [ ] Cover baixo tem 0,4–0,9 u e esconde pernas/torso baixo, mas não a cabeça; cover total tem 1,1–1,8 u e esconde a silhueta.
- [ ] Nenhum prop alto (> 2 u) no meio de lane; torii só na borda/fundo.
- [ ] Tatames estão alinhados em 2 por célula, com rotação alternada.
- [ ] Cercas formam bordas contínuas, sem gaps de 1 v.
- [ ] Nenhum prop repete a mesma rotação na mesma arena.
- [ ] Nenhum prop flutua; todos tocam o chão ou estão pendurados com suporte visível.
- [ ] Nenhum z-fighting em decals, tatame ou telhado.

### 12.3 Cor e contraste

- [ ] A cena funciona em **escala de cinza** (teste de valor).
- [ ] O tema usa no máximo **3 famílias de matiz** + neutros.
- [ ] O acento ocupa ≤ **10%** da área da tela.
- [ ] Inimigo vs piso: **ΔL\* ≥ 25** na massa do corpo; jogador: **ΔL\* ≥ 20** na massa **ou** 3:1 garantido por contorno/rim.
- [ ] UI: texto ≥ **4,5:1**; display grande ≥ **3:1**.
- [ ] Nenhum prop usa `#E23B2E`, `#19D3C5` ou `#F2B51C` como cor dominante.
- [ ] O jogador tem **núcleo branco + rim ciano**; em fundo claro, contorno `PLAYER_DARK`.
- [ ] O inimigo tem contorno `ENEMY_DARK` de 1 v.
- [ ] Teste em deuteranopia: os 5 arquétipos continuam distinguíveis por forma.
- [ ] Teste de 80 ms: o jogador é encontrado em < 300 ms; cada inimigo é identificado em < 500 ms.

### 12.4 Iluminação e pós

- [ ] Uma única direção de sombra; sem sombras conflitantes.
- [ ] Sem shadow acne, sem peter-panning, sem sombra “dura” em personagem.
- [ ] Bloom só em emissivos; nada de bloom no piso, papel ou corpo inteiro.
- [ ] Fog começa ≥ 18 u; não lava o gameplay.
- [ ] Tone mapping coerente com o tema (Neutral em Washi/Outono/Bambu; AgX em Noite/Neon).
- [ ] DPR limitado a 2 (high) / 1 (low); dynamic resolution funcionando.
- [ ] High: ≥ 60 fps em 1080p numa GTX 1060/M1; Low: ≥ 30 fps em Iris/integrado.
- [ ] Draw calls ≤ **80** (high) / **40** (low); tris ≤ **90 k** / **45 k**.
- [ ] Partículas ≤ **512** (high) / **160** (low).
- [ ] Nenhuma alocação de geometria/material por frame.

### 12.5 VFX

- [ ] Muzzle flash ≤ 60 ms; tracer ≤ 80 ms; impacto ≤ 180 ms.
- [ ] Sangue com decal que desaparece em 8 s; sem decal permanente.
- [ ] Parry com hitstop de 70 ms, anel dourado e 12 fragmentos.
- [ ] Dash com 6 ghosts, 180 ms; sem rastro permanente.
- [ ] Spawn com 18 cubos, 500 ms, anel vermelho; invulnerável nos primeiros 300 ms.
- [ ] Morte com 22–26 cubos e decal; sem explosão instantânea.
- [ ] Nenhum flash de tela cheia > 80 ms; ≤ 3 flashes/s.
- [ ] Shake ≤ 6 px e ≤ 300 ms.
- [ ] VFX não esconde a silhueta do inimigo por > 100 ms.

### 12.6 UI/HUD

- [ ] HUD não cobre mais de 20% da tela.
- [ ] Munição, HP, objetivo, moedas e cooldowns legíveis a 1 m do monitor.
- [ ] Crosshair de 1 px, 8 px de comprimento, gap 4 px.
- [ ] Fontes: Archivo Black + Space Grotesk + Zen Old Mincho (máx. 3).
- [ ] Nenhum texto em japonês sem tradução/função.
- [ ] Botões ≥ 48 px; touch ≥ 44 px.
- [ ] Contraste de UI ≥ 4,5:1.
- [ ] Layout mobile 390×844 sem sobreposição; safe-area respeitada.
- [ ] Nenhum card com raio > 0; sombra dura, não blur.
- [ ] Nenhum emoji como ícone.

### 12.7 Áudio

- [ ] Áudio só inicia após gesto; mute funciona; aba oculta suspende.
- [ ] Sem clipping; pico ≤ −1 dBFS.
- [ ] Taiko, shamisen, flauta e sino soam distintos e afinados em hirajoshi.
- [ ] Tempo parado muda o filtro e remove taiko; movimento reabre em 180 ms.
- [ ] Parry faz duck de 3 dB; morte faz silêncio de 400 ms.
- [ ] Pan/distance ajudam a localizar inimigos, mas nada essencial depende só de pan.
- [ ] ≤ 32 vozes; sem `setInterval` para ritmo.

### 12.8 Teste final de arte

- [ ] 10 screenshots (5 temas × 2 ângulos) revisados lado a lado.
- [ ] Nenhum asset parece “asset flip” ou “AI slop” segundo a lista §11.
- [ ] Nenhum asset copiado de *Ronin Trail*; comparação lado a lado documentada.
- [ ] A arena funciona nos 5 temas sem trocar geometria, só paleta/luz/fog.
- [ ] O jogador consegue jogar 60 s sem perder a própria silhueta.
- [ ] O reviewer consegue descrever a arena em 1 frase (ponto focal + clima).

---

## 13. Pesquisa, fontes e incertezas

### 13.1 Fontes usadas

| Fonte | Uso | Acesso |
|---|---|---|
| Steam — *Ronin Trail* (app 1606970) | status, descrição, screenshots oficiais | 2026-11-23 |
| Unreal Engine — entrevista com devpachi (12/10/2022) | voxels, MagicaVoxel, Blender, “soft voxel”, DOF, fog, kasa, influências | 2026-11-23 |
| GameGrin — entrevista com devpachi (20/07/2022) | MagicaVoxel, Kurosawa, Vagabond, combate, voxels | 2026-11-23 |
| Wikipedia — Traditional colors of Japan | HEX de cores tradicionais | 2026-11-23 |
| Wikipedia — *Bokashi* (printing) | gradiente na xilogravura, azul da Prússia | 2026-11-23 |
| Wikipedia — *Shoji* / *Ken (unit)* | módulo 1,82 m, tatame 0,91×1,82 m | 2026-11-23 |
| Wikipedia — *Superhot* / Eurogamer | paleta limitada, inimigos vermelhos, tempo | 2026-11-23 |
| Wikipedia — *Filmmaking technique of Akira Kurosawa* / Bordwell | wipes, clima, teleobjetiva, deep focus | 2026-11-23 |
| Washi Arts / Awagami / Hiromi Paper | fibras de kozo, translucidez, textura | 2026-11-23 |
| Google Fonts / GitHub googlefonts | licenças OFL de Archivo Black, Space Grotesk, Space Mono, Zen Old Mincho | 2026-11-23 |

Links diretos:

- Steam: <https://store.steampowered.com/app/1606970/Ronin_Trail/>
- Entrevista Unreal Engine (acessada via espelho de leitura): <https://www.unrealengine.com/developer-interviews/ronin-trail-is-a-voxel-based-open-world-game>
- Entrevista GameGrin: <https://gamegrin.com/articles/developer-interview-ronin-trail>
- Cores tradicionais: <https://en.wikipedia.org/wiki/Traditional_colors_of_Japan>
- Bokashi: <https://en.wikipedia.org/wiki/Bokashi_(printing)>
- Shoji: <https://en.wikipedia.org/wiki/Shoji>
- Ken: <https://en.wikipedia.org/wiki/Ken_(unit)>
- SUPERHOT: <https://en.wikipedia.org/wiki/Superhot>
- Técnica de Kurosawa: <https://en.wikipedia.org/wiki/Filmmaking_technique_of_Akira_Kurosawa>
- Washi: <https://washiarts.com/what-is-washi>
- Zen Old Mincho: <https://fonts.google.com/specimen/Zen+Old+Mincho>

### 13.2 O que é fato vs. decisão de arte

**Fatos verificados sobre Ronin Trail:** engine Unreal, voxels feitos em MagicaVoxel e otimizados no Blender, normal maps de sombreamento suave para o look “soft voxel”, uso de DOF e fog volumétrico, protagonista rōnin de chapéu de palha, influências de Kurosawa/Vagabond/Samurai Champloo, combate letal com sangue e desmembramento. Status na Steam: “Coming soon”, Early Access planejado, demo disponível, sem reviews de usuário na data de acesso.

**Decisões deste guia (não são fatos do jogo de referência):** todos os HEX, escalas, contagens de partículas, orçamentos de performance, nomes de arquétipos, layouts de UI, receitas de áudio e a arena 17×13. Foram projetados para MOVESTOP e devem ser validados em engine.

**Incertezas explícitas:**

- A paleta exata de *Ronin Trail* não é publicada; as cores deste guia são escolhas originais.
- A grade de voxels de *Ronin Trail* não é pública; a escala 0,1 u é nossa.
- Não há confirmação de que *Ronin Trail* use os shaders/post-processos exatos descritos aqui; o dev confirmou “soft voxel”, DOF e fog, não a implementação.
- O status de lançamento pode mudar; confira a Steam antes de citar.
- Os tempos de windup vêm de `ENEMY_DEFS` do código atual e podem ser ajustados por balanceamento; a arte deve seguir o gameplay, não o contrário.
- Não foram identificados e verificados outros jogos comerciais de “voxel samurai” além de *Ronin Trail* dentro do escopo desta pesquisa. Para não inventar títulos, o guia ancora a referência em *Ronin Trail* e no trabalho de voxel japonês de Niklas Mäckle, citado pelo próprio dev. Se o time trouxer outros títulos, eles devem ser avaliados com a mesma régua de “princípios, não assets”.

### 13.3 Mapa de aplicação no código atual (recomendação, não aplicado)

| Área | Onde | O que fazer |
|---|---|---|
| Paleta dos temas | `src/game/catalog.ts` (`ThemeDef`) | alinhar os HEX da §3.2; manter os campos existentes |
| Paleta de UI | `src/style.css` (`:root`) | trocar vars; adicionar `--ui-*`; grão 0,14 |
| Props | novo `src/game/props.ts` | geometria mesclada + `InstancedMesh`; tabela §4 |
| Personagem | `src/game/voxel.ts` (`PlayerAvatar`) | aplicar proporções §5; rim ciano; 5 skins |
| Inimigos | `src/game/voxel.ts` (`EnemyAvatar`) + `levels.ts` | silhuetas §6; telegraph por arquétipo |
| Luz/post | setup da cena (main) | §7; `NeutralToneMapping`/`AgX`; bloom seletivo |
| VFX | novo `src/game/vfx.ts` | pool + receitas §9 |
| Áudio | `src/game/audio.ts` | camadas §10; scheduler; filtro por `timeScale` |
| UI | `src/style.css` + telas | §8; manter a identidade brutalista existente |

> Este documento não altera nenhum desses arquivos. A implementação deve ser feita em tickets separados, com teste visual e de performance.

---

## 14. Resumo executivo em 12 linhas

1. Aesthetic: diorama de papel japonês, voxels macios, câmera telefoto, clima contido.
2. Escala: 1 u = 1,82 m; 1 v = 0,1 u; arena 17×13 = 30,9×23,7 m.
3. Cor: ambiente dessaturado; jogador ciano/branco; inimigo vermelho; feedback dourado.
4. Cinco temas: Washi, Noite, Neon, Outono, Bambu, com 14 papéis cada.
5. Props: 25 tipos, 12–18 por arena, ≤ 2 pesados, ≤ 35 k tris de cenário.
6. Jogador: 11 v, kasa 7 v, katana 10 v, fuzil 12 v; 5 skins com silhuetas distintas.
7. Inimigos: 5 arquétipos com forma + cor + som + telegraph de 3 estágios.
8. Luz: hemisphere 1,15 + directional 2,4 + fill 0,35; sombra 2048; fog 22–60.
9. Post: bloom 0,38 / threshold 0,85; Neutral ou AgX; grão 12 fps; SMAA.
10. UI: Archivo Black + Space Grotesk + Zen Old Mincho; cartões 2 px, sombra dura, zero raio.
11. VFX: 60–900 ms, 5–63 partículas, sem flash > 80 ms; áudio 100% procedural.
12. Critério: se não passa no teste de 80 ms e no checklist §12, não entra.

---

**Fim do guia.**
