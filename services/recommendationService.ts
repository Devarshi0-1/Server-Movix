import { Types } from 'mongoose'
import { Movie, TMovie } from '../models/movie.model'
import User, { TUser } from '../models/user.model'

interface RecommendationScore {
    movie: TMovie
    score: number
}

export class MovieRecommendationService {
    /**
     * Generate personalized movie recommendations for a user
     * @param userId - The ID of the user to generate recommendations for
     * @param limit - Maximum number of recommendations to return (default: 10)
     * @returns Array of recommended movies sorted by relevance score
     */
    static async getPersonalizedRecommendations(
        userId: string,
        limit: number = 10,
    ): Promise<RecommendationScore[]> {
        try {
            // Fetch user and their data
            const user = await User.findById(userId).populate('preferences.favorite_genres')

            if (!user) throw new Error('User not found')

            // Convert Mongoose document to plain object to resolve type issues
            const userPlainObject = user.toObject() as TUser & { _id: Types.ObjectId }

            // Fetch user's watched movies
            const watchedMovieIds = userPlainObject.watchedMovie.map((w) => w?.movie?.toString())

            // Combine multiple recommendation strategies
            // Combine multiple recommendation strategies
            const contentBasedRecs = await this.getContentBasedRecommendations(userPlainObject)
            const collaborativeFilteringRecs =
                await this.getCollaborativeRecommendations(userPlainObject)
            const genreBasedRecs =
                (
                    user.preferences // Check if preferences exist
                ) ?
                    await this.getGenreBasedRecommendations(userPlainObject)
                :   [] // Return empty array if preferences are missing

            // Merge and deduplicate recommendations
            const combinedRecommendations = this.mergeRecommendations(
                contentBasedRecs,
                collaborativeFilteringRecs,
                genreBasedRecs,
            )

            // Filter out already watched movies and sort by score
            return combinedRecommendations
                .filter((rec) => !watchedMovieIds.includes(rec.movie._id.toString()))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
        } catch (error) {
            console.error('Recommendation generation error:', error)
            throw error
        }
    }

    /**
     * Content-based recommendations based on user's watched movies and preferences
     */
    private static async getContentBasedRecommendations(
        user: TUser & { _id: Types.ObjectId },
    ): Promise<RecommendationScore[]> {
        const watchedMovies = await Movie.find({
            _id: { $in: user.watchedMovie.map((w) => w.movie) },
        }).populate('genre star_cast')

        // Handle null preferences or fallback to empty arrays
        const favoriteGenres = new Set([
            ...(user.preferences?.favorite_genres?.map((g) => g._id.toString()) || []),
            ...watchedMovies.flatMap((m) => m.genre.map((genre) => genre.toString())),
        ])

        const favoriteActors = new Set(
            watchedMovies.flatMap((m) => m.star_cast.map((actor) => actor.toString())),
        )

        const contentBasedMovies = await Movie.find({
            _id: { $nin: user.watchedMovie.map((w) => w.movie) },
            $or: [
                { genre: { $in: Array.from(favoriteGenres) } },
                { star_cast: { $in: Array.from(favoriteActors) } },
            ],
        }).populate('genre star_cast')

        return contentBasedMovies.map((movie) => ({
            movie,
            score: this.calculateContentBasedScore(movie, favoriteGenres, favoriteActors),
        }))
    }
    /**
     * Collaborative filtering recommendations
     */
    private static async getCollaborativeRecommendations(
        user: TUser & { _id: Types.ObjectId },
    ): Promise<RecommendationScore[]> {
        // Similar user logic: Find users with similar movie preferences
        const similarUsers = await User.find({
            _id: { $ne: user._id },
            'watchedMovie.rating': { $gte: 4 }, // Users who rated movies highly
        })

        const collaborativeRecs: RecommendationScore[] = []

        // Complex collaborative filtering would be implemented here
        return collaborativeRecs
    }

    /**
     * Genre-based recommendations
     */
    private static async getGenreBasedRecommendations(
        user: TUser & { _id: Types.ObjectId },
    ): Promise<RecommendationScore[]> {
        const genreIds = user.preferences?.favorite_genres?.map((g) => g._id) || []

        const genreBasedMovies = await Movie.find({
            genre: { $in: genreIds },
            _id: { $nin: user.watchedMovie.map((w) => w.movie) },
        })

        return genreBasedMovies.map((movie) => ({
            movie,
            score: 0.5, // Base genre match score
        }))
    }

    /**
     * Merge recommendations from different strategies
     */
    private static mergeRecommendations(
        ...recommendationLists: RecommendationScore[][]
    ): RecommendationScore[] {
        const mergedMap = new Map<string, RecommendationScore>()

        recommendationLists.forEach((recommendations) => {
            recommendations.forEach((rec) => {
                const existingRec = mergedMap.get(rec.movie._id.toString())
                if (existingRec) {
                    existingRec.score += rec.score
                } else {
                    mergedMap.set(rec.movie._id.toString(), rec)
                }
            })
        })

        return Array.from(mergedMap.values())
    }

    /**
     * Calculate content-based recommendation score
     */
    private static calculateContentBasedScore(
        movie: TMovie,
        favoriteGenres: Set<string>,
        favoriteActors: Set<string>,
    ): number {
        let score = 0

        // Genre match score
        movie.genre.forEach((genre) => {
            if (favoriteGenres.has(genre.toString())) score += 0.3
        })

        // Actor match score
        movie.star_cast.forEach((actor) => {
            if (favoriteActors.has(actor.toString())) score += 0.4
        })

        // Rating boost
        score += (movie.rating || 0) * 0.1

        return score
    }
}
