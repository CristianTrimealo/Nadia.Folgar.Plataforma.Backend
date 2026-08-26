import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cliente, ClienteSchema } from './schemas/cliente.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cliente.name, schema: ClienteSchema },
      // Para calcular `responsablesEfectivos` (asignación real + el/los
      // titular/es del estudio marcados con `User.esTitular`) en
      // `ClientesService` — ver el comentario en `cliente.schema.ts`.
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
