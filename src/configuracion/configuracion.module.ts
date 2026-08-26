import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IntegracionIa, IntegracionIaSchema } from './schemas/integracion-ia.schema';
import { Estudio, EstudioSchema } from '../tenancy/schemas/estudio.schema';
import { IntegracionesService } from './integraciones.service';
import { IntegracionesController } from './integraciones.controller';
import { ProveedorIaValidatorService } from './proveedor-ia-validator.service';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { ClientesModule } from '../clientes/clientes.module';
import { SecretCipherService } from '../common/crypto/secret-cipher.service';

/**
 * Configuración → Integraciones: conectar/desconectar proveedores de IA
 * (OpenAI, Claude) a nivel Estudio y elegir el motor por defecto. Ver
 * `AiProviderResolverService` para cómo `extractos-ia` y `asistente-ia`
 * resuelven, en el momento de usarlo, qué proveedor y credencial les toca —
 * reemplaza el factory estático `AI_PROVIDER` de entorno que existía antes
 * (que sigue funcionando como último fallback, ver el resolver).
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IntegracionIa.name, schema: IntegracionIaSchema },
      { name: Estudio.name, schema: EstudioSchema },
    ]),
    ClientesModule,
  ],
  controllers: [IntegracionesController],
  providers: [
    IntegracionesService,
    ProveedorIaValidatorService,
    AiProviderResolverService,
    SecretCipherService,
  ],
  exports: [AiProviderResolverService],
})
export class ConfiguracionModule {}
