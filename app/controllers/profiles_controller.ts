import type { HttpContext } from '@adonisjs/core/http';
import { validateProfileStore } from '#validators/profile_valide';
import { createNewProfile } from '#utils/profiles_utils';
import Profile from '#models/profile';
import User from '#models/user';

export default class ProfilesController {
    async store({request, response, auth}: HttpContext) {
        try {
            // Аутентификация запроса
            const user: User = await auth.authenticate();

            // Извлечение полей запроса
            const rawData = request.only(['name', 'lastname', 'surname', 'gender', 'phoneNumber', 'email', 'login', 'avatar', 'birthAt'])

            const valideData = await validateProfileStore.validate(rawData);

            // Создание нового профиля
            const newProfile: Profile = await createNewProfile({...valideData});
            await user.related('profile').save(newProfile);

            response.send({ 
                meta: { status: 'success', code: 200, url: request.url(true) }, 
                data: newProfile,
            });
        } catch (err) {
            response.abort(err);
        }
    };

    // Получить мой профиль
    async getMyProfile({request, response, auth}: HttpContext) {
        try {
            // Аутентификация запроса
            const user: User = await auth.authenticate();

            const profile = await user.related('profile').query().first();
            if(!profile) throw 'Не удалось получить профиль пользователя';
            
            response.send({ 
                meta: { status: 'success', code: 200, url: request.url(true) }, 
                data: profile.toJSON(),
            });
        } catch (err) {
            response.abort(err);
        }
    }
}