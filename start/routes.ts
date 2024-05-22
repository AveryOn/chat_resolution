/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router';


// AUTH ROUTES
router.group(() => {
    router.post('/', '#controllers/auth_controller.confirmCredenials');
    router.delete('/logout', '#controllers/auth_controller.logout');
}).prefix('auth');

// USERS ROUTES
router.group(() => {
    router.get('/', '#controllers/users_controller.getUsers');  // Get users
    router.get('/:id', '#controllers/users_controller.getUserById');  // Get user BY id
    router.post('/create', '#controllers/users_controller.store');  // Create
    router.put('/:user_id/update', '#controllers/users_controller.updateUser')  // Update
    router.delete('/:user_id/delete', '#controllers/users_controller.deleteUser')  // Delete
}).prefix('users');

// CHATS ROUTES
router.group(() => {
    router.get('/', '#controllers/chats_controller.getChats');
    router.get('/:id', '#controllers/chats_controller.getChatById');
    router.post('/create', '#controllers/chats_controller.store');
    router.put('/:id/update', '#controllers/chats_controller.updateChat');
    router.delete('/:id/delete', '#controllers/chats_controller.deleteChat');
}).prefix('chats');

// MESsAGES ROUTES
router.group(() => {
    // ...
}).prefix('messages');


