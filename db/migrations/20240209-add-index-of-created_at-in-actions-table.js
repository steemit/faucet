module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('actions', ['created_at'], {
        name: 'idx_created_at',
    })
  },
  down: queryInterface => queryInterface.removeIndex('actions', 'idx_created_at'),
};