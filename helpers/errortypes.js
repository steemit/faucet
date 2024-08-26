class ApiError extends Error {
  constructor({
    type = 'error_api_general',
    field = 'general',
    status = 400,
    cause,
  }) {
    super(`${field}:${type}`);
    this.type = type;
    this.field = field;
    this.status = status;
    this.cause = cause;
  }

  toJSON() {
    return { type: this.type, field: this.field };
  }
}

export default ApiError;
