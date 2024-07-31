import type { HttpContext } from '@adonisjs/core/http';
import { ValidateProfilePatch, validateProfileStore } from '#validators/profile_valide';
import { createNewProfile } from '#utils/profiles_utils';
import Profile from '#models/profile';
import User from '#models/user';
import { DateTime } from 'luxon';
import { UserAndToken } from '#types/user_types';
import { AccessToken } from '@adonisjs/auth/access_tokens';

export default class ProfilesController {
    async store({ request, response, auth }: HttpContext) {
        try {
            // Аутентификация запроса
            const user: User = await auth.authenticate();

            // Извлечение полей запроса
            const rawData = request.only(['name', 'lastname', 'surname', 'gender', 'phoneNumber', 'email', 'login', 'avatar', 'birthAt'])

            const valideData = await validateProfileStore.validate(rawData);

            // Создание нового профиля
            const newProfile: Profile = await createNewProfile({ ...valideData });
            await user.related('profile').save(newProfile);

            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: newProfile,
            });
        } catch (err) {
            response.abort(err);
        }
    };

    // Единичное обновление данных профиля
    async patchDataProfile({ request, response, auth }: HttpContext) {
        try {
            // Аутентификация
            const user: User = await auth.authenticate();
            // Извлечение данных запроса
            const { id } = request.params();
            const rawBody = request.all();
            const valideData = await ValidateProfilePatch.validate(rawBody);
            const profile: Profile = await Profile.findOrFail(id);
            if (valideData.name) {
                profile.name = valideData.name
                user.name = valideData.name;
            }
            if (valideData.lastname) {
                profile.lastname = valideData.lastname!;
                user.lastname = valideData.lastname;
            }
            if (valideData.surname) {
                profile.surname = valideData.surname;
                user.surname = valideData.surname;
            }
            if (valideData.email) {
                profile.email = valideData.email;
                user.email = valideData.email;
            }
            if (valideData.avatar) profile.avatar = valideData.avatar;
            if (valideData.birthAt) {
                const birthAt = new Date(valideData.birthAt);
                profile.birthAt = birthAt;
            }
            if (valideData.gender) profile.gender = valideData.gender;
            if (valideData.login) profile.login = valideData.login;
            if (valideData.phoneNumber) profile.phoneNumber = valideData.phoneNumber;
            await profile.save();
            await user.save();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: profile.toJSON(),
            });
        } catch (err) {
            response.abort(err);
        }
    }

    // Множественное обновление данных профиля
    async putDataProfile({ request, response, auth }: HttpContext) {
        try {
            // Аутентификация
            const user: User = await auth.authenticate();
            // Извлечение данных запроса
            const { id } = request.params();
            const rawBody = request.all();
            const valideData = await ValidateProfilePatch.validate(rawBody);
            const profile: Profile = await Profile.findOrFail(id);
            if (valideData.name) {
                profile.name = valideData.name
                user.name = valideData.name;
            }
            if (valideData.lastname) {
                profile.lastname = valideData.lastname!;
                user.lastname = valideData.lastname;
            }
            if (valideData.surname) {
                profile.surname = valideData.surname;
                user.surname = valideData.surname;
            }
            if (valideData.email) {
                profile.email = valideData.email;
                user.email = valideData.email;
            }
            if (valideData.avatar) profile.avatar = valideData.avatar;
            if (valideData.birthAt) {
                const birthAt = new Date(valideData.birthAt);
                profile.birthAt = birthAt;
            }
            if (valideData.gender) profile.gender = valideData.gender;
            if (valideData.login) profile.login = valideData.login;
            if (valideData.phoneNumber) profile.phoneNumber = valideData.phoneNumber;
            await profile.save();
            await user.save();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: profile.toJSON(),
            });
        } catch (err) {
            console.error(err)
            response.abort(err);
        }
    }

    // Получить мой профиль
    async getMyProfile({ request, response, auth }: HttpContext) {
        try {
            // Аутентификация запроса
            const user: User = await auth.authenticate();

            const profile = await user.related('profile').query().first();
            if (!profile) throw 'Не удалось получить профиль пользователя';
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: profile.toJSON(),
            });
        } catch (err) {
            console.error(err)
            response.abort(err);
        }
    }

    // Удалить мой профиль
    async deleteMyProfile({ request, response, auth }: HttpContext) {
        try {
            // Аутентификация запроса
            const user: UserAndToken = await auth.authenticate();
            const token = user.currentAccessToken;

            const { id } = request.params();

            const profile: Profile = await Profile.findOrFail(id);
            const currentDate = DateTime.local()
            user.deletedAt = currentDate;
            profile.deletedAt = currentDate;

            // Удаление токена
            await User.accessTokens.delete(user, token.identifier);


            await user.save();
            await profile.save();

            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: null,
            });
        } catch (err) {
            response.abort(err);
        }
    }

    // Восстановить мой профиль (после удаления)
    async restoreMyProfile({ request, response, auth }: HttpContext) {
        try {
            // Аутентификация запроса
            const user: User = await auth.authenticate();
            const { id } = request.params();
            const profile: Profile = await Profile.findOrFail(id);

            user.deletedAt = null;
            profile.deletedAt = null;
            await user.save();
            await profile.save();

            const readyUser = user.toJSON();
            const readyProfile = profile.toJSON();
            delete readyProfile.deletedAt;
            readyUser.profile = readyProfile
            delete readyUser.password;
            delete readyUser.deletedAt;
            delete readyUser.role;

            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: { user: readyUser },
            });
        } catch (err) {
            response.abort(err);
        }
    }
}