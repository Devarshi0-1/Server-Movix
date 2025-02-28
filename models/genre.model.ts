import { Document, InferSchemaType, Schema, model } from 'mongoose'

const genreSchema = new Schema(
    {
        name: {
            type: String,
            unique: true,
            required: [true, 'Genre name is required'],
        },
        description: {
            type: String,
            required: true,
            default: '',
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true },
)

export type TGenre = Document<Schema.Types.ObjectId> & InferSchemaType<typeof genreSchema>

export const Genre = model<TGenre>('Genre', genreSchema)
