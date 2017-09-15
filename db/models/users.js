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
    account_is_created: DataTypes.BOOLEAN,
    fingerprint: {
      type: DataTypes.STRING,
      get() {
        if (this.getDataValue('fingerprint')) {
          return JSON.parse(this.getDataValue('fingerprint'));
        }
        return {};
      },
      set(value) {
        this.setDataValue('fingerprint', JSON.stringify(value));
      },
    },
  }, {
    freezeTableName: true,
    underscored: true,
  })
);
