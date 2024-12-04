import { RequestHandler } from 'express'
import { httpCode } from '../utils/httpCodes'
import { sendErrorResponse } from '../utils/response'

export const checkRole = (...roles: ('USER' | 'MODERATOR' | 'ADMIN')[]): RequestHandler => {
    return (req, res, next) => {
        if (!req.user) return sendErrorResponse(res, httpCode.notAuthorized, 'Unauthorized')
        if (!roles.includes(req.user.role))
            return sendErrorResponse(res, httpCode.notAuthorized, 'Unauthorized')
        next()
    }
}
