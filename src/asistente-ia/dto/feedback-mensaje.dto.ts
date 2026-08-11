import { IsBoolean } from 'class-validator';

export class FeedbackMensajeDto {
  @IsBoolean()
  util: boolean;
}
