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
            phone_number_is_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            last_attempt_verify_phone_number: {
                type: Sequelize.DATE,
            },
            ref_code: {
                type: Sequelize.STRING,
                unique: true,
            },
        })
    ),
    down: queryInterface => queryInterface.dropTable('phonecode'),
};
