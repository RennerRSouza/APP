import {ContagemRepositoryImpl} from '../../data/repositories/ContagemRepositoryImpl';
import {SqliteContagemDataSource} from '../../data/datasources/SqliteContagemDataSource';
import {DjangoSyncDataSource} from '../../data/datasources/DjangoSyncDataSource';
import {ContarObjetos} from '../../domain/usecases/ContarObjetos';
import {ListarContagens} from '../../domain/usecases/ListarContagens';
import {SalvarContagem} from '../../domain/usecases/SalvarContagem';
import {ObjectDetector} from '../../domain/repositories/ObjectDetector';
import {Detection} from '../../domain/entities/Detection';
import {persistImage} from '../media/persistImage';
import {gerarId} from '../utils/id';

export const MODEL_VERSION = 'YOLO26n-v1.0';

// Detector padrão de desenvolvimento (Mesa Bistrô e Gradil)
class DevYoloDetector implements ObjectDetector {
  async detect(_imageUri: string): Promise<Detection[]> {
    // Retorna detecções simuladas para permitir testes imediatos do fluxo
    return [
      {
        box: {x: 40, y: 80, width: 180, height: 220},
        score: 0.95,
        classId: 0,
        label: 'mesa_bistro',
      },
      {
        box: {x: 240, y: 90, width: 170, height: 210},
        score: 0.91,
        classId: 0,
        label: 'mesa_bistro',
      },
    ];
  }
}

// 1. DataSources e APIs
const sqliteDs = new SqliteContagemDataSource();
const syncApi = new DjangoSyncDataSource();

// 2. Repositórios e Serviços
const repo = new ContagemRepositoryImpl(sqliteDs, persistImage, syncApi);
const detector: ObjectDetector = new DevYoloDetector();

// 3. Exportação dos Casos de Uso
export const container = {
  syncApi,
  repo,
  contarObjetos: new ContarObjetos(detector),
  salvarContagem: new SalvarContagem(repo, gerarId, MODEL_VERSION),
  listarContagens: new ListarContagens(repo),
};