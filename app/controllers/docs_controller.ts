import type { HttpContext } from '@adonisjs/core/http';

export default class DocsController {
    async getDocs({ view }: HttpContext) {
        try {
            return view.render('welcome')
        } catch (err) {
            console.error(`controllers/docs_controller: getDocs  =>  ${err}`);
            throw err;
        }
    }
}