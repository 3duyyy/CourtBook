import { plainToInstance } from 'class-transformer'
import { validate, ValidationError } from 'class-validator'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../exceptions'

export const validationMiddleware = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dtoInstance = plainToInstance(dtoClass, req.body)

      const errors: ValidationError[] = await validate(dtoInstance)

      if (errors.length > 0) {
        const formattedErrors = errors.map((err) => ({
          field: err.property,
          errors: Object.values(err.constraints || {})
        }))

        throw new AppError('Validation failed!', StatusCodes.BAD_REQUEST, formattedErrors)
      }

      req.body = dtoInstance
      next()
    } catch (error) {
      console.error('Validation Error:', error)
      next(error)
    }
  }
}
