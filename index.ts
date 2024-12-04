import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { connectDB } from './database/connect'
import actorRouter from './routes/actor.route'
import authRouter from './routes/auth.route'
import genreRouter from './routes/genre.route'
import movieRouter from './routes/movie.route'
import userRouter from './routes/user.route'

const PORT: unknown = Number(process.env.PORT)
const MONGO_URI: unknown = process.env.MONGO_URI
const FRONTEND_URL: unknown = process.env.FRONTEND_URL
const app = express()

if (typeof MONGO_URI !== 'string' || typeof FRONTEND_URL !== 'string' || typeof PORT !== 'number') {
    if (typeof MONGO_URI !== 'string') throw new Error('Invalid: MONGO_URI')
    if (typeof FRONTEND_URL !== 'string') throw new Error('Invalid: FRONTEND_URL')
    if (typeof PORT !== 'number') throw new Error('Invalid: PORT')
}

connectDB(MONGO_URI)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(
    cors({
        origin: [FRONTEND_URL],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    }),
)

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/user', userRouter)
app.use('/api/v1/genre', genreRouter)
app.use('/api/v1/actor', actorRouter)
app.use('/api/v1/movie', movieRouter)

app.get('/', (req, res) => {
    return res.status(200).json({
        message: 'Working Fine!',
    })
})

app.listen(PORT, () => {
    console.log(`Listening on PORT: http://localhost:${PORT}`)
})
