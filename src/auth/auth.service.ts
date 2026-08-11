import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { AuthenticatedUser, UserRole } from '../common/types/authenticated-user';
import { Role } from '../roles/schemas/role.schema';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshPayload {
  sub: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserDocument> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  buildUserContext(user: UserDocument): AuthenticatedUser {
    const roles = (user.roleIds as unknown as Role[]).filter(
      (role): role is Role => typeof role === 'object' && role !== null && 'nombre' in role,
    );
    const permissions = Array.from(new Set(roles.flatMap((role) => role.permisos)));

    return {
      userId: user._id.toString(),
      email: user.email,
      roles: roles.map((role) => role.nombre) as UserRole[],
      permissions,
      estudioId: user.estudioId.toString(),
      clienteId: user.clienteId?.toString(),
    };
  }

  login(user: UserDocument): TokenPair {
    return this.issueTokens(this.buildUserContext(user));
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshPayload;
    try {
      payload = this.jwtService.verify<RefreshPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    return this.issueTokens(this.buildUserContext(user));
  }

  private issueTokens(context: AuthenticatedUser): TokenPair {
    const accessToken = this.jwtService.sign(context as unknown as Record<string, unknown>, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') as never,
    });

    const refreshToken = this.jwtService.sign(
      { sub: context.userId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') as never,
      },
    );

    return { accessToken, refreshToken };
  }
}
