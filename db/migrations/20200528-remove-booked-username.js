module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'username_booked_at');
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'username_booked_at', {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },
};

