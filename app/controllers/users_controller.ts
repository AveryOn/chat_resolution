// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";
import { validBodyUser } from "#validators/user";
import User from "#models/user";
import { AccessToken } from "@adonisjs/auth/access_tokens";

export default class UsersController {

    // Создание пользователя
    async store({ request, response }: HttpContext) {
        try {
            const rawData = request.all();
            const validData = await validBodyUser.validate(rawData)
            // Создание нового пользователя
            const user: User = await User.create({ ...validData });
            // Создание токена доступа
            const token: AccessToken = await User.accessTokens.create(user);
            const userReadyJSON = user.toJSON();
            delete userReadyJSON.password;
            console.log(userReadyJSON);
            response.send({
                    meta: { status: 'success', code: 200 },
                    data: { user: userReadyJSON, access_token: token },
                });
        } catch (err) {
            console.error(err);
            response.abort({ error: err });
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