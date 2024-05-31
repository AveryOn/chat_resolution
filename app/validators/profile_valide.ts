import { Database } from '@adonisjs/lucid/database';
import vine from '@vinejs/vine';


export const validateProfileStore = vine.compile(vine.object({
    name: vine.string().trim().maxLength(255),
    lastname: vine.string().trim().maxLength(255),
    surname: vine.string().trim().maxLength(255).optional(),
    gender: vine.number().positive().min(0).max(2).optional(),
    email: vine.string().trim().unique(async (db: Database, value: string, _) => {
        const email = await db.from('profiles').where('email', value).first();
        if (email) return false;
        else return true;
    }),
    phoneNumber: vine.string().trim().unique(async (db: Database, value: string, _) => {
        const phone = await db.from('profiles').where('phone_number', value).first();
        if (phone) return false;
        else return true;
    }).optional(),

    login: vine.string().trim().unique(async (db: Database, value: string, _) => {
        const login = await db.from('profiles').where('login', value).first();
        if (login) return false;
        else return true;
    }).optional(),
    avatar: vine.string().trim().trim().optional(),
    birthAt: vine.string().trim().optional(),
}))