import crypto from 'crypto'
import jwt, { Secret } from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

export interface TokenPayload {
  id: number
  email: string
}

export const generateToken = (payload: TokenPayload, secretSignature: Secret, tokenLife: string | number) => {
  return jwt.sign(payload, secretSignature, { expiresIn: tokenLife as any })
}

export const verifyToken = (token: string, secretSignature: Secret): TokenPayload => {
  return jwt.verify(token, secretSignature) as TokenPayload
}

// Hash Token for save token into DB (dùng crypto vì có thể tìm kiếm được token đã hash vì cùng input sẽ cùng output hash)
export const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex')
}
