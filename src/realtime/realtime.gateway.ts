import { Injectable, Logger } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { AuthenticatedUser } from '../common/types/authenticated-user';

function roomDeEstudio(estudioId: string): string {
  return `estudio:${estudioId}`;
}

/**
 * Push en tiempo real hacia el Frontend (arranca con el caso de "extracto
 * terminó de procesarse" — ver `ExtractosIaProcessor` — pero queda genérico
 * para que otros módulos lo reusen a futuro, por eso vive en `src/realtime/`
 * y no dentro de `extractos-ia/`).
 *
 * Autenticación del handshake: el Frontend manda el access token vigente en
 * `socket.handshake.auth.token` (mismo token que ya usa `http.ts` en el
 * header Authorization). Se valida con el mismo `JwtService`/`JWT_SECRET`
 * que ya usa `JwtStrategy` para las requests HTTP — un socket sin token
 * válido se desconecta antes de unirse a ninguna room. Cada usuario se une a
 * la room de su propio `estudioId` (mismo aislamiento multi-tenant que ya
 * aplican todos los queries del Backend), nunca a rooms de otros estudios.
 */
@Injectable()
@WebSocketGateway({
  cors: { origin: (origin, cb) => cb(null, true), credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<AuthenticatedUser>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      void client.join(roomDeEstudio(payload.estudioId));
    } catch {
      this.logger.warn(`Conexión WS rechazada: token inválido o expirado`);
      client.disconnect(true);
    }
  }

  emitToEstudio(estudioId: string, event: string, payload: unknown): void {
    this.server.to(roomDeEstudio(estudioId)).emit(event, payload);
  }
}
