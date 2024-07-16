import { DateTime } from 'luxon';
import User from '#models/user'
import { BaseModel, column, belongsTo, manyToMany, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Message from '#models/message';


export default class Chat extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare previewMessage: string | null;

    @column()
    declare creator: number;

    @column()
    declare visible: boolean;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null;

    @column.dateTime()
    declare deletedAt: DateTime | null;

    @manyToMany(() => User, {
        pivotTable: 'user_chats',
    })
    declare users: ManyToMany<typeof User>;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>

    @hasMany(() => Message)
    declare message: HasMany<typeof Message>;
}
