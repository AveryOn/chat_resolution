import Message from "#models/message";
import MessagesForwarding from "#models/messages_forwading";
import { MessagesPaginator } from "#types/message_types";
import db from "@adonisjs/lucid/services/db";
import { ModelObject } from "@adonisjs/lucid/types/model";
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
export async function fetchForwardedMessages(forwardedMessagesIds: Array<number>): Promise<Array<ModelObject> | undefined> {
    try {
        const messages = await Message
            .query()
            .select(['id', 'from_user_id', 'to_user_id', 'chat_id', 'content', 'is_forwarding'])
            .preload('fromUser', (queryFrom) => queryFrom.select(['id', 'name', 'lastname', 'surname']))
            .preload('toUser', (queryTo) => queryTo.select(['id', 'name', 'lastname', 'surname']))
            .whereIn('id', forwardedMessagesIds)
        return uploadRecursiveForwardedMessages(messages);
    } catch (err) {
        console.log(err);
        console.error('Не удалось извлечь сообщения по записям сопоставления');
        throw {
            meta: { status: 'error', code: 500 },
            data: 'Не удалось извлечь сообщения по записям сопоставления',
        }
    }
}

// Функция извлекает связанное сообщение у reply-сообщения (Если оно есть), иначе возвращает JSON этого сообщения 
export async function fetchRelatedMessage(message: Message, readyMessage: ModelObject) {
    if (message.replied === true) {
        try {
            await message.load('repliedInfoRow', (infoBuilder) => {
                infoBuilder.preload('relatedMessage', (relatedMsgBuilder) => {
                    relatedMsgBuilder
                        .select(['id', 'from_user_id', 'to_user_id', 'chat_id', 'content', 'created_at', 'updated_at', 'is_forwarding',])
                        .where('chat_id', message.chatId);
                });
            });
            if (message.repliedInfoRow && message.repliedInfoRow.length) {
                readyMessage.relatedMessage = message.repliedInfoRow[0].relatedMessage;
            }
        } catch (err) {
            console.error('utils/messages_utils: fetchRelatedMessage => ', err);
            throw err;
        }
    } else readyMessage.relatedMessage = null;
    return readyMessage;
}

// Функция рекурсивно запрашивает вложенные (пересылаемые) сообщения и собирает массив сообщений
// Где у каждого сообщения есть ключ forwardedMessages который содержит вложенные сообщения
export async function uploadRecursiveForwardedMessages(messages: Array<Message>) {
    try {
        // рекурсия
        async function transformMessages(message: Message): Promise<ModelObject> {
            let readyMessage: ModelObject = message.toJSON();
            delete readyMessage!.forwardedMessagesId;  // Исключается ключ forwardedMessagesId (он бесполезен)
            if (message.isForwarding === false) {
                return await fetchRelatedMessage(message, readyMessage);
            }
            // Если список вложенных сообщений есть то выполняем рекурсивный проход по нему
            if (message.forwardedMessagesId && message.forwardedMessagesId.length > 0) {
                readyMessage!.forwardedMessages = []
                let inner = message.forwardedMessagesId.map(async (entry) => {
                    return await transformMessages(entry.forwardedMessage);
                });
                readyMessage!.forwardedMessages = await Promise.all(inner); // ожидание полезных данных в ответе БД
            }
            // Если массива с вложенными сообщениями нет, но есть об этом информация (т.е поле isForwading=true)
            // То выполняется запрос на получение вложенных сообщений с БД
            else {
                const trx = await db.transaction();
                try {
                    await message.load('forwardedMessagesId', (queryMain) => {
                        queryMain.preload('forwardedMessage', (queryMessage) => {
                            queryMessage
                                .select(['id', 'from_user_id', 'to_user_id', 'chat_id', 'content', 'is_forwarding'])
                                .preload('fromUser', (querFrom) => querFrom.select(['id', 'name', 'lastname', 'surname']))
                                .preload('toUser', (queryTo) => queryTo.select(['id', 'name', 'lastname', 'surname']))
                        })
                    });
                    trx.commit();
                    return await transformMessages(message);
                } catch (err) {
                    await trx.rollback();
                    console.error('Ошибка извлечении forwardedMessages => utils/messages_utils:  uploadRecursiveForwardedMessages', err);
                    throw err;
                }
            }
            return readyMessage!;
        }
        let result: Array<ModelObject> = [];
        result = messages.map(async (message) => {
            return await transformMessages(message);
        });
        result = await Promise.all(result);
        return result;
    } catch (err) {
        console.error('Ошибка при переборе => utils/messages_utils: uploadRecursiveForwardedMessages', err);
        throw err;
    }
}

// Базовая функция для получения сообщений C ПАГИНАТОРОМ
export async function fetchMessagesBasicWithPaginator(chatId: number, paginator: MessagesPaginator) {
    function compOffsetNLimit() {
        if (paginator) {
            // Вычисление Offset-смещения
            let readyOffset = paginator.total - (paginator.currentPage * paginator.perPage);
            let limit = paginator.perPage;
            if(readyOffset < 0) {
                console.log(readyOffset);
                // Вычисление лимита
                limit = paginator.perPage - Math.abs(readyOffset);
                readyOffset = 0;
            }
            return {offset: readyOffset, limit};
        }
        else return {offset: 0, limit: 0};
    }
    const trx = await db.transaction();
    try {
        const messages: Array<Message> = await Message
            .query({ client: trx })
            .select(['*'])
            .where('chat_id', chatId)
            .whereNull('deleted_at')
            .offset(compOffsetNLimit().offset)
            .limit(compOffsetNLimit().limit)
            .orderBy('created_at', 'asc');
        await trx.commit();
        return await uploadRecursiveForwardedMessages(messages);
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
            .whereNull('deleted_at')
            .orderBy('created_at', 'asc')
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
            })
            .preload('repliedInfoRow', (infoBuilder) => {
                infoBuilder.preload('relatedMessage', (relatedMsgBuilder) => {
                    relatedMsgBuilder
                        .select(['id', 'from_user_id', 'to_user_id', 'chat_id', 'content', 'created_at', 'updated_at', 'is_forwarding'])
                        .where('chat_id', chatId);
                });
            })
        await trx.commit();
        messages.forEach((mes) => {
            console.log(mes.toJSON()?.forwardedMessagesId);
        })
        return messages
        // return await uploadRucursiveForwardedMessages(messages);
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


// При удалении сообщения удаляются и все (для текущего сообщения) связанные записи с информацией о пересланных сообщениях
export async function deleteRelationForwardingMessages(messageId: number, currentTime: DateTime<boolean>) {
    const trx = await db.transaction();
    try {
        await Message.query({ client: trx })
            .preload('forwardedMessagesId', (query) => {
                query
                    .select('*')
                    .where('main_message_id', messageId)
                    .orWhere('forwarded_message_id', messageId)
                    .update({
                        deleted_at: currentTime.toSQL(),
                    });
            })
        await trx.commit();
    } catch (err) {
        console.log(err);
        console.error('Не удалось удалить связанные сообщения => utils/messages_utils: deleteRelationForwardingMessages');
        await trx.rollback();
        throw {
            meta: { status: 'error', code: 500 },
            data: 'Не удалось удалить связанные сообщения',
        }
    }
} 