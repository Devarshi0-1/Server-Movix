import express from 'express'
import {
    createActor,
    deleteActor,
    getActorById,
    getMyActors,
    searchActors,
    updateActor,
} from '../controllers/actor.controller'
import { checkRole } from '../middlewares/checkRoles'
import { protectRoute } from '../middlewares/protectedRoute'

const router = express.Router()

router.post('/', protectRoute, checkRole('MODERATOR', 'ADMIN'), createActor)
router.route('/my').get(protectRoute, checkRole('MODERATOR', 'ADMIN'), getMyActors)

// @ts-ignore
router.route('/search').get(protectRoute, searchActors)

router
    .route('/:id')
    .get(protectRoute, getActorById)
    .put(protectRoute, checkRole('MODERATOR', 'ADMIN'), updateActor)
    .delete(protectRoute, checkRole('MODERATOR', 'ADMIN'), deleteActor)

export default router
