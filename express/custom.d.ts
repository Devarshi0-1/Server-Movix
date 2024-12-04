declare namespace Express {
    interface Request {
        user: {
            _id: Schema.Types.ObjectId
            username: string
            email: string
            role: 'USER' | 'MODERATOR' | 'ADMIN'
            password: string
            createdAt: NativeDate
            updatedAt: NativeDate
        } | null
    }
}
