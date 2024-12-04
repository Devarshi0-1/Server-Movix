import { RequestHandler } from 'express'
import { isValidObjectId, PipelineStage } from 'mongoose'
import cloudinary from '../imageUpload/cloudinary'
import { Actor } from '../models/actor.model'
import { httpCode } from '../utils/httpCodes'
import { sendErrorResponse, sendSuccessResponse } from '../utils/response'
import { actorValidator, nameValidator, numberValidator } from '../utils/validators'
import { Movie } from '../models/movie.model'

type TCreateUpdateActorBody = {
    name: unknown
    biography: unknown
    profile_image: unknown
    profile_alt: unknown
    birth_date: unknown
    gender: unknown
}

export const createActor: RequestHandler<{}, {}, TCreateUpdateActorBody> = async (req, res) => {
    try {
        const actorValidationResult = actorValidator.safeParse({
            ...req.body,
            birth_date: new Date(req.body.birth_date as string),
        })

        if (actorValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, actorValidationResult.error.message)

        const { name, biography, profile_image, profile_alt, birth_date, gender } =
            actorValidationResult.data

        let upload_result

        if (profile_image) {
            if (!profile_alt)
                return sendErrorResponse(
                    res,
                    httpCode.badRequest,
                    'Please provide a profile alt text',
                )

            upload_result = await cloudinary.uploader.upload(
                profile_image,
                {
                    upload_preset: 'unsigned_upload',
                    public_id: `${name} avatar`,
                    folder: 'actor_profile_images', 
                    allowed_formats: ['png', 'jpg', 'svg', 'ico', 'jfif', 'webp'],
                },
                (error, result) => {
                    if (error) {
                        console.log('Error uploading image to Cloudinary:', error)
                        return sendErrorResponse(
                            res,
                            httpCode.internalServerError,
                            'Internal Server Error!',
                        )
                    }

                    console.log('Image uploaded to Cloudinary:', result)
                },
            )
        }

        const actor = await Actor.create({
            name,
            biography,
            birth_date,
            profile_image: {
                url: upload_result?.url || null,
                alt: profile_alt,
            },
            gender,
            createdBy: req.user?._id,
        })

        if (!actor)
            return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')

        return sendSuccessResponse(
            res,
            httpCode.resourceCreated,
            actor,
            'Actor created successfully!',
        )
    } catch (error) {
        console.log('Error In Actor Controller, at function createActor: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

type TSearchActorsQuery = {
    page: unknown
    limit: unknown
    name: unknown
}

export const searchActors: RequestHandler<{}, {}, {}, TSearchActorsQuery> = async (req, res) => {
    try {
        const nameValidationResult = nameValidator.safeParse(req.query.name)

        if (nameValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, nameValidationResult.error.message)

        const pageValidatorResult = numberValidator(1, 20).safeParse(Number(req.query.page))
        const limitValidatorResult = numberValidator(1, 20).safeParse(Number(req.query.limit))

        if (pageValidatorResult.error)
            return sendErrorResponse(res, httpCode.badRequest, pageValidatorResult.error.message)

        const name = nameValidationResult.data
        const page = pageValidatorResult.data
        const limit = limitValidatorResult.data

        // Validate and parse pagination parameters
        const pageNumber = Math.max(1, Number(page))
        const limitNumber = Math.min(Math.max(1, Number(limit)), 20) // Limit between 1-20
        const skip = (pageNumber - 1) * limitNumber

        // Create case-insensitive regex for fuzzy matching
        const nameRegex = new RegExp(String(name).trim(), 'i')

        // Aggregation pipeline for flexible searching
        const searchPipeline: PipelineStage[] = [
            {
                $match: {
                    $or: [
                        { name: nameRegex }, // Fuzzy match on full name
                        { name: { $regex: `^${String(name).trim()}`, $options: 'i' } }, // Prefix matching
                    ],
                },
            },
            {
                $addFields: {
                    score: {
                        $cond: {
                            if: { $eq: [{ $toLower: '$name' }, String(name).toLowerCase()] },
                            then: 2,
                            else: 1,
                        },
                    },
                },
            },
            {
                $project: {
                    name: 1,
                    biography: 1,
                    birth_date: 1,
                    profile_image: 1,
                    gender: 1,
                    score: 1,
                },
            },
            { $sort: { score: -1, name: 1 } }, // Sort by relevance and then name
            { $skip: skip },
            { $limit: limitNumber },
        ]

        // Count pipeline
        const countPipeline: PipelineStage[] = [
            {
                $match: {
                    $or: [
                        { name: nameRegex },
                        { name: { $regex: `^${String(name).trim()}`, $options: 'i' } },
                    ],
                },
            },
            { $count: 'total' },
        ]

        // Execute search and count in parallel
        const [actors, countResult] = await Promise.all([
            Actor.aggregate(searchPipeline),
            Actor.aggregate(countPipeline),
        ])

        // Extract total count
        const total = countResult[0]?.total || 0

        // If no actors found and a name was provided, return specific message
        if (actors.length === 0 && name) {
            return sendSuccessResponse(
                res,
                httpCode.successful,
                { actors: [], pagination: { total_actors: 0 } },
                `No actors found matching "${name}"!`,
            )
        }

        // Send successful response with actors and pagination metadata
        return sendSuccessResponse(
            res,
            httpCode.successful,
            {
                actors,
                pagination: {
                    current_page: pageNumber,
                    total_pages: Math.ceil(total / limitNumber),
                    total_actors: total,
                    per_page: limitNumber,
                },
            },
            'Actors retrieved successfully!',
        )
    } catch (error) {
        console.error('Error in Actor Controller, at function searchActors: ', error)
        return sendErrorResponse(
            res,
            httpCode.internalServerError,
            'Internal Server Error while searching actors!',
        )
    }
}

export const getActorById: RequestHandler<{ id: unknown }> = async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid actor ID!')

        const actor = await Actor.findById(id)

        if (!actor) return sendErrorResponse(res, httpCode.resourceNotFound, 'Actor not found!')

        return sendSuccessResponse(res, httpCode.successful, actor, 'Actor retrieved successfully!')
    } catch (error) {
        console.error('Error in Actor Controller, at function getActorById: ', error)
        return sendErrorResponse(
            res,
            httpCode.internalServerError,
            'Internal Server Error while retrieving actor!',
        )
    }
}

export const updateActor: RequestHandler<{ id: unknown }, {}, TCreateUpdateActorBody> = async (
    req,
    res,
) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid actor ID!')

        const actorValidationResult = actorValidator.safeParse(req.body)

        if (actorValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, actorValidationResult.error.message)

        const { name, biography, birth_date, gender } = actorValidationResult.data

        const actor = await Actor.findById(id)

        if (!actor) return sendErrorResponse(res, httpCode.resourceNotFound, 'Actor not found!')

        actor.name = name
        actor.biography = biography
        actor.birth_date = new Date(birth_date)
        // actor.profile_image = profile_image
        actor.gender = gender

        actor.updatedBy = req.user?._id

        await actor.save()

        return sendSuccessResponse(res, httpCode.successful, actor, 'Actor updated successfully!')
    } catch (error) {
        console.error('Error in Actor Controller, at function updateActor: ', error)
        return sendErrorResponse(
            res,
            httpCode.internalServerError,
            'Internal Server Error while updating actor!',
        )
    }
}

export const getMyActors: RequestHandler = async (req, res) => {
    try {
        const myActors = await Actor.find({ createdBy: req.user?._id })

        return sendSuccessResponse(
            res,
            httpCode.successful,
            myActors,
            'Actors retrieved successfully!',
        )
    } catch (error) {
        console.error('Error in Actor Controller, at function getMyActors: ', error)
        return sendErrorResponse(
            res,
            httpCode.internalServerError,
            'Internal Server Error while getting actors!',
        )
    }
}

export const deleteActor: RequestHandler<{ id: unknown }> = async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id)) {
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid actor ID!')
        }

        const movies = await Movie.find({ star_cast: id })

        if (movies.length > 0) {
            return sendErrorResponse(
                res,
                httpCode.badRequest,
                'Actor cannot be deleted because they are associated with movies',
            )
        }

        const actor = await Actor.findByIdAndDelete(id)

        if (!actor) return sendErrorResponse(res, httpCode.resourceNotFound, 'Actor not found!')

        return sendSuccessResponse(res, httpCode.successful, actor, 'Actor deleted successfully!')
    } catch (error) {
        console.error('Error in Actor Controller, at function deleteActor: ', error)
        return sendErrorResponse(
            res,
            httpCode.internalServerError,
            'Internal Server Error while deleting actor!',
        )
    }
}
