// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";

export default class BasesController {
    async get({ response }: HttpContext) {

        const rows = (await db.rawQuery(
            `
                SELECT * FROM test;

            `
        )).rows;
        response.send({data: rows});
    }
}