import vine from '@vinejs/vine';

export const validateMessageBodyCreation = vine.compile(vine.object({
    from_user_id: vine.number().positive(),
    to_user_id: vine.number().positive(),
    chat_id: vine.number().positive().nullable(),
    content: vine.string(),
    forwarded_ids: vine.array(vine.number().positive().min(1)).minLength(1).maxLength(10).optional(),
    replied_at: vine.number().positive().min(1).optional(),
    forwarding: vine.boolean().optional(), // query
    replied: vine.boolean().optional(),    // query
}));

export const validateMessageBodyPut = vine.compile(vine.object({
    id: vine.number().positive().min(1),
    content: vine.string().minLength(1),
}));

export const validateMessageParamsDelete = vine.compile(vine.object({
    ids: vine.array(vine.number().positive()),
    chat_id: vine.number().positive().min(1),
}));

export const validateMessageParamsGet = vine.compile(vine.object({
    id: vine.number().positive().min(1),
}));

export const validateMessagesParamsGet = vine.compile(vine.object({
    per_page: vine.number().positive().min(1).optional().requiredIfExists('page'),
    page: vine.number().positive().min(1).optional().requiredIfExists('per_page'),
    chat_id: vine.number().positive().min(1),
}));