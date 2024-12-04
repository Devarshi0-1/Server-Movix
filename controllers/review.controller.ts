import { RequestHandler } from 'express'
import { isValidObjectId } from 'mongoose'
import { Movie } from '../models/movie.model'
import { Review } from '../models/review.model'
import { httpCode } from '../utils/httpCodes'
import { sendErrorResponse, sendSuccessResponse } from '../utils/response'
import { reviewValidator } from '../utils/validators'

type TCreateUpdateReviewReqBody = {
    movieId: unknown
    rating: unknown
    comment: unknown
}

export const createReview: RequestHandler<{}, {}, TCreateUpdateReviewReqBody> = async (
    req,
    res,
) => {
    try {
        const _id = req.user?._id
        const { movieId } = req.body

        if (!isValidObjectId(movieId))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid movie ID!')

        const reviewValidationResult = reviewValidator.safeParse(req.body)

        if (reviewValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, reviewValidationResult.error.message)

        const { rating, comment } = reviewValidationResult.data

        const movie = await Movie.findById(movieId)

        if (!movie) return sendErrorResponse(res, httpCode.resourceNotFound, 'Movie not found!')

        const review = await Review.create({
            createdBy: _id,
            movie: movieId,
            rating,
            comment,
        })

        if (!review)
            return sendErrorResponse(
                res,
                httpCode.internalServerError,
                'Review could not be created!',
            )

        movie.reviews.push(review._id)

        movie.save()

        return sendSuccessResponse(res, httpCode.successful, review, 'Review created successfully!')
    } catch (error) {
        console.log('Error In Review Controller, at function createReview: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

export const updateReview: RequestHandler<{ id: unknown }, {}, TCreateUpdateReviewReqBody> = async (
    req,
    res,
) => {
    try {
        const { id: reviewId } = req.params

        if (!isValidObjectId(reviewId))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid Review ID!')

        const reviewValidationResult = reviewValidator.safeParse(req.body)

        if (reviewValidationResult.error)
            return sendErrorResponse(res, httpCode.badRequest, reviewValidationResult.error.message)

        const { rating, comment } = reviewValidationResult.data

        const review = await Review.findById(reviewId)

        if (!review) return sendErrorResponse(res, httpCode.resourceNotFound, 'Review not found!')

        if (req.user?._id.toString() !== review.createdBy.toString())
            return sendErrorResponse(res, httpCode.notAuthorized, 'Not Authorized!')

        review.rating = rating
        review.comment = comment

        await review.save()

        return sendSuccessResponse(res, httpCode.successful, review, 'Review updated successfully!')
    } catch (error) {
        console.log('Error In Review Controller, at function updateReview: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

export const getMovieReviews: RequestHandler<{ movieId: unknown }> = async (req, res) => {
    try {
        const { movieId } = req.params

        if (!isValidObjectId(movieId))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid movie ID!')

        const movie = await Movie.findById(movieId).populate('reviews')

        if (!movie) return sendErrorResponse(res, httpCode.resourceNotFound, 'Movie not found!')

        return sendSuccessResponse(
            res,
            httpCode.successful,
            movie.reviews,
            'Reviews retrieved successfully!',
        )
    } catch (error) {
        console.log('Error In Review Controller, at function getReviews: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}

export const deleteReview: RequestHandler<{ id: unknown }> = async (req, res) => {
    try {
        const { id } = req.params

        if (!isValidObjectId(id))
            return sendErrorResponse(res, httpCode.badRequest, 'Invalid review ID!')

        const review = await Review.findByIdAndDelete(id)

        if (!review) return sendErrorResponse(res, httpCode.resourceNotFound, 'Review not found!')

        return sendSuccessResponse(res, httpCode.successful, review, 'Review deleted successfully!')
    } catch (error) {
        console.log('Error In Review Controller, at function deleteReview: ', error)
        return sendErrorResponse(res, httpCode.internalServerError, 'Internal Server Error!')
    }
}
