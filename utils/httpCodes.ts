type THttpCode = {
    successful: 200
    resourceCreated: 201
    badRequest: 400
    notAuthorized: 401
    resourceNotFound: 404
    internalServerError: 500
}

export const httpCode: THttpCode = {
    successful: 200,
    resourceCreated: 201,
    badRequest: 400,
    notAuthorized: 401,
    resourceNotFound: 404,
    internalServerError: 500,
} as const
