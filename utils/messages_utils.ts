import Message from "#models/message";
import { MessagesPaginator } from "#types/message_types";
import db from "@adonisjs/lucid/services/db";
import { ModelObject } from "@adonisjs/lucid/types/model";
import { query } from "express";
import { DateTime } from "luxon";

type inputForwardedObject = {
    forwarded_message_id: number;
}

// Собрать объекты для создания строк в таблице messages_frowarfings
export function bundleForwardedRowsForCreate(forwardedIds: Array<number>): Array<inputForwardedObject> {
    let readyRows: Array<inputForwardedObject> = [];
    if (forwardedIds) {
        forwardedIds.forEach((id) => {
            readyRows.push({
                forwarded_message_id: id,
            });
        });
    } else {
        console.error('Не удалось собрать бандл записей для пересылаемых сообщений');
        throw {
            meta: { status: 'error', code: 422 },
            data: 'Не удалось собрать бандл записей для пересылаемых сообщений',
        }
    }
    return readyRows!;
}


// Создание записей в таблицу messages_forwardings
export async function createForwardingsRows(message: Message, forwardedIds: Array<number>) {
    try {
        return await message
            .related('forwardedMessagesId')
            .createMany(bundleForwardedRowsForCreate(forwardedIds))
    } catch (err) {
        console.error('Не удалось создать записи сопоставления пересылаемых сообщений')
        console.error(err);
        throw {
            meta: { status: 'error', code: 500 },
            data: 'Не удалось создать записи сопоставления пересылаемых сообщений',
        }
    }
}

// Извлечение пересланных сообщений по ID в записях сопоставления таблицы messages_forwardings
export async function fetchForwardedMessages(forwardedMessagesIds: Array<number>) {
    try {
        return await Message
            .query()
            .select(['id', 'content', 'created_at', 'updated_at'])
            .whereIn('id', forwardedMessagesIds)
            .preload('fromUser', (queryBuilder) => {
                queryBuilder.select('id', 'name', 'lastname', 'surname');
            })
            .preload('toUser', (queryBuilder) => {
                queryBuilder.select('id', 'name', 'lastname', 'surname');
            })
    } catch (err) {
        console.log(err);
        console.error('Не удалось извлечь сообщения по записям сопоставления');
        throw {
            meta: { status: 'error', code: 500 },
            data: 'Не удалось извлечь сообщения по записям сопоставления',
        }
    }
}


// Функция рекурсивно запрашивает вложенные (пересылаемые) сообщения и собирает массив сообщений
// Где у каждого сообщения есть ключ forwardedMessages который содержит вложенные сообщения
async function uploadRucursiveForwardedMessages(messages: Array<Message>) {
    const trx = await db.transaction();
    try {
        async function transformMessages(message: Message) {
            let readyMessage: ModelObject = message.toJSON();
            if (message.isForwarding === false) {
                console.log('Выход', message.id);
                delete readyMessage.forwardedMessagesId;
                return readyMessage!;
            }
            if (message.forwardedMessagesId && message.forwardedMessagesId.length > 0) {
                readyMessage.forwardedMessages = []
                console.log(message.id, 'Имеет вложенность', message.forwardedMessagesId.length, 'шт');
                let inner = message.forwardedMessagesId.map(async (entry) => {
                    return await transformMessages(entry.forwardedMessage);
                });
                delete readyMessage.forwardedMessagesId;
                readyMessage.forwardedMessages = await Promise.all(inner);
            } else {
                await message.load('forwardedMessagesId', (queryMain) => {
                    queryMain.preload('forwardedMessage', (queryMessage) => {
                        queryMessage
                            .select(['id', 'from_user_id', 'to_user_id', 'chat_id', 'content', 'is_forwarding'])
                            .preload('fromUser', (querFrom) => querFrom.select(['id', 'name', 'lastname', 'surname']))
                            .preload('toUser', (queryTo) => queryTo.select(['id', 'name', 'lastname', 'surname']));
                    })
                });
                return await transformMessages(message);
            }
            return readyMessage!;
        }
        let result: Array<ModelObject> = [];
        result = messages.map(async (message) => {
            return await transformMessages(message);
        });
        result = await Promise.all(result);
        await trx.commit();
        return result;
    } catch (err) {
        console.log(err);
        await trx.rollback();
        console.error('Ошибка при переборе => utils/messages_utils: excludeExcessForMessages');
    }
}

// Базовая функция для получения сообщений C ПАГИНАТОРОМ
export async function fetchMessagesBasicWithPaginator(chatId: number, paginator: MessagesPaginator) {
    function compOffset() {
        if (paginator) return (paginator.currentPage - 1) * paginator.perPage;
        else return 0;
    }
    const trx = await db.transaction();
    try {
        const messages: Array<Message> = await Message
            .query({ client: trx })
            .select(['*'])
            .where('chat_id', chatId)
            .offset(compOffset())
            .limit(paginator.perPage);
        await trx.commit();
        return await uploadRucursiveForwardedMessages(messages);
    } catch (err) {
        console.log(err);
        console.error('Не удалось выполнить запрос на получение сообщений => utils/messages_utils: fetchMessagesBasicWithPaginator');
        await trx.rollback();
        throw {
            meta: { status: 'error', code: 500 },
            data: 'Не удалось извлечь сообщения по записям сопоставления',
        }
    }
}

// Базовая функция для получения сообщений БЕЗ ПАГИНАТОРА
export async function fetchMessagesBasicWithoutPaginator(chatId: number) {
    const trx = await db.transaction();
    try {
        const messages: Array<Message> = await Message
            .query({ client: trx })
            .select(['*'])
            .where('chat_id', chatId)
            .preload('forwardedMessagesId', (queryBuilder) => {
                queryBuilder
                    .select(['forwarded_message_id'])
                    .preload('forwardedMessage', (queryMessage) => {
                        queryMessage
                            .select(['id', 'from_user_id', 'to_user_id', 'chat_id', 'content', 'is_forwarding'])
                            .preload('fromUser', (queryUser) => {
                                queryUser
                                    .select(['id', 'name', 'lastname', 'surname'])
                            })
                            .preload('toUser', (queryUser) => {
                                queryUser
                                    .select(['id', 'name', 'lastname', 'surname'])
                            })
                    })
            });
        await trx.commit();
        return await uploadRucursiveForwardedMessages(messages);
    } catch (err) {
        console.log(err);
        console.error('Не удалось выполнить запрос на получение сообщений => utils/messages_utils: fetchMessagesBasicWithoutPaginator');
        await trx.rollback();
        throw {
            meta: { status: 'error', code: 500 },
            data: 'Не удалось извлечь сообщения по записям сопоставления',
        }
    }
}