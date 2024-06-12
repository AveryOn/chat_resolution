import type { HttpContext } from '@adonisjs/core/http';
import { ValidateProfilePatch, validateProfileStore } from '#validators/profile_valide';
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

    async patchDataProfile({ request, response, auth }: HttpContext) {
        try {
            // Аутентификация
            await auth.authenticate();
            // Извлечение данных запроса
            const { id } = request.params();
            const rawBody = request.all();
            const valideData = await ValidateProfilePatch.validate(rawBody);
            const profile: Profile = await Profile.findOrFail(id);
            if(valideData.name) profile.name = valideData.name
            if(valideData.lastname) profile.lastname = valideData.lastname!;
            if(valideData.surname) profile.surname = valideData.surname;
            if(valideData.avatar) profile.avatar = valideData.avatar;
            if(valideData.birthAt) profile.birthAt = valideData.birthAt;
            if(valideData.email) profile.email = valideData.email;
            if(valideData.gender) profile.gender = valideData.gender;
            if(valideData.login) profile.login = valideData.login;
            if(valideData.phoneNumber) profile.phoneNumber = valideData.phoneNumber;
            await profile.save();
            
            response.send({ 
                meta: { status: 'success', code: 200, url: request.url(true) }, 
                data: profile.toJSON(),
            });
        } catch (err) {
            response.abort(err);
        }
    }

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