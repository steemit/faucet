module.exports = (sequelize, DataTypes) => (
  sequelize.define('users', {
    username: DataTypes.STRING,
    email: DataTypes.STRING,
    email_is_verified: DataTypes.BOOLEAN,
    phone_number: DataTypes.STRING,
    phone_number_is_verified: DataTypes.BOOLEAN,
    ip: DataTypes.STRING,
    ua: DataTypes.TEXT,
  }, {
    freezeTableName: true,
    underscored: true,
  })
);
