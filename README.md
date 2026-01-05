# Steem Faucet

A web application for Steem account registration and management.

## Prerequisites

- Node.js >= 20
- pnpm (package manager)
- MySQL database
- SMTP server (for email sending)
- Twilio account (for SMS verification, Deprecated)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/steemit/faucet.git
cd faucet
```

2. Install dependencies:
```bash
pnpm install
```

## Database Setup

### Initialize Database

Set up and run migrations using Sequelize CLI:

```bash
pnpm run db:migrate
```

The migration command uses the `DATABASE_URL` environment variable from your `.env` file.

**Note**: If your local database server does not support SSL, you can modify the `ssl` option in `db/config/config.json` to set `rejectUnauthorized: false` for the `local` environment.

### Seed Database

To seed the database with initial data:

```bash
env $(tr "\\n" " " < .env) sequelize-cli db:seed:all --config db/config/config.json --migrations-path db/migrations --seeders-path db/seeders --models-path db/models
```

Seed data can be added at: `db/seeders/`

### Reset Database

To start fresh (⚠️ **Warning**: This will delete all data):

```bash
env $(tr "\\n" " " < .env) sequelize-cli db:migrate:undo:all --config db/config/config.json --migrations-path db/migrations --seeders-path db/seeders --models-path db/models
```

#### Example One-liner

Reset and reinitialize the database:

```bash
env $(tr "\\n" " " < .env) sequelize-cli db:migrate:undo:all --config db/config/config.json --migrations-path db/migrations --seeders-path db/seeders --models-path db/models && pnpm run db:migrate && env $(tr "\\n" " " < .env) sequelize-cli db:seed:all --config db/config/config.json --migrations-path db/migrations --seeders-path db/seeders --models-path db/models
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your configuration values. See [Environment Variables](#environment-variables) section below for details.

## Environment Variables

### Database Configuration

- **`DATABASE_URL`** (required)
  - MySQL connection string
  - Format: `mysql://username:password@hostname:port/database`
  - Example: `mysql://root:password@localhost:3306/faucet`

- **`DATABASE_EXPIRY`** (optional, default: `60`)
  - Number of days to keep database records before cleanup
  - Used for automatic cleanup of old actions and users

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

### Steem/Blockchain Configuration

- **`STEEMJS_URL`** (required)
  - Steem RPC node URL
  - Example: `https://api.steemit.com`

- **`CONVEYOR_POSTING_WIF`** (required)
  - Private posting key for conveyor account

- **`CONVEYOR_USERNAME`** (required)
  - Conveyor account username

- **`CREATE_USER_SECRET`** (required)
  - Secret key for create user API

- **`CREATE_USER_URL`** (required)
  - URL for create user API endpoint
  - Example: `https://steemit.com/api/create_user`

### Application Configuration

- **`PORT`** (optional, default: `3001`)
  - Port number for the HTTP server

- **`NODE_ENV`** (optional, default: `development`)
  - Environment mode: `development`, `production`, or `staging`

- **`LOG_LEVEL`** (optional, default: `info`)
  - Logging level: `debug`, `info`, `warn`, `error`

- **`JWT_SECRET`** (required)
  - Secret key for JWT token signing

- **`DEFAULT_REDIRECT_URI`** (required)
  - Default redirect URI after account creation
  - Example: `https://steemit.com/login.html#account={{username}}`

### Client-Side Configuration

These variables are exposed to the client-side React application:

- **`TURNSTILE_SWITCH`** (required)
  - Enable/disable Cloudflare Turnstile captcha
  - Values: `ON` or `OFF`

- **`TURNSTILE_SITE_KEY`** (required)
  - Cloudflare Turnstile site key

- **`TURNSTILE_SECRET`** (required)
  - Cloudflare Turnstile secret key (server-side only)

- **`REACT_DISABLE_ACCOUNT_CREATION`** (required)
  - Disable account creation in UI
  - Values: `true` or `false`

- **`PENDING_CLAIMED_ACCOUNTS_THRESHOLD`** (required)
  - Threshold for pending claimed accounts
  - Default: `100`

- **`CREATOR_INFO`** (required)
  - Creator account information (pipe-separated)
  - Example: `steem|steemcurator01|steemcurator02`

- **`GOOGLE_ANALYTICS_ID`** (optional)
  - Google Analytics tracking ID

### Newsletter Configuration

- **`NEWSLETTER_URL`** (required)
  - Newsletter subscription API URL
  - Example: `https://newsletter.example.com/api/subscribe`

- **`NEWSLETTER_LIST`** (required)
  - Newsletter list identifier
  - Example: `steem-faucet-users`

### Other Configuration

- **`DEBUG_MODE`** (optional)
  - Enable debug mode (mocks external services)
  - Set to any value to enable

## Running the Application

### Development Mode

Build the frontend and start the development server:

```bash
pnpm run build-dev
pnpm run start-dev
```

Or use the one-liner:

```bash
env $(tr "\\n" " " < .env) pnpm run start-dev
```

The development server includes:
- Hot module replacement (HMR)
- Webpack dev middleware
- Automatic rebuilds on file changes
- Pretty-printed logs with `pino-pretty`

### Production Mode

1. Build the frontend:
```bash
pnpm run build
```

2. Start the server:
```bash
NODE_ENV=production pnpm start
```

## Docker

A Dockerfile is provided for containerized deployment.

### Building the Docker Image

```bash
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
docker build -t="$USER/faucet:$BRANCH" .
```

### Running the Docker Container

```bash
docker run -it -p 3000:3001 --env-file=.env "$USER/faucet:$BRANCH"
```

**Note**: The Dockerfile exposes port 3001 internally, but you can map it to any external port (e.g., 3000) using the `-p` flag.

**Important**: When running the Docker image locally, you may need to bind your MySQL server to not only localhost but also the IP used in Docker's network. You can then specify this IP in `DATABASE_URL`.

## Testing

The test suite includes linting, unit tests, and integration tests:

```bash
pnpm test
```

This command runs:
1. ESLint static analysis (`pnpm run lint`)
2. Jest unit and integration tests (`pnpm run jest`)

**Note**: You need to supply dummy values for required environment variables. Use the `.env.example` file:

```bash
env $(grep -v '^#' .env.example | grep -v '^$' | tr "\\n" " ") pnpm test
```

### Individual Test Commands

- Run linting only:
```bash
pnpm run lint
```

- Run tests only:
```bash
pnpm run jest
```

- Fix linting issues automatically:
```bash
pnpm run lint-fix
```

## Debugging

### VSCode Configuration

Add the following to `.vscode/launch.json` in the `configurations` array:

```json
{
  "type": "node",
  "request": "launch",
  "name": "nodemon",
  "runtimeExecutable": "${workspaceRoot}/node_modules/nodemon/bin/nodemon.js",
  "program": "${workspaceFolder}/bin/www",
  "restart": true,
  "sourceMaps": true,
  "outFiles": [],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen",
  "args": [
    "--ignore",
    "src",
    "|",
    "bunyan",
    "-o",
    "short"
  ],
  "envFile": "${workspaceFolder}/.env"
}
```

## Project Structure

```
faucet/
├── bin/              # Server entry point
├── db/               # Database models, migrations, seeders
│   ├── config/       # Sequelize configuration
│   ├── migrations/   # Database migrations
│   ├── models/       # Sequelize models
│   └── seeders/      # Database seeders
├── helpers/          # Utility functions and helpers
├── public/           # Static assets (CSS, images, etc.)
├── routes/           # Express routes
├── src/              # React frontend source code
│   ├── components/   # React components
│   ├── containers/   # React containers
│   ├── features/     # Feature modules
│   ├── locales/      # i18n translation files
│   └── utils/        # Frontend utilities
├── views/            # Handlebars templates
├── webpack/          # Webpack configuration
└── app.js            # Express application setup
```

## Features

- User account registration with email/SMS verification
- Cloudflare Turnstile captcha integration
- IP-based geolocation using MaxMind GeoIP2
- Automatic database cleanup of old records
- Integration with Steem blockchain for account creation
- Newsletter subscription support
- Activity tracking and analytics
- Multi-language support (i18n)

## License

MIT

## Support

For issues and questions, please visit: https://github.com/steemit/faucet/issues
