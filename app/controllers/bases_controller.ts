// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from "@adonisjs/core/http";

export default class BasesController {
    async get({ response }: HttpContext) {
        response.send({data: 'Hello World!'});
    }
}