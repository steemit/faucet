export default (sequelize, DataTypes) => (
  sequelize.define('actions', {
    action: DataTypes.STRING,
    ip: DataTypes.STRING,
    metadata: DataTypes.JSON,
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    freezeTableName: true,
    underscored: true,
  })
);
