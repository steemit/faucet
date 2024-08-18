export default (sequelize, DataTypes) => (
    sequelize.define('emailcode', {
        email: DataTypes.STRING,
        email_normalized: DataTypes.STRING,
        email_code: DataTypes.STRING,
        email_code_attempts: DataTypes.INTEGER,
        last_attempt_verify_email: DataTypes.DATE,
        email_code_sent: DataTypes.INTEGER,
        email_code_generated: DataTypes.DATE,
        email_code_first_sent: DataTypes.DATE,
    }, {
        freezeTableName: true,
        underscored: true,
        timestamps: false,
    })
);
