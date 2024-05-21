// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";
import { validBodyUser } from "#validators/user";
import User from "#models/user";

export default class UsersController {
    // Создание пользователя
    async store({ request, response }: HttpContext) {
        try {
            const data = request.all();
            const validData = await validBodyUser.validate(data);
            const user: User = await User.create({ ...validData })
            const token = await User.accessTokens.create(user);
            response.send({ user, token });
        } catch (err) {
            response.abort({ error: err });
            console.error(err);
        }
    }

    // Получить всех пользователей
    async getUsers({ request, response, auth }: HttpContext) {
        try {
            const transation = await db.transaction();
            await auth.authenticate();
            auth.authenticate()
            const params = request.qs();
            const users = await transation
                .query()
                .select(
                    'id',
                    'full_name',
                    'email',
                    'login',
                    'created_at',
                    'updated_at'
                )
                .from('users')
                .paginate(
                    params.page ?? 1,
                    params.per_page ?? 20
                );
            response.send(users);
        } catch (err) {
            response.abort({ error: err });
            console.error(err);
        }
    }
}