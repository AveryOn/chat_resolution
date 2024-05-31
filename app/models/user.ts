import { DateTime } from 'luxon';
import hash from '@adonisjs/core/services/hash';
import { compose } from '@adonisjs/core/helpers';
import { BaseModel, column, manyToMany, hasOne } from '@adonisjs/lucid/orm';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';
import type { ManyToMany, HasOne } from '@adonisjs/lucid/types/relations';
import Chat from '#models/chat';
import Profile from '#models/profile';

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
    uids: ['email'],
    passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare name: string;

    @column()
    declare lastname: string;

    @column()
    declare surname: string | null;

    @column()
    declare email: string;

    @column()
    declare password: string;

    @column()
    declare role: "user" | "admin";

    @column.dateTime()
    declare lastActivity: DateTime | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null;

    @column.dateTime()
    declare deletedAt: DateTime | null;

    @manyToMany(() => Chat, {
        pivotTable: 'user_chats',
    })
    declare chats: ManyToMany<typeof Chat>;


    @hasOne(() => Profile)
    declare profile: HasOne<typeof Profile>;

    static accessTokens = DbAccessTokensProvider.forModel(User, {
        expiresIn: '30 days',
        prefix: 'cht_',
        table: 'auth_access_tokens',
        type: 'auth_token',
        tokenSecretLength: 40,
    });

}