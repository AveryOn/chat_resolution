import router from '@adonisjs/core/services/router';
router.get('/', async () => {
    return {
        hello: 'world',
    };
});
router.group(() => {
    router.get('/', '#controllers/users_controller.get');
}).prefix('main');
//# sourceMappingURL=routes.js.map