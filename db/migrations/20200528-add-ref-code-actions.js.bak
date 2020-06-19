module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('actions', 'user_id');

        // await queryInterface.addColumn('actions', 'ref_code', {
        //     type: Sequelize.STRING,
        //     allowNull: false,
        //     unique: true,
        // });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('actions', 'user_id', {
            type: Sequelize.INTEGER,
            references: {
                model: 'users',
                key: 'id'
            }
        });

        // await queryInterface.removeColumn('actions', 'ref_code');
    },
};
