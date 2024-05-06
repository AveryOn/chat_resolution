// import type { HttpContext } from '@adonisjs/core/http'

import { HttpContext } from "@adonisjs/core/http";

export default class UsersController {
    store() {

    }
    get({ response }: HttpContext) {
        response.send({ data: 'hello world!' });
    }
}