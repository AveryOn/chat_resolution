import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'users'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id', { primaryKey: true }).notNullable()
            table.string('name', 255).notNullable();
            table.string('lastname', 255).notNullable();
            table.string('surname', 255).nullable();
            table.string('email', 255).notNullable().unique();
            table.string('password').notNullable();
            table.string('role', 20).defaultTo('user').notNullable();
            table.timestamp('last_activity', { useTz: true });
            table.timestamp('created_at', { useTz: true }).notNullable();
            table.timestamp('updated_at', { useTz: true }).nullable();
            table.timestamp('deleted_at', { useTz: true }).nullable();
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}