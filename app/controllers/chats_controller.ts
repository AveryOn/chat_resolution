import Chat from '#models/chat';
import User from '#models/user';
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db';
import {
    validBodyCreationChat,
    validBodyPutChat,
    validParamsDeleteChat,
    validParamsGetChat,
    validParamsGetChats,
} from '#validators/chat_valide';
import { DateTime } from 'luxon';
import { ChatsPaginator } from '#types/chat_types';
import { initChatsPaginator } from '#utils/meta_utils';

export default class ChatsController {

    // Получение чата по ID 
    async getChatById({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {

            // Аутентификация
            await auth.authenticate();
            const { id } = request.params();
            // Валидация параметров запроса
            const { id: chatId } = await validParamsGetChat.validate({ id });

            // Получение чата по ID
            let chat: Chat;
            try {
                chat = await Chat.findOrFail(chatId, { client: trx });
                // Если временная метка удаления есть то чат считается удаленным
                if (chat.deletedAt) throw { status: 404 }
            } catch (err) {
                if (err?.status === 404) throw {
                    meta: { status: 'error', code: 404, url: request.url(true) },
                    data: 'Чат c таким ID не найден',
                }
            }
            await trx.commit();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: chat!.toJSON(),
            })
        } catch (err) {
            await trx.rollback();
            console.error(`chats_controller: getChatById  => ${err?.data ?? err}`);
            response.abort(err, err?.meta.code);
        }
    }

    // Получение всех чатов для пользователя
    async getChats({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {

            // Аутентификация
            const user: User = await auth.authenticate();

            // Получение параметров запроса
            const queries = request.qs();
            let validQueries;
            try {
                validQueries = await validParamsGetChats.validate(queries);
            } catch (err) {
                // Если валидация параметров запроса не прошла
                throw {
                    meta: { status: 'error', code: 422, url: request.url(true) },
                    data: 'Некорректные данные запроса',
                }
            }

            // Пагинатор не обязателен
            let paginator: ChatsPaginator | null = null;

            // Если нет параметров запроса то пагинатор не инициализируется
            if (validQueries!.page && validQueries!.per_page) {
                paginator = await initChatsPaginator(validQueries!.page, validQueries!.per_page);
            }

            // Получение списка чатов
            let chats: Array<Chat>;
            // Если пагинатор определен то получаем список сущностей по пагинации
            if (paginator) {
                function compOffset() {
                    if (paginator) return (paginator.currentPage - 1) * paginator.perPage;
                    else return 0;
                }
                try {
                    // Получить пользователя по ID и загрузить его чаты вместе с пользователями этих чатов
                    const fecthedUser = await User.query({ client: trx })
                        .where('id', user.id)
                        .preload('chats', (chatsQuery) => {
                            chatsQuery
                                .select(['id', 'creator', 'created_at'])
                                .whereNull('chats.deleted_at')
                                .preload('users', (usersQuery) => {
                                    usersQuery
                                        .select(['id', 'name', 'lastname', 'surname', 'last_activity', 'created_at'])
                                        .whereNull('users.deleted_at')
                                        .whereNot('users.id', user.id)
                                })
                                .offset(compOffset())
                                .limit(paginator.perPage);
                        })
                        .firstOrFail();

                    chats = fecthedUser.chats;
                } catch (err) {
                    throw {
                        meta: { status: 'error', code: 400, url: request.url(true) },
                        data: 'Не удалось получить чаты [with pagination]',
                    }
                }
            } else {
                try {
                    // Получить пользователя по ID и загрузить его чаты вместе с пользователями этих чатов
                    const fecthedUser = await User.query({ client: trx })
                        .where('id', user.id)
                        .preload('chats', (chatsQuery) => {
                            chatsQuery
                                .select(['id', 'creator', 'created_at'])
                                .whereNull('chats.deleted_at')
                                .preload('users', (usersQuery) => {
                                    usersQuery
                                        .select(['id', 'name', 'lastname', 'surname', 'last_activity', 'created_at'])
                                        .whereNull('users.deleted_at')
                                        .whereNot('users.id', user.id)
                                });
                        })
                        .firstOrFail();

                    chats = fecthedUser.chats;
                } catch (err) {
                    throw {
                        meta: { status: 'error', code: 400, url: request.url(true) },
                        data: 'Не удалось получить чаты [without pagination]',
                    }
                }
            }
            await trx.commit();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true), paginator },
                data: chats,
            })
        } catch (err) {
            await trx.rollback();
            console.error(`chats_controller: getChats  => ${err?.data ?? err}`);
            response.abort(err, err?.meta?.code ?? 500);
        }
    }

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

    // Удаление чата
    async deleteChat({ request, response, auth }: HttpContext) {
        const trx = await db.transaction();
        try {
            await auth.authenticate();
            const { id } = request.params();
            const { id: chatId } = await validParamsDeleteChat.validate({ id });

            // Поиск чата по ID
            let chat: Chat;
            try {
                chat = await Chat.findOrFail(chatId, { client: trx });
            } catch (err) {
                // Если чат не найден то findOrFail поднимает исключение
                if (err?.status === 404) {
                    throw {
                        meta: { status: 'error', code: 404, url: request.url(true) },
                        data: 'Чат c таким ID не найден',
                    }
                }
                // Если поднимается ошибка с другим кодом то значит она связана с проблемой не относящейся к поиску чата
                else throw {
                    meta: { status: 'error', code: 500, url: request.url(true) },
                    data: 'Внутренняя ошибка сервера',
                }
            }

            const localDateTime = DateTime.local();
            // Если метка удления уже установлена в этом чате то он считается удаленным, и пораждает исключение 422
            if (chat.deletedAt) {
                throw {
                    meta: { status: 'error', code: 422, url: request.url(true) },
                    data: 'Чат уже удален',
                }
            }
            chat.deletedAt = localDateTime  // Изменение временной метки deleted_at
            await chat.save();
            await trx.commit();
            response.send({
                meta: { status: 'success', code: 200, url: request.url(true) },
                data: { deleted_at: localDateTime },
            });
        } catch (err) {
            await trx.rollback();
            console.error(`chats_controller: deleteChat  => ${err?.data ?? err}`);
            response.abort(err, err?.meta.code);
        }
    }

}