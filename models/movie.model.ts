import { Document, InferSchemaType, Schema, model } from 'mongoose'

const movieSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Movie title is required'],
        },
        description: {
            type: String,
        },
        release_date: {
            type: Date,
            required: [true, 'Movie release date is required'],
        },
        rating: {
            type: Number,
        },
        duration: {
            type: Number,
            required: [true, 'Movie duration is required'],
        },
        poster_image: {
            url: String,
            alt: String,
        },
        reviews: {
            type: [Schema.Types.ObjectId],
            ref: 'Review',
            default: [],
        },
        star_cast: {
            type: [Schema.Types.ObjectId],
            ref: 'Actor',
            required: [true, 'Movie star cast is required'],
        },
        genre: {
            type: [Schema.Types.ObjectId],
            ref: 'Genre',
            required: [true, 'Movie genre is required'],
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true },
)

export type TMovie = Document<Schema.Types.ObjectId> & InferSchemaType<typeof movieSchema>

export const Movie = model<TMovie>('Movie', movieSchema)
