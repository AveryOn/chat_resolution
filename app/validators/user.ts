import { Database } from '@adonisjs/lucid/database';
import vine from '@vinejs/vine';

// Валдиация тела запроса для создания пользователя
export const validBodyUser = vine.compile(vine.object({
    password: vine.string().trim(),
    name: vine.string().trim().maxLength(255),
    lastname: vine.string().trim().maxLength(255),
    email: vine.string().unique(async (db: Database, value: string, _) => {
        const email = await db.from('users').where('email', value).first();
        if (email) return false;
        else return true;
    }),
}));


// Валидация тела запроса для обновления данных пользователя 
export const validBodyUserPut = vine.compile(vine.object({
    name: vine.string().trim().maxLength(255).optional(),
    lastname: vine.string().trim().maxLength(255).optional(),
    surname: vine.string().trim().maxLength(255).optional(),
    password: vine.string().trim().minLength(8).optional(),
    email: vine.string().trim().email().unique(async (db: Database, value, _) => {
        const email = await db.from('users').where('email', value).first();
        if (email) return false;
        else return true;
    }).optional(),
}));

export const validParamsUsersGet = vine.compile(vine.object({
    page: vine.number().positive().optional(),
    per_page: vine.number().positive().optional(),
}))