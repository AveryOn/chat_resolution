import type { HttpContext } from '@adonisjs/core/http'

export default class DocsController {
    getDocs({request, response}: HttpContext) {
        try {
            response.send({ data: "It's docs for server Forge!" })
        } catch (err) {
            console.error(`controllers/docs_controller: getDocs  =>  ${err}`);
            throw err;
        }
    }
}