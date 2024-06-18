import type { HttpContext } from '@adonisjs/core/http';
import { validCredentials } from '#validators/auth_valide'
import User from '#models/user';
import { AccessToken } from '@adonisjs/auth/access_tokens';
import { UserAndToken } from '#types/user_types';
import hash from '@adonisjs/core/services/hash'

export default class AuthControllersController {

    // Авторизация. Проверка email и password
    async confirmCredenials({ request, response }: HttpContext) {
        try {
            // Валидация полученных email и password
            let valideData;
            const rawData = request.only(['email', 'password']);
            try {
                valideData = await validCredentials.validate(rawData);
            } catch (err) {
                throw {
                    meta: { code: 'error', status: 422, url: request.url(true) },
                    data: {
                        messages: err?.messages,
                        preview: 'Проверьте корректность введенных данных',
                    },
                }
            }
            // Получение текущего пользователя по email
            const fetchedUser = await User.query().select('*').where('email', valideData.email).first();

            // Проверка соответствия пароля
            const isPasswordVerify: boolean = await hash.verify(fetchedUser!.password, valideData.password);

            // Если пользователь не был найден по email или если пароль не верный то возвращается ошибка на клиент
            if(!fetchedUser || isPasswordVerify !== true) {
                return response.abort({
                    meta: { code: 'error', status: 422, url: request.url(true) },
                    data: {
                        preview: 'Учётные данные не верны',
                    }
                });
            }

            // Удаление существующих токенов пользователя если они есть
            const userTokens = await User.accessTokens.all(fetchedUser);
            userTokens.forEach(async (token: AccessToken) => {
                token && await User.accessTokens.delete(fetchedUser, token.identifier)
            });

            // Создание нового токена доступа
            const token: AccessToken = await User.accessTokens.create(fetchedUser, ['*']);

            // Исключение поля password для формирования ответа
            const user = fetchedUser.toJSON();
            delete user.password;

            response.send({ data: { user, access_token: token } });
        } catch (err) {
            console.error(err);
            console.error(`auth_controller: confirmCredenials  => ${err}`);
            response.abort(err)
        }
    }

    // Выход из системы. Разлогинится
    async logout({ request, response, auth }: HttpContext) {
        try {
            const user: UserAndToken = await auth.authenticate();
            const token = user.currentAccessToken;
            await User.accessTokens.delete(user, token.identifier);
            response.send({ meta: { status: 'success', code: 200, url: request.url(true) }, data: null });
        } catch (err) {
            console.error(`auth_controller: logout  => ${err}`);
            response.abort({
                meta: { status: 'error', code: 401, url: request.url(true) },
                data: 'Ошибка авторизации',
            })
        }
    }

    async authenticateCheck({request, response, auth}: HttpContext) {
        try {
            const confirmed: boolean = await auth.check();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: confirmed,
            })
        } catch (err) {
            console.error(`auth_controller: authenticateCheck  => Ошибка при проверке токена доступа`);
            response.abort({
                meta: { status: 'error', code: 401, url: request.url(true) },
                data: 'Ошибка при проверке токена доступа',
            })
        }
    }

}