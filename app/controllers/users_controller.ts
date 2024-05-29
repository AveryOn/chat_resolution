import { DateTime } from 'luxon';
import { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";
import { validBodyUser, validBodyUserPut, validParamsUsersGet, validPathParamsUserGet } from "#validators/user";
import User from "#models/user";
import { AccessToken } from "@adonisjs/auth/access_tokens";
import { UserAndToken, UsersPaginator } from '#types/user_types';
import { initUserPaginator } from '#utils/meta_utils';

export default class UsersController {

    // Получить всех пользователей
    async getUsers({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {

            // Аутентификация
            const user: User = await auth.authenticate();

            // Валидация параметров запроса
            const params = await validParamsUsersGet.validate(request.qs());

            // Пагинатор не обязателен
            let paginator: UsersPaginator | null = null;

            // Если нет параметров запроса то пагинатор не инициализируется
            if (params?.page && params?.per_page) {
                paginator = await initUserPaginator(params.page, params.per_page);
            }

            let users: User[];
            // Если объект пагинатора определен, то получаем пользователей согласно правилам пагинации
            if (paginator) {
                function compOffset() {
                    if (paginator) return (paginator.currentPage - 1) * paginator.perPage;
                    else return 0;
                }

                users = await User
                    .query({ client: trx })
                    .select(['id', 'name', 'lastname', 'surname', 'last_activity', 'created_at'])
                    .whereNot('id', user.id)
                    .offset(compOffset())
                    .limit(paginator.perPage);
            }
            // Если пагинатор НЕ определен, то получаем всех пользователей
            else {
                users = await User
                    .query({ client: trx })
                    .select(['id', 'name', 'lastname', 'surname', 'last_activity', 'created_at'])
                    .whereNot('id', user.id)
            }

            // Формируем ответ для клиента
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true), paginator },
                data: { users },
            });
            await trx.commit();
        } catch (err) {
            await trx.rollback();
            console.error(`users_controller: getUsers  => ${err}`);
            response.abort({
                meta: { status: 'error', code: 400, url: request.url(true) },
                data: err.messages ?? 'Bad request',
            })
        }
    }

    // Получение пользователя по ID
    async getUserById({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {
            // Аутентификация
            await auth.authenticate();
            const { id: userId } = await validPathParamsUserGet.validate(request.params());

            // Получение пользователя по ID
            const user = await User
                .query({ client: trx })
                .select(['id', 'name', 'lastname', 'surname', 'last_activity', 'created_at', 'deleted_at'])
                .where('id', userId)
                .first();
                
            await trx.commit();

            // Формируем ответ для клиента
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: user,
            });
        } catch (err) {
            console.error(`users_controller: getUserById  => ${err}`);
            response.abort({
                meta: { status: 'error', code: 400, url: request.url(true) },
                data: err.messages ?? 'Bad request',
            })
        }
    }

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
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: { user: userReadyJSON, access_token: token },
            });
        } catch (err) {
            console.error(`users_controller: store  => ${err}`);
            response.abort({
                meta: { status: 'error', code: 400, url: request.url(true) },
                data: err.messages ?? 'Bad request',
            })
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
            const user: UserAndToken = await auth.authenticate();
            const token: AccessToken = user.currentAccessToken;


            // Установка deleted_at
            user.deletedAt = DateTime.local();
            await user.save();

            // Удаления токена доступа
            await User.accessTokens.delete(user, token.identifier);
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


}