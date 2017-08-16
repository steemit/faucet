module.exports = {
  up: (queryInterface, Sequelize) => (
    queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      email_is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      last_attempt_verify_email: {
        type: Sequelize.DATE,
      },
      phone_number: {
        type: Sequelize.STRING,
      },
      phone_number_is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      last_attempt_verify_phone_number: {
        type: Sequelize.DATE,
      },
      ip: {
        type: Sequelize.STRING,
      },
      ua: {
        type: Sequelize.TEXT,
      },
      account_is_created: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  ),
  down: queryInterface => queryInterface.dropTable('apps'),
};
