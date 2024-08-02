import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'messages';

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.boolean('replied').defaultTo(false);
        })
    }
    async down() {
        this.schema.dropTable(this.tableName)
    }
}