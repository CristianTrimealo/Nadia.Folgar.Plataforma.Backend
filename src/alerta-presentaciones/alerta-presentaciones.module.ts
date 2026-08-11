import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cliente, ClienteSchema } from '../clientes/schemas/cliente.schema';
import { MESSAGING_PROVIDER } from '../notificaciones/ports/messaging-provider.port';
import { EmailAdapter } from '../notificaciones/adapters/email.adapter';
import { NovedadFiscal, NovedadFiscalSchema } from './schemas/novedad-fiscal.schema';
import { ARCA_MONITOR_PORT } from './ports/arca-monitor.port';
import { ArcaMonitorStubAdapter } from './adapters/arca-monitor-stub.adapter';
import { AlertaPresentacionesService } from './alerta-presentaciones.service';
import { AlertaPresentacionesController } from './alerta-presentaciones.controller';

/**
 * Módulo "Alerta de Presentaciones (Domicilio Fiscal Electrónico)" (backlog
 * FOLGAR-040 a FOLGAR-045) — **RIESGO ALTO**, ver CLAUDE.md.
 *
 * Deliberadamente NO se importa en `AppModule` todavía — esa integración
 * queda a cargo de otro cambio en paralelo sobre ese mismo archivo, para
 * evitar pisarlo (mismo criterio que `catedral`, `notificaciones` y
 * `portal-clientes`).
 *
 * El provider de `ARCA_MONITOR_PORT` apunta hoy a `ArcaMonitorStubAdapter`
 * porque FOLGAR-040/041 (vía de acceso al Domicilio Fiscal Electrónico:
 * ¿delegación de Clave Fiscal?, ¿API oficial de ARCA?, otra) todavía no
 * están decididos con el cliente. Cuando se decida, alcanza con reemplazar
 * el `useClass` de este provider por el adapter real —
 * `AlertaPresentacionesService` y `AlertaPresentacionesController` no
 * deberían requerir cambios.
 *
 * Reutiliza el puerto `MessagingProvider` y el adapter stub `EmailAdapter`
 * de `notificaciones/` (mismo contrato, no se duplica ni se modifica ese
 * código) para avisarle al equipo del estudio cuando aparece una novedad
 * fiscal nueva — mismo patrón que `portal-clientes.module.ts`: se registra
 * el `useClass` acá mismo, en vez de importar `NotificacionesModule`,
 * porque ese módulo hoy no exporta el token `MESSAGING_PROVIDER`. Si en el
 * futuro empieza a exportarlo, este provider puede reemplazarse por
 * `imports: [NotificacionesModule]` sin tocar el resto de este módulo.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NovedadFiscal.name, schema: NovedadFiscalSchema },
      { name: Cliente.name, schema: ClienteSchema },
    ]),
  ],
  controllers: [AlertaPresentacionesController],
  providers: [
    AlertaPresentacionesService,
    { provide: ARCA_MONITOR_PORT, useClass: ArcaMonitorStubAdapter },
    { provide: MESSAGING_PROVIDER, useClass: EmailAdapter },
  ],
  exports: [AlertaPresentacionesService],
})
export class AlertaPresentacionesModule {}
