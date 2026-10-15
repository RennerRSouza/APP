import {Contagem} from '../../domain/entities/Contagem';

// No Emulador Android: 10.0.2.2 aponta para o localhost do seu computador.
// No iOS Simulator ou Web: use 127.0.0.1. Em aparelho físico: use o IP da sua rede local (ex: 192.168.x.x).
const DEFAULT_API_URL = 'http://10.0.2.2:8000';

// Função utilitária para codificar Basic Auth sem depender de libs externas
function toBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = str.charCodeAt(i + 1);
    const c = str.charCodeAt(i + 2);

    const enc1 = a >> 2;
    const enc2 = ((a & 3) << 4) | (b >> 4);
    let enc3 = ((b & 15) << 2) | (c >> 6);
    let enc4 = c & 63;

    if (isNaN(b)) {
      enc3 = enc4 = 64;
    } else if (isNaN(c)) {
      enc4 = 64;
    }
    output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
  }
  return output;
}

export class DjangoSyncDataSource {
  constructor(
    private readonly baseUrl: string = DEFAULT_API_URL,
    private readonly usuario: string = 'funcionario1',
    private readonly senha: string = 'senha123',
    private readonly deviceUuid: string = 'device-android-test-01',
  ) {}

  async sincronizarContagem(c: Contagem): Promise<{sucesso: boolean; status?: string; mensagem?: string}> {
    const url = `${this.baseUrl}/api/sincronizar/`;

    // Converte os itens por classe detectados pelo YOLO para o schema do backend
    const entries = Object.entries(c.porClasse);
    const itens = entries.length > 0
      ? entries.map(([codigo, qtd]) => ({
          classe_codigo: codigo,
          qtd_detectada_ia: qtd,
          qtd_confirmada_humano: c.totalConfirmado,
          justificativa: c.justificativa || '',
        }))
      : [
          {
            classe_codigo: 'mesa_bistro', // fallback default
            qtd_detectada_ia: c.totalDetectado,
            qtd_confirmada_humano: c.totalConfirmado,
            justificativa: c.justificativa || '',
          },
        ];

    const dataHoraIso = new Date(c.criadoEm).toISOString();

    const payload = {
      id: c.id,
      data_hora_inicio: dataHoraIso,
      data_hora_fim: dataHoraIso,
      lat_long: '',
      itens,
    };

    const authHeader = `Basic ${toBase64(`${this.usuario}:${this.senha}`)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'X-Device-UUID': this.deviceUuid,
          'X-Device-Model': 'Smartphone Android',
        },
        body: JSON.stringify(payload),
      });

      const responseJson = await response.json();

      if (response.status === 201) {
        return {
          sucesso: true,
          status: responseJson.status,
          mensagem: responseJson.message,
        };
      }

      if (response.status === 422) {
        return {
          sucesso: false,
          mensagem: `Erro de Regra de Negócio (422): ${JSON.stringify(responseJson.detalhes || responseJson.error)}`,
        };
      }

      return {
        sucesso: false,
        mensagem: `Erro HTTP ${response.status}: ${JSON.stringify(responseJson)}`,
      };
    } catch (error) {
      return {
        sucesso: false,
        mensagem: `Falha de conexão com servidor Django: ${String(error)}`,
      };
    }
  }
}