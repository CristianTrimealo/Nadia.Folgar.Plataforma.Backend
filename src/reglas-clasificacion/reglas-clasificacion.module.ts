import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReglaClasificacion, ReglaClasificacionSchema } from './schemas/regla-clasificacion.schema';
import { ReglasClasificacionService } from './reglas-clasificacion.service';
import { ReglasClasificacionController } from './reglas-clasificacion.controller';
import { ClientesModule } from '../clientes/clientes.module';
import { PlanCuentasModule } from '../plan-cuentas/plan-cuentas.module';
import { CuentasBancariasModule } from '../cuentas-bancarias/cuentas-bancarias.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReglaClasificacion.name, schema: ReglaClasificacionSchema },
    ]),
    ClientesModule,
    PlanCuentasModule,
    CuentasBancariasModule,
  ],
  controllers: [ReglasClasificacionController],
  providers: [ReglasClasificacionService],
  exports: [ReglasClasificacionService],
})
export class ReglasClasificacionModule {}
