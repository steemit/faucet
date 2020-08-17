module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'phone_code_attempts', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'phone_code_attempts', {
      type: Sequelize.INTEGER,
    });
  },
};