import mongoose from 'mongoose'

export const connectDB = (mongoURI: string) => {
    mongoose
        .connect(mongoURI, {
            dbName: 'movies_app',
        })
        .then((c) => console.log(`Database Connected With ${c.connection.name}`))
        .catch((err) => console.log('Failed to connect to Database with error\n ' + err.message))
}
