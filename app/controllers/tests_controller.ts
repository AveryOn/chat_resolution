import type { HttpContext } from '@adonisjs/core/http';
import logMethod from '#services/logger_service';

export default class TestsController {
    @logMethod
    async store({ request, response }: HttpContext) {
        const body = request.all();
        response.send({ data: 'Hello World' })
    }
}