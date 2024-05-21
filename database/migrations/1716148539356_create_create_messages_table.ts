import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'messages'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id', { primaryKey: true });
            table.integer('from_user_id').unsigned().references('users.id');
            table.integer('to_user_id').unsigned().references('users.id');
            table.integer('chat_id').unsigned().references('chats.id');
            table.string('content').notNullable();
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
            table.timestamp('deleted_at', { useTz: true });
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}