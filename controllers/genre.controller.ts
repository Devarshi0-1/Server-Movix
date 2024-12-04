import { RequestHandler } from 'express'
import { isValidObjectId } from 'mongoose'
import { Genre } from '../models/genre.model'
import { Movie } from '../models/movie.model'
import { httpCode } from '../utils/httpCodes'
import { sendErrorResponse, sendSuccessResponse } from '../utils/response'
import { genreDescriptionValidator, nameValidator, numberValidator } from '../utils/validators'

type TCreateUpdateGenreReqBody = {
    name: unknown
    description?: unknown
}

export const createGenre: RequestHandler<{}, {}, TCreateUpdateGenreReqBody> = async (req, res) => {
    try {
        const nameValidatorResult = nameValidator.safeParse(req.body.name)
        const descriptionValidatorResult = genreDescriptionValidator.safeParse(req.body.description)

        if (descriptionValidatorResult.error)
            return sendErrorResponse(
                res,
                httpCode.badRequest,
                descriptionValidatorResult.error.message,
            )

        if (nameValidatorResult.error)
            return sendErrorResponse(res, httpCode.badRequest, nameValidatorResult.error.message)

        const name = nameValidatorResult.data
        const description = descriptionValidatorResult.data || ''

        let existingGenre = await Genre.findOne({ name })

        if (existingGenre)
            return sendErrorResponse(res, httpCode.notAuthorized, 'Genre already exists!')

        const genre = await Genre.create({ name, description, createdBy: req.user?._id })

        if (!genre)
            return sendErrorResponse(
                res,
                httpCode.internalServerError,
                'Genre could not be created!',
            )

        return sendSuccessResponse(res, httpCode.successful, genre, 'Genre created successfully!')
    } catch (error) {
        console.log('Error In Genre Controller, at function createGenre: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

export const updateGenre: RequestHandler<{ id: unknown }, {}, TCreateUpdateGenreReqBody> = async (
    req,
    res,
) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid genre ID!')

        if (!req.body.name && !req.body.description)
            return sendErrorResponse(res, httpCode.badRequest, 'No fields to update!')

        const genre = await Genre.findById(id)

        if (!genre) return sendErrorResponse(res, httpCode.resourceNotFound, 'Genre not found!')

        const nameValidatorResult = nameValidator.optional().safeParse(req.body.name)
        const descriptionValidatorResult = genreDescriptionValidator.safeParse(req.body.description)

        if (descriptionValidatorResult.error)
            return sendErrorResponse(
                res,
                httpCode.badRequest,
                descriptionValidatorResult.error.message,
            )

        if (nameValidatorResult.error)
            return sendErrorResponse(res, httpCode.badRequest, nameValidatorResult.error.message)

        const name = nameValidatorResult.data
        const description = descriptionValidatorResult.data

        if (name) genre.name = name

        if (description) genre.description = description

        genre.updatedBy = req.user?._id

        await genre.save()

        return sendSuccessResponse(res, httpCode.successful, genre, 'Genre updated successfully!')
    } catch (error) {
        console.log('Error In Genre Controller, at function updateGenre: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

export const deleteGenre: RequestHandler<{ id: unknown }> = async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid genre ID!')

        const moviesWithGenre = await Movie.find({ genre: { $in: [id] } })

        if (moviesWithGenre.length > 0)
            return sendErrorResponse(
                res,
                httpCode.badRequest,
                'Genre is associated with movies, cannot delete!',
            )

        const genre = await Genre.findByIdAndDelete(id)

        if (!genre) return sendErrorResponse(res, httpCode.resourceNotFound, 'Genre not found!')

        return sendSuccessResponse(res, httpCode.successful, null, 'Genre deleted successfully!')
    } catch (error) {
        console.log('Error In Genre Controller, at function deleteGenre: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

type TSearchGenresQuery = {
    page: unknown
    limit: unknown
    name: unknown
}

export const searchGenres: RequestHandler<{}, {}, {}, TSearchGenresQuery> = async (req, res) => {
    try {
        const nameValidationResult = nameValidator.safeParse(req.query.name)

        if (nameValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, nameValidationResult.error.message)

        const pageValidator = numberValidator(1, 20)
        const limitValidator = numberValidator(1, 20)

        const pageValidationResult = pageValidator.safeParse(Number(req.query.page))
        const limitValidationResult = limitValidator.safeParse(Number(req.query.limit))

        if (pageValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, pageValidationResult.error.message)

        const name = nameValidationResult.data
        const page = pageValidationResult.data
        const limit = limitValidationResult.data

        // Validate and parse pagination parameters
        const pageNumber = Math.max(1, Number(page))
        const limitNumber = Math.min(Math.max(1, Number(limit)), 20) // Limit between 1-20
        const skip = (pageNumber - 1) * limitNumber

        const nameRegex = new RegExp(name.trim(), 'i')
        const genres = await Genre.aggregate([
            { $match: { name: nameRegex } },
            { $sort: { name: 1 } },
            { $skip: skip },
            { $limit: limitNumber },
        ])

        const totalGenres = await Genre.countDocuments({ name: nameRegex })

        return sendSuccessResponse(
            res,
            httpCode.successful,
            {
                genres,
                pagination: {
                    current_page: pageNumber,
                    total_pages: Math.ceil(totalGenres / limitNumber),
                    total_genres: totalGenres,
                    per_page: limitNumber,
                },
            },
            'Genres retrieved successfully!',
        )
    } catch (err) {
        res.status(500).json({ message: 'Error fetching genres', error: err })
    }
}

export const getGenreByName: RequestHandler<{ name: unknown }> = async (req, res) => {
    try {
        const nameValidatorResult = nameValidator.safeParse(req.params.name)

        if (!nameValidatorResult.success)
            return sendErrorResponse(res, httpCode.badRequest, nameValidatorResult.error.message)

        const name = nameValidatorResult.data

        const genre = await Genre.findOne({ name })

        if (!genre) return sendErrorResponse(res, httpCode.resourceNotFound, 'Genre not found!')

        return sendSuccessResponse(res, httpCode.successful, genre, 'Genre found successfully!')
    } catch (error) {
        console.log('Error In Genre Controller, at function getGenreByName: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

export const getGenreById: RequestHandler<{ id: unknown }> = async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid genre ID!')

        const genre = await Genre.findById(id)

        if (!genre) return sendErrorResponse(res, httpCode.resourceNotFound, 'Genre not found!')

        return sendSuccessResponse(res, httpCode.successful, genre, 'Genre found successfully!')
    } catch (error) {
        console.log('Error In Genre Controller, at function getGenreById: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

export const getMyGenre: RequestHandler = async (req, res) => {
    try {
        const myGenres = await Genre.find({ createdBy: req.user?._id })

        return sendSuccessResponse(
            res,
            httpCode.successful,
            myGenres,
            'My genres found successfully!',
        )
    } catch (error) {
        console.log('Error In Genre Controller, at function getMyGenre: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

export const getAllGenres: RequestHandler = async (req, res) => {
    try {
        console.log('getAllGenres')

        const genres = await Genre.find()

        return sendSuccessResponse(
            res,
            httpCode.successful,
            genres,
            'All genres found successfully!',
        )
    } catch (error) {
        console.log('Error In Genre Controller, at function getAllGenres: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}
