import vine from '@vinejs/vine';

export const validCredentials = vine.compile(vine.object({
    email: vine.string().trim().email(),
    password: vine.string().trim().minLength(8),
}))