module.exports = (sequelize, DataTypes) => (
    sequelize.define('emailcode', {
        email: DataTypes.STRING,
        email_normalized: DataTypes.STRING,
        email_is_verified: DataTypes.BOOLEAN,
        last_attempt_verify_email: DataTypes.DATE,
        tracking_id: DataTypes.STRING,
    }, {
        freezeTableName: true,
        underscored: true,
    })
);
