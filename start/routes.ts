/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router.get('/posts', '#controllers/bases_controller.get');


router.group(() => {
    router.get('/', '#controllers/users_controller.getUsers');
    router.post('/create', '#controllers/users_controller.store');
}).prefix('users')
