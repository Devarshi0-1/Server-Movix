import { Document, InferSchemaType, model, Schema } from 'mongoose'

const userSchema = new Schema(
    {
        username: {
            type: String,
            unique: true,
            trim: true,
            required: [true, 'User name is required'],
        },
        email: {
            type: String,
            unique: true,
            trim: true,
            required: [true, 'User email is required'],
        },
        // phone_number: {
        //     type: String,
        //     unique: true,
        //     trim: true,
        //     required: [true, 'User phone number is required'],
        // },
        password: {
            type: String,
            select: false,
            required: [true, 'User password is required'],
        },
        role: {
            type: String,
            enum: ['USER', 'MODERATOR', 'ADMIN'],
            required: [true, 'User role is required'],
            default: 'USER',
        },
        // mfaSecret: {
        //     type: String,
        // },
        // mfaEnabled: {
        //     type: Boolean,
        //     default: false,
        // },
        watchedMovie: [
            {
                movie: {
                    type: Schema.Types.ObjectId,
                    ref: 'Movie',
                },
                rating: Number,
                watchDate: Date,
            },
        ],
        preferences: {
            favorite_genres: {
                type: [Schema.Types.ObjectId],
                ref: 'Genre',
                required: true,
            }
        },
    },
    { timestamps: true },
)

export type TUser = Document<Schema.Types.ObjectId> & InferSchemaType<typeof userSchema>

const User = model('User', userSchema)

export default User
