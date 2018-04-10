export interface User {
    email: string,
    email_is_verified: boolean,
    last_attempt_verify_email: Date,
    phone_number: string,
    phone_number_is_verified: boolean,
    phone_code_attempts: number,
    phone_code: string,
    last_attempt_verify_phone_number: Date,
    ip: string,
    account_is_created: boolean,
    fingerprint: JSON,
    status: string,
    username: string,
    username_booked_at: Date,
    // TODO: what is in metadata?
    // metadata: JSON,
    creation_hash: string,
}

export type Users = User[]

export interface Request {
    id: string,
    params: object,
    response: object | null,
}

export interface RequestError {
    message: string,
    code: string,
}

export type Requests = Request[]

export type RequestIds = String[]