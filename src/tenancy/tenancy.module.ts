import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Estudio, EstudioSchema } from './schemas/estudio.schema';
import { TenancyService } from './tenancy.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Estudio.name, schema: EstudioSchema }])],
  providers: [TenancyService],
  exports: [TenancyService, MongooseModule],
})
export class TenancyModule {}
