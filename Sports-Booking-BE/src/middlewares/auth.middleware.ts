// import { NextFunction, Request, Response } from 'express'
// import { StatusCodes } from 'http-status-codes'
// import { verifyToken } from '../utils/jwt'
// import { env } from '../config/env.config'
// import { UserRepository } from '../repositories/user.repo'
// import { AppError } from '../exceptions'

// export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
//   const authHeader = req.headers.authorization

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return next(new AppError('Bạn chưa đăng nhập!', StatusCodes.UNAUTHORIZED))
//   }

//   const accessToken = authHeader.split(' ')[1]

//   try {
//     const payload = verifyToken(accessToken!, env.ACCESS_TOKEN_SECRET_SIGNATURE!)

//     const user = await UserRepository.findByEmail(payload.email)
//     if (!user) {
//       return next(new AppError('User không tồn tại!', StatusCodes.NOT_FOUND))
//     }

//     req.user = user
//     next()
//   } catch (error) {
//     next(error)
//   }
// }
