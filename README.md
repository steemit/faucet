# Steem faucet

## Environment Variables

### SMTP Configuration

The following environment variables are required for email sending functionality:

#### Required SMTP Variables

- **`SMTP_HOST`** (required)
  - SMTP server hostname
  - Example: `email-smtp.us-east-1.amazonaws.com` (AWS SES)
  - Example: `smtp.gmail.com` (Gmail)

- **`SMTP_PORT`** (optional, default: `587`)
  - SMTP server port
  - Common values:
    - `587` - STARTTLS (recommended, most common)
    - `465` - Direct SSL/TLS
    - `25` - Unencrypted (not recommended)

- **`SMTP_USER`** (required)
  - SMTP authentication username
  - For AWS SES: IAM user access key ID
  - For Gmail: your email address

- **`SMTP_PASS`** (required)
  - SMTP authentication password
  - For AWS SES: IAM user secret access key
  - For Gmail: app-specific password

- **`SMTP_FROM`** (optional)
  - Email address to use as the sender
  - Defaults to `SMTP_USER` if not set
  - Example: `noreply@example.com`

#### Optional SMTP Variables

- **`SMTP_SECURE`** (optional, auto-detected)
  - Whether to use direct SSL/TLS connection
  - Values: `'true'` / `'1'` for SSL/TLS (port 465), `'false'` / `'0'` for STARTTLS (port 587)
  - If not set, automatically detects based on port:
    - Port `465` → `secure: true` (direct SSL/TLS)
    - Other ports → `secure: false` (STARTTLS)
  - **Note**: Port 587 requires STARTTLS (`secure: false`). If you set `SMTP_SECURE=true` with port 587, it will be automatically overridden.

- **`SMTP_REJECT_UNAUTHORIZED`** (optional, default: `true`)
  - Whether to verify SSL/TLS certificates
  - Values: `'false'` / `'0'` to skip certificate validation, any other value or unset to verify certificates
  - Default: `true` (verify certificates for security)
  - **Security Note**: Only set to `false` for self-signed certificates or internal servers. For production services like AWS SES, Gmail, etc., keep the default `true` to ensure secure connections.

#### SMTP Configuration Examples

**AWS SES (Recommended for Production)**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=YOUR_SMTP_PASSWORD
SMTP_FROM=noreply@example.com
# Optional: SMTP_SECURE is auto-detected (false for port 587)
# Optional: SMTP_REJECT_UNAUTHORIZED defaults to true (verify certificates)
```

**Gmail**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=YOUR_APP_SPECIFIC_PASSWORD
SMTP_FROM=your-email@gmail.com
```

**Internal Server with Self-Signed Certificate**
```bash
SMTP_HOST=smtp.internal.example.com
SMTP_PORT=587
SMTP_USER=internal-user
SMTP_PASS=YOUR_INTERNAL_PASSWORD
SMTP_REJECT_UNAUTHORIZED=false
```

#### Testing SMTP Configuration

You can test your SMTP configuration using the provided test script:

```bash
pnpm run test:smtp
```

This will verify your SMTP connection and display the configuration being used.

### Other Environment Variables

See `.env.example` for a complete list of all environment variables.
