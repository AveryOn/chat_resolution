import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db';
import {
    validateMessageBodyCreation,
    validateMessageBodyPut,
    validateMessageParamsDelete,
    validateMessageParamsGet,
    validateMessagesParamsGet,
} from '#validators/message_valide';
import User from '#models/user';
import Chat from '#models/chat';
import Message from '#models/message';
import { DateTime } from 'luxon';
import { initMessagesPaginator } from '#utils/meta_utils';
import { MessagesPaginator } from '#types/message_types';

export default class MessagesController {

    // Получение сообщения по id
    async getMessageById({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {
            // Аутентификация
            const user: User = await auth.authenticate();
            const { id: messageId } = await validateMessageParamsGet.validate(request.params());

            // Получение сообщения по ID
            let message: Message;
            try {
                message = await Message
                .query({ client: trx })
                .select(['*'])
                .where('id', messageId)
                .firstOrFail();
            } catch (err) {
                throw {
                    meta: { status: 'error', code: 500, url: request.url(true) },
                    data: { preivew: "Не удалось получить сообщение по ID" },
                }
            }
            // Если пользователь не является участников сообщения то он его не получит
            if(user.id !== message.from_user_id && user.id !== message.to_user_id) {
                throw {
                    meta: { status: 'error', code: 404, url: request.url(true) },
                    data: { preivew: "Сообщение не найдено" },
                }
            }
            await trx.commit();
            // Формируем ответ для клиента
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: message,
            });
        } catch (err) {
            await trx.rollback();
            console.error(`messages_controller: getMessageById  => ${err.data.preview}`);
            response.abort(err, err?.meta?.code ?? 500);
        }
    }

    // Получение сообщений чата
    async getMessages({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {
            // Получние параметров запроса и их валидация
            const params = request.params();
            let validParams;
            try {
                validParams = await validateMessagesParamsGet.validate({ ...request.qs(), ...params });
            } catch (err) {
                if (err?.messages) throw {
                    meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                    data: { messages: err?.messages, preview: 'Проверьте корректность отправляемых данных' },
                }
            }
            // Инициализация пагинатора
            let paginator: MessagesPaginator | null = null;
            if (validParams?.page && validParams?.per_page) {
                paginator = await initMessagesPaginator(validParams.page, validParams.per_page);
            }
            // Аутентификация
            await auth.authenticate();

            let messages: Array<Message>;
            // Если объект пагинатора определен, то получаем сообщения согласно правилам пагинации
            if (paginator) {
                function compOffset() {
                    if (paginator) return (paginator.currentPage - 1) * paginator.perPage;
                    else return 0;
                }
                messages = await Message
                    .query({ client: trx })
                    .select(['*'])
                    .where('chat_id', validParams!.chat_id)
                    .offset(compOffset())
                    .limit(paginator.perPage);
            }
            // Если пагинатор НЕ определен, то получаем все сообщения
            else {
                messages = await Message
                    .query({ client: trx })
                    .select(['*']);
            }
            await trx.commit();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true), paginator },
                data: { messages },
            })
        } catch (err) {
            await trx.rollback();
            console.error(`messages_controller: getMessages  => ${err.data.preview}`);
            response.abort(err, err?.meta?.code ?? 500);
        }
    }

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
                    data: { messages: err?.messages, preview: 'Проверьте корректность отправляемых данных' },
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
                await message.load('chat');

                // Обновление preview_message для Чата
                let previewMessage: string;
                if (validData!.content.length >= 50) {
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

    // Редактирование сообщения
    async updateMessage({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {
            // Аутентификация
            const user: User = await auth.authenticate();

            // Получение тела запроса и его валидация
            let validData;
            try {
                const rawPathParams = request.params();
                const rawData = request.only(['content']);
                validData = await validateMessageBodyPut.validate({ ...rawData, ...rawPathParams });
            } catch (err) {
                if (err?.messages) throw {
                    meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                    data: { messages: err?.messages, preview: 'Проверьте корректность отправляемых данных' },
                }
            }
            let message: Message;
            try {
                message = await Message.findOrFail(validData!.id, { client: trx });
                message.content = validData!.content;
                await message.save();
            } catch (err) {
                if (err?.messages) throw {
                    meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                    data: err,
                }
            }
            // Если сообщение с таким ID не существует
            if (!message!) throw {
                meta: { status: 'error', code: 404, url: request.url(true) },
                data: { preview: 'Сообщения с таким ID не существует' },
            }
            // Если по какой-то причине используется токен доступа другого пользователя для выполнения этого запроса
            if (user.id !== message!.from_user_id) throw {
                meta: { status: 'error', code: 400, url: request.url(true) },
                data: { preview: 'Поля ID текущего пользователя и from_user_id разные. Они должны быть одинаковыми' },
            }
            // Обновление поля preview_message для чата
            try {
                const chat: Chat = await Chat.findOrFail(message!.chatId);
                let previewMessage: string;
                if (validData!.content.length >= 50) {
                    previewMessage = validData!.content.substring(0, 47) + '...';
                } else previewMessage = validData!.content;
                chat.previewMessage = previewMessage;
                await chat.save();
            } catch (err) {
                throw {
                    meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                    data: err,
                }
            }
            // Подгрузка связанного с сообщением чата  
            try {
                await message!.load('chat');
            } catch (err) {
                throw {
                    meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                    data: err,
                }
            }
            await trx.commit();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: message!.toJSON(),
            })
        } catch (err) {
            await trx.rollback();
            console.error(`messages_controller: updateMessage  => ${err.data.preview}`);
            response.abort(err, err?.meta?.code ?? 500);
        }
    }

    // Удаление сообщения
    async deleteMessage({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {
            // Аутентификация
            const user: User = await auth.authenticate();

            // Получение параметров пути и их валидация
            let validParams;
            try {
                const rawPathParams = request.params();
                validParams = await validateMessageParamsDelete.validate(rawPathParams);
            } catch (err) {
                if (err?.messages) throw {
                    meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                    data: { messages: err?.messages, preview: 'Проверьте корректность отправляемых данных' },
                }
            }
            let message: Message | null = await Message.find(validParams!.id);
            if (!message) throw {
                meta: { status: 'error', code: 404, url: request.url(true) },
                data: { preview: 'Сообщения с таким ID не существует' },
            }

            if (message.deletedAt) throw {
                meta: { status: 'error', code: 422, url: request.url(true) },
                data: { preview: 'Сообщене с таким ID уже было удалено' },
            }

            if (user.id !== message.from_user_id) throw {
                meta: { status: 'error', code: 403, url: request.url(true) },
                data: { preview: 'Сообщение не принадлежит пользователю с таким ID' },
            }

            try {
                message.deletedAt = DateTime.local();
                await message.save();
            } catch (err) {
                throw {
                    meta: { status: 'error', code: 500, url: request.url(true) },
                    data: { preview: 'Ошибка при удалении сообщеня' },
                }
            }
            await trx.commit();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: null,
            })
        } catch (err) {
            await trx.rollback();
            console.error(`messages_controller: deleteMessage  => ${err.data.preview}`);
            response.abort(err, err?.meta?.code ?? 500);
        }
    }
}
