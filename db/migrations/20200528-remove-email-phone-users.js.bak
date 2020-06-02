module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'email_normalized');
        await queryInterface.removeColumn('users', 'email_is_verified');
        await queryInterface.removeColumn('users', 'last_attempt_verify_email');
        await queryInterface.removeColumn('users', 'phone_number_is_verified');
        await queryInterface.removeColumn('users', 'phone_code_attempts');
        await queryInterface.removeColumn('users', 'phone_code');
        await queryInterface.removeColumn('users', 'last_attempt_verify_phone_number');
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'email_normalized', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('users', 'email_is_verified', {
            type: Sequelize.BOOLEAN,
            allowNull: true,
        });
        await queryInterface.addColumn('users', 'last_attempt_verify_email', {
            type: Sequelize.DATE,
            allowNull: true,
        });
        await queryInterface.addColumn('users', 'phone_number_is_verified', {
            type: Sequelize.BOOLEAN,
            allowNull: true,
        });
        await queryInterface.addColumn('users', 'phone_code_attempts', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
        await queryInterface.addColumn('users', 'phone_code', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('users', 'last_attempt_verify_phone_number', {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },
};
