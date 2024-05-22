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