# MOVESTOP — Plano de negócio e monetização

> **Documento de pesquisa e decisão.** Não altera código. As recomendações abaixo assumem a campanha estática (Vite + Three.js), progresso em `localStorage` e pagamentos simulados. **Atualização:** o duelo 1v1 online usa um servidor Bun autoritativo (`server/`, veja `docs/ONLINE.md`); a campanha continua estática e compras reais seguem fora do escopo.
>
> **Data-base:** 23 de novembro de 2026. Câmbio de referência: **US$ 1 ≈ R$ 5,90** [46]. O câmbio flutua; reprice sempre que variar mais de 10%.
>
> **Como ler os números:** este relatório separa **[FATO]** (dado publicado, com fonte), **[ESTIMATIVA]** (conta própria, com premissas explícitas) e **[OPINIÃO]** (julgamento do autor). Benchmarks de fornecedores de ads e de retenção são tratados como indicativos, não como média de mercado. Os números entre colchetes ([1], [2]...) remetem à lista de fontes na §10.

---

## 0. Resumo executivo

1. **O modelo principal deve ser free-to-play direto com IAP cosmético + pacote de apoiador.** É o que melhor combina com a força real do MOVESTOP — acesso instantâneo, sessão de 2–5 min e um mecanismo visualmente compartilhável — mesmo que o ticket médio seja menor que o de um premium bem-sucedido.
2. **O modelo secundário é o híbrido com ads recompensados, mas só dentro de portais (CrazyGames/Poki), onde o anúncio é a única monetização permitida.** Não coloque anúncios no site próprio no lançamento. O Founder/Supporter Edition é o SKU âncora dentro do modelo principal, não um modelo separado; Steam e mobile ficam para depois de o jogo ter 10–15 fases.
3. **Anúncios não são um plano.** Portais pagam algo como US$ 1–1,50 por 1.000 partidas [7]. Um único Founder Pack de US$ 14,99 vale mais que 10.000 partidas em portal. Ads só entram como consequência de distribuição em Poki/CrazyGames, nunca como estratégia central.
4. **O maior risco comercial não é falta de tráfego: é vender poder e revive agressivo em um jogo de 3 fases, sem backend.** Tudo que for vendido como vantagem competitiva será trivialmente editado no `localStorage` e vai destruir a confiança. Venda cosmético, status e apoio; poder, não.
5. **Pagamento:** Stripe Brasil (Pix + cartão) para o mercado local e Paddle como merchant of record para o exterior. Lemon Squeezy está sendo desligada (31/03/2027) e não deve ser adotada [32]. Licenças assinadas (ECDSA P-256) emitidas por um Cloudflare Worker mínimo resolvem o entitlement sem servidor de jogo.

---

## 1. Benchmarks: quanto jogos web e casuais realmente ganham

### 1.1 O mercado web em 2026

**[FATO]** O Poki relata **100 milhões de jogadores ativos por mês em 2026**, contra 10 milhões em 2020, e mais de 600 desenvolvedores no catálogo [15]. O CrazyGames é o segundo maior portal, com dezenas de milhões de MAU segundo comparativos de mercado de 2026; a ordem de grandeza é essa.

**[FATO]** Pesquisa do Poki com 2.000 jogadores de web (EUA/Reino Unido, maio/2026): **37% jogam web games várias vezes por dia**; **27% gastam mais de US$ 50/mês em jogos** em todas as plataformas; **62% já compraram ou baixaram um jogo depois de descobri-lo no navegador** [15]. Isso mostra que o público web não é necessariamente pobre — mas o gasto acontece majoritariamente **fora** do jogo web.

**[FATO]** Sessão típica: 11–20 minutos, com 2–3 jogos por sessão [15]. O MOVESTOP, com sessões de 2–5 min, está alinhado com o formato, mas precisa de um motivo para o jogador voltar no mesmo dia.

### 1.2 Retenção: o número que decide tudo

| Fonte | D1 | D7 | D30 | Observação |
|---|---:|---:|---:|---|
| GameAnalytics 2026 (mediana de 16 mil jogos mobile) | ~22% | <4% | 0,7–0,8% | Mediana real de mercado [3] |
| GameAnalytics 2026 (top 1%) | — | — | 13–15% | Outliers [3] |
| AppLixir (web casual, dados de fornecedor) | 40–50% | 15–25% | 5–10% | Amostra de clientes do fornecedor; otimista [1] |
| MOBAT (casual, "ilustrativo") | 35–45% | 12–18% | 4–8% | O próprio site diz que não é dado medido [4] |

**[OPINIÃO]** Para o MOVESTOP, o número certo para planejar é o do meio: **D1 25–35%, D7 8–15%, D30 3–6%** em um lançamento com alguma tração. A mediana de 22% D1 e <4% D7 é o chão realista; os 40–50% D1 de fornecedor de ads não devem entrar em plano de receita.

### 1.3 ARPDAU e ARPPU: cuidado com a mistura de conceitos

| Segmento / modelo | ARPDAU | Conversão de pagantes | ARPPU | Fonte |
|---|---:|---:|---:|---|
| Web casual, só ads | US$ 0,01–0,05 | — | — | Playio 2026 [2] |
| Web casual, ARPU (ads) | US$ 0,03–0,12 (ARPU) | — | — | AppLixir [1] |
| Web action/arcade (ads) | US$ 0,08 (ARPU) | — | — | AppLixir [1] |
| Mobile casual, IAP | US$ 0,10–0,30 | 1–3% | US$ 15–40/mês | MOBAT, ilustrativo [4] |
| Mobile hyper-casual | US$ 0,05–0,15 | 0,3–1% | US$ 8–20/mês | MOBAT, ilustrativo [4] |
| Mobile hybrid-casual | US$ 0,15–0,50 | — | — | Playio 2026 [2] |
| Mobile casual, D90 por pagante | — | — | US$ 7,26 (receita de compra) | AppsFlyer 2026 [5] |

**[FATO]** A AppsFlyer mede **US$ 7,26 de receita de compra por pagante casual em D90** [5]. Esse é um bom teto para a receita por pagante nos primeiros 90 dias do MOVESTOP: um jogo curto não deve esperar US$ 30–40 por pagante.

**[ESTIMATIVA]** Para um web game sem backend, sem conta e com 3 fases, a conversão realista fica **abaixo** do mobile casual: **0,3–1,5% dos jogadores únicos**, com ARPPU de **US$ 5–12**. Não porque o público seja pior, mas porque (a) não há login, (b) o catálogo é pequeno, (c) o pagamento exige sair do jogo para um checkout externo e (d) o conteúdo acaba em 15 minutos.

### 1.4 Quanto os portais pagam por partida

| Portal | Modelo | O que o desenvolvedor recebe | Números publicados / relatados |
|---|---|---|---|
| **CrazyGames** | Ads via SDK; IAP convidado (Xsolla) | 60% de ads e 70% de IAP nos termos da jam 2026, segundo levantamento de 2026 [6]; termos gerais não publicam % | Mínimo € 100; pagamento mensal via Tipalti [8][10][11] |
| **Poki** | Só ads; **não há IAP** | 100% da receita do tráfego direto; divisão no tráfego do portal (relatos de 50/50) | Exclusividade web de 5 anos por padrão [12][13] |
| **GameDistribution** | Ads | ~33% do líquido | Mínimo € 100 [7] |
| **Playgama Bridge** | Ads/IAP | ~80% | Termos da Playgama [7] |
| **itch.io** | Venda direta/PWYW | 90% padrão (0–100% configurável) | Você traz o tráfego [16][17] |
| **Newgrounds** | Ads legado/supporters | Em transição para ad-free; sem revenue share relevante | Marketing, não receita [50] |

**[FATO]** Casos reais relatados por desenvolvedores: **US$ 37 em 36.477 partidas** no CrazyGames (~US$ 1 por 1.000 partidas) [7]; **€ 556,92 em 451.327 partidas** em oito jogos WebGL (~€ 1,20 por 1.000) [6][7]; **€ 0,19 na primeira semana** no GameDistribution [7]. A dispersão é enorme, mas a ordem de grandeza é clara.

**[FATO]** **Licenciamento:** a Poki tem dois modelos. No exclusivo, ela investe em marketing e paga revenue share sobre o tráfego que traz, com exclusividade web de 5 anos (Steam e mobile ficam fora). No não exclusivo, oferece **uma taxa única de licença, sem revenue share** [12]. Para um jogo que já está no itch.io/CrazyGames, o modelo não exclusivo pode ser a única porta de entrada.

**[ESTIMATIVA]** 100.000 partidas em portal, pelos casos reais relatados (~US$ 1–1,50 por 1.000), dão **US$ 100–150** para o desenvolvedor — antes de impostos. A fórmula teórica (50–60% de opt-in × eCPM de US$ 8–12) chega a **US$ 250–400**, mas os relatos reais ficam bem abaixo disso; planeje pelo real. Isso paga o domínio, não o desenvolvimento.

### 1.5 Premium: o outro extremo

**[FATO]** Na Steam, a mediana de receita de um jogo indie lançado em 2025 foi **US$ 347**; **66% dos lançamentos ficaram abaixo de US$ 1.000** [19][20]. A Steam fica com **30%** até US$ 10 milhões, 25% até US$ 50 milhões e 20% acima; a taxa de publicação é **US$ 100 por app**, recoupável após US$ 1.000 de receita bruta ajustada [18].

**[FATO]** SUPERHOT, a referência mais próxima do MOVESTOP, passou de **2 milhões de cópias** na franquia [48]. É um outlier construído com anos de marketing, console e VR — não um benchmark de lançamento de 3 fases.

**[OPINIÃO]** Premium só faz sentido para o MOVESTOP quando houver **10–15 fases, editor de fases, conquistas e uma página de Steam com wishlist**. Lançar 3 fases a US$ 9,99 na Steam é comprar um fracasso estatístico.

### 1.6 O que isso significa para o MOVESTOP

| Verdade desconfortável | Consequência prática |
|---|---|
| Portal paga ~US$ 1–1,50 por 1.000 partidas | Ads são troco; não desenhe o jogo para ads. |
| Web casual converte menos que mobile | O primeiro SKU precisa ser barato e óbvio, e o checkout precisa ser de 1 clique. |
| 3 fases não sustentam preço premium | Venda "apoio + cosmético", não "campanha". |
| Sem backend, poder vendido é poder pirateado | Venda status, não vantagem. |
| O público web gasta, mas fora do jogo | Capture e-mail e leve o fã para Steam/itch depois. |

---

## 2. Modelos aplicáveis

### 2.1 Comparação

| Modelo | Como funciona | Prós para o MOVESTOP | Contras | Fit |
|---|---|---|---|---|
| **(a) Premium pago** (Steam/itch) | Paga uma vez, joga tudo | Receita por unidade alta; simples; sem tentação de pay-to-win | 3 fases é pouco; Steam mediana US$ 347; exige wishlist e marketing; 30% de comissão | **Baixo agora, médio depois** |
| **(b) F2P + IAP cosmético + revive** | Grátis; vende skins, temas, rastros, pacotes e revive | Aproveita acesso instantâneo; escala com compartilhamento; margem alta; sem backend | Conversão baixa; sem backend o entitlement é frágil; revive mal desenhado queima reputação | **Principal** |
| **(c) Híbrido com ads recompensados** | Ads em pausas + rewarded para moedas/revive | Funciona em portais; não exige checkout; receita em tráfego frio | eCPM baixo no Brasil; UX pior; portais proíbem IAP externo; ad-block | **Secundário tático (só portal)** |
| **(d) Battle pass / season** | Passe com recompensas por temporada | Receita recorrente; retenção | Exige conteúdo novo a cada 4–6 semanas; sem backend, timers e entitlements são fáceis de burlar; 3 fases não sustentam | **Não agora** |
| **(e) Licenciamento B2B / white-label** | Versão brandada para marca, evento ou portal | Ticket alto (R$ 5k–25k por projeto) [ESTIMATIVA]; reusa engine; sem depender de conversão | Venda consultiva; distrai do produto; contratos e suporte | **Upside, não plano A** |

### 2.2 Recomendação

**Principal: (b) free-to-play direto com IAP cosmético + pacote de apoiador.** Justificativa:
- O jogo é curto e o acesso é instantâneo; cobrar entrada reduz o topo do funil exatamente onde o formato web é mais forte.
- O custo marginal de uma skin é zero; a margem é alta mesmo com taxas de 6–15%.
- O mecanismo "o tempo só anda quando você anda" é visual e compartilhável; o crescimento orgânico alimenta o funil de IAP.
- O Founder Pack captura os superfãs com ticket alto sem exigir 15 fases.

**Secundário: (c) híbrido com ads recompensados, mas somente dentro de portais (CrazyGames/Poki), onde os anúncios são a única monetização permitida.** Não coloque anúncios no site próprio no lançamento: o eCPM brasileiro (US$ 1–3) não paga a perda de UX e o trabalho de consentimento. Use o portal para descoberta e para monetizar tráfego frio; use o site próprio para IAP e relacionamento.

**Terceiro caminho, só depois:** (e) white-label. Se o jogo tiver uma estética forte, uma versão brandada para uma marca/evento pode pagar mais que meses de IAP. Trate como projeto sob encomenda, não como modelo recorrente.

**O que não fazer:** lançar como premium na Steam com 3 fases; lançar battle pass; vender "vida extra permanente" ou "dash" como item pago; apostar em ads como receita principal.

---

## 3. Funil de IAP

### 3.1 Jornada desenhada (e onde cada oferta entra)

| Etapa | O que o jogador vê | Oferta | Regra de ouro |
|---|---|---|---|
| **1. Primeiro contato** | Tela de título + "Jogar" grande; botão de loja pequeno e permanente | Nenhuma | Não peça dinheiro antes de o jogador entender a mecânica. |
| **2. Primeira fase** | Tutorial de 30–60 s; primeira morte | **Retry grátis** em destaque | A primeira morte é aprendizado, não funil de compra. |
| **3. Fim da fase 1** | Resumo com tempo, mortes e "nova skin desbloqueada" | Loja abre com 1 destaque: **Skin Papercut** (R$ 19,90) e, ao lado, **Starter Pack** (skin + 300 moedas, R$ 24,90) | Primeiro SKU ≤ R$ 20; o Starter é o upsell. |
| **4. Segunda morte** | Tela de morte com 3 opções de peso igual: "Tentar de novo", "Reviver com 50 moedas", "Ver resumo" | Revive com moeda ganha; se faltar, link discreto "comprar moedas" | Sem timer, sem "última chance", sem botão gigante de compra. |
| **5. Fase 2 ("Desarmado")** | Desafio de parry; recompensa por concluir | **Pacote Fundador** (oferta única, sem contagem regressiva) | Oferta depois de o jogador provar que gostou, não no momento de frustração. |
| **6. Primeira compra** | Checkout externo (Stripe/Paddle); retorno ao jogo com licença | **Starter Pack** ou skin avulsa | Conceder em < 5 s; e-mail de recibo; botão "restaurar compra". |
| **7. Recompra** | Nova skin/tema a cada 2–4 semanas; bundle "complete o set" | **Bundles** e **Edição Apoiador** | Sem loot box; sem "surpresa"; preço real ao lado da moeda. |

### 3.2 Catálogo inicial: 6 SKUs, não 20

**[ESTIMATIVA]** Não há benchmark público confiável de "tamanho ideal de catálogo" para web games. A prática de jogos casuais bem monetizados é ter **6–12 SKUs no lançamento** e **15–30** depois de live ops. Para 3 fases, 6 é o máximo que faz sentido; cada SKU precisa de uma razão clara.

Catálogo recomendado:

| # | SKU | O que entrega | Papel |
|---|---|---|---|
| 1 | **Starter Pack** | 1 skin exclusiva + 300 moedas | Primeira compra, ticket baixo |
| 2 | **Skin Papercut** | Skin de personagem | Cosmético de entrada |
| 3 | **Skin Origami** | Skin de personagem | Cosmético de meio |
| 4 | **Arena Concreto** | Tema de arena | Cosmético de alto valor percebido |
| 5 | **Rastro Tinta** | Rastro de bala | Micro-cosmético |
| 6 | **Pacote Fundador** | 3 skins + arena + 1.500 moedas + nome nos créditos | Âncora / superfã |

Depois do lançamento, adicione **Edição Apoiador** (todos os cosméticos atuais + futuros por 12 meses) como âncora superior. Só venda se você conseguir entregar 12 meses de cosméticos; caso contrário, prometa apenas o que existe.

### 3.3 Preço âncora e arquitetura de escolha

- **Âncora:** Edição Apoiador a R$ 129,90 / US$ 24,99.
- **Alvo:** Pacote Fundador a R$ 79,90 / US$ 14,99.
- **Entrada:** Skin Papercut a R$ 19,90 / US$ 3,99; Starter Pack a R$ 24,90 / US$ 4,99.
- **Avulsos:** skins R$ 19,90–24,90; arena R$ 29,90; rastro R$ 9,90.

A âncora não é para vender muito; é para fazer o Fundador parecer razoável. Mas **não invente valor "de R$ 300 por R$ 79"**: se você mostrar valor avulso, some os preços reais dos itens e mostre a conta.

### 3.4 Métricas e eventos (sem backend)

**North star:** **pagantes por 1.000 jogadores únicos** (não ARPDAU; o tráfego de lançamento é irregular e o ARPDAU engana).

Eventos mínimos, todos anônimos e sem PII:

| Evento | Propriedades | Para que serve |
|---|---|---|
| `session_start` | `utm`, `referrer`, `device`, `lang`, `first_seen` | Aquisição e retenção |
| `tutorial_complete` | `time_to_complete` | Onboarding |
| `level_start` | `level` | Funil de conteúdo |
| `death` | `level`, `cause`, `time_alive` | Dificuldade e frustração |
| `revive_offer_shown` | `level`, `price_coins`, `has_coins` | Exposição do revive |
| `revive_accept` | `method` (`coins`, `ad`, `paid`) | Eficácia e ética |
| `level_complete` | `level`, `time`, `deaths` | Retenção |
| `store_open` | `source` (`menu`, `death`, `level_end`) | Descoberta da loja |
| `sku_view` | `sku`, `price`, `currency` | Interesse |
| `checkout_start` | `sku`, `provider` | Atrito do checkout |
| `purchase_success` | `sku`, `price`, `currency`, `provider`, `order_id` | Receita (validar no servidor) |
| `purchase_fail` | `reason` | Bugs de pagamento |
| `license_restore` | `method` | Suporte |
| `refund_request` | `sku`, `reason` | Qualidade e risco |

**Como calcular sem backend:**
- **D1/D7:** `first_seen` + `last_seen` no `localStorage`; um ping diário enquanto o jogo estiver aberto. Subestima quem troca de dispositivo ou limpa o cache. Declare isso no dashboard.
- **Conversão:** `purchase_success` / `session_start` únicos por `install_id` (UUID aleatório no `localStorage`).
- **ARPPU:** receita validada no webhook / pagantes únicos.
- **Origem:** UTM e `document.referrer`; se o portal iframar o jogo, o referrer pode ser mascarado — use um parâmetro `?portal=crazygames` no seu link quando possível.
- **Ferramenta:** Plausible ou Umami (cookieless) para o site próprio; PostHog Cloud se precisar de funis e coortes. Evite Google Analytics no Poki (proibido) [14] e reduza scripts no site próprio.

**Metas iniciais [ESTIMATIVA]:**

| Métrica | Meta conservadora | Meta boa |
|---|---:|---:|
| Abertura da loja (por jogador) | 25% | 35–40% |
| SKU view → checkout | 5% | 8–10% |
| Checkout → compra | 40% | 55–65% |
| Conversão de jogador em pagante | 0,4% | 1,0–1,5% |
| ARPPU | US$ 5 | US$ 8–10 |
| Reembolso | <5% | <2% |
| Chargeback | <0,5% | <0,2% |

### 3.5 Testes que valem a pena

1. **Posição da loja:** botão no menu vs. botão flutuante vs. oferta só no fim de fase. Meça `store_open` por 1.000 sessões.
2. **Primeiro SKU:** Starter Pack com skin + moedas vs. skin avulsa. Meça conversão e ARPPU, não só receita.
3. **Preço do Fundador:** R$ 79,90 vs. R$ 99,90 (com teste A/B real, não "desconto que volta").
4. **Revive:** 50 moedas vs. 100 moedas vs. só ads. Meça `revive_accept` e reclamações.
5. **Copy:** "Reviver" vs. "Continuar de onde parou"; "Pacote Fundador" vs. "Edição de Lançamento".

Não faça teste A/B de preço sem volume: com 200 pagantes, a diferença pode ser ruído. Use testes qualitativos e pré-venda.

---

## 4. Preços recomendados

### 4.1 Princípios

1. **Preço em BRL e USD, com paridade visível.** O brasileiro paga em real; o gringo paga em dólar. Não use só USD no site em português.
2. **Nada abaixo de R$ 9,90 / US$ 1,99.** Taxas fixas destroem tickets menores (ver §5).
3. **Preço terminado em ,90 no Brasil e em ,99 nos EUA.** É o padrão de cada mercado e reduz atrito.
4. **Mostre o preço real ao lado da moeda.** Exigência das autoridades europeias e boa prática no Brasil [35][36].
5. **Desconto de paridade de ~15% no Brasil**, não 50%. O Brasil é um mercado grande, mas não é tier 3 para um jogo autoral.
6. **Sem moeda que expira.** Moeda que expira é passivo e reclamação.

### 4.2 Tabela de preços

Câmbio de referência: US$ 1 = R$ 5,90 [46]. Arredondamento comercial; não é conversão exata.

| SKU | Conteúdo | BRL | USD | Equivalente em BRL | Desconto vs. paridade |
|---|---|---:|---:|---:|---:|
| **Rastro Tinta** | Rastro de bala | R$ 9,90 | US$ 1,99 | R$ 11,74 | −15,7% |
| **Skin Papercut** | Skin | R$ 19,90 | US$ 3,99 | R$ 23,54 | −15,5% |
| **Starter Pack** | Skin + 300 moedas | R$ 24,90 | US$ 4,99 | R$ 29,44 | −15,4% |
| **Skin Origami** | Skin | R$ 24,90 | US$ 4,99 | R$ 29,44 | −15,4% |
| **Arena Concreto** | Tema de arena | R$ 29,90 | US$ 5,99 | R$ 35,34 | −15,4% |
| **Pacote Fundador** | 3 skins + arena + 1.500 moedas + créditos | R$ 79,90 | US$ 14,99 | R$ 88,44 | −9,7% |
| **Edição Apoiador** | Fundador + cosméticos futuros (12 meses) | R$ 129,90 | US$ 24,99 | R$ 147,44 | −11,9% |
| **500 moedas** | 500 moedas | R$ 14,90 | US$ 2,99 | R$ 17,64 | −15,5% |
| **1.300 moedas** | 1.000 + 300 bônus | R$ 29,90 | US$ 5,99 | R$ 35,34 | −15,4% |
| **3.500 moedas** | 3.000 + 500 bônus | R$ 69,90 | US$ 13,99 | R$ 82,54 | −15,3% |

**Nota:** a tabela inclui SKUs de teste (pacotes de moeda e Edição Apoiador) que não fazem parte do catálogo inicial de 6. O catálogo inicial é o da §3.2. Rastro (US$ 1,99) e Skin Papercut (US$ 3,99) são Stripe-only no exterior; o piso Paddle é US$ 4,99 por causa da taxa fixa.

**Leitura para o público brasileiro:** R$ 19,90 é 1,2% do salário mínimo de 2026 (R$ 1.621) [47]; R$ 79,90 é 4,9%. O Fundador é caro para o brasileiro médio, mas é um produto de superfã — e é justamente por isso que ele precisa ser **opcional, sem pressão e com valor claro**.

### 4.3 Economia das moedas

| Pacote | Preço | Moedas | R$/moeda | Revive de 50 moedas | Skin de 800 moedas |
|---|---:|---:|---:|---:|---:|
| 500 | R$ 14,90 | 500 | R$ 0,0298 | R$ 1,49 | R$ 23,84 |
| 1.300 | R$ 29,90 | 1.300 | R$ 0,0230 | R$ 1,15 | R$ 18,40 |
| 3.500 | R$ 69,90 | 3.500 | R$ 0,0200 | R$ 1,00 | R$ 16,00 |

**Problema:** a skin de 800 moedas custa **mais** que a skin avulsa de R$ 19,90 no pacote de entrada. Isso é confuso e parece punição. Corrija de uma das duas formas:
- **(Recomendado)** Venda cosméticos **só em dinheiro**; use moedas apenas para revive e para desbloqueios ganhos jogando. Elimina a moeda premium vendável e o risco regulatório.
- **(Alternativa)** Ajuste a paridade: 800 moedas devem custar **menos** que o preço avulso em todos os pacotes. Ex.: skin avulsa R$ 24,90; 800 moedas a R$ 19,90 no pacote de entrada.

**[OPINIÃO]** A primeira opção é mais saudável. Moeda premium é uma taxa de confusão: o jogador não sabe quanto custa, sobra saldo, e o regulador europeu está exatamente olhando para isso [35][36]. Para um jogo pequeno, **preço direto** é mais transparente, converte melhor e dá menos dor de cabeça.

### 4.4 Founder Pack: o que faz valer R$ 79,90

O Fundador precisa de valor **não cosmético** que custe pouco para você:
- Nome nos créditos (com opção de pseudônimo).
- Canal no Discord / badge.
- Acesso antecipado a novas fases (1 semana).
- Voto em qual arena entra primeiro.
- Skin exclusiva que **nunca** volta (prometa e cumpra).

O que **não** funciona: "10% de desconto em compras futuras" (ninguém compra por isso), "moedas em dobro" (inflaciona a economia), "acesso vitalício a tudo" (você não sabe se vai existir em 2 anos).

### 4.5 Ancoragem e escassez ética

- **Escassez real:** o Fundador fica disponível até o fim do mês de lançamento; depois vira "Edição de Lançamento" a R$ 99,90 ou sai de linha. Comunique a data, cumpra a data.
- **Sem contagem regressiva que reinicia** ao recarregar a página.
- **Sem "últimas unidades"** para produto digital ilimitado.
- **Sem desconto falso:** se o preço "de" nunca foi praticado, é propaganda enganosa (CDC art. 37).

---

## 5. Pagamentos para um app estático

### 5.1 Comparativo de provedores

| Provedor | Taxa | MoR? | Impostos | Pix/BRL | Entitlement | Fit |
|---|---|---|---|---|---|---|
| **Stripe Brasil** | 3,99% + R$ 0,39 (cartão nacional); +2% cartão internacional; disputa R$ 55 [25] | Não; o Managed Payments (MoR) não atende empresas no Brasil [26] | Você recolhe (Simples/ISS); para UE, você precisa de OSS/VAT | Sim (Pix, cartão, boleto) | Checkout + webhook + licença própria | **Melhor custo local** |
| **Paddle** | 5% + US$ 0,50 [27] | Sim | Paddle recolhe VAT/sales tax | Sim (Pix para compradores; payout por wire/Payoneer) [29] | Webhook + API; licenças próprias | **Melhor global** |
| **Gumroad** | 10% + US$ 0,50; 30% via marketplace [30] | Sim | Gumroad recolhe desde 01/2025 | Preço em USD; IOF/spread do cartão | License keys + API de verificação [31] | **Mais fácil, mais caro** |
| **Ko-fi** | 5% (free) ou 0% (Gold US$ 12/mês) + processor [33] | Não | Você | Via Stripe/PayPal | Sem API de licença | Só gorjeta/apoio |
| **Lemon Squeezy** | 5% + US$ 0,50 | Sim | — | — | — | **Não usar: encerra em 31/03/2027** [32] |
| **itch.io** | 10% padrão (0–100%) + processor [16][17] | Não | Você | PayPal/Stripe; relatos de atraso | Sem API de licença | Demo/PWYW |
| **Steam** | 30% até US$ 10M; US$ 100/app [18] | Não | Valve recolhe VAT | BRL na loja | Steamworks | Só com conteúdo |
| **Apple/Google** | 15% até US$ 1M (programas de pequeno porte); 30% acima [21][22] | Não | Loja recolhe | IAP obrigatório | StoreKit/Play Billing | Só mobile nativo |

### 5.2 A conta que importa: taxa efetiva por venda

| Venda | Stripe BR (doméstico) | Stripe BR (+2% intl.) | Paddle | Gumroad | itch.io | Steam | Apple/Google |
|---|---:|---:|---:|---:|---:|---:|---:|
| **US$ 2,99** | 6,3% | 8,3% | 21,7% | 26,8% | ~23% | — | 15% |
| **US$ 9,99** | 4,6% | 6,6% | 10,0% | 15,0% | ~15,9% | 30% | 15% |
| **US$ 14,99** | 4,5% | 6,5% | 8,3% | 13,3% | ~14,9% | 30% | 15% |

**[FATO]** A taxa fixa é o assassino dos tickets baixos: US$ 0,50 em uma venda de US$ 2,99 é 16,7% **antes** do percentual. Por isso, Paddle/Gumroad só fazem sentido para o Founder Pack e para bundles; para moedas e skins baratas, Stripe local é imbatível.

**[OPINIÃO]** A arquitetura de dois trilhos é a certa:
- **Brasil:** Stripe Brasil, Pix + cartão, preços em BRL, SKUs a partir de R$ 9,90. Você cuida do Simples/ISS.
- **Exterior:** Paddle como MoR, preços em USD, só SKUs ≥ US$ 4,99 (Starter, Founder, Supporter, bundles). As skins de US$ 1,99–3,99 ficam só no Stripe local ou em bundle. Paddle cuida de VAT/sales tax e chargebacks.
- **Nunca** venda moeda avulsa via Paddle/Gumroad: a taxa fixa come 20–30% e o AUP da Paddle tem restrição a "virtual currency/stored value" [28]. A Paddle tem produto de in-app purchase e atende games, mas confirme o enquadramento com o suporte antes de vender moeda. Venda **bundle de cosmético** ou **Founder Pack**, não saldo.

### 5.3 Arquitetura mínima sem servidor de jogo

```
[Cloudflare Pages]  jogo estático (Vite/Three.js)
        |
        | 1. clique em "comprar"
        v
[Cloudflare Worker]  /api/checkout
        | 2. cria Checkout Session (Stripe) ou transação (Paddle)
        v
[Stripe/Paddle]  checkout hospedado (Pix, cartão, PayPal)
        |
        | 3. webhook assinado
        v
[Cloudflare Worker]  /api/webhook
        | 4. verifica assinatura + idempotência
        | 5. grava pedido no D1/KV
        | 6. assina licença (ECDSA P-256)
        v
[E-mail]  recibo + link "restaurar compra"
        |
        v
[Jogo]  valida assinatura com chave pública embutida; grava token no localStorage
```

**Peças:**
- **Cloudflare Pages:** hospedagem estática gratuita; o jogo não muda.
- **Cloudflare Worker:** 100.000 requisições/dia no plano free, 10 ms de CPU por requisição [34]. Suficiente para checkout + webhook em um lançamento pequeno; se a verificação de assinatura estourar o CPU, o plano pago (US$ 5/mês) resolve.
- **D1/KV:** guardar `order_id`, `sku`, `email_hash`, `status`, `jti` (ID da licença). Não guarde cartão nem CPF.
- **Chave de assinatura:** ECDSA P-256 (Web Crypto é universal), **não** Ed25519 (suporte ainda irregular). A chave privada fica no Worker secret; a pública é embutida no bundle do jogo.
- **Token:** `{sub, sku[], iat, exp, jti}` assinado. Validade de 90 dias, renovável no boot via `/api/license/refresh` com `order_id` + e-mail.
- **Restauração:** "Já comprei" → e-mail + código do pedido → Worker reemite o token. Sem conta, sem senha.
- **Revogação:** webhook de refund/chargeback adiciona o `jti` a uma lista de revogação no KV; o jogo consulta no boot (com cache de 24 h). Offline, o token vale até expirar. Aceite esse compromisso.

### 5.4 Riscos de fraude se a liberação for 100% client-side

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Editar `localStorage` e desbloquear tudo | **Alta** (qualquer pessoa com DevTools) | Alto se vender poder; baixo se vender cosmético | Não venda poder; ofusque o bundle; aceite o vazamento de cosmético |
| Compartilhar token/licença | Média | Médio | Token curto (90 dias), limite de restaurações, vínculo com e-mail (hash), monitorar picos |
| Webhook falso | Média se endpoint sem assinatura | **Muito alto** | Verificar `Stripe-Signature`/`Paddle-Signature`; idempotência; rejeitar payload sem `order_id` |
| Reembolso abusivo | Média | Médio | Política clara; limite de 1 reembolso por e-mail; Stripe Radar/Paddle |
| Chargeback | Baixa-média | Médio | Responder com evidências; revogar licença; Paddle assume disputa no exterior |
| "Comprei e não recebi" | Média | Médio | Concessão idempotente; e-mail imediato; botão "restaurar"; logs |
| Menor comprando sem autorização | Média | Alto (CDC/ECA) | Aviso parental; limite de gasto; reembolso rápido; não usar dark patterns |

**Regra de ouro:** se você não consegue defender o item em um tribunal ou na App Store, não venda. Cosmético é defensável; "vida extra permanente" em jogo single-player é pirataria trivial e destrói a economia.

### 5.5 Caminho de menor atrito para lançar

**Semana 1 (Brasil, 1–3 dias):**
1. Crie uma conta Stripe Brasil (CPF/CNPJ).
2. Crie **Payment Links** para 3 SKUs: Starter Pack, Fundador, 500 moedas.
3. Configure o redirect para `https://jogo.com/obrigado?session_id={CHECKOUT_SESSION_ID}`.
4. Worker verifica a sessão (`stripe.checkout.sessions.retrieve`), confere `payment_status=paid`, emite o token assinado.
5. Teste com cartão de teste e Pix de teste.

**Semana 2–3 (exterior):**
1. Abra conta Paddle com CNPJ/MEI (aprovação pode levar dias; peça cedo).
2. Crie os produtos Founder (US$ 14,99) e Supporter (US$ 24,99).
3. Webhook Paddle → mesmo Worker → mesmo formato de licença.
4. Se a Paddle travar, use **Gumroad** como plano B em 48 h: produto com license keys, verificação via Worker (proxy da API do Gumroad) [31]. Custa ~13–15%, mas lança.

**Não faça:** checkout próprio com cartão no seu domínio (PCI), assinatura HMAC simétrica no cliente (a chave vaza), ou "liberar na hora" sem webhook.

### 5.6 O que fazer com o dinheiro (Brasil)

- **Simples Nacional:** serviço de desenvolvimento de software/jogos costuma cair no Anexo III (6%) ou V (15,5%), dependendo do Fator R; confirme com contador [44].
- **ISS:** incluído no Simples; fora dele, 2–5% conforme o município.
- **Reforma tributária:** 2026 é fase de teste (IBS/CBS em alíquotas reduzidas); 2027 começa a CBS; 2033 é o modelo pleno [44]. Não trave preço de 3 anos sem cláusula de repasse.
- **Vendas ao exterior via Paddle:** o MoR recolhe o imposto local; você recebe líquido. Ainda assim, declare a receita no Brasil.
- **IOF/câmbio:** cartão internacional tem IOF e spread; por isso o preço em BRL via Pix é mais competitivo.
- **Pix:** ~45–46% do valor do e-commerce brasileiro em 2026, com projeção de 48% em 2027 [45]. Ofereça Pix; é mais barato e converte.

---

## 6. Distribuição e aquisição

### 6.1 Onde publicar

| Canal | Requisitos | Comissão / modelo | Tráfego | Fit para o MOVESTOP |
|---|---|---|---|---|
| **Site próprio (Cloudflare Pages)** | Domínio, SSL, LGPD, checkout, suporte | 0% + gateway (4–8%) | Você traz | **Principal.** Margem, dados, relacionamento. |
| **itch.io** | Build HTML5 (zip/index.html), página, screenshots | 10% padrão (0–100%) + processor [16][17] | Médio/baixo, mas qualificado | **Demo + PWYW + comunidade.** |
| **CrazyGames** | SDK v3, 50 MB de carga inicial (20 MB para homepage mobile), 1.500 arquivos, inglês, QA, Basic Launch 7–21 dias [10] | 60% ads / 70% IAP nos termos da jam 2026; € 100 mínimo [8][11] | Alto | **Marketing + ads.** IAP só por convite (Xsolla) [9]. |
| **Poki** | SDK, desktop/mobile/tablet, sem requests externos, sem contas externas, sem chat [14] | 100% da receita do tráfego direto; divisão no tráfego do portal; exclusividade web de 5 anos [12][13] | Muito alto (100M MAU) | **Alcance, não receita.** Não aceita IAP. |
| **Newgrounds** | Upload, sem SDK | Ads legado; transição para ad-free [50] | Médio | **Marketing/portfólio.** |
| **Yandex Games** | SDK, russo/CIS | 50% da receita de licença; IAP via Yans | Médio (CIS) | **Opcional.** Só se houver localização. |
| **Steam** | US$ 100/app, página, build Electron (steamworks.js) ou Tauri, wishlist [18][51] | 30% até US$ 10M [18] | Alto, mas competitivo | **Depois:** 12–15 fases, conquistas, cloud. |
| **Google Play (TWA)** | Digital Asset Links, Play Billing para bens digitais [23][52] | 15% até US$ 1M [22] | Alto | **Depois:** Android primeiro; IAP via Play Billing ou só ads. |
| **App Store** | Guideline 4.2 rejeita wrapper de site [24]; IAP obrigatório | 15% até US$ 1M [21] | Alto | **Não agora.** Exige features nativas e review caro. |

**Nota sobre Steam:** Electron + `steamworks.js` é o caminho com mais exemplos para overlay, conquistas e saves; Tauri é mais leve, mas a integração com a Steam ainda é experimental. Para o primeiro lançamento, prefira o caminho testado.

### 6.2 Recomendação de distribuição

**Fase 1 (lançamento, 30 dias):**
1. **Site próprio** em Cloudflare Pages — é a única casa onde você controla preço, checkout, dados e relacionamento.
2. **itch.io** — página do jogo, build gratuita, botão "pague o quanto quiser" e devlog. Serve como prova social e backlink.
3. **CrazyGames Basic Launch** — submeta assim que o SDK estiver integrado. O Basic Launch não paga, mas testa retenção e pode levar ao Full Launch. Não coloque IAP no portal; use-o para descoberta.
4. **Poki** — só se você aceitar a exclusividade web de 5 anos e a ausência de IAP. Para um jogo que quer vender cosmético, a Poki é canal de massa, não de monetização. Decida com base no tráfego que ela trouxer.

**Fase 2 (60–90 dias):**
- Steam, se e somente se: 12+ fases, 5.000+ wishlists, trailer, conquistas e build Electron testada em Deck. Caso contrário, não queime o lançamento.
- Google Play TWA, se o mobile web já tiver controle por toque e retenção decente. Lembre: TWA no Android exige Play Billing para bens digitais [52]; vender cosmético fora do billing pode violar a política.
- App Store, só com features nativas reais (haptics, Game Center, push, cloud) para passar da 4.2 [24]. Wrapper de site é rejeição quase certa.

**Fase 3 (opcional):**
- Yandex Games, se houver localização para russo e o custo de suporte compensar.
- Licenciamento white-label para marcas/eventos.

### 6.3 Aquisição: o que funciona para esse jogo

**O hook é o marketing.** "O tempo só passa quando você se move" é uma frase que se explica em 3 segundos e um vídeo de 15 segundos. Explore isso:

1. **Vídeo curto (TikTok/Reels/Shorts):** 3–5 posts/semana, 15–25 s, sem narração, com texto na tela: "the world only moves when you move". Mostre uma morte, um parry e um tiro que para no ar. O algoritmo favorece novidade visual; o jogo tem isso.
2. **Reddit:** r/WebGames, r/playmygame, r/indiegames, r/gamedev (devlog, não spam), r/SUPERHOT (só se for relevante e sem fingir que não é seu). Leia as regras de cada sub; auto-promoção excessiva queima a conta.
3. **Hacker News:** "Show HN: A browser shooter where time moves only when you move". Esteja presente nos comentários; HN odeia marketing, ama detalhes técnicos (Three.js, performance, 60 fps).
4. **Product Hunt:** lance com um GIF forte e uma oferta de Fundador para os primeiros 100.
5. **itch.io:** devlog com números reais (build size, fps, mortes por fase). A comunidade valoriza transparência.
6. **Imprensa indie:** Rock Paper Shotgun, PC Gamer, newsletters de web games. Pitch de 1 parágrafo + GIF + link jogável. Sem embargo, sem press release genérico.
7. **SEO:** landing page em PT/EN com "jogo de tiro onde o tempo para", "SUPERHOT no navegador", "browser FPS time moves when you move". Uma página, um H1, um vídeo, um botão "jogar".
8. **Discord:** servidor próprio, 50–100 fãs, canal de bugs e votação de skins. É o seu CRM.

**O que não fazer:**
- **Paid UA no lançamento.** CPI de casual/hyper-casual US$ 1,50–6,00 [4] contra LTV provável < US$ 0,50. A conta não fecha. Se testar, limite a US$ 100 e meça payback, não instalação.
- **Comprar seguidores/views.** Destrói a credibilidade e não converte.
- **Spam em massa de DM.** Reddit/Twitter banem; o custo reputacional é permanente.
- **Pagar influencer grande.** Prefira 10 micro-criadores com chave grátis e liberdade editorial.

### 6.4 Métricas de aquisição

| Métrica | Como medir | Meta inicial |
|---|---|---:|
| Visitas → jogadores (ativados) | `session_start` / visitas | 60–75% |
| Jogadores → tutorial completo | `tutorial_complete` | 70% |
| Jogadores → fase 1 completa | `level_complete` | 50% |
| Jogadores → fase 2 completa | `level_complete` | 25% |
| Compartilhamentos | cliques em "share" / jogadores | 2–5% |
| Custo por jogador (se pagar) | gasto / jogadores | < US$ 0,30 |
| E-mail capturado | inscritos / jogadores | 5–10% |

---

## 7. Riscos e conformidade

> **Aviso:** isto é análise de produto, não parecer jurídico. Antes de vender para menores, para a UE ou em escala, consulte advogado e contador. As regras abaixo mudam com frequência.

### 7.1 Loot boxes e moeda virtual

**[FATO]** O **ECA Digital (Lei 15.211/2025)** entrou em vigor em **17/03/2026**. Ele proíbe **loot boxes** em jogos direcionados a menores ou de acesso provável por eles, conforme a classificação indicativa; exige supervisão parental, limita a interação entre usuários por padrão e veda dark patterns que enfraqueçam salvaguardas [38][39][40]. Multas podem chegar a **10% do faturamento no Brasil ou R$ 50 milhões por infração** [40].

**O MOVESTOP não usa loot boxes — mantenha assim.** Não introduza:
- "Pacote surpresa", "skin misteriosa", "roda da sorte", "card pack".
- Caixa comprada com moeda premium que possa ser comprada com dinheiro.
- Recompensa aleatória paga, mesmo que "só cosmética".

**[FATO]** A rede europeia de proteção ao consumidor (CPC) publicou **7 princípios** para moedas virtuais em jogos: preço em dinheiro real, evitar práticas enganosas, permitir comprar a quantidade exata, informação pré-contratual clara, termos claros, direito de arrependimento de 14 dias e respeito a consumidores vulneráveis [35][36].

**Consequências práticas:**
- Mostre **R$ e US$ ao lado de cada preço em moedas**.
- Permita comprar **a quantidade exata** para o item; não force pacotes com sobra.
- Não faça **duas moedas** (moeda premium + moeda de evento).
- Não expire moedas.
- Não use "moeda bônus" para obscurecer o preço.
- Se vender moeda, tenha um caminho de reembolso claro.

**[OPINIÃO]** A solução mais limpa é **eliminar a moeda premium vendável**. Deixe moedas apenas como recompensa de jogo e venda cosméticos a preço direto. Você perde um pouco de flexibilidade de preço e ganha transparência, menos suporte e menos risco regulatório.

### 7.2 Reembolsos

**[FATO]** O **CDC art. 49** dá 7 dias para desistir de compras feitas fora do estabelecimento comercial, inclusive digitais; o fornecedor deve devolver o valor e informar a administradora do cartão [41]. A lei não exclui jogo digital; na prática, tribunais tendem a negar reembolso de quem jogou muitas horas, mas concedem para quem jogou pouco ou para compra feita por criança sem autorização [42].

**[FATO]** Na UE, o direito de arrependimento é de **14 dias**; para conteúdo digital, a exceção exige consentimento explícito e reconhecimento da perda do direito. As autoridades recomendam informar o direito mesmo para moeda virtual [35][36].

**Política recomendada:**
- **7 dias, sem perguntas, para primeira compra** com menos de 2 h de jogo e menos de 50% do conteúdo consumido.
- **Reembolso integral** se o item não foi entregue ou o jogo quebrou.
- **Crédito ou reembolso** para compras de menores sem autorização parental; não brigue.
- Exiba a política no checkout e no jogo, em PT/EN.
- Responda chargeback com evidências (recibo, logs de entrega, aceite dos termos).

**Não faça:** "não reembolsamos produtos digitais" como cláusula absoluta. No Brasil, cláusula que retira direito do consumidor é nula (CDC art. 51) [41].

### 7.3 LGPD, menores e ECA Digital

**[FATO]** A LGPD (art. 14) exige **consentimento específico e em destaque de pelo menos um dos pais ou responsável** para o tratamento de dados de **crianças até 12 anos incompletos**, e o melhor interesse da criança [43].

**[FATO]** O ECA Digital aplica-se a produtos digitais **direcionados a menores de 18 anos ou de acesso provável por esse público**, independentemente do país do fornecedor; exige **verificação de idade** para conteúdo inadequado, ferramentas de **supervisão parental**, proibição de **dark patterns** e **representante legal no Brasil** [38][39][40].

**O que fazer na prática:**
1. **Classificação indicativa:** busque a ClassInd/JugosBR ou autoclassificação. Um shooter voxel sem sangue, sem gore e sem violência realista pode ficar em **12+**; se ficar 14+/16+, a régua de idade sobe.
2. **Sem chat e sem UGC** no lançamento. Isso elimina a obrigação de moderação e o risco de interação entre menores.
3. **Sem ads comportamentais** para menores; se usar ads, use contextual e peça consentimento.
4. **Minimização:** colete só o necessário (install_id anônimo, eventos de jogo, e-mail se comprar). Não peça nome, CPF, telefone ou data de nascimento.
5. **Política de privacidade** clara, em PT/EN, com base legal, retenção, transferência internacional (Stripe/Paddle/Cloudflare) e contato do encarregado.
6. **Aviso parental** na tela inicial: "Este jogo contém violência estilizada. Menores de 12 anos devem jogar com supervisão. Compras exigem autorização do responsável."
7. **Controles parentais:** limite de gasto, senha para comprar, opção de desativar compras.
8. **Não use autodeclaração de idade** como única barreira para conteúdo restrito. Se o jogo for 18+, você precisa de verificação real — e isso é caro; evite.

**[OPINIÃO]** Para um jogo indie, o caminho de menor risco é: **12+, sem sangue, sem chat, sem loot box, sem coleta de dados pessoais além do necessário, com aviso parental e reembolso fácil**. Isso não elimina o ECA Digital, mas reduz muito a exposição.

### 7.4 Dark patterns a evitar

**[FATO]** A FTC dos EUA documenta padrões como pré-seleção, falsa urgência, "confirmshaming" e dificuldade de cancelar [49]. A proposta de **Digital Fairness Act** na UE (publicada em novembro de 2026, ainda em tramitação) quer proibir dark patterns e "addictive design", com foco em moedas virtuais e público vulnerável [37].

**No MOVESTOP, evite especificamente:**

| Padrão | Como aparece em jogo | Por que evitar | Substituto |
|---|---|---|---|
| **Revive com timer** | "Revive em 9, 8, 7..." | Pressão artificial; abusivo em vários contextos; queima confiança | Sem timer; "tentar de novo" em destaque |
| **Botão gigante de compra** | "REVIVER AGORA" ocupa 80% da tela | Explorar frustração | Três opções de peso igual |
| **Pré-seleção** | Pacote marcado por padrão | Compra não intencional | Nada pré-selecionado |
| **Confirmshaming** | "Tem certeza que quer desistir?" | Manipulação emocional | "Tentar de novo" neutro |
| **Oferta repetida** | Após cada morte | Perseguição | Uma oferta por fase; "não" respeitado |
| **Escassez falsa** | "Últimas 3 unidades" (digital) | Propaganda enganosa (CDC art. 37) | Janela real de lançamento |
| **Moeda confusa** | 1.200 moedas = R$ 29,90; item = 800 | Jogador não sabe o preço | Preço real ao lado |
| **Ad disfarçado** | "Ganhe 100 moedas" e é anúncio | Engano | Rótulo "assistir anúncio" |
| **Cancelamento difícil** | Esconder "não comprar" | Ilegal em muitos lugares | "Não, obrigado" visível |

**Teste de ética:** se a oferta fosse mostrada para uma criança de 10 anos e para os pais dela, você ficaria confortável? Se não, refaça.

### 7.5 Tributos e obrigações acessórias

- **Preço com imposto incluso** no Brasil; destaque o valor total.
- **NFS-e** para serviços digitais; confirme com contador o código de serviço e o município.
- **Simples Nacional:** Anexo III ou V, conforme Fator R; alíquota efetiva de ~6% a ~15,5% [44].
- **Reforma tributária:** 2026 é ano de teste; 2027 começa a CBS; 2033 é o modelo pleno [44]. Revise preços antes de 2027.
- **Vendas ao exterior:** se usar Paddle/Gumroad, o MoR recolhe o imposto de consumo local; você ainda declara a receita no Brasil.
- **Nota fiscal para pessoa física:** o comprador pode pedir; tenha processo.
- **Chargebacks:** provisione 0,5–1% da receita.

### 7.6 Propriedade intelectual

- **"MOVESTOP"**: faça busca no INPI e registre a marca se o projeto for sério. Custa pouco e evita dor de cabeça.
- **SUPERHOT**: a mecânica de tempo não é protegida por copyright, mas o nome, os assets e a estética são. Não use "SUPERHOT" no título, na página ou no anúncio; use "inspirado em" apenas em texto editorial, com cuidado.
- **Música e fontes:** use originais ou licenciadas; guarde a licença. Não use assets de jogos comerciais sem licença.
- **Contribuições de terceiros:** contrato de cessão de direitos assinado, mesmo com amigos.

---

## 8. Plano de lançamento de 30 dias e projeção

### 8.1 Cronograma

| Período | Foco | Entregáveis | Critério de sucesso |
|---|---|---|---|
| **Dias 1–2** | Produto | Remover pay-to-win do IAP; redesenhar tela de morte; 6 SKUs; texto do Fundador | Nenhum item pago dá vantagem; "tentar de novo" é a ação primária |
| **Dias 3–4** | Dados | 10 eventos; dashboard simples; `install_id`; UTM | Consegue ver funil de loja e morte |
| **Dias 5–6** | Legal | Termos, Privacidade, Reembolso, Classificação, contato, aviso parental | Páginas no ar, links no rodapé e no checkout |
| **Dia 7** | Pagamento BR | Stripe Payment Links + Worker + licença assinada; teste Pix/cartão | Compra de teste concede em < 5 s; "restaurar" funciona |
| **Dias 8–10** | Performance | 50 MB de carga inicial; 60 fps em notebook médio; 144/165 Hz; mobile touch básico | CrazyGames QA passa; sem travamento em Safari |
| **Dias 11–14** | Soft launch | 50–100 testadores (Discord, Reddit, amigos); correções de onboarding | 70% completam o tutorial; 40% completam a fase 1 |
| **Dias 15–17** | Conteúdo | 6 clipes verticais; 3 screenshots; trailer de 30 s; press kit; página no itch.io | Kit pronto; itch publicado |
| **Dias 18–21** | Lançamento | Site + itch + Product Hunt + Show HN + Reddit + TikTok/Shorts; CrazyGames Basic Launch | 1.000 jogadores nos primeiros 7 dias; 50 e-mails |
| **Dias 22–24** | Pagamento global | Paddle aprovado + webhook + Founder US$ 14,99; plano B Gumroad | Compra internacional funciona; recibo automático |
| **Dias 25–27** | Otimização | A/B de posição da loja e primeiro SKU; correção dos 3 maiores drop-offs | Conversão sobe ou atrito cai |
| **Dias 28–30** | Decisão | Relatório do funil; decisão sobre 2 novas fases; plano 60–90 dias | Se D7 < 8%, priorizar conteúdo, não preço |

**Regra de ouro do cronograma:** não atrase o lançamento para adicionar features. Um jogo de 3 fases no ar com pagamento funcionando vale mais que um jogo perfeito em junho.

### 8.2 Premissas da projeção

**[ESTIMATIVA]** Todas as linhas abaixo são contas, não previsões. Elas existem para você trocar os números pelos seus.

| Premissa | Conservador | Base | Otimista | Racional |
|---|---:|---:|---:|---|
| Jogadores únicos no mês 1 | 8.000 | 35.000 | 90.000 | Lançamento orgânico; sem paid UA |
| Abertura da loja | 30% | 35% | 40% | Botão permanente + oferta no fim de fase |
| Conversão em pagante | 0,4% | 1,2% | 1,8% | Web casual sem login; abaixo do mobile (1–3%) [4] |
| ARPPU bruto | US$ 5 | US$ 9 | US$ 12 | Mix de Starter/Fundador; D90 casual US$ 7,26 [5] |
| Partidas por jogador | 1,5 | 1,5 | 1,5 | Sessão curta, 2–3 voltas |
| % de jogadores via portal | 30% | 30% | 30% | CrazyGames/Poki |
| eCPM de portal | US$ 1,20/1.000 | US$ 1,20/1.000 | US$ 1,20/1.000 | Caso real relatado [7] |
| Taxas de pagamento | 10% | 10% | 10% | Mix Stripe/Paddle |
| Impostos | 10% | 10% | 10% | Simples/ISS; pode ser 6–15,5% [44] |
| Multiplicador de receita em 6 meses | 2,09× o mês 1 | 2,09× | 2,09× | Decaimento 100/40/25/18/14/12% |

### 8.3 Cenários

| Linha | Conservador | Base | Otimista |
|---|---:|---:|---:|
| Jogadores únicos (mês 1) | 8.000 | 35.000 | 90.000 |
| Pagantes (mês 1) | 32 | 420 | 1.620 |
| Receita de IAP (mês 1) | US$ 160 | US$ 3.780 | US$ 19.440 |
| Ads de portal (mês 1) | US$ 4 | US$ 19 | US$ 49 |
| **Receita bruta (mês 1)** | **US$ 164** | **US$ 3.799** | **US$ 19.489** |
| Taxas (10%) | US$ 16 | US$ 380 | US$ 1.949 |
| Impostos (10%) | US$ 16 | US$ 380 | US$ 1.949 |
| **Receita líquida (mês 1)** | **US$ 131** | **US$ 3.039** | **US$ 15.591** |
| **Receita líquida acumulada (6 meses)** | **US$ 274** | **US$ 6.351** | **US$ 32.585** |

**Simplificação:** nos SKUs vendidos via Paddle, o imposto de consumo já está embutido na taxa do MoR; nos SKUs via Stripe, os 10% de imposto são uma provisão. O total de 20% é conservador para um cenário de lançamento; se o Simples ficar em 15,5%, a margem cai.

**Contas:**
- Conservador: `8.000 × 0,4% = 32 pagantes × US$ 5 = US$ 160`.
- Base: `35.000 × 1,2% = 420 × US$ 9 = US$ 3.780`.
- Otimista: `90.000 × 1,8% = 1.620 × US$ 12 = US$ 19.440`.
- Ads: `jogadores × 1,5 × 30% ÷ 1.000 × US$ 1,20`.
- Líquido: `bruto × 0,80`.
- 6 meses: `mês 1 × 2,09`.

### 8.4 Sensibilidade: onde está o dinheiro

| Mudança | Efeito na receita bruta (base) | Efeito líquido | Leitura |
|---|---:|---:|---|
| +1 p.p. de conversão (1,2% → 2,2%) | +US$ 3.150 | +US$ 2.520 | **Maior alavanca.** Conversão vale mais que preço. |
| +US$ 1 de ARPPU (US$ 9 → 10) | +US$ 420 | +US$ 336 | Menor, mas somável. |
| +50% de tráfego | +50% | +50% | Linear; depende de marketing. |
| −20% de preço com +30% de conversão | +4% | +4% | Quase neutro; não é bala de prata. |
| Fundador = 30% da receita | US$ 1.134 | US$ 907 | O Fundador é o produto, não a skin. |

**Break-even:** se você considerar 3 meses de custo de oportunidade a R$ 6.000/mês (R$ 18.000 ≈ US$ 3.050), o cenário base cobre em 6 meses; o conservador não. Custos fixos (domínio, Cloudflare, e-mail) ficam abaixo de US$ 100/ano. O risco é tempo, não hospedagem.

**O que a projeção não inclui:** white-label, venda de dados (não faça), patrocínio, adiantamento de portal, Steam, mobile. Qualquer um desses pode mudar a ordem de grandeza — para cima ou para baixo.

---

## 9. Recomendações concretas para o produto e a loja

### 9.1 Esta semana (P0 — não lance sem)

1. **Tire os upgrades permanentes da loja.** Vida extra, dash e munição vendidos como IAP transformam o jogo em pay-to-win, são pirateáveis no `localStorage` e contradizem a proposta de habilidade. Mantenha-os como **desbloqueios ganhos jogando** (conquistas, moedas ganhas, desafios). Se quiser vender um atalho, venda **um único "Unlock All"** claramente rotulado como atalho, nunca upgrades individuais — e só quando o grind for real (10+ fases).
2. **Redesenhe a morte.** Três opções de peso igual: **"Tentar de novo" (grátis)**, **"Reviver com 50 moedas"**, **"Ver resumo"**. Sem timer, sem botão gigante, sem oferta repetida. Se o jogador não tem moedas, o link "comprar moedas" é secundário e discreto.
3. **Corte a loja para 6 SKUs.** Starter Pack, 2 skins, 1 arena, 1 rastro, Pacote Fundador. Cada SKU com uma frase de benefício e preço em BRL/USD. Nada de 20 itens sem curadoria.
4. **Coloque o Pacote Fundador como âncora.** R$ 79,90 / US$ 14,99, com 3 skins, arena, 1.500 moedas e nome nos créditos. Janela real de lançamento (30 dias), sem contagem regressiva falsa.
5. **Implemente "restaurar compra" e recibo por e-mail.** Sem isso, cada problema de pagamento vira reembolso e reclamação pública.
6. **Instrumente 10 eventos** (§3.4) e um dashboard simples. Se não medir `store_open`, `checkout_start` e `purchase_success`, você está pilotando no escuro.
7. **Publique Termos, Privacidade, Reembolso, Classificação e aviso parental.** Links no rodapé, no checkout e na tela de compra.
8. **Performance de portal:** 50 MB de carga inicial, 20 MB para homepage mobile, 1.500 arquivos, 60 fps, física igual em 144/165 Hz, `user-select: none`, sem botão de fullscreen [10].

### 9.2 Próximo mês (P1 — crescer)

1. **Stripe BR + Paddle + Worker + licença assinada.** Dois trilhos, um só formato de entitlement. Teste Pix, cartão, reembolso e chargeback.
2. **Duas fases novas + desafio diário.** O desafio diário pode reusar as 3 arenas com modificadores (sem dash, só parry, tempo dobrado). Custa pouco e triplica o conteúdo percebido.
3. **Calendário de cosméticos:** 1 skin nova por mês, 1 bundle a cada 2 meses. Anuncie o calendário; cumpra.
4. **Captura de e-mail + código de indicação.** "Convide um amigo; os dois ganham uma skin" — implemente com código assinado no URL e conceda após o amigo completar a fase 1. Sem backend, use um Worker mínimo para validar.
5. **Submeta ao CrazyGames Basic Launch e ao Poki.** Use o portal para alcance; mantenha o IAP no site próprio.
6. **Construa 10 clipes e um press kit.** O hook visual é o ativo de marketing mais barato que você tem.
7. **A/B test de preço e posição da loja.** Só com volume; caso contrário, teste qualitativo com 20 jogadores.

### 9.3 Depois (P2 — escalar)

1. **Steam "Complete Edition"** com 12–15 fases, conquistas, cloud save, level editor e trilha sonora, a US$ 9,99. Só depois de 5.000 wishlists e de o jogo web provar retenção.
2. **Mobile PWA/TWA.** Android primeiro; anúncios ou preço premium. IAP só com Play Billing; não tente burlar a política [52].
3. **White-label B2B.** Versão brandada de 1 fase para marca/evento, R$ 5.000–25.000 por projeto [ESTIMATIVA]. Use a mesma engine; cobre 50% adiantado.
4. **Passe de temporada** só com 12+ fases, 10.000 MAU e capacidade de entregar conteúdo a cada 6 semanas. Antes disso, é uma promessa que você não consegue cumprir.
5. **Contas e cloud save** só se D7 > 10% e houver demanda real por cross-device. Backend é custo e LGPD; não construa "por precaução".

### 9.4 O que não fazer (lista negra)

- Loot box, pacote surpresa, roda da sorte, "skin misteriosa".
- Vender vida extra, dash, munição ou qualquer vantagem competitiva.
- Revive com timer, botão gigante ou oferta repetida.
- Escassez falsa, desconto falso, "últimas unidades" digitais.
- Paid UA no lançamento.
- Steam com 3 fases.
- Backend "só para garantir" antes de ter receita.
- Lemon Squeezy (encerra em 31/03/2027) [32].
- Gumroad/Paddle para SKUs de US$ 2 (taxa fixa come 20–30%).
- Prometer "todo o conteúdo futuro para sempre".
- Chat/UGC sem moderação e sem plano para menores.

---

## 10. Fontes

1. AppLixir — *Web Game Monetization Benchmarks: ARPU, CPMs, and Rewarded Ad Engagement Rates* (dados 2024–2026). https://www.applixir.com/blog/web-game-monetization-benchmarks-arpu-cpms-and-rewarded-ad-engagement-rates/
2. Playio — *Revenue = DAU × ARPDAU: 2026 benchmarks by genre and monetization model*. https://blog.playio.co/arpdau-benchmarks-mobile-games
3. GameAnalytics — *2026 Mobile & PC Gaming Benchmarks* (citado por Playio). https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks
4. MOBAT Labs — *Mobile Game KPI Benchmarks* (o próprio site declara que são estimativas ilustrativas, não dados medidos). https://mobat-labs.com/benchmarks
5. AppsFlyer — *The State of App Monetization 2026*. https://www.appsflyer.com/resources/reports/app-marketing-monetization-report/
6. PixelGameCraft — *How Much Money Do HTML5 Games Actually Make? (Real 2026 Numbers)*. https://pixelgamecraft.com/blog/html5-game-income
7. BitBite Games — *How much does a web game earn per 1,000 plays? What developers report* (checado em 26/10/2026). https://publishers.bitbite.games/guides/web-game-earnings-per-1000-plays
8. CrazyGames — *Payouts*. https://docs.crazygames.com/payouts/
9. CrazyGames — *In-game purchases* (convite + Xsolla). https://docs.crazygames.com/sdk/in-game-purchases/
10. Portal Ready — *CrazyGames for developers: launch stages, SDK, limits and payouts* (03/10/2026). https://portalready.world/portals/crazygames
11. CrazyGames — *Developer Terms* (18/08/2025). https://files.crazygames.com/documents/developer_terms_20250818.pdf
12. Poki — *How we partner with you (revenue deal types)*. https://developers.poki.com/guide/revenue-deal-types
13. Poki — *Monetization overview* (só ads; sem IAP). https://developers.poki.com/guide/how-monetization-works
14. Poki — *External resources policy* (sem requests externos, sem contas externas, sem chat). https://developers.poki.com/guide/external-resources-policy
15. Poki — *The 2026 State of Web Gaming Report* (25/06/2026). https://poki.com/blog/state-of-web-gaming-report-2026
16. itch.io — *Introducing open revenue sharing* (10% padrão). https://itch.io/updates/introducing-open-revenue-sharing
17. itch.io — *Accepting Payments and Getting Paid*. https://itch.io/docs/creators/payments
18. Steam Page Analyzer — *Steam revenue share explained: 30% / 25% / 20%, US$ 100 fee*. https://steampageanalyzer.com/blog/steam-revenue-share-explained
19. SuperJump — *State of Indie 2026 Part 1: Winners and Losers* (mediana US$ 347 para lançamentos de 2025, dados Gamalytic). https://superjumpmagazine.com/state-of-indie-2026-part-1
20. Game-Developers.org — *The Steam Paradox 2025* (66% abaixo de US$ 1.000). https://game-developers.org/steam-paradox-2025-revenue-volume
21. Apple — *App Store Small Business Program* (15% até US$ 1M). https://developer.apple.com/app-store/small-business-program/
22. Google Play — *Service fees* (15% para a maioria; 30% acima do limite). https://support.google.com/googleplay/android-developer/answer/112622
23. Google Play — *Understanding Google Play's Payments policy* (bens digitais exigem Play Billing). https://support.google.com/googleplay/android-developer/answer/10281818
24. Apple — *App Review Guidelines* (4.2 Minimum Functionality). https://developer.apple.com/app-store/review/guidelines
25. Stripe — *Preços e tarifas Brasil* (3,99% + R$ 0,39; +2% internacional). https://stripe.com/br/pricing
26. Stripe — *Managed Payments eligibility* (empresas no Brasil não são elegíveis). https://docs.stripe.com/payments/managed-payments/eligibility
27. Paddle — *Pricing* (5% + US$ 0,50). https://paddle.com/pricing
28. Paddle — *Acceptable Use Policy* (restrição a virtual currency/stored value; última atualização 13/04/2026). https://paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle
29. Paddle — *Which countries are supported by Paddle?* (Brasil suportado como seller). https://paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle
30. Gumroad — *Pricing* (10% + US$ 0,50; 30% via discover; MoR desde 01/01/2025). https://gumroad.com/pricing
31. Gumroad — *License keys* / *Verify a License*. https://gumroad.com/help/article/76-license-keys e https://api.gumroad.com/v2/licenses/verify
32. Lemon Squeezy — *Saying goodbye to Lemon Squeezy* (sem novos cadastros; encerra em 31/03/2027). https://www.lemonsqueezy.com/blog/saying-goodbye-to-lemon-squeezy
33. Ko-fi — *Pricing* (5% free / 0% Gold US$ 12/mês + processor). https://ko-fi.com/pricing
34. Cloudflare — *Workers Limits* (100.000 req/dia free; 10 ms CPU). https://developers.cloudflare.com/workers/platform/limits/
35. Linklaters — *Game changer: EU introduces consumer protection guidance for in-game virtual currencies* (27/03/2025). https://techinsights.linklaters.com/post/102k6t4/game-changer-eu-introduces-consumer-protection-guidance-for-in-game-virtual-curr
36. European Commission — *Key principles on in-game virtual currencies* (PDF). https://commission.europa.eu/document/download/8af13e88-6540-436c-b137-9853e7fe866a_en
37. European Commission — *Proposal for a Digital Fairness Act* (novembro/2026; em tramitação). https://commission.europa.eu/document/download/0575d59f-554f-4a9e-b54b-e6b717175809_en
38. ANPD — *ECA Digital* (página oficial, atualizada em 10/06/2026). https://www.gov.br/anpd/pt-br/assuntos/eca-digital
39. Brasil — *Lei nº 15.211/2025 (ECA Digital)*. https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm
40. Souto Correa — *ECA Digital entra em vigor: o que muda para empresas de serviços digitais e jogos eletrônicos* (20/03/2026). https://soutocorrea.com.br/client-alerts/eca-digital-entra-em-vigor-o-que-muda-para-empresas-de-servicos-digitais-e-jogos-eletronicos
41. Brasil — *Código de Defesa do Consumidor (Lei 8.078/1990)*, art. 49 e art. 51. https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
42. Mercado Advogados — *Devolver jogo digital depois de jogar: o que a lei permite* (19/11/2026). https://www.mercadoadvogados.com.br/conteudo/devolver-jogo-digital-depois-de-jogar
43. Brasil — *LGPD (Lei 13.709/2018)*, art. 14. https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
44. Mercado Advogados — *Reforma tributária e a PJ de serviços em 2026 e 2027* (16/08/2026). https://www.mercadoadvogados.com.br/conteudo/reforma-tributaria-pj-servicos-2026-2027
45. Valor Econômico — *Pix responde por 45% das transações no e-commerce* (26/02/2026). https://valor.globo.com/financas/noticia/2026/02/26/pix-responde-por-45-pontos-percentuais-das-transaes-no-e-commerce-mostra-pesquisa-da-visa.ghtml
46. Investing.com — *USD/BRL* (21/11/2026: ~5,90). https://br.investing.com/currencies/usd-brl
47. UOL Economia — *Salário mínimo 2026: R$ 1.621* (30/09/2026). https://economia.uol.com.br/noticias/redacao/2026/09/30/decreto-fixa-salario-minimo-em-r-1621-a-partir-de-2026.ghtm
48. GamesIndustry.biz — *Superhot passes two million lifetime sales*. https://gamesindustry.biz/superhot-passes-two-million-lifetime-sales
49. FTC — *Bringing Dark Patterns to Light* (setembro/2022). https://www.ftc.gov/reports/bringing-dark-patterns-light
50. Newgrounds — *Monetization* (transição para ad-free). http://newgrounds.com/wiki/creator-resources/monetization
51. steamworks.js — *Steamworks implementation for Electron/NW.js* (overlay, achievements). https://github.com/ceifa/steamworks.js
52. Google — *Use Google Play Billing in your Trusted Web Activity*. https://developers.google.com/web/android/trusted-web-activity/receive-payments-play-billing

---

## 11. Conclusão: as 5 decisões

1. **Modelo:** free-to-play direto com IAP cosmético + Pacote Fundador. Premium só depois de 12–15 fases; ads só em portais.
2. **Produto:** fora pay-to-win e revive agressivo. "Tentar de novo" grátis é a ação primária; revive com moeda ganha é secundário.
3. **Preço:** 6 SKUs, nada abaixo de R$ 9,90/US$ 1,99; Fundador a R$ 79,90/US$ 14,99; preço real ao lado de qualquer moeda.
4. **Pagamento:** Stripe Brasil (Pix/cartão) para o local; Paddle (MoR) para o exterior; licença assinada por Worker; Lemon Squeezy nunca.
5. **Distribuição:** site próprio + itch.io + CrazyGames/Poki como marketing; Steam e mobile só depois de conteúdo e wishlist. Sem paid UA no lançamento.

**A aposta central:** o MOVESTOP não vai vencer por ter 50 skins ou um battle pass. Vai vencer se o hook visual trouxer gente, se a primeira fase for boa o suficiente para alguém querer apoiar, e se o pedido de apoio for honesto. O resto é execução.

