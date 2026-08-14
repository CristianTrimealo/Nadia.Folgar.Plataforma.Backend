import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CuentaContable, CuentaContableSchema } from './schemas/cuenta-contable.schema';
import { PlanCuentasService } from './plan-cuentas.service';
import { PlanCuentasController } from './plan-cuentas.controller';
import { ClientesModule } from '../clientes/clientes.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CuentaContable.name, schema: CuentaContableSchema }]),
    ClientesModule,
  ],
  controllers: [PlanCuentasController],
  providers: [PlanCuentasService],
  exports: [PlanCuentasService],
})
export class PlanCuentasModule {}
