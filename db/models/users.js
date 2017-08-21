module.exports = (sequelize, DataTypes) => (
  sequelize.define('users', {
    email: DataTypes.STRING,
    email_is_verified: DataTypes.BOOLEAN,
    last_attempt_verify_email: DataTypes.DATE,
    phone_number: DataTypes.STRING,
    phone_number_is_verified: DataTypes.BOOLEAN,
    phone_code_attempts: DataTypes.INTEGER,
    phone_code: DataTypes.STRING,
    last_attempt_verify_phone_number: DataTypes.DATE,
    ip: DataTypes.STRING,
    ua: DataTypes.TEXT,
    account_is_created: DataTypes.BOOLEAN,
  }, {
    freezeTableName: true,
    underscored: true,
  })
);
