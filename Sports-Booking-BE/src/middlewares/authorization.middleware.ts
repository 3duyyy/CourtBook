import { NextFunction, Request, Response } from 'express'
import { hasPermission, Permission, RoleId, ROLES } from '../shared/constants/roles'
import { AppError } from '../shared/exceptions'
import { StatusCodes } from 'http-status-codes'

export class AuthorizationMiddleware {
  static roles(...allowedRoles: RoleId[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = req.user?.roleId as RoleId

      if (!userRole) {
        return next(new AppError('Bạn chưa đăng nhập!', StatusCodes.UNAUTHORIZED))
      }

      if (!allowedRoles.includes(userRole)) {
        return next(new AppError('Bạn không có quyền truy cập', StatusCodes.FORBIDDEN))
      }

      next()
    }
  }

  static permission(requiredPermission: Permission) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = req.user?.roleId as RoleId

      if (!userRole) {
        return next(new AppError('Bạn chưa đăng nhập!', StatusCodes.UNAUTHORIZED))
      }

      if (!hasPermission(userRole, requiredPermission)) {
        return next(new AppError('Bạn không có quyền thực hiện hành động này', StatusCodes.FORBIDDEN))
      }

      next()
    }
  }

  static adminOnly = () => this.roles(ROLES.ADMIN)
  static ownerOnly = () => this.roles(ROLES.OWNER)
  static customerOnly = () => this.roles(ROLES.CUSTOMER)
  static ownerOrAdmin = () => this.roles(ROLES.OWNER, ROLES.ADMIN)
}
