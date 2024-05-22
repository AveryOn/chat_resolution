import vine from '@vinejs/vine';

export const validateMessageBodyCreation = vine.compile(vine.object({
    from_user_id: vine.number().positive(),
    to_user_id: vine.number().positive(),
    chat_id: vine.number().positive(),
    content: vine.string(),
}))