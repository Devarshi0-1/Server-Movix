import type { RequestHandler } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import User from '../models/user.model'
import { httpCode } from '../utils/httpCodes'
import { sendErrorResponse } from '../utils/response'

export const protectRoute: RequestHandler = async (req, res, next) => {
    try {
        const token = req.cookies.jwt
        const JWT_SECRET: string = process.env.JWT_SECRET!

        if (!token) throw new Error('Invalid Token')

        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
            _id: string
        }

        if (!decoded) throw new Error('Invalid Token')

        const user = await User.findById(decoded._id)

        if (!user)
            return sendErrorResponse(
                res,
                httpCode.resourceNotFound,
                'User with that ID does not exist! Protected Route Error!',
            )

        req.user = user

        next()
    } catch (error) {
        const err = error as Error
        if (err.message === 'Invalid Token') {
            res.cookie('jwt', '', { maxAge: 0 })
            req.user = null
            return sendErrorResponse(
                res,
                httpCode.notAuthorized,
                'Not Authorized! Try Logging In Again!',
            )
        }

        console.log('Error at function protectedRoute: ', err.message)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}
