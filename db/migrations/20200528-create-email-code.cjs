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
            last_attempt_verify_email: {
                type: Sequelize.DATE,
            },
            email_code_sent: {
                type: Sequelize.INTEGER,
            },
            email_code_generated: {
                type: Sequelize.DATE,
            },
        })
    ),
    down: queryInterface => queryInterface.dropTable('emailcode'),
};
