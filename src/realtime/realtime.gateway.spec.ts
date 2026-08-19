import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway';

interface MockSocket {
  handshake: { auth: Record<string, unknown> };
  join: jest.Mock;
  disconnect: jest.Mock;
}

describe('RealtimeGateway', () => {
  const jwtServiceMock = { verify: jest.fn() };
  const configServiceMock = { get: jest.fn().mockReturnValue('dev-secret') };

  function buildGateway(): RealtimeGateway {
    return new RealtimeGateway(
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
    );
  }

  function buildSocket(token?: string): MockSocket {
    return {
      handshake: { auth: token ? { token } : {} },
      join: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('desconecta el socket si no manda token', () => {
    const gateway = buildGateway();
    const socket = buildSocket();

    gateway.handleConnection(socket as unknown as Socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('desconecta el socket si el token es inválido', () => {
    jwtServiceMock.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    const gateway = buildGateway();
    const socket = buildSocket('token-malo');

    gateway.handleConnection(socket as unknown as Socket);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('une al socket a la room de su estudio si el token es válido', () => {
    jwtServiceMock.verify.mockReturnValue({ estudioId: 'estudio-1' });
    const gateway = buildGateway();
    const socket = buildSocket('token-bueno');

    gateway.handleConnection(socket as unknown as Socket);

    expect(socket.join).toHaveBeenCalledWith('estudio:estudio-1');
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('emitToEstudio emite el evento solo a la room del estudio indicado', () => {
    const gateway = buildGateway();
    const toMock = jest.fn().mockReturnValue({ emit: jest.fn() });
    (gateway as unknown as { server: { to: jest.Mock } }).server = { to: toMock };

    gateway.emitToEstudio('estudio-1', 'extracto:procesado', { extractoId: 'x' });

    expect(toMock).toHaveBeenCalledWith('estudio:estudio-1');
  });
});
