module.exports = (sequelize, DataTypes) => (
    sequelize.define('emailcode', {
        email: DataTypes.STRING,
        email_normalized: DataTypes.STRING,
        email_code: DataTypes.STRING,
        email_code_attempts: DataTypes.INTEGER,
        email_is_verified: DataTypes.BOOLEAN,
        last_attempt_verify_email: DataTypes.DATE,
        email_code_sent: DataTypes.INTEGER,
        email_code_generated: DataTypes.DATE,
        ref_code: {
            type: DataTypes.STRING,
        }
    }, {
        freezeTableName: true,
        underscored: true,
        timestamps: false,
    })
);
