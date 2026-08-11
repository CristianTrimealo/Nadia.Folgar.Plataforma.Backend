import { IsEnum, IsOptional } from 'class-validator';
import { CatedralSyncOperacion } from '../schemas/catedral-sync-log.schema';

export class SyncCatedralDto {
  @IsEnum(CatedralSyncOperacion)
  operacion: CatedralSyncOperacion;

  /**
   * Payload de origen, solo aplica a IMPORTAR_MOVIMIENTOS. Forma libre a
   * propósito: todavía no está definido si va a ser un archivo, una URL, una
   * respuesta de API, etc. (depende de la decisión de FOLGAR-029).
   */
  @IsOptional()
  origen?: unknown;
}
