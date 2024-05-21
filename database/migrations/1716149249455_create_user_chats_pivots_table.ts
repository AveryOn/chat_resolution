import { BaseSchema } from '@adonisjs/lucid/schema'


export default class extends BaseSchema {
    protected tableName = 'user_chats';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id', { primaryKey: true });
            table.integer('user_id').unsigned().references('users.id');
            table.integer('chat_id').unsigned().references('chats.id');
            table.unique(['user_id', 'chat_id']);
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
            table.timestamp('deleted_at', { useTz: true });
        });
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}