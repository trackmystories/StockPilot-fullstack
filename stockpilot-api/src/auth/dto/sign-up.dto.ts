import {Transform} from 'class-transformer';
import {IsEmail, IsString, MaxLength, MinLength} from 'class-validator';

export class SignUpDto {
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(4096)
  password!: string;

  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;
}
