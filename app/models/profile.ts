import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from '#models/user'

export default class Profile extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare name: string;
 
    @column()
    declare lastname: string;

    @column()
    declare surname?: string | null;

    @column()
    declare gender: 0 | 1 | 2 | number;

    @column()
    declare phoneNumber?: string;

    @column()
    declare email: string;

    @column()
    declare login?: string | null;

    @column()
    declare avatar?: string | null;

    @column()
    declare birthAt?: DateTime | string;

    @column()
    declare userId: number;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @column()
    declare deletedAt: DateTime | null;

    @belongsTo(() => User, { foreignKey: 'user_id' })
    declare user: BelongsTo<typeof User>;

}