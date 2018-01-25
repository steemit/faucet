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
      phone_code_attempts: {
        type: Sequelize.INTEGER,
        default: 0,
      },
      phone_code: {
        type: Sequelize.STRING,
      },
      ip: {
        type: Sequelize.STRING,
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
      fingerprint: {
        type: Sequelize.JSON,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: false,
      },
      username: {
        type: Sequelize.STRING,
      },
      username_booked_at: {
        type: Sequelize.DATE,
      },
      metadata: {
        type: Sequelize.JSON,
      },
      locale: {
        type: Sequelize.STRING,
      },
    })
  ),
  down: queryInterface => queryInterface.dropTable('users'),
};
