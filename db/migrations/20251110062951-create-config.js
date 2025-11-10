module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('config', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      c_key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      c_val: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex('config', { fields: ['c_key'], unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('config', ['c_key']);
    await queryInterface.dropTable('config');
  },
};
