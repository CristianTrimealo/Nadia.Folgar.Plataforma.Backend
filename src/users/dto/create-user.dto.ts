import { IsArray, IsEmail, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  nombre: string;

  @IsArray()
  @IsMongoId({ each: true })
  roleIds: string[];

  @IsOptional()
  @IsMongoId()
  clienteId?: string;
}
