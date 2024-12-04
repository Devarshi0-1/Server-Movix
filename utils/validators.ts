import { profile } from 'console'
import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

export const emailValidator = z.string().trim().email('Invalid email').readonly()

export const passwordValidator = z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(18, 'Password must be at most 18 characters')
    .readonly()

export const usernameValidator = z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
        /^[a-z0-9_\.]+$/,
        'Username must only contain lowercase letters, numbers, underscores, and dots!',
    )
    .readonly()

export const phoneValidator = z
    .string()
    .trim()
    .regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Invalid phone number!')
    .readonly()

export const nameValidator = z
    .string()
    .trim()
    .min(1, 'Name must be at least 1 character')
    .max(50, 'Name must be at most 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must only contain letters and spaces!')
    .readonly()

export const numberValidator = (min: number, max: number) =>
    z
        .number()
        .min(min)
        .max(max)
        .transform((value) => Number(value))
        .readonly()

export const genreDescriptionValidator = z
    .string()
    .trim()
    .min(1, 'Description must be at least 1 character')
    .max(500, 'Description must be at most 500 characters')
    .regex(/^[a-zA-Z\s,.]+$/, 'Description must only contain letters, spaces, commas, and periods!')
    .readonly()
    .optional()

export const mfaTokenValidator = z
    .string()
    .trim()
    .min(6, 'Invalid Token!')
    .max(6, 'Invalid Token!')
    .regex(/^[0-9]+$/, 'Invalid Token!')
    .readonly()

export const signUpValidator = z.object({
    username: usernameValidator,
    email: emailValidator,
    password: passwordValidator,
    // phone: phoneValidator,
})

export const loginValidator = z.object({
    username: usernameValidator,
    password: passwordValidator,
})

export const biographyValidator = z
    .string()
    .trim()
    .min(1, 'Biography must be at least 1 character')
    .max(600, 'Biography must be at most 600 characters')
    .regex(/^[a-zA-Z\s,.]+$/, 'Biography must only contain letters, spaces, commas, and periods!')
    .readonly()

export const dateValidator = z.date().readonly()

const imageValidationBase64 = z.string().regex(/^data:image\/[a-z]+;base64,[a-zA-Z0-9+/=]+$/)

export const genderValidator = z.enum(['male', 'female', 'other', 'unknown']).readonly()

export const actorValidator = z.object({
    name: nameValidator,
    biography: biographyValidator.optional(),
    birth_date: dateValidator,
    profile_image: imageValidationBase64.optional(),
    profile_alt: z.string().trim().optional(),
    gender: genderValidator,
})

export const titleValidator = z
    .string()
    .trim()
    .min(1, 'Title must be at least 1 character')
    .max(100, 'Title must be at most 100 characters')
    .readonly()

export const movieDescriptionValidator = z
    .string()
    .trim()
    .min(1, 'Description must be at least 1 character')
    .max(500, 'Description must be at most 500 characters')
    .readonly()

export const movieRatingValidator = z
    .number()
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating must be at most 5 stars')
    .transform((value) => Number(value))
    .readonly()

export const movieDurationValidator = z
    .number()
    .min(1, 'Duration must be at least 1 minute')
    .max(999, 'Duration must be at most 999 minutes')
    .transform((value) => Number(value))
    .readonly()

export const objectIdsValidator = (fieldName: string) =>
    z.array(
        z
            .string()
            .trim()
            .refine((value) => isValidObjectId(value), {
                message: `Invalid MongoDB ObjectId for ${fieldName}!`,
            }),
    )

export const movieValidator = z.object({
    title: titleValidator,
    description: movieDescriptionValidator,
    release_date: dateValidator,
    // rating: movieRatingValidator,
    poster_image: imageValidationBase64.optional(),
    poster_alt: z.string().trim().optional(),
    duration: movieDurationValidator,
    genres: objectIdsValidator('genre'),
    star_cast: objectIdsValidator('star cast'),
})

export const commentValidator = z
    .string()
    .trim()
    .min(1, 'Comment must be at least 1 character')
    .max(500, 'Comment must be at most 500 characters')
    .readonly()

export const reviewValidator = z.object({
    rating: movieRatingValidator,
    comment: commentValidator,
})
