import type { HttpContext } from '@adonisjs/core/http';
import { validCredentials } from '#validators/auth_valide'
import User from '#models/user';
import { AccessToken } from '@adonisjs/auth/access_tokens';

export default class AuthControllersController {
    async confirmCredenials({ request, response }: HttpContext) {
        try {
            // Валидация полученных email и password
            const rawData = request.only(['email', 'password']);
            const valideData = await validCredentials.validate(rawData);

            // Получение текущего пользователя по email
            const fetchedUser = await User.query().select('*').where('email', valideData.email).first();
            if (fetchedUser) {
                // Удаление существующих токенов пользователя если они есть
                const userTokens = await User.accessTokens.all(fetchedUser);
                userTokens.forEach(async (token: AccessToken) => {
                    token && await User.accessTokens.delete(fetchedUser, token.identifier)
                });
    
                // Создание нового токена доступа
                const token = await User.accessTokens.create(fetchedUser, ['*']);
    
                // Исключение поля password для формирования ответа
                const user = fetchedUser.toJSON();
                delete user.password;
    
                response.send({ data: { user, access_token: token  } });
            } else {
                return response.abort({
                    meta: { status: 'error', code: 404, url: request.url(true) },
                    data: 'Пользователь c таким E-mail не найден',
                });
            }
        } catch (err) {
            console.error(`auth_controller: confirmCredenials  => ${err}`);
            response.abort({
                meta: { status: 'error', code: 500, url: request.url(true) },
                data: 'Internal Server Error'
            })
        }
    }
}