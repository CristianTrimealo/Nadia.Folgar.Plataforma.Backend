import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cliente, ClienteSchema } from '../clientes/schemas/cliente.schema';
import { Factura, FacturaSchema } from './schemas/factura.schema';
import { FacturacionElectronicaService } from './facturacion-electronica.service';
import { FacturacionElectronicaController } from './facturacion-electronica.controller';
import { FACTURACION_ELECTRONICA_PORT } from './ports/facturacion-electronica.port';
import { FacturacionStubAdapter } from './adapters/facturacion-stub.adapter';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Factura.name, schema: FacturaSchema },
      { name: Cliente.name, schema: ClienteSchema },
    ]),
  ],
  controllers: [FacturacionElectronicaController],
  providers: [
    FacturacionElectronicaService,
    { provide: FACTURACION_ELECTRONICA_PORT, useClass: FacturacionStubAdapter },
  ],
  exports: [FacturacionElectronicaService],
})
export class FacturacionElectronicaModule {}
