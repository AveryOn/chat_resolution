import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'messages_forwardings'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.timestamp('deleted_at')
        });
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}