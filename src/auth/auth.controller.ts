import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { ChangePasswordDto } from '../users/dto/change-password.dto';
import { UpdateAvatarDto } from '../users/dto/update-avatar.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // Límite propio, más estricto que el global de la API (ver `THROTTLE_LIMIT`
  // en app.module.ts) — el global se subió a 300/min para que la navegación
  // normal del Dashboard no dispare "Too Many Requests", así que el login
  // necesita su propia protección contra fuerza bruta en vez de heredar ese
  // número.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('google')
  @Redirect('', 302)
  google(@Query('returnTo') returnTo?: string) {
    return this.socialStart('google', returnTo);
  }

  @Get('linkedin')
  @Redirect('', 302)
  linkedin(@Query('returnTo') returnTo?: string) {
    return this.socialStart('linkedin', returnTo);
  }

  @Get('apple')
  @Redirect('', 302)
  apple(@Query('returnTo') returnTo?: string) {
    return this.socialStart('apple', returnTo);
  }

  @Get('google/callback')
  @Redirect('', 302)
  async googleCallback(@Query('code') code?: string, @Query('state') state?: string) {
    return this.socialCallback('google', code, state);
  }

  @Get('linkedin/callback')
  @Redirect('', 302)
  async linkedinCallback(@Query('code') code?: string, @Query('state') state?: string) {
    return this.socialCallback('linkedin', code, state);
  }

  @Get('apple/callback')
  @Redirect('', 302)
  async appleCallback(@Query('code') code?: string, @Query('state') state?: string) {
    return this.socialCallback('apple', code, state);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // ── "Mi perfil" (autogestión) ────────────────────────────────────────────
  // Sin permiso adicional más allá de estar autenticado: cada usuario gestiona
  // solo su propio registro (`user.userId` sale del token, nunca de un param).

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const doc = await this.usersService.findOne(user.userId);
    return this.usersService.toProfileResponse(doc);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    const doc = await this.usersService.updateOwnProfile(user.userId, dto);
    return this.usersService.toProfileResponse(doc);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.usersService.changeOwnPassword(user.userId, dto);
    return { ok: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('me/avatar')
  async updateAvatar(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAvatarDto) {
    const doc = await this.usersService.updateAvatar(user.userId, dto);
    return this.usersService.toProfileResponse(doc);
  }

  private socialStart(provider: 'google' | 'linkedin' | 'apple', returnTo?: string) {
    const callbackUrl = returnTo || this.authService.resolveSocialReturnTo();

    try {
      return { url: this.authService.buildSocialAuthorizationUrl(provider, callbackUrl) };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar el ingreso con la cuenta seleccionada';
      const params = new URLSearchParams({ error: message });
      return { url: `${callbackUrl}#${params.toString()}` };
    }
  }

  private async socialCallback(
    provider: 'google' | 'linkedin' | 'apple',
    code?: string,
    state?: string,
  ) {
    if (!code) {
      throw new BadRequestException('El proveedor no devolvió código de autorización');
    }

    const returnTo = this.authService.resolveSocialReturnTo(state);

    try {
      const tokens = await this.authService.loginWithSocialCode(provider, code);
      const params = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      return { url: `${returnTo}#${params.toString()}` };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo completar el ingreso social';
      const params = new URLSearchParams({ error: message });
      return { url: `${returnTo}#${params.toString()}` };
    }
  }
}
