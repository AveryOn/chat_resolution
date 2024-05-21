import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'chats'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id', { primaryKey: true });
            table.string('preview_message', 50);
            table.integer('creator').unsigned().references('users.id');
            table.boolean('visible').defaultTo(true).notNullable();
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
            table.timestamp('deleted_at', { useTz: true });
        });
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}