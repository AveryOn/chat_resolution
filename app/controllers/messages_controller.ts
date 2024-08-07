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
    uploadRecursiveForwardedMessages
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
                    const messageFull = await uploadRecursiveForwardedMessages([message]);
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
        try {
            // Аутентификация
            await auth.authenticate();

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
                paginator = await initMessagesPaginator(validParams.chat_id, validParams.page, validParams.per_page);
            }

            let messages: Array<ModelObject> | undefined;
            // Если объект пагинатора определен, то получаем сообщения согласно правилам пагинации
            if (paginator) {
                messages = await fetchMessagesBasicWithPaginator(validParams!.chat_id, paginator);
            }
            // Если пагинатор НЕ определен, то получаем все сообщения
            else {
                messages = await fetchMessagesBasicWithoutPaginator(validParams!.chat_id);
            }
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true), paginator },
                data: { messages },
            })
        } catch (err) {
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
                const rawData = request.only(['from_user_id', 'to_user_id', 'chat_id', 'content', 'forwarded_ids', 'replied_at']);
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
            message.edited = false;
            message.replied = false;
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
            // (Создать пересылаемое сообщение можно толькоcle в существующем чате)
            let forwardedMessages: Array<ModelObject> | undefined;
            if (!validData!.replied && validData!.forwarding === true && validData!.chat_id && validData!.forwarded_ids) {
                try {
                    await createForwardingsRows(message, validData!.forwarded_ids);
                    forwardedMessages = await fetchForwardedMessages(validData!.forwarded_ids);
    
                } catch (err) {
                    console.error(`messages_controller: store[forwading msg]  => `, err);
                    throw {
                        meta: { status: 'error', code: err.status ?? 500, url: request.url(true) },
                        data: err,
                    }
                }
            }
            // Если создаваемое сообщение является reply-сообщением на другое
            let forwardedMessagesReplied: any[] = [];
            if(!validData!.forwarding && validData?.replied === true && validData.replied_at && validData.chat_id) {
                try {
                    message.replied = true;
                    await message.related('repliedInfoRow').create({ main_message_id: message.id, replied_message_id: validData.replied_at });
                    await message.load('repliedInfoRow', (infoBuilder) => {
                        infoBuilder.preload('relatedMessage', (relatedMsgBuilder) => {
                            relatedMsgBuilder
                                .select(['id', 'from_user_id', 'to_user_id', 'chat_id', 'content', 'created_at', 'updated_at', 'is_forwarding', ])
                                .where('chat_id', message.chatId)
                        });
                    });
                    const relatedMessages: Message[] = await Message.query().select('*').where('id', validData.replied_at).preload('forwardedMessagesId', (builder) => {
                        builder.select('forwarded_message_id');
                    });
                    if(relatedMessages[0].forwardedMessagesId && relatedMessages[0].forwardedMessagesId.length) {
                        forwardedMessagesReplied = relatedMessages[0].forwardedMessagesId;
                    }
                } catch (err) {
                    console.error(`messages_controller: store[replied msg]  => `, err);
                    throw {
                        meta: { status: 'error', code: err.status ?? 500, url: request.url(true) },
                        data: err,
                    }
                }
            }
            let readyMessage;
            readyMessage = message.toJSON();
            if(message.repliedInfoRow && message.repliedInfoRow?.length) {
                Reflect.deleteProperty(readyMessage, 'repliedInfoRow');
                readyMessage.relatedMessage = message.repliedInfoRow[0].relatedMessage.toJSON();
                if(forwardedMessagesReplied.length) {
                    readyMessage.relatedMessage.forwardedMessagesCount = forwardedMessagesReplied.length;
                }
            } else {
                readyMessage.relatedMessage = null;
            }
            if (forwardedMessages! && forwardedMessages!.length) {
                forwardedMessages.sort((a, b) => a.id - b.id);
                readyMessage.forwardedMessages = forwardedMessages;
            } else {
                readyMessage.forwardedMessages = null;
                readyMessage.isForwarding = false;
            }
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: readyMessage,
            });
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
                message.edited = true;
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
                    const messageFull = await uploadRecursiveForwardedMessages([message]);
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
        
        try {
            // Аутентификация
            const user: User = await auth.authenticate();
            let toUserId: number;

            // Получение параметров пути и их валидация
            let validParams;
            try {
                const rawQueryParams = request.qs();
                validParams = await validateMessageParamsDelete.validate(rawQueryParams);
            } catch (err) {
                if (err?.messages) throw {
                    meta: { status: 'error', code: err?.status ?? 422, url: request.url(true) },
                    data: { messages: err?.messages, preview: 'Проверьте корректность отправляемых данных' },
                }
            }
            // Извлечение чата из БД для получения его сообщений по выборке
            let chat: Chat;
            try {
                chat = await Chat.findByOrFail('id', validParams!.chat_id);
            } catch (err) {
                console.error(`messages_controller: deleteMessage  => Не удалось извлечь чат из базы данных =>`, err);
                throw {
                    meta: { status: 'error', code: err?.status ?? 500, url: request.url(true) },
                    data: { messages: err?.messages, preview: 'Не удалось извлечь чат из базы данных по его ID из параметров запроса' },
                }
            }

            // Извлечение сообщений, которые необходимо удалить
            let messages: Message[];
            try {
                messages = await chat
                .related('message')
                .query()
                .select('*')
                .whereNull('deleted_at')
                .andWhereIn('id', validParams!.ids)
                .andWhere('from_user_id', user!.id)
            } catch (err) {
                console.error(`messages_controller: deleteMessage  => Ошибка при извлечении сообщений через сущность чата =>`, err);
                throw {
                    meta: { status: 'error', code: err?.status ?? 500, url: request.url(true) },
                    data: { messages: err?.messages, preview: 'Ошибка при чтении сообщений в Базе Данных по их ID из параметров запроса' },
                }
            }

            // Установка поля deleted_at сообщениям, чтобы сделать их мягко удаленными 
            messages.forEach((message) => {
                if(!toUserId) toUserId = message.to_user_id;
                message.deletedAt = DateTime.local();
            });
            // Сохранение изменений сообщений в Базе Данных
            try {
                await chat.related('message').saveMany(messages);
            } catch (err) {
                console.error(`messages_controller: deleteMessage  => Ошибка при сохранении изменений полей deletedAt у удаляемых сообщений =>`, err);
                throw {
                    meta: { status: 'error', code: err?.status ?? 500, url: request.url(true) },
                    data: { messages: err?.messages, preview: 'Не удалось удалить выбранные сообщения' },
                }
            }

            // Извлечение последнего сообщения в чате
            let lastMessage: Message[] | Message;
            let readyLastMessage;
            try {
                lastMessage = await chat
                    .related('message')
                    .query()
                    .select(['content', 'id', 'created_at', 'edited'])
                    .whereNull('deleted_at')
                    .orderBy('created_at', 'desc')
                    .groupLimit(1);
                if(Array.isArray(lastMessage) && lastMessage.length > 0) lastMessage = lastMessage[0];
                if(lastMessage instanceof Message) {
                    readyLastMessage = {
                        content: lastMessage.content,
                        id: lastMessage.id,
                        createdAt: lastMessage.createdAt.toJSON(),
                        edited: lastMessage.edited,
                    }
                }
            } catch (err) {
                console.error(`messages_controller: deleteMessage  => Ошибка при извлечении последнего сообщения чата =>`, err);
                throw {
                    meta: { status: 'error', code: err?.status ?? 500, url: request.url(true) },
                    data: { messages: err?.messages, preview: 'Не удалось удалить выбранные сообщения' },
                }
            }
            // Уведомить собеседника об удалении этого сообщения
            messageDeleteEmit(validParams!.ids, toUserId!);
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: { lastMessage: readyLastMessage ?? null },
            });
        } catch (err) {
            console.error(`messages_controller: deleteMessage  => ${err.data.preview}`);
            response.abort(err, err?.meta?.code ?? 500);
        }
    }
}
