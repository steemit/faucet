module.exports = (sequelize, DataTypes) => (
    sequelize.define('phonecode', {
        phone_number: DataTypes.STRING,
        phone_number_is_verified: DataTypes.BOOLEAN,
        phone_code_attempts: DataTypes.INTEGER,
        phone_code: DataTypes.STRING,
        last_attempt_verify_phone_number: DataTypes.DATE,
        ref_code: {
            type: DataTypes.STRING,
        }
    }, {
        freezeTableName: true,
        underscored: true,
    })
);
