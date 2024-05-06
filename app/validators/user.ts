import { Database } from '@adonisjs/lucid/database';
import vine from '@vinejs/vine';

export const validBodyUser = vine.compile(
    vine.object({
        password: vine.string().trim(),
        full_name: vine.string().trim().maxLength(255),
        login: vine.string().unique(async (db: Database, value: string, _) => {
            const login = await db.from('users').where('login', value).first();
            if(login) return false;
            else return true;
        }),
        email: vine.string().unique(async (db: Database, value: string, _) => {
            const login = await db.from('users').where('email', value).first();
            if(login) return false;
            else return true;
        }),

    })
)