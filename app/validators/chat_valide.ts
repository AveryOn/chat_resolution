import vine from '@vinejs/vine';
import { FieldContext } from '@vinejs/vine/types';

const cropMessage = vine.createRule((value: unknown, options: { max: number }, field: FieldContext) => {
    if (typeof value === 'string') {
        let mutatableValue = value.substring(0, options.max) + '...';
        field.mutate(mutatableValue, field);
    }
})

export const validBodyCreationChat = vine.compile(
    vine.object({
        creator: vine.number().positive(),
        companion_id: vine.number().positive().optional(),
        preview_message: vine.string().minLength(1).use(cropMessage({ max: 47 }))
    })
)

export const validBodyPutChat = vine.compile(vine.object({
    id: vine.number().positive(),
    preview_message: vine.string().minLength(1).use(cropMessage({ max: 47 })).optional(),
    visible: vine.boolean().optional(),
}));

export const validParamsDeleteChat = vine.compile(vine.object({
    id: vine.number().positive(),
}));

export const validParamsGetChat = vine.compile(vine.object({
    id: vine.number().positive(),
}));

export const validParamsGetChats = vine.compile(vine.object({
    is_visible: vine.boolean().optional(),
    page: vine.number().positive().min(1).optional(),
    per_page: vine.number().positive().min(1).optional(),
}));

