import type { Response } from 'express'

const sendSuccessResponse = (res: Response, status: number, data: any, successMessage: string) => {
    if (Number(String(status).at(0)) !== 2)
        throw Error(`Http Success Response Code Can Only be 2XX`)

    return res.status(status).json({
        success: true,
        data,
        message: successMessage,
        isError: false,
        error: {
            message: '',
        },
    })
}

const sendErrorResponse = (res: Response, status: number, errorMessage: string) => {
    if (Number(String(status).at(0)) === 2) throw Error(`Http Error Response Code Cannot be 2XX`)

    return res.status(status).json({
        success: false,
        data: null,
        message: '',
        isError: true,
        error: {
            message: errorMessage,
        },
    })
}

export { sendErrorResponse, sendSuccessResponse }
