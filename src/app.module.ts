import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.validation';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { TenancyModule } from './tenancy/tenancy.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { CatedralModule } from './catedral/catedral.module';
import { ExtractosIaModule } from './extractos-ia/extractos-ia.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { PortalClientesModule } from './portal-clientes/portal-clientes.module';
import { AlertaPresentacionesModule } from './alerta-presentaciones/alerta-presentaciones.module';
import { IvaTareasModule } from './iva-tareas/iva-tareas.module';
import { FacturacionElectronicaModule } from './facturacion-electronica/facturacion-electronica.module';
import { AsistenteIaModule } from './asistente-ia/asistente-ia.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      expandVariables: true,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport:
            configService.get<string>('NODE_ENV') === 'production'
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
        },
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL') ?? 60000,
          limit: configService.get<number>('THROTTLE_LIMIT') ?? 20,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    TenancyModule,
    RolesModule,
    UsersModule,
    AuthModule,
    ClientesModule,
    CatedralModule,
    ExtractosIaModule,
    NotificacionesModule,
    PortalClientesModule,
    AlertaPresentacionesModule,
    IvaTareasModule,
    FacturacionElectronicaModule,
    AsistenteIaModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalHttpExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
