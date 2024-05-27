import type { HttpContext } from '@adonisjs/core/http'

export default class DocsController {
    getDocs({ view }: HttpContext) {
        try {
            return view.render('welcome', { username: 'Hello!' })
        } catch (err) {
            console.error(`controllers/docs_controller: getDocs  =>  ${err}`);
            throw err;
        }
    }
}