import { Document, InferSchemaType, model, Schema } from 'mongoose'

const actorSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Actor name is required'],
        },
        biography: {
            type: String,
        },
        birth_date: {
            type: Date,
            required: [true, 'Actor birth date is required'],
        },
        profile_image: {
            url: String,
            alt: String,
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'unknown'],
            default: 'unknown',
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

export type TActor = Document<Schema.Types.ObjectId> & InferSchemaType<typeof actorSchema>

export const Actor = model<TActor>('Actor', actorSchema)
