import { RequestHandler } from 'express'
import { Movie } from '../models/movie.model'
import User from '../models/user.model'
import { httpCode } from '../utils/httpCodes'
import { sendErrorResponse, sendSuccessResponse } from '../utils/response'

export const addWatchedMovie: RequestHandler = async (req, res) => {
    try {
        const userId = req.user?._id
        const { movieId, rating } = req.body

        // Validate inputs
        if (!userId) {
            return sendErrorResponse(res, httpCode.notAuthorized, 'Authentication required')
        }

        // Validate movie exists
        const movie = await Movie.findById(movieId)

        if (!movie) {
            return sendErrorResponse(res, httpCode.resourceNotFound, 'Movie not found')
        }

        // Validate rating
        if (rating && (rating < 0 || rating > 5)) {
            return sendErrorResponse(res, httpCode.badRequest, 'Rating must be between 0 and 5')
        }

        // Update user's watched movies
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    watchedMovie: {
                        movie: movieId,
                        rating: rating || null,
                        watchDate: new Date(),
                    },
                },
            },
            { new: true },
        )

        if (!updatedUser) {
            return sendErrorResponse(res, httpCode.resourceNotFound, 'User not found')
        }

        return sendSuccessResponse(
            res,
            httpCode.successful,
            updatedUser.watchedMovie,
            'Watched movie added successfully',
        )
    } catch (error) {
        console.error('Error adding watched movie:', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Failed to add watched movie')
    }
}

export const updateUserPreferences: RequestHandler = async (req, res) => {
    try {
        const userId = req.user?._id
        const { favorite_genres } = req.body

        console.log(req.user)

        // Validate input
        if (!userId) {
            return sendErrorResponse(res, httpCode.notAuthorized, 'Authentication required')
        }

        // Validate genres
        if (!favorite_genres || !Array.isArray(favorite_genres)) {
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid genres provided')
        }

        // Update user preferences
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                'preferences.favorite_genres': favorite_genres,
            },
            { new: true },
        )

        if (!updatedUser) return sendErrorResponse(res, httpCode.resourceNotFound, 'User not found')

        return sendSuccessResponse(
            res,
            httpCode.successful,
            updatedUser.preferences,
            'User preferences updated successfully',
        )
    } catch (error) {
        console.error('Error updating user preferences:', error)
        return sendErrorResponse(
            res,
            httpCode.internalServerError,
            'Failed to update user preferences',
        )
    }
}
