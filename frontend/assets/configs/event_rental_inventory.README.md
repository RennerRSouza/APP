É um contrato próprio do aplicativo, não um Workflow importável no Roboflow nem algo que o TFLite execute sozinho.
O código do app deve interpretar essas etapas e validar a configuração antes de usar.

Pontos principais:
- Os parâmetros geométricos e thresholds foram deixados como `null` intencionalmente — devem ser calibrados em testes.
- `table_joint` é a evidência primária; um par transversal corresponde a uma mesa.
- `alternative_evidence.side_joint` está desabilitado por padrão.
- Falta de evidências produz `missing_evidence_result: "inconclusive"` (não assume 0 mesas).

Onde colocar no projeto:
- Tipos e validador: `frontend/src/core/ai/inventoryContractTypes.ts` e `frontend/src/core/ai/inventoryContractValidator.ts`
- Exemplo JSON: `frontend/assets/configs/event_rental_inventory.json`

Instalação (opcional, para usar o validador Zod):

Execute no diretório `frontend`:

npm install zod

Uso rápido (exemplo):

import { validateWithZod, basicValidate } from '../../core/ai/inventoryContractValidator';
const cfg = require('../assets/configs/event_rental_inventory.json');
const r = basicValidate(cfg);
if (r.length) console.warn('validation errors', r);
// se quiser usar Zod (requer pacote):
// const zres = validateWithZod(cfg);

Próximos passos:
- Implementar testes unitários para a validação e as regras condicionais.
- Adicionar rotina de calibração que grava os valores calibrados no JSON final.
