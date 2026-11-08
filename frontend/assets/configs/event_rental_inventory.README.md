# Contrato de contagem de inventário offline

Configuração do processamento de fotos para contagem de mesas e gradis no aplicativo React Native para Android, com inferência local via TFLite.

É um contrato próprio do aplicativo, não um Workflow importável no Roboflow nem algo que o TFLite execute sozinho. O código do app deve interpretar as etapas e validar a configuração antes de usá-la.

## Versões

- Versão do contrato: `2.0.0`.
- Project de origem: `event-rental-inventory`.
- Versão esperada do modelo: `14`.

A versão do contrato descreve a estrutura do JSON. A versão do modelo identifica o treinamento usado na exportação.

Alterar `model.source_version` não substitui o modelo instalado: o arquivo `.tflite` empacotado também deve corresponder à v14.

## Escopo

- Processamento de uma foto por execução.
- Inferência e regras de contagem executadas offline.
- Sem vídeo, processamento ao vivo ou tracking.
- Boxes ocultas na interface final, com visualização de diagnóstico opcional.
- Contagens de mesas e gradis separadas.
- `side_joint` não faz parte deste contrato.

## Classes e metadados

Classes esperadas:

- `Black-Fold-Table`
- `Brown-Fold-Table`
- `table_joint`
- `Gradil`

Os nomes devem corresponder exatamente aos metadados do modelo exportado.

O contrato registra explicitamente os IDs usados pelo export: `0` Black-Fold-Table, `1` Brown-Fold-Table, `2` Gradil e `3` table_joint. O runtime deriva a ordem do decoder desse mapeamento.

Os índices numéricos devem ser extraídos do modelo ou do arquivo de metadados exportado junto dele. Não presumir índices pela ordem alfabética ou pela ordem de exibição no Roboflow.

O pré-processamento e o decoder devem corresponder aos tensores reais do `.tflite`, incluindo dimensões, tipos de dados, quantização e formato das saídas.

## Regras de contagem

### Mesas

As regras ficam em `counting.tables`.

- `table_joint` é a evidência primária.
- Um par transversal de articulações corresponde a uma mesa.
- As mesas se sucedem no eixo longitudinal da fila.
- Cada articulação pode pertencer a, no máximo, uma mesa.
- Uma articulação única pode representar uma mesa parcialmente visível, desde que exista evidência de corte na borda da foto original.
- A borda de um recorte interno não deve ser tratada como borda da foto.
- Articulações isoladas no interior da fila são casos incertos.
- Detecções da mesa inteira complementam a associação e a identificação do tipo, sem duplicar a contagem.
- Uma mesa inteira sem juntas associadas permanece incerta na configuração atual.
- Sem evidência do tipo, a mesa é classificada como `unknown`.
- Espaços entre detecções não geram mesas automaticamente.

### Gradis

As regras ficam em `counting.direct_objects.Gradil`.

A regra inicial proposta é:

- Uma detecção válida da classe `Gradil` individual corresponde a uma unidade.
- Gradis não usam pareamento de `table_joint`.
- Não é obrigatório associar o gradil a uma fila.
- Detecções repetidas da foto inteira e dos recortes devem ser reconciliadas.
- Sobreposição entre boxes, sozinha, não comprova duplicidade.
- Objetos parciais e duplicidades ambíguas permanecem incertos na configuração atual.

Essa regra depende de cada anotação da classe `Gradil` representar uma unidade individual, não uma pilha ou conjunto. Essa correspondência precisa ser validada.

### Resultado inconclusivo

A falta de evidências produz:

`missing_evidence_result: "inconclusive"`

Isso não deve ser apresentado como confirmação de zero itens.

Casos incertos ficam separados do total identificado. As contagens representam os itens identificados na foto, não uma garantia de inventário completo.

## Fluxo de processamento

1. Preparar a foto e corrigir sua orientação.
2. Executar a detecção na foto inteira.
3. Identificar filas de mesas geometricamente.
4. Executar inferência adicional nos recortes das filas.
5. Reconciliar detecções da foto inteira e dos recortes.
6. Parear articulações transversalmente.
7. Resolver mesas parcialmente visíveis nas bordas originais.
8. Associar detecções de mesas inteiras às hipóteses formadas.
9. Contar mesas únicas.
10. Contar gradis únicos.
11. Agregar os resultados por categoria, sem somar articulações como itens.

A formação de filas aplica-se às classes de mesas e articulações, não à classe `Gradil`.

Se não houver evidência suficiente para localizar uma fila, o contrato prevê solicitar uma região manual. Essa interação precisa ser implementada no app.

## Parâmetros e calibração

Os thresholds e parâmetros geométricos foram deixados como `null` intencionalmente.

Eles devem ser calibrados com fotos representativas antes do uso em produção. `null` significa parâmetro pendente, não zero nem um valor padrão implícito.

A configuração permanece com:

`configuration_status: "requires_calibration"`

O validador deve distinguir:

- **Validade estrutural:** formato, tipos e campos do contrato.
- **Prontidão para execução:** modelo disponível, decoder compatível e parâmetros necessários preenchidos.
- **Prontidão para produção:** calibração concluída e comportamento validado.

Uma configuração estruturalmente válida ainda pode não estar pronta para executar a contagem.

## Arquivos no projeto

- Tipos:
  `frontend/src/core/ai/inventoryContractTypes.ts`
- Validador:
  `frontend/src/core/ai/inventoryContractValidator.ts`
- Configuração:
  `frontend/assets/configs/event_rental_inventory.json`

O runtime carrega o contrato em `modelConfig.ts` e deriva dele os nomes das classes e a versão do modelo. O arquivo `.tflite` continua sendo empacotado estaticamente pelo Metro/Android; `model.asset_path` documenta o artefato esperado.

O decoder também valida se o eixo de classes do tensor corresponde ao mapeamento. Os thresholds `null` usam temporariamente o threshold global para testes; isso não significa que estejam calibrados para produção.

Em builds de desenvolvimento a inferência pode ser testada com essa configuração pendente. Em builds de produção, o app bloqueia a inferência enquanto a configuração exigir calibração ou tiver parâmetros obrigatórios nulos.

Não é necessária uma chave de API Roboflow para executar o modelo TFLite local empacotado.

## Migração do contrato 1.0.0

A versão `2.0.0` altera a estrutura do contrato. Os tipos, o validador estrutural e o mapeamento do decoder já acompanham essa versão.

Principais mudanças:

- `model.source_version`: de `11` para `14`.
- `model.source_version`: de `11` para `14`.
- Inclusão do mapeamento explícito de ID para classe, consumido pelo decoder.
- Remoção de `classes.alternative_evidence`.
- Inclusão de `Gradil` nas classes e thresholds.
- Regras de mesas movidas de `counting` para `counting.tables`.
- Inclusão de `counting.direct_objects.Gradil`.
- Inclusão de `counting.aggregation`.
- Critérios de reconciliação separados em `evidence_merging.matching_rules`.
- Inclusão das etapas de contagem de objetos diretos e agregação.
- Renomeação de campos de saída para distinguir mesas de outras categorias.

Campos de saída alterados:

| Contrato 1.0.0 | Contrato 2.0.0 |
|---|---|
| `include_total_identified` | `include_total_identified_by_category` |
| `include_counts_by_row` | `include_table_counts_by_row` |
| `include_counts_by_type` | `include_table_counts_by_type` |
| `include_unknown_type_count` | `include_unknown_table_type_count` |
| `include_evidence_per_table` | `include_evidence_per_item` |

Também foi adicionado `include_gradil_count`.

## Uso rápido

Exemplo em um arquivo localizado em `frontend/src/vision/`:

```typescript
import {
  basicValidate,
  getProductionReadinessErrors,
} from '../core/ai/inventoryContractValidator';

const cfg = require(
  '../../assets/configs/event_rental_inventory.json'
);

const errors = basicValidate(cfg);

if (errors.length > 0) {
  console.warn('Erros de validação:', errors);
  throw new Error('Configuração de inventário inválida.');
}

const readinessErrors = getProductionReadinessErrors(cfg);

// Antes de executar a contagem, verificar também:
// - parâmetros necessários preenchidos;
// - modelo e metadados compatíveis;
// - decoder e pré-processamento corretos;
// - estado de calibração.
```

Ajuste os caminhos relativos conforme a localização do arquivo consumidor. A validação estrutural aceita parâmetros nulos para permitir testes; `getProductionReadinessErrors` informa se a configuração ainda precisa de calibração.

## Próximos passos

- Implementar o motor de regras descrito no JSON.
- Definir o schema dos resultados retornados pelo motor.
- Ampliar testes para pareamento, bordas e reconciliação; validação do contrato e decode do modelo têm testes focados.
- Validar a regra de uma unidade por detecção de gradil.
- Calibrar os parâmetros em fotos representativas.
- Persistir a configuração calibrada no armazenamento local ou gerar um novo arquivo para empacotamento.

O JSON empacotado com o aplicativo não deve ser tratado como arquivo gravável em tempo de execução. Ajustes feitos no celular precisam ser salvos em armazenamento local apropriado.
