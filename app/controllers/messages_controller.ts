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
import {
    createForwardingsRows,
    deleteRelationForwardingMessages,
    fetchForwardedMessages,
    fetchMessagesBasicWithPaginator,
    fetchMessagesBasicWithoutPaginator,
    uploadRucursiveForwardedMessages
} from '#utils/messages_utils';
import { ModelObject } from '@adonisjs/lucid/types/model';
import { messageDeleteEmit, messageNewEmit, messageUpdateEmit } from '#socket/emits/message_emits';
import UserChats from '#models/users_chat';

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
            if (user.id !== message.from_user_id && user.id !== message.to_user_id) {
                throw {
                    meta: { status: 'error', code: 404, url: request.url(true) },
                    data: { preivew: "Сообщение не найдено" },
                }
            }
            let readyMessage = message!.toJSON();
            // Если запрашиваемое сообщение является пересылающим другие сообщения то получаем их
            try {
                if (message.isForwarding === true) {
                    const messageFull = await uploadRucursiveForwardedMessages([message]);
                    if (messageFull) readyMessage = messageFull[0];
                }
            } catch (err) {
                throw {
                    meta: { status: 'error', code: err.status ?? 500, url: request.url(true) },
                    data: err,
                }
            }
            await trx.commit();
            // Формируем ответ для клиента
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: readyMessage,
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

            let messages: Array<ModelObject> | undefined;
            // Если объект пагинатора определен, то получаем сообщения согласно правилам пагинации
            if (paginator) {
                messages = await fetchMessagesBasicWithPaginator(validParams!.chat_id, paginator);
            }
            // Если пагинатор НЕ определен, то получаем все сообщения
            else {
                messages = await fetchMessagesBasicWithoutPaginator(validParams!.chat_id);
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
        try {
            // Аутентификация
            const user: User = await auth.authenticate();

            // Получение данных запроса и их валидация
            let validData;
            try {
                const rawData = request.only(['from_user_id', 'to_user_id', 'chat_id', 'content', 'forwarded_ids']);
                const rawQueries = request.qs();
                validData = await validateMessageBodyCreation.validate({ ...rawData, ...rawQueries });
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
            const message: Message | Message & { forwardedMessages: Array<Message> } = new Message();
            message.content = validData!.content;
            if (validData!.forwarding === true && validData!.chat_id !== null) {
                message.isForwarding = true;
            }
            let chat: Chat;
            try {
                /*  Если поле chat_id равно null, значит необходимо УБЕДИТСЯ что чата действительно не существует между
                    пользователями from_user_id и to_user_id. И если чата действительно нет то создаем новый чат и добавляем в него сообщение 
                */
                if (validData!.chat_id === null) {
                    // Проверяем наличие чата между двумя пользователями
                    // Пример data: { chatId: number } | undefined
                    const data = (await UserChats.query()
                        .select('chat_id')
                        .where('user_id', validData!.from_user_id)
                        .orWhere('user_id', validData!.to_user_id)
                        .groupBy('chat_id')
                        .havingRaw('COUNT(DISTINCT user_id) = 2') // Убедится, что оба пользователя связаны с тем же чатом
                        .first())?.toJSON();

                    if(!data) {
                        chat = await Chat.create({
                            creator: validData!.from_user_id,
                            visible: true,
                        });
                        // Привязываем чат к его участникам
                        if (validData!.to_user_id) {
                            await chat.related('users').attach([validData!.from_user_id, validData!.to_user_id]);
                        } else {
                            await chat.related('users').attach([validData!.from_user_id]);
                        }
                    } 
                    // Если чат уже существует между двумя пользователями
                    else if(data) {
                        chat = await user.related('chats')
                            .query()
                            .select('*')
                            .whereNull('chats.deleted_at')  // Исключаем из запроса удаленные чаты
                            .where('chats.id', data?.chatId)
                            .firstOrFail();
                    }
                }
                // Если поле chat_id есть то получаем существующий чат 
                else {
                    chat = await user.related('chats')
                        .query()
                        .select('*')
                        .whereNull('chats.deleted_at')  // Исключаем из запроса удаленные чаты
                        .where('chats.id', validData!.chat_id)
                        .firstOrFail();
                }
                const toUser: User = await User.findOrFail(validData!.to_user_id);
                await message.related('chat').associate(chat!);
                await message.related('toUser').associate(toUser);
                await message.related('fromUser').associate(user);
                await message.save();
                await message.load('chat');
            } catch (err) {
                throw err;
            }

            // Если создаваемое сообщение является пересылающим другие сообщения
            // (Создать пересылаемое сообщение можно только в существующем чате)
            let forwardedMessages: Array<ModelObject> | undefined;
            try {
                if (validData!.forwarding === true && validData!.chat_id && validData!.forwarded_ids) {
                    await createForwardingsRows(message, validData!.forwarded_ids);
                    forwardedMessages = await fetchForwardedMessages(validData!.forwarded_ids);
                }
            } catch (err) {
                throw {
                    meta: { status: 'error', code: err.status ?? 500, url: request.url(true) },
                    data: err,
                }
            }
            let readyMessage;
            readyMessage = message.toJSON();
            if (forwardedMessages!) {
                readyMessage.forwardedMessages = forwardedMessages;
            }
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: readyMessage,
            })
            // Направление созданного сообщения собеседнику
            messageNewEmit(readyMessage, validData!.chat_id, (validData!.chat_id === null) ? readyMessage.chatId : undefined);
        } catch (err) {
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
            // Подгрузка связанного с сообщением чата  
            try {
                await message!.load('chat');
            } catch (err) {
                throw {
                    meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                    data: err,
                }
            }
            let readyMessage = message!.toJSON();
            // Если редактируемое сообщение является пересылающим другие сообщения  то получаем их
            try {
                if (message.isForwarding === true) {
                    const messageFull = await uploadRucursiveForwardedMessages([message]);
                    if (messageFull) readyMessage = messageFull[0];
                }
            } catch (err) {
                throw {
                    meta: { status: 'error', code: err.status ?? 500, url: request.url(true) },
                    data: err,
                }
            }
            await trx.commit();
            // Направить собеседнику редактированное сообщение
            messageUpdateEmit(readyMessage);
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: readyMessage,
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
                const currentDate = DateTime.local()
                message.deletedAt = currentDate;
                // Если сообщение пересылает другие сообщения, то информация об этом тоже удаляется 
                // if(message.isForwarding === true) {
                //     await deleteRelationForwardingMessages(message.id, currentDate);
                // }
                await message.save();
            } catch (err) {
                throw {
                    meta: { status: 'error', code: 500, url: request.url(true) },
                    data: { preview: 'Ошибка при удалении сообщения' },
                }
            }
            await trx.commit();
            const readyMessage = message.toJSON();
            // Уведомить собеседника об удалении этого сообщения
            messageDeleteEmit(readyMessage);
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: null,
            });
        } catch (err) {
            await trx.rollback();
            console.error(`messages_controller: deleteMessage  => ${err.data.preview}`);
            response.abort(err, err?.meta?.code ?? 500);
        }
    }
}
