import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'replied_messages'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id', { primaryKey: true }).notNullable();
            table
                .integer('main_message_id')
                .unsigned()
                .notNullable()
                .references('messages.id')
            // .inTable('messages')
            // .onDelete('CASCADE')
            table
                .integer('replied_message_id')
                .unsigned()
                .notNullable()
                .references('messages.id')
            // .inTable('messages')
            // .onDelete('CASCADE')
            table.timestamp('created_at')
            table.timestamp('updated_at')
            table.timestamp('deleted_at')
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}