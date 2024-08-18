module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('emailcode', 'email_code_first_sent', {
      type: Sequelize.DATE,
    });
  },
  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('emailcode', 'email_code_first_sent');
  },
};
