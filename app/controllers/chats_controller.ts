import Chat from '#models/chat';
import User from '#models/user';
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db';
// import db from '@adonisjs/lucid/services/db';
import { validBodyCreationChat, validBodyPutChat } from '#validators/chat_valide';

export default class ChatsController {

    // Создание нового чата
    async store({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {
            // Получение и валидация тела запроса
            const rawData = request.only(['creator', 'companion_id', 'preview_message',]);
            const { creator, companion_id, preview_message } = await validBodyCreationChat.validate(rawData);

            await auth.authenticate();

            // Создание нового чата
            const newChat = await Chat.create({
                creator,
                previewMessage: preview_message,
                visible: true,
            }, { client: trx });

            // Привязываем чат к его участникам
            if (companion_id) {
                await newChat.related('users').attach([creator, companion_id], trx);
            } else {
                await newChat.related('users').attach([creator], trx);
            }

            // Добавление участников чата в итоговый чат 
            await newChat.load('users', (query) => {
                query.select(['id', 'name', 'lastname', 'surname', 'last_activity', 'created_at', 'deleted_at'])
            });
            await trx.commit();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: newChat.toJSON(),
            });
        } catch (err) {
            await trx.rollback();
            console.error(`chats_controller: store  => ${err}`);
            response.abort({
                meta: { status: 'error', code: 400, url: request.url(true) },
                data: err.messages ?? 'Bad request',
            });
        }
    }

    // Обновление данных чата
    async updateChat({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {

            // Аутентификация 
            const user: User = await auth.authenticate();

            // Извлечение и валидация полей запроса 
            const { id } = request.params();
            const rawData = request.only(['preview_message', 'visible']);
            const validData = await validBodyPutChat.validate({ id, ...rawData });

            await user.load('chats');

            let chat: Chat | undefined;

            // Проверка. Является ли пользователь участником чата 
            user.chats.forEach((itemChat: Chat) => {
                if (itemChat.id === validData.id) chat = itemChat;
            });


            // Если чат принадлежит текущему пользователю то изменения применяются
            if (chat) {
                // Обновление записи в таблице chats
                let chatUpdated: Chat = await chat.merge({ ...validData }).save();

                await trx.commit();
                response.send({
                    meta: { status: 'success', code: 200, url: request.url(true) },
                    data: chatUpdated.toJSON(),
                });
            } else {
                response.abort({
                    meta: { status: 'error', code: 422, url: request.url(true) },
                    data: null,
                });
            }
        } catch (err) {
            await trx.rollback();
            console.error(`chats_controller: updateChat  => ${err}`);
            response.abort({
                meta: { status: 'error', code: 400, url: request.url(true) },
                data: err.messages ?? 'Bad request',
            });
        }
    }

}