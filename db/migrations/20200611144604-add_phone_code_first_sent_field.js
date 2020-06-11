module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('phonecode', 'phone_code_first_sent', {
      type: Sequelize.DATE,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('phonecode', 'phone_code_first_sent');
  },
};
