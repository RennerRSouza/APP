import {ContagemRepositoryImpl} from '../../data/repositories/ContagemRepositoryImpl';
import {SqliteContagemDataSource} from '../../data/datasources/SqliteContagemDataSource';
import {DjangoSyncDataSource} from '../../data/datasources/DjangoSyncDataSource';
import {ContarObjetos} from '../../domain/usecases/ContarObjetos';
import {ListarContagens} from '../../domain/usecases/ListarContagens';
import {SalvarContagem} from '../../domain/usecases/SalvarContagem';
import {ObjectDetector} from '../../domain/repositories/ObjectDetector';
// Importação do nosso YOLO verdadeiro que consertamos
import {YoloDetector} from '../ai/YoloDetector';
import {persistImage} from '../media/persistImage';
import {gerarId} from '../utils/id';

export const MODEL_VERSION = 'YOLO26n-v1.0';

// 1. DataSources e APIs
const sqliteDs = new SqliteContagemDataSource();
const syncApi = new DjangoSyncDataSource();

// 2. Repositórios e Serviços
const repo = new ContagemRepositoryImpl(sqliteDs, persistImage, syncApi);

// ⚡ AQUI ESTÁ A MÁGICA: Instanciamos o YOLO Real (TensorFlow Lite) em vez do DevYoloDetector
const detector: ObjectDetector = new YoloDetector();

// 3. Exportação dos Casos de Uso
export const container = {
  syncApi,
  repo,
  contarObjetos: new ContarObjetos(detector),
  salvarContagem: new SalvarContagem(repo, gerarId, MODEL_VERSION),
  listarContagens: new ListarContagens(repo),
};