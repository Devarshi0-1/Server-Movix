import { RequestHandler } from 'express'
import { isValidObjectId, PipelineStage } from 'mongoose'
import cloudinary from '../imageUpload/cloudinary'
import { Movie } from '../models/movie.model'
import User from '../models/user.model'
import { MovieRecommendationService } from '../services/recommendationService'
import { httpCode } from '../utils/httpCodes'
import { sendErrorResponse, sendSuccessResponse } from '../utils/response'
import { movieValidator, nameValidator, numberValidator } from '../utils/validators'

type TCreateMovieReqBody = {
    title: unknown
    description: unknown
    release_date: unknown
    rating: unknown
    duration: unknown
    genres: unknown
    poster_image: unknown
    poster_alt: unknown
    star_cast: unknown
}

export const createMovie: RequestHandler<{}, {}, TCreateMovieReqBody> = async (req, res) => {
    try {
        const movieValidationResult = movieValidator.safeParse({
            ...req.body,
            release_date: new Date(req.body.release_date as string),
        })

        if (movieValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, movieValidationResult.error.message)

        const {
            title,
            poster_image,
            poster_alt,
            description,
            release_date,
            duration,
            genres,
            star_cast,
        } = movieValidationResult.data

        let upload_result

        if (poster_image) {
            if (!poster_alt)
                return sendErrorResponse(
                    res,
                    httpCode.badRequest,
                    'Please provide a profile alt text',
                )

            upload_result = await cloudinary.uploader.upload(
                poster_image,
                {
                    upload_preset: 'unsigned_upload',
                    public_id: `${title} avatar`,
                    folders: 'movie_poster_images',
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

        const movie = await Movie.create({
            title,
            description,
            release_date,
            duration,
            poster_image: {
                url: upload_result?.url || null,
                alt: poster_alt,
            },
            genre: genres,
            star_cast,
            createdBy: req.user?._id,
        })

        if (!movie)
            return sendErrorResponse(res, httpCode.badRequest, 'Movie could not be created!')

        return sendSuccessResponse(
            res,
            httpCode.successful,
            await movie.populate('genre'),
            'Movie created successfully!',
        )
    } catch (error) {
        console.log('Error In Movie Controller, at function createMovie: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

type MovieSearchQuery = {
    page?: unknown
    limit?: unknown
    name?: unknown
}

export const searchMovies: RequestHandler<{}, {}, {}, MovieSearchQuery> = async (req, res) => {
    try {
        const pageValidationResult = numberValidator(1, 20).safeParse(Number(req.query.page))
        const limitValidationResult = numberValidator(1, 20).safeParse(Number(req.query.limit))
        const nameValidationResult = nameValidator.safeParse(req.query.name)

        if (pageValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, pageValidationResult.error.message)

        if (limitValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, limitValidationResult.error.message)

        if (nameValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, nameValidationResult.error.message)

        const page = pageValidationResult.data
        const limit = limitValidationResult.data
        const title = nameValidationResult.data

        // Validate and parse pagination parameters
        const pageNumber = Math.max(1, Number(page))
        const limitNumber = Math.min(Math.max(1, Number(limit)), 20) // Limit between 1-20
        const skip = (pageNumber - 1) * limitNumber

        // Create case-insensitive regex for fuzzy matching
        const titleRegex = new RegExp(String(title).trim(), 'i')

        // Aggregation pipeline for flexible searching
        const searchPipeline: PipelineStage[] = [
            {
                $match: {
                    $or: [
                        { title: titleRegex }, // Fuzzy match on full title
                        { title: { $regex: `^${String(title).trim()}`, $options: 'i' } }, // Prefix matching
                    ],
                },
            },
            {
                $addFields: {
                    score: {
                        $cond: {
                            if: { $eq: [{ $toLower: '$title' }, String(title).toLowerCase()] },
                            then: 2,
                            else: 1,
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: 'actors', // Assuming the collection name for actors
                    localField: 'star_cast',
                    foreignField: '_id',
                    as: 'star_cast_details',
                },
            },
            {
                $lookup: {
                    from: 'genres', // Assuming the collection name for genres
                    localField: 'genre',
                    foreignField: '_id',
                    as: 'genre_details',
                },
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    release_date: 1,
                    rating: 1,
                    duration: 1,
                    poster_image: 1,
                    score: 1,
                    star_cast_details: {
                        _id: 1,
                        name: 1,
                    },
                    genre_details: {
                        _id: 1,
                        name: 1,
                    },
                },
            },
            { $sort: { score: -1, title: 1 } }, // Sort by relevance and then title
            { $skip: skip },
            { $limit: limitNumber },
        ]

        // Count pipeline
        const countPipeline: PipelineStage[] = [
            {
                $match: {
                    $or: [
                        { title: titleRegex },
                        { title: { $regex: `^${String(title).trim()}`, $options: 'i' } },
                    ],
                },
            },
            { $count: 'total' },
        ]

        // Execute search and count in parallel
        const [movies, countResult] = await Promise.all([
            Movie.aggregate(searchPipeline),
            Movie.aggregate(countPipeline),
        ])

        // Extract total count
        const total = countResult[0]?.total || 0

        // If no movies found and a title was provided, return specific message
        if (movies.length === 0 && title) {
            return sendSuccessResponse(
                res,
                httpCode.successful,
                { movies: [], pagination: { total_movies: 0 } },
                `No movies found matching "${title}"!`,
            )
        }

        // Send successful response with movies and pagination metadata
        return sendSuccessResponse(
            res,
            httpCode.successful,
            {
                movies,
                pagination: {
                    current_page: pageNumber,
                    total_pages: Math.ceil(total / limitNumber),
                    total_movies: total,
                    per_page: limitNumber,
                },
            },
            'Movies retrieved successfully!',
        )
    } catch (error) {
        console.error('Error in Movie Controller, at function searchMovies: ', error)
        return sendErrorResponse(
            res,
            httpCode.internalServerError,
            'Internal Server Error while searching movies!',
        )
    }
}

export const getMovieById: RequestHandler<{ id: unknown }> = async (req, res) => {
    try {
        const { id } = req.params

        // Validate MongoDB ObjectId
        if (!isValidObjectId(id))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid movie ID!')

        // Find movie by ID with populated star cast and genres
        const movie = await Movie.findById(id)
            .populate('star_cast', 'name')
            .populate('genre', 'name')

        // Handle movie not found
        if (!movie) return sendErrorResponse(res, httpCode.resourceNotFound, 'Movie not found!')

        // Send successful response
        return sendSuccessResponse(res, httpCode.successful, movie, 'Movie retrieved successfully!')
    } catch (error) {
        console.error('Error in Movie Controller, at function getMovieById: ', error)
        return sendErrorResponse(
            res,
            httpCode.internalServerError,
            'Internal Server Error while retrieving movie!',
        )
    }
}

export const getMovieRecommendations: RequestHandler = async (req, res) => {
    try {
        // Extract user ID from authenticated request
        const userId = req.user?._id

        // Validate user ID
        if (!userId) {
            return sendErrorResponse(
                res,
                httpCode.notAuthorized,
                'Authentication required for movie recommendations',
            )
        }

        // Optional query parameter for limit (default 10)
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10

        // Validate limit
        if (isNaN(limit) || limit <= 0 || limit > 50) {
            return sendErrorResponse(
                res,
                httpCode.badRequest,
                'Invalid recommendations limit. Must be between 1 and 50',
            )
        }

        // Generate personalized recommendations
        const recommendations = await MovieRecommendationService.getPersonalizedRecommendations(
            userId.toString(),
            limit,
        )

        // If no recommendations found
        if (recommendations.length === 0) {
            return sendSuccessResponse(
                res,
                httpCode.successful,
                [],
                'No personalized recommendations available. Try exploring more movies!',
            )
        }

        // Transform recommendations for response
        const recommendedMovies = recommendations.map((rec) => ({
            ...rec.movie.toObject(),
            recommendationScore: rec.score,
        }))

        // Send successful response
        return sendSuccessResponse(
            res,
            httpCode.successful,
            recommendedMovies,
            'Movie recommendations generated successfully',
        )
    } catch (error) {
        // Log the error
        console.error('Error in movie recommendations:', error)

        // Send error response
        return sendErrorResponse(
            res,
            httpCode.internalServerError,
            'Failed to generate movie recommendations',
        )
    }
}

export const getMyMovies: RequestHandler = async (req, res) => {
    try {
        const myMovies = await Movie.find({ createdBy: req.user?._id }).populate('genre star_cast')

        return sendSuccessResponse(
            res,
            httpCode.successful,
            myMovies,
            'My genres found successfully!',
        )
    } catch (error) {
        console.log('Error In Genre Controller, at function getMyGenre: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

export const deleteMovie: RequestHandler<{ id: unknown }> = async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id)) {
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid Movie ID!')
        }

        const userUpdateResult = await User.updateMany(
            { 'watchedMovie.movie': id },
            { $pull: { watchedMovie: { movie: id } } },
        )

        if (userUpdateResult.modifiedCount === 0) {
            console.log('No users found to remove movie reference.')
        } else {
            console.log(
                `Updated ${userUpdateResult.modifiedCount} user(s) to remove movie references.`,
            )
        }

        // Find and delete the movie
        const movie = await Movie.findByIdAndDelete(id)

        if (!movie) {
            return sendErrorResponse(res, httpCode.resourceNotFound, 'Movie not found!')
        }

        return sendSuccessResponse(res, httpCode.successful, null, 'Movie deleted successfully!')
    } catch (error) {
        console.error('Error in deleteMovie controller:', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}
