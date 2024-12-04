import express from 'express'
import {
    createMovie,
    deleteMovie,
    getMovieRecommendations,
    getMyMovies,
    searchMovies,
} from '../controllers/movie.controller'
import { checkRole } from '../middlewares/checkRoles'
import { protectRoute } from '../middlewares/protectedRoute'

const router = express.Router()

router.route('/').post(protectRoute, checkRole('ADMIN', 'MODERATOR'), createMovie)

router.route('/my').get(protectRoute, checkRole('ADMIN', 'MODERATOR'), getMyMovies)

router.route('/recommendations').get(protectRoute, getMovieRecommendations)

router.route('/search').get(protectRoute, searchMovies)

router.route('/:id').delete(protectRoute, checkRole('ADMIN', 'MODERATOR'), deleteMovie)

export default router
