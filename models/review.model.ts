import { Document, InferSchemaType, model, Schema } from 'mongoose'

const reviewSchema = new Schema(
    {
        movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true },
        comment: { type: String, required: true },
        helpful_votes: { type: Number, default: 0 },
        weight: { type: Number, default: 0 },
    },
    { timestamps: true },
)

export type TReview = Document<Schema.Types.ObjectId> & InferSchemaType<typeof reviewSchema>

export const Review = model<TReview>('Review', reviewSchema)
