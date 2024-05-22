import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db';
import { validateMessageBodyCreation } from '#validators/message_valide';
import User from '#models/user';
import Chat from '#models/chat';
import Message from '#models/message';

export default class MessagesController {

    // Создание нового сообщения
    async store({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {
            // Аутентификация
            const user: User = await auth.authenticate();

            // Получение данных запроса и их валидация
            let validData;
            try {
                const rawData = request.only(['from_user_id', 'to_user_id', 'chat_id', 'content']);
                validData = await validateMessageBodyCreation.validate(rawData);
            } catch (err) {
                if (err?.messages) throw {
                    meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                    data: { messages: err?.messages, preview: 'Проверьте правильность отправляемых данных' },
                }
            }
            // Проверка на то чтобы ID создателя сообщения сопоставлялось с полем from_user_id и не было равно to_user_id
            if (validData && (user.id !== validData.from_user_id || user.id === validData.to_user_id)) throw {
                meta: { status: 'error', code: 422, url: request.url(true) },
                data: { preview: 'Убедитесь, что вы передаете правильные from_user_id и to_user_id поля' },
            }

            // Создание нового экземпляра сообщения
            const message: Message = new Message();
            message.content = validData!.content;
            try {
                const chat: Chat = await user.related('chats')
                    .query()
                    .select('*')
                    .whereNull('chats.deleted_at')  // Исключаем из запроса удаленные чаты
                    .where('chats.id', validData!.chat_id)
                    .firstOrFail();
                const toUser: User = await User.findOrFail(validData!.to_user_id, { client: trx })

                await message.related('chat').associate(chat);
                await message.related('toUser').associate(toUser);
                await message.related('fromUser').associate(user);
                await message.save();
                
                // Обновление preview_message для Чата
                let previewMessage: string;
                if(validData!.content.length >= 50) {
                    previewMessage = validData!.content.substring(0, 47) + '...';
                } else previewMessage = validData!.content;
                chat.previewMessage = previewMessage;
                await chat.save();
            } catch (err) {
                throw err;
                // if (err?.messages) throw {
                //     meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                //     data: { messages: err?.messages, preview: 'Проверьте правильность отправляемых данных' },
                // }
            }
            await trx.commit();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: message,
            })
        } catch (err) {
            await trx.rollback();
            console.error(`messages_controller: store  => ${err?.data ?? err}`);
            response.abort(err, err?.meta?.code ?? 500);
        }
    }
}