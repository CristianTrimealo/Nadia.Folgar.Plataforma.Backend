import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CuentaBancaria, CuentaBancariaSchema } from './schemas/cuenta-bancaria.schema';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CuentasBancariasController } from './cuentas-bancarias.controller';
import { ClientesModule } from '../clientes/clientes.module';
import { PlanCuentasModule } from '../plan-cuentas/plan-cuentas.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CuentaBancaria.name, schema: CuentaBancariaSchema }]),
    ClientesModule,
    PlanCuentasModule,
  ],
  controllers: [CuentasBancariasController],
  providers: [CuentasBancariasService],
  exports: [CuentasBancariasService],
})
export class CuentasBancariasModule {}
