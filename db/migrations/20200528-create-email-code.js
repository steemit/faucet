module.exports = {
    up: (queryInterface, Sequelize) => (
        queryInterface.createTable('emailcode', {
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
            email_normalized: {
                type: Sequelize.STRING,
                defaultValue: false,
            },
            email_code: {
                type: Sequelize.STRING,
            },
            email_code_attempts: {
                type: Sequelize.INTEGER,
            },
            email_is_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            last_attempt_verify_email: {
                type: Sequelize.DATE,
            },
            ref_code: {
                type: Sequelize.STRING,
                unique: true,
            },
        })
    ),
    down: queryInterface => queryInterface.dropTable('emailcode'),
};
