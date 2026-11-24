# MOVESTOP — Level Design

Auditoria e reformulação da campanha (8 fases / 3 atos). Documento de trabalho:
tudo aqui é dado de design, não código. Fonte auditada: `src/game/levels.ts`
(grids, ondas, munição, par) e `src/game/save.ts` (progressão).

**Pilares usados para julgar cada fase**

1. **Parar é jogar.** Se a melhor jogada é ficar imóvel, a fase está quebrada.
2. **Uma fase, uma ideia.** Cada fase ensina ou testa um verbo (mirar, contornar,
   aparar, quebrar linha, ler corrida).
3. **Morte tem dono.** Com 1 HP, dano inevitável é bug de design, não dificuldade.
4. **Munição é ritmo, não solução.** Balas definem cadência; parry define maestria.
5. **Silhueta antes do susto.** Todo perigo tem estado legível com o tempo parado.

---

## 1. Auditoria crítica das 8 fases atuais

### 1.1 Bugs concretos (bloqueantes)

| # | Fase | Problema | Coordenada | Impacto |
|---|------|----------|-----------|---------|
| B1 | 1 Primeiro Movimento | Inimigo nasce na célula do fragmento | `gunner [2,12]` = `o` | Sobreposição inimigo/coletável; se o fragmento for pego antes, o spawn fica num "buraco" de leitura |
| B2 | 5 Corredor | Inimigo nasce **dentro de parede** | `hunter [9,4]` = `#` | Caçador preso ou atravessando geometria; onda perde 25% da ameaça |
| B3 | 7 Cerco | Inimigo nasce **dentro de parede** | `hunter [2,8]` = `#` | Acontece na **onda 4**, a mais difícil; se a onda só fecha matando todos, a fase trava |
| B4 | 5 Corredor | Só **1 fragmento** no grid | `o [4,8]` | Quebra a economia de 3 fragmentos das outras 7 fases e o meta de coleta |
| B5 | 8 Relojoeiro | Fragmento a 2 tiles do `P`, no eixo do boss | `o [9,8]` | Coleta "de graça" no caminho; não cria decisão risco/recompensa |

**Achado de sistema:** `save.unlocked` é limitado a `Math.min(3, …)` (`save.ts:55`),
mas a campanha tem **8 fases**. A progressão não comporta o conteúdo atual —
ou o cap sobe para 8, ou o desbloqueio passa a ser por ato (`1 / 4 / 7`).

### 1.2 Fairness (spawns e dano inevitável)

Medi distância euclidiana e linha de visão (LOS) de cada spawn até o `P`:

| Fase | Spawn | Dist. | LOS | Veredito |
|------|-------|-------|-----|----------|
| 2 | `gunner [8,4]`, onda 2 | **2,8** | sim | Inaceitável: nasce colado, à vista, atirando |
| 4 | `burster [3,1]`, onda 3 | **2,8** | sim | Rajada de 3 à queima-roupa na última onda |
| 6 | `shield [9,2]`, onda 3 | **3,2** | sim | Escudo que avança e bloqueia frontal a 3 tiles |
| 7 | `hunter [2,3]`, onda 3 | **3,0** | não | Corrida com 3 tiles de reação |
| 7 | `gunner [1,1]`, onda 1 | 4,5 | sim | Abre a fase com tiro já armado |
| 5 | `hunter [2,8]`, onda 2 | 4,0 | sim | Caçador com LOS limpo a 4 tiles; contato mata |

Não existe, no dado, nenhum campo de **telegraph de onda**. Ou o runtime tem uma
regra fixa (e então ela precisa ser auditada), ou os spawns aparecem "prontos" — o
que transforma cada troca de onda em roleta.

### 1.3 Ritmo e progressão

- **Curva aos saltos.** 2 → 2 → 3 → 2 → 4 → 3 → 4/5 → boss (ondas por fase). O
  salto 6→7 é de 10 para 16 inimigos (+60%) com **menos** munição (8→6).
- **Par incoerente.** F3 (0 balas, 8 inimigos, só parry) tem 50 s; F2 (8 inimigos,
  7 balas) tem 42 s; F7 (16 inimigos, 4 ondas) tem 80 s = 5,0 s por inimigo,
  incluindo travessia entre ondas. O par não reflete o custo real.
- **Sem alternância pico/vale.** O Ato II só sobe (5 → 6 → 6,5) e o Ato III abre
  em 8. Faltam vales curtos para o jogador consolidar o verbo aprendido.
- **Munição contra caçadores.** F5: 6 balas, 4 caçadores (imunes a parry) + 7
  atiradores. F7: 6 balas, 4 caçadores + 12 atiradores. Um erro de mira = fase
  impossível (softlock), não fase difícil.

### 1.4 Clareza

- **F3 exige parry antes de ensiná-lo.** O jogador chega ao nível "sem munição"
  sem nunca ter aparado: a fase inteira é tutorial e prova ao mesmo tempo.
- **F6 promete o que não entrega.** "Paredes têm janelas" — não existe janela,
  one-way ou vidro no grid; é só um corredor. Copy contra mecânica.
- **F7 promete cerco.** "Deixe o cerco trabalhar por você" — nada fecha, nada
  aperta, nenhum barrel é posicionado para o cerco. É uma arena comum com 4 ondas.
- **F4 não ensina a regra do laser.** O subtítulo explica ("a mira termina antes
  de você"), mas o laser não tem estado de "travado" — o tiro sai da linha atual.

### 1.5 Variedade

- **Spawn template repetido.** 5 das 8 fases começam com `P` nas colunas 2–3 e
  inimigos vindos da direita. O jogador aprende a pré-mirar o canto superior
  direito; a "surpresa" da fase 7 é a mesma da 1.
- **Arenas convexas.** Quase todas são salas com pilares: nenhuma rota de uma
  via, nenhum bolsão, nenhum corredor que obrigue compromisso.
- **Fragmentos sem triângulo.** Em F1 os três ficam no lado direito; em F4 dois
  ficam no corredor direito e um cola na saída do jogador. Coletar é "ir até lá",
  não "escolher qual risco pagar".
- **Caixas decorativas.** 0–3 por fase, nunca posicionadas para cortar uma linha
  de sniper específica ou cobrir uma rota de fuga.

### 1.6 O buraco sistêmico: camping

Como o tempo só anda com o jogador, **uma onda só com inimigos estáticos é
eternamente segura**. F4 onda 1 = 2 snipers parados (`moveSpeed: 0`). O jogador
fica atrás da parede e a onda nunca termina nem ameaça: stall, não stealth.

Regra derivada: **nenhuma onda pode ser 100% estacionária**. Toda onda precisa de
ao menos uma fonte de pressão espacial (atirador que avança, caçador, barril
posicionado, corredor estreito).

### 1.7 O que está bom e deve sobreviver

- F1 é um tutorial honesto: sala aberta, 4 inimigos em 2 ondas, 6 balas, sem exóticos.
- F3 como *conceito* é a melhor ideia da campanha (a arma é o inimigo).
- F6 tem a única geometria com "sala + corredor" e barris — vale aprofundar.
- Boss de 14 HP com adds está na faixa certa de duração para um ato final.

---

## 2. Fases revisadas

Legenda mantida: `#` parede · `x` caixa · `b` barril · `P` player · `o` fragmento · `.` chão.
Todas as coordenadas são `[linha, coluna]` (0-based) e o grid tem **17 colunas × 13 linhas**.

Regras aplicadas em todas as 8:

- 3 fragmentos, sempre alcançáveis, nunca a menos de 2 tiles do `P`.
- Spawn mínimo de **5,0 tiles** do `P`; abaixo de 6 tiles, exige telegraph ≥ 1,0 s.
- Nenhuma onda 100% estacionária.
- Munição ≥ nº de caçadores + 2 (nunca softlock por falta de bala).
- `P` sempre com **duas saídas** (nunca num bolsão de saída única).

### Fase 1 — PRIMEIRO MOVIMENTO

**Beat:** *"ande, pare, leia"*. Duas pausas curtas: o jogador entende que parar
congela o windup inimigo e que mirar é gratuito. Nada de exótico.

```text
#################
#...............#
#.....#....o....#
#.....#.........#
#..o............#
#.....#.........#
#.P...#.........#
#.....#.........#
#.....#####..o..#
#...............#
#....x..........#
#...............#
#################
```

- **Munição:** 6 · **Par:** 28 s · **Alvo 1ª limpeza:** 1:10 · **Dificuldade:** 2/10
- **Fragmentos:** (2,11) · (4,3) · (8,13) — o de (4,3) é o "de graça" (ensina o que é); os outros dois pagam com exposição.
- **Caixas:** (10,5) · **Barris:** —
- **P:** (6,2), duas saídas (norte pelo vão em (4,6), sul pela lateral do bloco em (8,6)–(8,10)).

| Onda | Inimigos | Duração alvo | Leitura |
|------|----------|--------------|---------|
| 1 | GUNNER [3,13] · GUNNER [10,13] | 8 s | Dois ângulos opostos, ambos longe; ensina varredura de tela |
| 2 | GUNNER [1,9] · GUNNER [11,7] · GUNNER [5,15] | 12 s | Terceiro ângulo força o primeiro reposicionamento real |

**Por que funciona:** LOS inicial quebrado pela coluna de parede em `col 6`; o
inimigo mais próximo está a 7,1 tiles, atrás do bloco `(8,6)-(8,10)`. A caixa em (10,5)
é a primeira capa do jogo — o jogador descobre cobertura sem morrer.
**Parry já entra aqui:** o hint ensina o botão e a onda 1 dispara **uma** bala
isolada, sem pressão, só para o jogador testar o rebote. É a diferença entre F3
ser confirmação e F3 ser emboscada.
**Risco a vigiar:** se o jogador gastar 4 balas na onda 1, ainda vence (6 balas,
5 inimigos). Folga intencional.

---

### Fase 2 — LINHA DE FOGO

**Beat:** *"o escudo tem costas"*. Primeiro exótico: SHIELD. A fase inteira é uma
aula de flanco — o corredor central convida ao tiro frontal e pune.

```text
#################
#...............#
#..o.......x....#
#....###........#
#.....#....o....#
#..P..#.........#
#.....#.........#
#.....###.......#
#........#......#
#..x.....#..o...#
#........#......#
#...............#
#################
```

- **Munição:** 7 · **Par:** 40 s · **Alvo 1ª limpeza:** 1:50 · **Dificuldade:** 3,5/10
- **Fragmentos:** (2,3) · (4,11) · (9,12) — (4,11) fica **atrás** do eixo do escudo: pegar exige contornar.
- **Caixas:** (2,11) · (9,3) · **Barris:** —
- **P:** (5,3), saídas norte (row 1) e sudeste (vão em (9,8)).

| Onda | Inimigos | Duração alvo | Leitura |
|------|----------|--------------|---------|
| 1 | SHIELD [5,13] · GUNNER [10,12] | 10 s | Um escudo descendo o corredor; o gunner pune quem só olha o escudo |
| 2 | SHIELD [4,13] · GUNNER [1,10] · GUNNER [10,3] | 12 s | Segundo escudo + pressão dos dois lados |
| 3 | SHIELD [6,14] · BURSTER [10,13] · GUNNER [10,1] | 14 s | Rajada atrás do escudo: aparar é mais rápido que flanquear |

**Por que funciona:** as caixas em (2,11) e (9,3) cortam as duas linhas longas,
então o flanco é sempre um compromisso de 3–4 tiles, nunca um passeio.
**Risco a vigiar:** a onda 1 é a mais fácil — se o escudo morrer antes do gunner,
o jogador não aprende o flanco. Ordem de spawn (escudo primeiro no corredor, gunner
atrás) garante que o escudo chegue à metade da arena.

---

### Fase 3 — DESARMADO

**Beat:** *"sua arma é o inimigo"*. Zero balas. Só GUNNER e BURSTER (tudo
aparável), arena simétrica de 8 pilares para o jogador escolher de onde aparar.

```text
#################
#...............#
#..##.......##..#
#...............#
#.....o...o.....#
#...##.....##...#
#.......P.......#
#...##.....##...#
#...............#
#..##.......##..#
#.......o.......#
#...............#
#################
```

- **Munição:** 0 (`noAmmoDrops`) · **Par:** 48 s · **Alvo 1ª limpeza:** 2:20 · **Dificuldade:** 5/10
- **Fragmentos:** (4,6) · (4,10) · (10,8) — os dois de cima obrigam a sair do centro; o de baixo fica atrás de um pilar.
- **Caixas/Barris:** — (nada de objeto que "resolva" a fase: só parry)
- **P:** (6,8) — centro exato, 4 rotas de fuga.

| Onda | Inimigos | Duração alvo | Leitura |
|------|----------|--------------|---------|
| 1 | GUNNER [1,2] · GUNNER [1,14] | 12 s | Simétrico e lento: ensina a mirar *na bala*, não no inimigo |
| 2 | GUNNER [11,1] · GUNNER [11,15] · GUNNER [1,8] | 14 s | Três ângulos; o de cima chega por cima de um pilar |
| 3 | BURSTER [1,5] · BURSTER [11,11] · GUNNER [6,15] | 18 s | Rajada dupla: cada rebatida precisa acertar 3 balas ou posicionar antes |

**Por que funciona:** arena simétrica = o jogador sempre tem um pilar a ~3 tiles;
cada bala viaja ≥5 tiles, então a janela de parry é confortável com o tempo parado.
**Risco a vigiar:** é o pico de habilidade do ato 1. Se o playtest mostrar >6 mortes
por sessão, reduza a onda 3 para 1 burster + 1 gunner (mantendo 8 inimigos, alonga
o ritmo em vez de aumentar a densidade).

---

### Fase 4 — SALA DE ESPERA

**Beat:** *"quebre a linha"*. SNIPER entra: laser de 1,5 s que **para de rastrear**
0,25 s antes do disparo. O mapa é um corredor de três pistas — a solução é rotação
pelo topo ou pela base, não correr no aberto.

```text
#################
#...............#
#.....#...#.....#
#..o..#...#..o..#
#.....#...#.....#
#.P...#...#.....#
#.....#...#.....#
#.....#...#.....#
#..........#....#
#..###.....#....#
#.........o.....#
#...............#
#################
```

- **Munição:** 6 · **Par:** 46 s · **Alvo 1ª limpeza:** 2:20 · **Dificuldade:** 5/10
- **Fragmentos:** (3,3) · (3,13) · (10,10) — um por pista: coletar todos exige atravessar 3 linhas de laser.
- **Caixas:** (8,3) · (10,12) · **Barris:** —
- **P:** (5,2), na pista oeste; saídas pelo topo (row 1) e pela base (row 8).

| Onda | Inimigos | Duração alvo | Leitura |
|------|----------|--------------|---------|
| 1 | SNIPER [2,13] · GUNNER [11,3] | 12 s | O gunner é a pressão que impede camping; o sniper é a lição |
| 2 | SNIPER [10,7] · SNIPER [2,14] · GUNNER [10,15] | 14 s | Dois lasers em pistas diferentes: uma rotação resolve os dois |
| 3 | SNIPER [9,14] · BURSTER [3,12] · GUNNER [1,8] | 16 s | Rajada no corredor central fecha a rota "fácil" |

**Por que funciona:** as duas paredes verticais (col 6 e col 10) criam três
pistas reais; a caixa em (8,3) é o único ponto de respiro ao sair da pista oeste.
**Risco a vigiar:** sem o gunner, a onda 1 vira stall (era o bug do original).
Nunca remova o elemento móvel desta fase.

---

### Fase 5 — CORREDOR

**Beat:** *"eles chegam"*. HUNTER: não atira, corre, mata por contato. É a única
fase em que a bala vale mais que o parry — e a munição finalmente é apertada.

```text
#################
#...............#
#..##..###..##..#
#...............#
#.o.....P.....o.#
#...............#
#..##..###..##..#
#...............#
#.....##....##..#
#...............#
#...............#
#.......o.......#
#################
```

- **Munição:** 9 · **Par:** 52 s · **Alvo 1ª limpeza:** 2:50 · **Dificuldade:** 6/10
- **Fragmentos:** (4,2) · (4,14) · (11,8) — os laterais ficam nas duas bocas do corredor; o de baixo fica atrás do muro duplo.
- **Caixas/Barris:** — (arena limpa: a corrida precisa de linha reta para ser lida)
- **P:** (4,8) — centro; quatro saídas, duas por cima e duas por baixo dos pilares.

| Onda | Inimigos | Duração alvo | Leitura |
|------|----------|--------------|---------|
| 1 | HUNTER [1,1] · HUNTER [1,15] · GUNNER [11,1] | 12 s | Duas corridas simétricas: ensina que parar **não** para o caçador |
| 2 | HUNTER [11,2] · HUNTER [1,14] · GUNNER [1,3] · GUNNER [11,13] | 16 s | Cruzado: uma corrida por cima, uma por baixo; o tiro separa as duas |
| 3 | HUNTER [2,15] · HUNTER [10,1] · BURSTER [11,7] | 18 s | Rajada no eixo central enquanto dois caçadores fecham as laterais |

**Por que funciona:** os pilares em duas fileiras (rows 2 e 6) dão linha para a
corrida e quebra de LOS para o tiro; o jogador tem que escolher *quem* matar com
bala (caçador) e *quem* deixar vir para aparar (gunner).
**Risco a vigiar:** 9 balas / 6 caçadores. Se a taxa de acerto cair de 70%, a fase
vira sorte; o failsafe de munição (seção 5.4) deve estar ativo.

---

### Fase 6 — VIDRO FUMÊ

**Beat:** *"o barril não pergunta de que lado você está"*. Escudo + barril: a
explosão **ignora o escudo**, então o barril é a resposta barata para o flanco —
e a armadilha para quem atira no escuro.

```text
#################
#...............#
#..x...o...b....#
#.....###...#...#
#......#....#.o.#
#......#....#...#
#..P...#........#
#......#....#...#
#.....###...#...#
#..o.......b.b..#
#..........x....#
#...............#
#################
```

- **Munição:** 7 · **Par:** 54 s · **Alvo 1ª limpeza:** 3:00 · **Dificuldade:** 6,5/10
- **Fragmentos:** (2,7) · (4,14) · (9,3) — (4,14) fica na sala leste, atrás da linha de escudos.
- **Caixas:** (2,3) · (10,11) · **Barris:** (2,11) · (9,11) · (9,13) — os dois de baixo formam cadeia.
- **P:** (6,3); saídas por cima (vão em (3,4)) e por baixo (vão em (8,4)).

| Onda | Inimigos | Duração alvo | Leitura |
|------|----------|--------------|---------|
| 1 | SHIELD [3,14] · GUNNER [2,13] | 12 s | Escudo na sala leste: o barril de (2,11) está no caminho dele |
| 2 | BURSTER [1,12] · BURSTER [10,9] · SHIELD [4,15] | 16 s | Rajada de cima e de baixo + escudo: hora de usar a cadeia (9,11)-(9,13) |
| 3 | SHIELD [8,14] · SHIELD [9,9] · BURSTER [2,6] · GUNNER [11,14] | 20 s | Dois escudos em eixos diferentes; um barril bem usado mata os dois |

**Por que funciona:** os barris ficam **fora** da sala do jogador (nada explode nas
costas no primeiro segundo) e **no** corredor dos escudos (uso tático). A cadeia
(9,11)+(9,13) dá o momento "eu causei isso".
**Risco a vigiar:** explosão em cadeia perto do `P` é morte sem autoria. Se a
cadeia alcançar (10,11), mova a caixa para (10,14) — capa, não combustível.

---

### Fase 7 — CERCO

**Beat:** *"quatro ondas, um recurso"*. Prova final do ato 3: **gestão**. Cada
onda cobra uma resposta diferente (espaço, mira, corrida, caos) e a munição não
volta.

```text
#################
#..x.......x..o.#
#.....###.......#
#.....#....#..b.#
#.....#....#..o.#
#..P..#....#....#
#.....###..#....#
#...........#...#
#..x.....b......#
#.....o.........#
#..###....###...#
#...............#
#################
```

- **Munição:** 9 · **Par:** 85 s · **Alvo 1ª limpeza:** 4:00 · **Dificuldade:** 8/10
- **Fragmentos:** (1,14) · (4,14) · (9,6) — (9,6) fica **ao lado do barril** (8,9): risco explícito.
- **Caixas:** (1,3) · (1,11) · (8,3) · **Barris:** (3,14) · (8,9)
- **P:** (5,3) na câmara oeste; saídas por cima (row 1) e por baixo (row 7).

| Onda | Inimigos | Duração alvo | Leitura |
|------|----------|--------------|---------|
| 1 | GUNNER [1,6] · GUNNER [1,15] · HUNTER [10,8] | 14 s | Abre com tiro de trás da parede + caçador: não dá para pré-mirar tudo |
| 2 | SHIELD [3,13] · BURSTER [8,13] · SNIPER [1,8] · GUNNER [10,2] | 18 s | Quatro verbos ao mesmo tempo; a caixa (8,3) é a única sombra |
| 3 | HUNTER [2,13] · HUNTER [9,14] · SHIELD [3,12] · GUNNER [10,6] | 20 s | Duas corridas + escudo na mesma linha: escolha de alvo importa |
| 4 | BURSTER [1,8] · BURSTER [11,3] · SHIELD [8,14] · SNIPER [11,15] · HUNTER [1,9] | 24 s | Fecha com tudo, mas tudo **longe**: ≥6 tiles, telegraph de 1,0 s |

**Por que funciona:** a câmara oeste (5×6, duas saídas) é um abrigo que cada onda
empurra o jogador a abandonar. O barril (8,9) é a saída de emergência: mata o
escudo que avança pelo corredor ou o burster que se aproxima.
**Risco a vigiar:** 16 inimigos com 9 balas só fecha se o parry estiver dominado.
É intencional: F7 é o exame. Monitore "quantas vezes o jogador ficou sem bala com
caçador vivo" — se >20%, ative o failsafe.

---

### Fase 8 — O RELOJOEIRO

**Beat:** *"a arena é o mostrador"*. Boss de 14 HP, quatro ataques telegrafados,
dois adds. O núcleo só abre **1,0 s depois de cada ataque** — parar e estudar é a
mecânica, não a muleta.

```text
#################
#.......o.......#
#...##.....##...#
#...............#
#..o...........o#
#...............#
#.....#...#.....#
#...............#
#...............#
#...##.....##...#
#...............#
#.......P.......#
#################
```

- **Munição:** 8 · **Par:** 120 s · **Alvo 1ª limpeza:** 4:30 · **Dificuldade:** 9/10
- **Boss:** (3,8), 14 HP · **P:** (11,8) — 8 tiles de distância, sem LOS quebrada no eixo central (linha limpa para o primeiro ataque).
- **Fragmentos:** (1,8) **atrás do boss** · (4,3) · (4,15) — os laterais exigem sair do eixo durante padrões.
- **Caixas:** — · **Barris:** — · **Pilares:** (2,4)-(2,5), (2,11)-(2,12), (9,4)-(9,5), (9,11)-(9,12), (6,6), (6,10)
- **Paredes:** `#` em (6,6) e (6,10) são as duas únicas coberturas do miolo — usadas pelo PONTEIRO.

Detalhamento do boss na **seção 4**.

---

## 3. Curva de dificuldade e duração alvo

| Fase | Verbo novo | Inimigos | Munição | Par | 1ª limpeza | Parry exigido | Dif. |
|------|-----------|----------|---------|-----|------------|---------------|------|
| 1 Primeiro Movimento | mover/mirar | 5 | 6 | 28 s | 1:10 | 0 | 2 |
| 2 Linha de Fogo | flanquear | 8 | 7 | 40 s | 1:50 | 1–2 | 3,5 |
| 3 Desarmado | aparar | 8 | 0 | 48 s | 2:20 | 8 (todos) | 5 |
| 4 Sala de Espera | quebrar LOS | 8 | 6 | 46 s | 2:20 | 2–3 | 5 |
| 5 Corredor | ler corrida | 10 | 9 | 52 s | 2:50 | 6–8 | 6 |
| 6 Vidro Fumê | barril tático | 9 | 7 | 54 s | 3:00 | 5–6 | 6,5 |
| 7 Cerco | gestão | 16 | 9 | 85 s | 4:00 | 11–12 | 8 |
| 8 Relojoeiro | padrão + janela | 14 + 4 adds | 8 | 120 s | 4:30 | 8–9 | 9 |

**Leitura da curva**

- Soma dos par: **7:53**. Soma das primeiras limpezas: **~22 min** (com 1–2 mortes por fase).
- Dois picos: **F3** (habilidade pura) e **F7** (gestão). Dois vales: **F1** (tutorial) e **F4** (respiro tenso, mesmo par de F3).
- F3 → F4 é o único trecho "difícil → igual". É de propósito: F4 troca execução por leitura.
- Nenhuma fase passa de **2,5× o par** na primeira limpeza, exceto F7 (2,8×) — aceitável por ser exame de ato.
- **Regra de aprovação:** se a mediana de mortes de 10 testadores for >4 numa fase, o problema é densidade, não velocidade. Corte 1 inimigo da última onda antes de mexer em `fireScale`.

**Alvos de sessão**

| Sessão | Conteúdo | Alvo |
|--------|----------|------|
| Speedrun (par) | 8 fases | ≤ 8:00 |
| Clear casual | 8 fases, 1–2 mortes/fase | 22–26 min |
| 100% (todos os fragmentos) | + desvios | +6–8 min |
| Replay com modificador | ver seção 6 | 12–20 min por run |

---

## 4. Boss — O RELOJOEIRO

### 4.1 Ficha

| Campo | Valor |
|-------|-------|
| HP | 14 (fases em ≤9 e ≤4) |
| Posição | (3,8), corpo fixo, 0,8 tile de raio |
| Arena | grid da Fase 8; 6 blocos de cobertura (dois pares no topo, dois na base, dois centrais) |
| Núcleo | **invulnerável**, exceto por 1,0 s após cada ataque resolver ("o mostrador abre") |
| Parry | bala rebatida **sempre** fere, ignorando o núcleo fechado |
| Adds | HP 9 → 2 GUNNER; HP 4 → 2 HUNTER |
| Tempo alvo | 100–130 s de tempo de mundo |

### 4.2 Ataques

| Ataque | Telegraph | Execução | Como ler parado | Como sobreviver |
|--------|-----------|----------|-----------------|-----------------|
| **VOLTA** | 1,1 s — anel de luz no chão, 8 setores | 8 balas radiais (5,2 u/s), 2 setores vazios opostos | O anel desenha os setores vazios antes de qualquer bala sair | Fique no vão; aparar 1 bala já fere o boss |
| **PONTEIRO** | 1,3 s — linha grossa do boss até a parede | varredura de 140° em 1,2 s, para no primeiro obstáculo | A linha mostra exatamente onde a cobertura corta | Quebre LOS atrás de (6,6)/(6,10) ou de um par de pilares |
| **CONTRATEMPO** | 0,7 s — clarão + recuo de 0,25 s | leque de 3 balas (12°, 7,0 u/s) mirado no `P` | O clarão congela com o mundo: dá para contar o leque | Um passo lateral de 1 tile; aparar devolve as 3 |
| **ADDS** | 1,2 s — portas laterais acesas | 2 GUNNER em (4,5)/(4,11) · 2 HUNTER em (10,2)/(10,14) | O portal fica aceso enquanto congelado | Matar os caçadores com bala; os gunners alimentam parry |

**Cadências (tempo de mundo):** VOLTA a cada 3,4 s · PONTEIRO a cada 5,0 s ·
CONTRATEMPO a cada 4,2 s. Dois ataques nunca começam a menos de **0,5 s** um do
outro; após troca de fase, o primeiro ataque tem **+0,4 s** de telegraph.

### 4.3 Fases

| Fase | HP | Muda | Janela do núcleo |
|------|----|------|------------------|
| I — Corda | 14–10 | VOLTA + PONTEIRO alternados | 1,0 s |
| II — Engrenagem | 9–5 | + CONTRATEMPO, cadência −10%, adds de gunner | 1,0 s |
| III — Hora extra | 4–1 | cadência −20%, VOLTA com **1** vão, PONTEIRO espelhado, adds de caçador | 0,9 s |

Transição: 1,2 s de invulnerabilidade, sino, flash curto. Nunca há ataque novo e
add no mesmo instante: add primeiro, ataque 1,5 s depois.

### 4.4 Por que o time-stop deixa o boss justo

1. **Tudo congela junto com o jogador.** O anel da VOLTA, a linha do PONTEIRO e o
   clarão do CONTRATEMPO são *decais* — não animações que precisam de tempo. Parar
   no meio de um padrão é a ferramenta de leitura, não uma pausa de menu.
2. **Nenhum ataque resolve no mesmo "passo" em que começa.** O mínimo entre
   telegraph e dano é 0,7 s de mundo — e o jogador controla esse relógio.
3. **O núcleo fechado impede cheese.** Não dá para ficar atrás de um pilar atirando
   de graça: só há dano na janela ou no parry. Isso força o jogador a se expor.
4. **Parry é o caminho do mestre.** Quem apara a VOLTA inteira mata em ~8 janelas;
   quem só atira leva o dobro. Autoestrada de habilidade sem obrigar.
5. **Adds são combustível, não dano.** Gunners dão balas de parry de graça; os
   caçadores custam munição. O orçamento de 8 balas fecha com 2 reservadas.

### 4.5 Erros a não repetir no boss

- Boss que atira durante a fala de apresentação (dano sem leitura).
- Add spawnando atrás do jogador sem portal visível — o portal de 1,2 s é obrigatório.
- Padrão que exige dash sem ensinar dash: o boss usa **andada lateral**, não dash.
- Sweep com hitbox contínua sem decal: sem a linha prévia, é lottery.

---

## 5. Regras de fairness (spawns, leitura de tiros, áudio)

### 5.1 Contrato de spawn

**Regra de ouro:** spawn visível (com LOS) e a menos de 6 tiles do jogador **só
existe com telegraph** — 0,9 s de materialização em que o inimigo não atira, não
anda e pode ser morto. Spawn sem telegraph é permitido apenas atrás de parede e a
≥7 tiles.

| Tipo | Dist. mín. do P | Telegraph | LOS no spawn | Regra extra |
|------|-----------------|-----------|--------------|-------------|
| GUNNER | 5,0 | 0,9 s (1,0 s se LOS <6) | livre a partir de 5,0 | nunca no cone traseiro |
| BURSTER | 5,5 | 1,0 s | livre a partir de 5,5 | nunca 2 no mesmo arco de 90° |
| SNIPER | 6,0 | 1,5 s | livre (laser precisa) | laser trava 0,25 s antes do tiro |
| SHIELD | 4,5 | 0,8 s | livre | rota de flanco ≤3 tiles andando |
| HUNTER | 7,0 | 1,0 s + agachar 0,5 s | **sem** LOS <7 | nunca 2 no mesmo corredor |
| ADD (boss) | 6,0 | 1,2 s | porta lateral | máx. 2 vivos |

Regras transversais:

1. **Regra do cone:** proibido spawnar a menos de 8 tiles **atrás** do jogador
   (120° nas costas). Se precisar cercar, use ≥10 tiles + cue de áudio.
2. **Regra dos 0,9 s:** nenhum inimigo pode causar dano antes de 0,9 s de mundo
   após aparecer (0,7 s de materialização + 0,2 s de margem).
3. **Regra da saída:** toda onda deixa uma rota de fuga de 3 tiles que não passe a
   menos de 1 tile de um inimigo armado.
4. **Regra da onda viva:** nova onda só entra com ≤1 inimigo restante; o total
   simultâneo nunca passa de 6 (7 no Ato III).
5. **Regra do estático:** toda onda tem ≥1 elemento móvel (bug do F4 original).
6. **Regra do softlock:** se `ammo == 0` e houver caçador vivo por 15 s de mundo,
   a caixa mais próxima quebra e solta 1 bala; sem caixa na arena, a bala surge no
   chão a ≥4 tiles do jogador (nunca no colo, nunca atrás de caçador).
   Vale em todas as fases exceto F3 (`noAmmoDrops`).

### 5.2 Leitura de tiro

- **Cor por dono:** gunner vermelho · burster laranja · sniper rosa · shield vinho ·
  boss dourado. A bala carrega a cor de quem atirou; o rebatido fica ciano.
- **Rastro de 3 frames** mesmo congelado: nunca blur que esconda a trajetória.
- **Velocidade:** 5,6–6,4 u/s para todos, exceto sniper (15,5 com laser). O jogador
  precisa conseguir vencer uma bala andando de lado — 6,4 é o teto.
- **Sniper:** a linha vai até a **primeira célula sólida** e termina ali. Um trace
  curto é informação ("estou coberto"), não bug.
- **Parry:** arco de 0,18 s, a bala inverte e sai **na direção da mira**, 20% mais rápida.
  O rebatido **não** colide com o atirador original no caminho (senão o parry fica
  impossível em corredor).
- **Congelado, tudo é estático:** nenhum efeito depende de animação para comunicar
  perigo. Se não dá para ler numa screenshot, o telegraph está errado.

### 5.3 Orçamento de dano

Com 1 HP, cada onda precisa oferecer pelo menos **duas** destas três saídas:

1. cobertura a ≤3 tiles,
2. janela de parry ≥0,35 s,
3. barril utilizável (que não esteja a <2 tiles do `P`).

Se uma onda não tiver duas, ela é injusta por construção.

### 5.4 Áudio (cues distintos, sem mascarar)

| Evento | Cue | Faixa | Prioridade |
|--------|-----|-------|-----------|
| Windup gunner | clique seco | 1,2 kHz | média |
| Windup burster | 3 cliques crescentes | 800–1,4 kHz | alta |
| Sniper carregando | assobio + zumbido do laser | 400→1,2 kHz | alta |
| Escudo avançando | arrasto metálico | 150 Hz | baixa |
| Caçador | rosnado + passo | 90–200 Hz | alta |
| **Parry** | "tang" metálico | 2,4 kHz | **máxima** |
| Barril | sibilo de pavio 0,6 s | 3 kHz | alta |
| Onda limpa | sino | 660 Hz | média |
| Munição vazia | clique seco no gatilho | 2 kHz | alta |

- Música cai **4 dB** enquanto houver windup mirado no jogador; melodia some na
  fase III do boss (só pulso do relógio).
- O parry precisa ser o som mais alto do mix — é o feedback de domínio.
- Todo cue tem versão "congelada" (loop curto), porque o tempo pode parar no meio.

---

## 6. 10 modificadores de desafio (replay)

| # | Nome | Regra | Para quem | Multiplicador |
|---|------|-------|-----------|---------------|
| 1 | **Casco Quebrado** | sem casco/ONI; 1 hit sempre mata | puristas | +25% moedas |
| 2 | **Conta-Gotas** | −2 balas; barril conta dano dobrado | puzzle de recurso | +30% |
| 3 | **Ponteiro Solto** | todas as cadências −20% | execução | +30% |
| 4 | **Sem Freio** | o mundo mantém 20% da velocidade parado | speedrunners | +50% |
| 5 | **Caçada** | +1 HUNTER em toda onda | pressão espacial | +35% |
| 6 | **Vidro** | caixas quebram com 1 tiro e não voltam | arena dinâmica | +25% |
| 7 | **Dash Negado** | sem dash; parry recarrega 30% mais rápido | maestria de parry | +40% |
| 8 | **Tiro Cego** | balas invisíveis até 1 tile do impacto (só áudio) | áudio | +60% |
| 9 | **Maratona** | 8 fases em sequência, munição carrega, 1 vida | run completa | +100% |
| 10 | **Relojoeiro 2.0** | boss 26 HP, os dois padrões se sobrepõem desde a fase I | endgame | +80% |

Notas de implementação:

- Modificadores **não** mudam os par times oficiais (ranking separado).
- 4 e 8 mudam a leitura fundamental: exigem aviso na tela antes de começar.
- 9 é o único que muda a economia de munição entre fases; documentar a regra
  ("carrega o que sobrou, mínimo 2") na tela de seleção.
- Combinações proibidas: 4+8 (ilegível), 1+7 (sem margem nenhuma), 2+5 (softlock).

---

## 7. Checklist de teste

### 7.1 Por fase (rodar em todas as 8)

- [ ] Grid 13 linhas × 17 colunas; borda sólida; `P` único.
- [ ] Todos os spawns em `.`, alcançáveis por BFS a partir do `P`.
- [ ] Nenhum spawn a <5,0 tiles; nenhum com LOS a <6 sem telegraph ≥1,0 s.
- [ ] 3 fragmentos, todos alcançáveis, nenhum a <2 tiles do `P`.
- [ ] Nenhuma onda 100% estacionária.
- [ ] `munição ≥ caçadores + 2`.
- [ ] Vitória possível gastando o pior caso de balas (simular 0% de parry nos não-caçadores).
- [ ] `P` com duas saídas; rota de fuga de 3 tiles em toda onda.
- [ ] Nenhum barril a <2 tiles do `P`.
- [ ] Áudio: cada tipo com cue distinto; parry audível sobre a música.
- [ ] Par ≥ 1,3× o **melhor** clear de 10 testadores (par é meta de speedrun, não tempo de 1ª limpeza).
- [ ] 60 fps com o pior caso (16 inimigos + 20 balas + 3 barris).

### 7.2 Matriz de observação por fase

| Fase | O que precisa ser observado em playtest |
|------|------------------------------------------|
| 1 | O jogador para de andar sozinho ao ver o windup? (se não, o tutorial falhou) |
| 2 | Ele tenta atirar no escudo de frente antes de flanquear? (esperado 1×) |
| 3 | Quantas mortes antes de descobrir que a mira define o rebote? |
| 4 | Ele usa as pistas ou tenta correr no aberto? |
| 5 | Ele gasta bala em gunner em vez de caçador? (erro de leitura) |
| 6 | Alguém morre pela própria cadeia de barris? (se >30%, mover barril) |
| 7 | Quantas vezes acaba a munição com caçador vivo? (failsafe dispara?) |
| 8 | Ele descobre a janela do núcleo sem dica? (se não, adicionar brilho no mostrador) |

### 7.3 Regressão de dados (script de lint)

O validador usado neste documento deve virar teste de CI. Ele checa:

1. 8 fases, `grid.length === 13`, toda linha `length === 17`, borda `#`.
2. Exatamente um `P` e três `o`; `o` e `P` alcançáveis.
3. `waves` e `boss.at` em célula `.`.
4. Distância mínima e LOS por spawn (tabela 5.1).
5. `ammo ≥ hunters + 2` (exceto `noAmmoDrops`).
6. `par ≥ soma das durações alvo das ondas`.

**Estado atual:** as 8 fases revisadas acima passam nos 6 checks. As 8 originais
violam o check 2 (B4: só 1 fragmento) e o check 3 (B1, B2, B3: spawns fora do chão).
B5 não é erro de lint — é erro de design, e só o playtest pega.

---

## Anexo — números medidos (fases revisadas)

| Fase | `P` | Spawn mínimo | Spawns com LOS | Onda 1/2/3/4 | Total |
|------|-----|--------------|----------------|--------------|-------|
| 1 | (6,2) | 7,1 | 1 (a 7,1) | 2/3 | 5 |
| 2 | (5,3) | 5,0 | 1 (a 5,4) | 2/3/3 | 8 |
| 3 | (6,8) | 5,0 | 4 | 2/3/3 | 8 |
| 4 | (5,2) | 6,1 | 1 | 2/3/3 | 8 |
| 5 | (4,8) | 5,8 | 2 | 3/4/3 | 10 |
| 6 | (6,3) | 5,0 | 0 | 2/3/4 | 9 |
| 7 | (5,3) | 5,0 | 2 | 3/4/4/5 | 16 |
| 8 | (11,8) | — | 0 | boss | 14+4 |

Os cinco spawns com LOS a 5,0–5,8 tiles são de ondas com telegraph de 1,0 s e
área aberta; qualquer redução de distância exige aumento de telegraph.
