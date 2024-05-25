import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Message from '#models/message';

export default class MessagesForwarding extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare main_message_id: number;

    @column()
    declare forwarded_message_id: number;

    // @column()
    // declare forwardedMessageId: number;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime


    @belongsTo(() => Message, { foreignKey: 'main_message_id' })
    declare mainMessage: BelongsTo<typeof Message>;

    @belongsTo(() => Message, { foreignKey: 'forwarded_message_id' })
    declare forwardedMessage: BelongsTo<typeof Message>;
}