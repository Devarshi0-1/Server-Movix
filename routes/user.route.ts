import express from 'express'
import { addWatchedMovie, updateUserPreferences } from '../controllers/user.controller'
import { protectRoute } from '../middlewares/protectedRoute'

const router = express.Router()

router.route('/preferences').put(protectRoute, updateUserPreferences)

router.route('/watched-movies').post(protectRoute, addWatchedMovie)

export default router
