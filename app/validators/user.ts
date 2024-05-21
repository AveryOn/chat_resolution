import { Database } from '@adonisjs/lucid/database';
import vine from '@vinejs/vine';

export const validBodyUser = vine.compile(
    vine.object({
        password: vine.string().trim(),
        name: vine.string().trim().maxLength(255),
        lastname: vine.string().trim().maxLength(255),
        email: vine.string().unique(async (db: Database, value: string, _) => {
            const login = await db.from('users').where('email', value).first();
            if(login) return false;
            else return true;
        }),

    })
)