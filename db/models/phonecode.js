module.exports = (sequelize, DataTypes) => (
    sequelize.define('phonecode', {
        phone_number: DataTypes.STRING,
        phone_code_attempts: DataTypes.INTEGER,
        phone_code: DataTypes.STRING,
        last_attempt_verify_phone_number: DataTypes.DATE,
        phone_code_sent: DataTypes.INTEGER,
        phone_code_generated: DataTypes.DATE,
        ref_code: {
            type: DataTypes.STRING,
        }
    }, {
        freezeTableName: true,
        underscored: true,
        timestamps: false,
    })
);
