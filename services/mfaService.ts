import speakeasy from 'speakeasy'
import twilio from 'twilio'

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export const generateMFASecret = () => speakeasy.generateSecret({ name: 'Movies App' })

export const sendVerificationCode = async (phoneNumber: string, code: string) => {
    try {
        await twilioClient.messages.create({
            body: `Your verification code is ${code}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        })
    } catch (error) {
        console.log('Error In MFA Service, at function sendVerificationCode: ', error)

        throw Error('Failed to send verification code!')
    }
}

export const verifyMFAToken = (secret: string, token: string) => {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
    })
}


