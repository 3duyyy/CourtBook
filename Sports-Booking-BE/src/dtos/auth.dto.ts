import { Exclude, Expose } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6, { message: 'Password phải tối thiểu 6 ký tự' })
  password!: string

  @IsString()
  fullName!: string

  @IsString()
  @IsOptional()
  phone!: string
}

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string

  @IsNotEmpty()
  @IsString()
  password!: string
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken!: string
}

export class AuthResponseDto {
  id!: number
  email!: string
  fullName!: string
  phone?: string
  avatarUrl?: string
  status!: string
  isVerified!: boolean
  createdAt!: Date
  updatedAt!: Date

  role!: {
    id: number
    name: string
  }

  @Exclude()
  passwordHash?: string

  @Exclude()
  refreshToken?: any[]
}

export class LoginResponseDto {
  @Expose()
  user!: AuthResponseDto

  @Expose()
  accessToken!: string

  @Exclude()
  refreshToken!: string

  @Expose()
  expiresAt!: number
}
