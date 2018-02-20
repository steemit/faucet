module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('actions', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ip: {
        type: Sequelize.STRING,
      },
      user_id: {
          allowNull: true,
          type: Sequelize.INTEGER,
          references: {
              model: 'users',
              key: 'id'
          }
      },
      metadata: {
        type: Sequelize.JSON,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      }
    })
    await queryInterface.addIndex('actions', {fields: ['ip']})
    await queryInterface.addIndex('actions', {fields: ['user_id']})
  },
  down: queryInterface => queryInterface.dropTable('actions'),
};
