module.exports = {
    up: (queryInterface, Sequelize) => (
        queryInterface.createTable('phonecode', {
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            phone_number: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            phone_code: {
                type: Sequelize.STRING,
            },
            phone_code_attempts: {
                type: Sequelize.INTEGER,
            },
            last_attempt_verify_phone_number: {
                type: Sequelize.DATE,
            },
            phone_code_sent: {
                type: Sequelize.INTEGER,
            },
            phone_code_generated: {
                type: Sequelize.DATE,
            },
        })
    ),
    down: queryInterface => queryInterface.dropTable('phonecode'),
};
