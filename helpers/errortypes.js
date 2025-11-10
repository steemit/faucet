class ApiError extends Error {
    constructor({
        type = 'error_api_general',
        field = 'general',
        status = 400,
        cause,
        data,
    }) {
        super(`${field}:${type}`);
        this.type = type;
        this.field = field;
        this.status = status;
        this.cause = cause;
        this.data = data;
    }

    toJSON() {
        const result = { type: this.type, field: this.field };
        if (this.data !== undefined) {
            result.data = this.data;
        }
        return result;
    }
}

module.exports = {
    ApiError,
};
