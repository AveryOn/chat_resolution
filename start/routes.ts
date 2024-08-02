/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router';

router.get('/docs', '#controllers/docs_controller.getDocs')

router.post('/test', '#controllers/tests_controller.store');

// AUTH ROUTES
router.group(() => {
    router.post('/', '#controllers/auth_controller.confirmCredenials').as('auth');
    router.get('/check', '#controllers/auth_controller.authenticateCheck').as('auth-check')
    router.delete('/logout', '#controllers/auth_controller.logout').as('logout');
}).prefix('auth');

// PROFILE ROUTES
router.group(() => {
    router.post('/create', '#controllers/profiles_controller.store').as('profile-create');
    router.patch('/:id/update-one', '#controllers/profiles_controller.patchDataProfile').as('profile-patch');
    router.put('/:id/update', '#controllers/profiles_controller.putDataProfile').as('profile-put');
    router.get('/me', '#controllers/profiles_controller.getMyProfile').as('profile-me');
    router.delete('/:id/delete', '#controllers/profiles_controller.deleteMyProfile').as('profile-delete');
    router.post('/:id/restore', '#controllers/profiles_controller.restoreMyProfile').as('profile-restore');
}).prefix('profile');

// USERS ROUTES
router.group(() => {
    router.get('/', '#controllers/users_controller.getUsers').as('get-users');                      // Get users
    router.get('/me', '#controllers/users_controller.getUserDataMe').as('get-user-owner-data');    // Get owner data user
    router.get('/:id', '#controllers/users_controller.getUserById').as('get-user-by-id');           // Get user BY id
    router.post('/create', '#controllers/users_controller.store').as('create-user');                // Create
    router.put('/:user_id/update', '#controllers/users_controller.updateUser').as('update-user')    // Update
    router.delete('/:user_id/delete', '#controllers/users_controller.deleteUser').as('delete-user') // Delete
}).prefix('users');

// CHATS ROUTES
router.group(() => {
    router.get('/', '#controllers/chats_controller.getChats').as('get-chats');                      // Get chats
    router.get('/:id', '#controllers/chats_controller.getChatById').as('get-chat-by-id');           //  Get chat BY id
    router.post('/create', '#controllers/chats_controller.store').as('create-chat');                //  Create chat
    router.put('/:id/update', '#controllers/chats_controller.updateChat').as('update-chat');        //  Update chat
    router.delete('/:id/delete', '#controllers/chats_controller.deleteChat').as('delete-chat');     //  Delete chat
}).prefix('chats');

// MESSAGES ROUTES
router.group(() => {
    router.get('/message/:id', '#controllers/messages_controller.getMessageById').as('get-message-by-id');            // Get message BY id
    router.get('/chat/:chat_id', '#controllers/messages_controller.getMessages').as('get-messages');                  // Get messages BY chat ID
    router.post('/create', '#controllers/messages_controller.store').as('create-message');                            // Create message
    router.put('/:id/update', '#controllers/messages_controller.updateMessage').as('update-message');                 // Update message
    router.delete('/delete', '#controllers/messages_controller.deleteMessage').as('delete-message');    //  Delete message
}).prefix('messages')


