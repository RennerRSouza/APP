# 6. Conclusão e Próximos Passos — Ecossistema SIGA

Este documento apresenta exclusivamente os **dados factuais e métricas auditadas** no repositório Git, no código-fonte e nos documentos de planejamento do projeto até **16/11/2026**, contemplando o tamanho do código, o histórico de commits por integrante, a comparação entre entregas realizadas e planejadas, os desafios técnicos superados e os trabalhos pendentes para conclusão da Sprint 3 e fase Pós-MVP.

---

## 6.1 Métricas Factuais do Projeto

### A. Tamanho de Código (Auditado no Workspace Atual)

| Módulo / Camada | Diretórios Auditados | Extensões | Arquivos | Linhas (LOC) |
| :--- | :--- | :--- | ---: | ---: |
| **Frontend Mobile — Código-fonte** | `frontend/src/` + `frontend/App.tsx` | `.ts`, `.tsx` | 40 | 2.507 |
| **Frontend Mobile — Testes Unitários** | `frontend/__tests__/` | `.ts`, `.tsx` | 4 | 161 |
| **Frontend Mobile — Contratos e Docs IA** | `frontend/assets/` | `.json`, `.md` | 3 | 414 |
| **Backend Web Admin — Django (`siga_core`)** | `backend/siga_core/`, `backend/config/`, `manage.py` | `.py` | 20 | 3.209 |
| **Backend Web Admin — Templates HTML** | `backend/templates/` | `.html` | 15 | 2.529 |
| **Backend Protótipo FastAPI + Testes API** | `backend/src/`, `backend/tests/` | `.py` | 15 | 166 |
| **CI/CD e Templates GitHub** | `.github/` | `.yml`, `.md` | 6 | 236 |
| **Total Geral do Repositório (Código/Config/Templates)** | — | — | **103** | **9.222** |

*(Nota: excluídos diretórios de dependências e caches como `node_modules/`, `venv/`, `.venv/`, `__pycache__/` e binários `.tflite`.)*

### B. Histórico de Commits e Contribuições por Membro da Equipe (Git Log)

Período registrado no histórico Git (`git log --all`): **29/09/2026 a 15/11/2026** — total de **153 commits** em todas as branches (sendo **109 commits manuais**, 44 checkpoints automáticos de sessão e **103 commits integrados na branch `main`**), com **14 merges de Pull Request** explícitos e referências até o **PR #16**.

| Integrante | E-mail (Git) | Commits Totais (`--all`) | Commits Manuais | Commits na `main` | Dias Ativos | Linhas Adicionadas / Removidas (Código/Docs Manuais)* | Principais Entregas Registradas no Histórico |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| **Vinícius Bryan Debatin** | `v.debatin@estudante.ifmt.edu.br` | 78 | 34 | 28 | 13 (`09/10` – `15/11`) | `+14.128` / `-1.278` | Desenvolvimento completo do **SIGA Web Admin v1.0 e v2.0** (Django MVT, 15 templates, API REST `/api/sincronizar/`, Multi-Tenant, 4 Pilares, testes); treinamento e upload do modelo `yolo.tflite` (YOLO26n v14); Contrato de Inventário v2.0 (`event_rental_inventory.json`, tipos e validador Zod); ajustes de UI para pontos centrais e divergência; documentação de engenharia e casos de uso. |
| **Renner Rodrigues de Souza** | `renner.rodrigues.souza@gmail.com` | 70 | 70 | 70 | 13 (`29/09` – `13/11`) | `+3.624` / `-768` | Setup inicial do monorepo, Docker e CI/CD (`#TSK-10`); arquitetura Clean Architecture no React Native; integração nativa TensorFlow Lite, pré-processamento *letterbox* `640×640` (`#TSK-09`, `#TSK-11`); NMS por classe; módulo de câmera, galeria e preview (`#TSK-12`); leitura de inclinação por sensor; geolocalização GPS com Google Maps; cálculo de mesas via `table_joint`; build Android 64-bits e gestão de Pull Requests. |
| **Hemilly Luiza** | `hemillyluiza@estudante.ifmt.edu.br` | 5 | 5 | 5 | 2 (`12/11` – `13/11`) | `+98` / `-7` | Criação do workflow de build iOS Release sem assinatura (`.github/workflows/ios-build.yml`); configuração de checkout Git LFS e validação de tamanho do `yolo.tflite`; adição de `react-native-nitro-image` e correção do carregamento de asset no bundle Release do iOS. |

*\*Contagem via `git log --all --no-merges --numstat` excluindo `package-lock.json`, `Podfile.lock`, binários `.tflite` e commits automáticos de checkpoint de sessão (`Agent host session`).*

### C. Métricas por Fase / Sprint da Engenharia de Software

| Fase / Sprint | Período Planejado | Capacidade (Story Points) | Quantidade de Tasks / Stories | Commits Registrados na Janela | Escopo Principal da Fase |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Sprint 1** *(Concluída)* | `01/09/2026` – `07/10/2026` | 18 SP | Setup + PoC | 22 commits (22 manuais) | Setup do monorepo, Clean Arch, Docker, CI inicial, 50 imagens anotadas, protótipo estático. |
| **Sprint 2** *(Concluída)* | `08/10/2026` – `05/11/2026` *(commits até `08/11`)* | 39 SP *(planejados)* / **45 SP** *(entregues na Review)* | 14 US concluídas (`US-01` a `US-14`) + bônus + Web Admin | 121 commits (77 manuais) | Dataset 130 fotos, YOLO26n v14 `.tflite`, câmera/galeria, inferência offline TFLite, overlay de pontos, GPS, inclinação, regra de divergência $>10\%$, SQLite e **SIGA Web Admin v1.0 & v2.0**. |
| **Sprint 3** *(Em andamento)* | `06/11/2026` – `11/12/2026` *(auditado até `16/11`)* | 24 SP *(backlog macro)* / **27 SP** *(Jira Sprint 3)* | 9 Stories em `jira_sprint3_scrum.csv` | 10 commits (10 manuais) até `15/11` | Refino dataset `Gradil` + calibração v2, correção por toque, filtros e detalhes no histórico, login/RBAC mobile, build iOS (já adiantado no CI), bateria de 50 testes $\text{MAPE} \le 10\%$ e APK final. |
| **Pós-MVP** *(Planejado)* | Após `11/12/2026` | 8 SP | 2 Stories (`US-29`, `US-30`) | — | Empacotamento e envio em background (Wi-Fi) de discrepâncias $>10\%$ para retreinamento contínuo. |

*(Observação sobre esforço em horas: não há apontamento de horas registrado nos arquivos de controle do repositório.)*

---

## 6.2 Resultados Alcançados (Entregue vs. Planejado)

| Épico / Frente | Planejado no Backlog / Visão | Status Factual no Código em `16/11/2026` |
| :--- | :--- | :--- |
| **EP03 — Modelo de IA** | Dataset inicial de 130–200 fotos, data augmentation, treino YOLO26n/11n, exportação `.tflite` e contrato JSON. | **Base v14 entregue / Refino Gradil na S3:** Modelo `yolo.tflite` (v14, 4 classes) treinado com 130 imagens e embarcado; Contrato JSON v2.0 validado via Zod (`configuration_status: requires_calibration`). Pendente expansão específica de `Gradil` e calibração final (`[IA-S3-01]`, `[IA-S3-02]`). |
| **EP02 — Captura de Imagens** | Câmera nativa, galeria, preview/descarte e compressão `640×640` *letterbox*. | **100% Concluído (Sprint 2):** `CameraScreen`, `CameraScanner`, `GalleryService`, `pickImage` e `imagePreprocess.ts` operacionais, mais leitura extra de inclinação (`useCameraAngle`). |
| **EP04 — Detecção e Contagem** | Runtime TFLite offline, pré-processamento float32, NMS e contagem agregada. | **100% Concluído (Sprint 2):** `YoloDetector.ts`, `yoloPostprocess.ts` (NMS por classe com `IoU = 0.60` para `Gradil`) e `ContarObjetos.ts` (conversão de `table_joint` em mesas via `Math.ceil(count/2)`) funcionais e testados com Jest. |
| **EP05 — Conferência e Correção** | Marcadores visuais, ajuste `+`/`−`, toque na imagem e confirmação final. | **Parcialmente Concluído + Adiantado:** Pontos centrais coloridos com *pinch-to-zoom* (`DetectionOverlay.tsx`), ajuste `+`/`−`, placar (`PlacarDeteccoes.tsx`) e **trava de justificativa $>10\%$ já entregues** (`ResultScreen.tsx` / `useContagemFlow.ts`). Pendente interação por toque direto nos pontos (`[UX-S3-03]`). |
| **EP06 — Registro e Histórico** | SQLite local, persistência, filtros e visualizador de detalhes. | **Parcialmente Concluído + Adiantado:** SQLite (`op-sqlite`) com 4 blocos de migrations, persistência completa, histórico recente na Home, tela `HistoryScreen` com **GPS + endereço + abertura direta no Google Maps** já entregues. Pendentes filtros rápidos e modal/tela de detalhes (`[DATA-S3-05]`, `[DATA-S3-06]`). |
| **SIGA Web Admin v2.0** *(Paralelo)* | Painel Django MVT + API REST para gestão multi-tenant, regras por perfil, catálogo, auditoria e dispositivos. | **Entregue com Expansão (v2.0):** Todas as views MVT e endpoints REST implementados e cobertos por 12 testes automatizados sobre **SQLite (`db.sqlite3`)** com isolamento lógico via `ForeignKey(Empresa)` (dispensando `TenantMiddleware` e suportando Digest Executivo, Webhook WhatsApp, Vitrine RFQ e `HistoricoEvento` sem dependência de PostgreSQL). Pendente apenas exportação PDF/CSV e ativação opcional de PostgreSQL (`DB_ENGINE=postgres`) para produção de alta concorrência. |
| **EP01 — Usuários e Acessos (Mobile)** | Tela de login mobile offline, RBAC visual no app e vínculo de operador. | **Pendente no App Mobile / Pronto no Backend:** Backend já expõe `/api/login/` e regras RBAC; pendente `LoginScreen.tsx` e restrições visuais no React Native (`[AUTH-S3-07]`, `[AUTH-S3-08]`). |
| **EP07 — Validação do MVP** | Bateria de 50 fotos reais em campo ($\text{MAPE} \le 10\%$), modo avião $<2,0\text{s}$ e APK final. | **Em andamento (Sprint 3):** Workflow de build iOS `.ipa` e configuração Android 64-bits já entregues; pendente coleta e homologação formal das 50 fotos de campo (`[QA-S3-09]`). |

---

## 6.3 Lições Aprendidas (Desafios Técnicos Superados no Repositório)

1. **Oclusão Severa em Pilhas de Mesas Dobráveis e Poluição Visual:**
   * *Problema:* Em pilhas densas, o tampo de uma mesa oculta as demais, inviabilizando a detecção da mesa inteira e gerando caixas delimitadoras sobrepostas ilegíveis na tela do celular.
   * *Solução registrada:* Treinamento da classe auxiliar `table_joint` (articulações laterais) com cálculo automático por pares em `ContarObjetos.ts` (`Math.ceil(porClasse.table_joint / 2)`) e substituição de retângulos por marcadores circulares centralizados (`DetectionOverlay.tsx`, commit `2fc5a93`) com zoom por pinça.
2. **Estouro de Memória (OOM) e Latência na Preparação de Tensores:**
   * *Problema:* Imagens em alta resolução decodificadas diretamente em JavaScript causam alto consumo de heap e travamentos.
   * *Solução registrada:* Implementação em `imagePreprocess.ts` de redimensionamento proporcional prévio via `@bam.tech/react-native-image-resizer` para `640×640`, preenchimento *letterbox* em `Float32Array` normalizado (`0.0`–`1.0`) e exclusão imediata do arquivo temporário no bloco `finally`.
3. **Supressão Indevida de Gradis Empilhados no NMS:**
   * *Problema:* O algoritmo NMS padrão com limiar único descartava peças legítimas de `Gradil` quando fotografadas lado a lado com alta sobreposição.
   * *Solução registrada:* Implementação em `yoloPostprocess.ts` (commit `18e34d4`) de NMS segmentado por `classId` com elevação dinâmica do limiar para `IoU = 0.60` na classe `Gradil` (mantendo `0.45` para as demais).
4. **Descompasso entre Modelo de IA e Código Mobile:**
   * *Problema:* Alterações na ordem ou quantidade de classes exportadas pelo Roboflow quebravam silenciosamente a decodificação no aplicativo.
   * *Solução registrada:* Criação do **Contrato de Inventário v2.0** (`event_rental_inventory.json`) validado em runtime por **Zod** (`inventoryContractValidator.ts`), exigindo correspondência explícita entre os índices do tensor, `class_id_mapping` e estado de calibração antes de builds de produção.
5. **Carregamento do `.tflite` em Build Release iOS e Ponteiros Git LFS no CI:**
   * *Problema:* No build Release do iOS, `Image.resolveAssetSource` não resolvia o binário TFLite da mesma forma que em Debug, e checkouts padrão sem LFS baixavam apenas o ponteiro de texto em vez do modelo real.
   * *Solução registrada:* Passagem direta do asset `require` para `loadTensorflowModel` no iOS Release (`YoloDetector.ts`, commit `05662c7`) e configuração de `lfs: true` com checagem `SIZE >= 1MB` em `.github/workflows/ios-build.yml` (commit `fb8a4f7`).
6. **Prevenção de Fraudes e Rastreabilidade na Sincronização Offline:**
   * *Problema:* Risco de operadores (especialmente terceirizados) alterarem contagens da IA arbitrariamente, usarem aparelhos não autorizados ou duplicarem lotes ao reenviar em rede instável.
   * *Solução registrada:* Implementação no `siga_core` de idempotência por UUID (`update_or_create` em `@transaction.atomic`), validação de hardware via `X-Device-UUID` (1º aparelho `AUTORIZADO`, 2º+ `PENDENTE`), regras versionadas diferenciadas por perfil (`Funcionário` `20%` vs. `Terceirizado` `5%`) e registros imutáveis em `LogAuditoria` e `HistoricoEvento`.

---

## 6.4 Trabalhos Futuros

### A. Pendências Imediatas para Conclusão da Sprint 3 (`jira_sprint3_scrum.csv`)
* **`[IA-S3-01]` & `[IA-S3-02]`:** Coletar e anotar novo lote focado em `Gradil` (ângulo 30°–45°), retreinar `yolo.tflite` e preencher `confidence_thresholds` no `event_rental_inventory.json` alterando `configuration_status` para `production_ready`.
* **`[UX-S3-03]` & `[UX-S3-04]`:** Implementar adição/remoção de marcadores por toque direto no `DetectionOverlay.tsx` (sem conflitar com *pinch-to-zoom*) e finalizar refinamento de nomes em português no `PlacarDeteccoes.tsx`.
* **`[DATA-S3-05]` & `[DATA-S3-06]`:** Adicionar filtros rápidos (Todos, Mesas, Gradil / Pendentes vs. Sincronizados) na `HistoryScreen.tsx` e tela/modal de detalhes auditáveis do lote offline.
* **`[AUTH-S3-07]` & `[AUTH-S3-08]`:** Criar `LoginScreen.tsx` com cache de sessão local offline, integrar ao `AppNavigator.tsx` e aplicar restrições visuais por perfil (`GESTOR`, `FUNCIONARIO`, `TERCEIRIZADO`) conectando as credenciais ao `DjangoSyncDataSource.ts`.
* **`[QA-S3-09]`:** Executar a bateria cega de **50 fotos reais** em modo avião validando $\text{MAPE} \le 10,0\%$ por classe e gerar o APK assinado 64-bits ARM.

### B. Evoluções Pós-MVP e Infraestrutura de Produção
* **Ciclo Contínuo de MLOps (`EP08` — `US-29` e `US-30`):** Armazenar localmente em pasta privada fotos e coordenadas com correção manual $>10\%$ e sincronizá-las automaticamente em segundo plano ao conectar em rede Wi-Fi (bateria $>50\%$) para retreinamento contínuo do detector.
* **Infraestrutura Cloud e Escalabilidade Opcional:** Ativar PostgreSQL (`DB_ENGINE=postgres` já previsto em `settings.py`) caso o tráfego simultâneo de escrita exija migração além do SQLite atual (ou schemas isolados via `django-tenants`), configurar armazenamento de mídia em Object Storage (`AWS S3` ou `MinIO`), habilitar fila assíncrona (`Celery + Redis`) para envio real de e-mails/Digest e adicionar exportação de relatórios em **PDF e CSV** (`RF007` do Documento de Visão Web).
* **Integração Ativa Meta Cloud API:** Conectar as credenciais de produção da Meta Cloud API no webhook `/api/webhooks/whatsapp/` para disparo ativo das notificações já auditadas em `HistoricoEvento`.
