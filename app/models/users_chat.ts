import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from '#models/user';
import Chat from '#models/chat';

export default class UserChats extends BaseModel {
    public static table = 'user_chats';

    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare chat_id: number;

    @column()
    declare user_id: number;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;

    @belongsTo(() => Chat)
    declare chat: BelongsTo<typeof Chat>;
}