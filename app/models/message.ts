import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from '#models/user';
import Chat from '#models/chat';


export default class Message extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare from_user_id: number

    @column()
    declare to_user_id: number;

    @column()
    declare chatId: number;

    @column()
    declare content: string;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null;

    @column.dateTime()
    declare deletedAt: DateTime | null;

    // RELATIONS
    @belongsTo(() => User, { foreignKey: 'from_user_id' })
    declare fromUser: BelongsTo<typeof User>;

    @belongsTo(() => User, { foreignKey: 'to_user_id' })
    declare toUser: BelongsTo<typeof User>;

    @belongsTo(() => Chat)
    declare chat: BelongsTo<typeof Chat>;
}