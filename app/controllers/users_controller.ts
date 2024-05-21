import { DateTime } from 'luxon';
import { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";
import { validBodyUser, validBodyUserPut } from "#validators/user";
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
            console.error(`users_controller: store  => ${err}`);
            response.abort({ error: err });
        }
    }


    // Обновление данных пользователя
    async updateUser({ request, response, auth }: HttpContext) {
        try {
            await db.transaction(async (trx) => {
                // Аутентификация
                const user: User = await auth.authenticate();

                let validData;
                // Проверка тела запроса
                const rawData = request.only(['name', 'lastname', 'surname', 'email', 'password']);
                validData = await validBodyUserPut.validate(rawData);

                // Обновление записи в таблице users
                let userUpdated: User = await user.merge({ ...validData }).save({ client: trx });
                let userUpdatedJson = userUpdated.toJSON();
                delete userUpdatedJson.password;  // Исключение пароля

                // Формирование ответа клиенту
                response.send({
                    meta: { status: 'success', code: 200, url: request.url(true) },
                    data: { user: userUpdatedJson },
                });
            })
        } catch (err) {
            console.error(`users_controller: updateUser  => ${err}`);
            response.abort({
                meta: { status: 'error', code: 400, url: request.url(true) },
                data: err.messages ?? 'Bad request',
            })
        }
    }


    // Мягкое удаление пользователя
    async deleteUser({ request, response, auth }: HttpContext) {
        try {
            const trx = await db.transaction();
            // Аутентификация
            const user: User = await auth.authenticate();

            // Установка deleted_at
            user.deletedAt = DateTime.local();
            await user.save();
            await trx.commit();

            // Формирование ответа клиенту
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: null,
            })
        } catch (err) {
            console.error(`users_controller: deleteUser  => ${err}`);
            response.abort({
                meta: { status: 'error', code: 400, url: request.url(true) },
                data: err.messages ?? 'Bad request',
            })
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
            console.error(`users_controller: store  => ${err}`);
            response.abort({ error: err });
        }
    }
}