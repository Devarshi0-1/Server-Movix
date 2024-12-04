import bcrypt from 'bcrypt'
import type { RequestHandler } from 'express'
import User from '../models/user.model'
import { httpCode } from '../utils/httpCodes'
import { sendErrorResponse, sendSuccessResponse } from '../utils/response'
import { generateCookie } from '../utils/sendCookie'
import { loginValidator, signUpValidator } from '../utils/validators'

type TSignupReqBody = {
    username: unknown
    password: unknown
    email: unknown
}

export const signup: RequestHandler<{}, {}, TSignupReqBody> = async (req, res) => {
    try {
        const validationResult = signUpValidator.safeParse(req.body)

        if (!validationResult.success)
            return sendErrorResponse(res, httpCode.badRequest, validationResult.error.message)

        const { username, password, email } = validationResult.data

        const existingUser = await User.findOne({ username })

        if (existingUser)
            return sendErrorResponse(res, httpCode.notAuthorized, 'User already exists!')

        const hashedPassword = await bcrypt.hash(password, 10)

        // const mfaSecret = generateMFASecret()

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            
            // mfaSecret: mfaSecret.base32,
            // mfaEnabled: false,
        })

        if (!user)
            return sendErrorResponse(
                res,
                httpCode.internalServerError,
                'Something Went Wrong! Please try again!',
            )

        generateCookie(res, user._id.toString())

        return sendSuccessResponse(
            res,
            httpCode.resourceCreated,
            {
                _id: user._id,
                username: user.username,
                email: user.email,
                // mfaSetup: mfaSecret.otpauth_url,
                preferences: user.preferences,
                role: user.role,
            },
            'Signed In Successfully!',
        )
    } catch (error) {
        const err = error as Error
        console.error('Error in Signup Controller', err.message)
        return sendErrorResponse(res, httpCode.badRequest, 'Internal Server Error!')
    }
}

export const login: RequestHandler = async (req, res) => {
    try {
        const validationResult = loginValidator.safeParse(req.body)

        if (!validationResult.success)
            return sendErrorResponse(res, httpCode.badRequest, validationResult.error.message)

        const { username, password } = validationResult.data

        const user = await User.findOne({ username }).select('+password')

        if (!user)
            return sendErrorResponse(res, httpCode.resourceNotFound, 'User does not exist, SignUp!')

        const isPasswordMatch = await bcrypt.compare(password, user.password)

        if (!isPasswordMatch)
            return sendErrorResponse(res, httpCode.notAuthorized, 'Username or Password incorrect!')

        // if (user.mfaEnabled) {
        //     if (!mfaToken) {
        //         await sendVerificationCode(user.phone_number, mfaToken)

        //         return sendSuccessResponse(
        //             res,
        //             httpCode.successful,
        //             { mfaNeeded: true },
        //             'MFA Required',
        //         )
        //     }

        //     if (!verifyMFAToken(user.mfaSecret!, mfaToken)) {
        //         return sendErrorResponse(res, httpCode.notAuthorized, 'Invalid MFA Token!')
        //     }
        // }

        generateCookie(res, user._id.toString())

        return sendSuccessResponse(
            res,
            httpCode.successful,
            {
                _id: user._id,
                username: user.username,
                preferences: user.preferences,
                role: user.role,
            },
            'Logged In Successfully!',
        )
    } catch (error) {
        const err = error as Error
        console.error('Error in Login Controller', err)
        return sendErrorResponse(res, httpCode.badRequest, 'Internal Server Error!')
    }
}

export const logout: RequestHandler = async (req, res) => {
    try {
        res.cookie('jwt', '', { maxAge: 0 })
        req.user = null
        return sendSuccessResponse(res, httpCode.successful, null, 'Logged Out!')
    } catch (error) {
        const err = error as Error
        console.log('Error In User Controller, at function logout: ', err.message)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

// TODO: Complete Reset Password Function
export const resetPassword: RequestHandler = async (req, res) => {
    try {
        const { email }: { email: string } = req.body

        const user = await User.findOne({ email })

        if (!user)
            return sendErrorResponse(res, httpCode.resourceNotFound, 'User does not exist, SignUp!')
    } catch (error) {}
}
