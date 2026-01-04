export default (sequelize, DataTypes) =>
  sequelize.define('config', {
    c_key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    c_val: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  }, {
    freezeTableName: true,
    underscored: true,
  });
