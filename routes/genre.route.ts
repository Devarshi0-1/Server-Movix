import express from 'express'
import {
    createGenre,
    deleteGenre,
    getAllGenres,
    getGenreById,
    getGenreByName,
    getMyGenre,
    searchGenres,
    updateGenre,
} from '../controllers/genre.controller'
import { checkRole } from '../middlewares/checkRoles'
import { protectRoute } from '../middlewares/protectedRoute'

const router = express.Router()

router.post('/', protectRoute, checkRole('MODERATOR', 'ADMIN'), createGenre)
router.route('/my').get(protectRoute, checkRole('MODERATOR', 'ADMIN'), getMyGenre)

// @ts-ignore
router.route('/search').get(protectRoute, searchGenres)

router.get('/all', protectRoute, getAllGenres)

router
    .route('/:id')
    .get(protectRoute, getGenreById)
    .put(protectRoute, checkRole('MODERATOR', 'ADMIN'), updateGenre)
    .delete(protectRoute, checkRole('MODERATOR', 'ADMIN'), deleteGenre)

router.route('/:name').get(protectRoute, getGenreByName)

export default router
