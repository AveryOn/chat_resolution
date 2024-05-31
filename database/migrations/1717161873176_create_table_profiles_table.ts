import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'profiles'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');
            table.string('name');
            table.string('lastname');
            table.string('surname');
            table.integer('gender');
            table.string('phone_number', 12).unique();
            table.string('email').unique();
            table.string('login').unique();
            table.string('avatar');
            table.timestamp('birth_at');
            table.integer('user_id').unsigned().references('users.id');
            table.timestamp('created_at');
            table.timestamp('updated_at');
            table.timestamp('deleted_at');
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}