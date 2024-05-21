import vine from '@vinejs/vine';

export const validBodyChat = vine.compile(
    vine.object({
        creator: vine.number().positive(),
    })
)