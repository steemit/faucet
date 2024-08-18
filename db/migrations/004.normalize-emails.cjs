module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Manual migration step:
    // UPDATE users SET email_normalized = LOWER(CONCAT(REPLACE(SUBSTRING_INDEX(SUBSTRING_INDEX(email, '@', 1), '+', 1), '.', ''), '@', SUBSTRING_INDEX(email, '@', -1)));
    await queryInterface.addColumn('users', 'email_normalized', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'email_normalized');
  },
};
