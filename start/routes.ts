/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router';

// cht_Mg.aDV5OGFnSEQ4UzFhOF9kdkFmZGcwQjR1dUEyNXZObmttT1pOWktxbTE4MjMwODA1ODI   -   1
// cht_Mw.Q2RSWTV2OWtjOTBKSHh6aTU3QzVtOUlZcWhYRUNsNW9lUmZrMmVUVTMwMDQyMTc0OTQ   -   2

// AUTH ROUTES
router.group(() => {
    router.post('/', '#controllers/auth_controller.confirmCredenials');
    router.delete('/logout', '#controllers/auth_controller.logout');
}).prefix('auth')

// USERS ROUTES
router.group(() => {
    router.post('/create', '#controllers/users_controller.store');  // Create
    router.put('/:user_id/update', '#controllers/users_controller.updateUser')  // Update
    router.delete('/:user_id/delete', '#controllers/users_controller.deleteUser')  // Delete
}).prefix('users')

// CHATS ROUTES
router.group(() => {
    router.get('/get-by-user-id/:userId', '#controllers/chats_controller.getChats')
    router.post('/create', '#controllers/chats_controller.store');
}).prefix('chats')


