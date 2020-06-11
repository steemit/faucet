module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('emailcode', 'email_code_first_sent', {
      type: Sequelize.DATE,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('emailcode', 'email_code_first_sent');
  },
};