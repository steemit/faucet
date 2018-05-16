/** Type interface for the Signup model (aka "User" in old faucet-admin). */
export interface SignupModel {
  id: number
  email: string
  email_is_verified: boolean
  last_attempt_verify_email: string // date
  phone_number: number
  phone_number_is_verified: boolean
  phone_code_attempts: number
  phone_code: number
  last_attempt_verify_phone_number: string
  ip: string
  account_is_created: boolean
  fingerprint: { [key: string]: string }
  status: string
  username: string
  username_booked_at: string // date
  metadata: { [key: string]: any }
  creation_hash: string
  created_at: string // date
  updated_at: string // date
  review_note: string
}
