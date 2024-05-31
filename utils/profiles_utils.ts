import Profile from "#models/profile";
import { DateTime } from "luxon";

type InputDataProfile = {
    name: string;
    lastname: string;
    surname?: string;
    email: string;
    phoneNumber?: string;
    login?: string;
    avatar?: string;
    birthAt?: DateTime<boolean> | string;
    gender?: 0 | 1 | 2 | number;

}

// Создать новый профиль пользователя
export async function createNewProfile(data: InputDataProfile) {
    try {
        const newProfile: Profile = await Profile.create({
            name: data.name,
            lastname: data.lastname,
            surname: data.surname,
            email: data.email,
            phoneNumber: data.phoneNumber,
            login: data.login,
            avatar: data.avatar,
            birthAt: data.birthAt,
            gender: data.gender
        });
        if(!newProfile) throw false;
        return newProfile;
    } catch (err) {
        console.error(`Не удалось создать профиль пользователя  => ${err}`);
        throw new Error('Не удалось создать профиль пользователя');
    }
}