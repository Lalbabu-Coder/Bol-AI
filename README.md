# Bolo AI Platform - Multi-Tenant MERN Scaffold

This is a production-grade, multi-tenant MERN stack (MongoDB, Express, React, Node.js) project scaffold named **bolo-ai-platform**. It features secure logical tenant isolation, JWT-based authentication (in-memory access tokens and HttpOnly secure cookie refresh tokens), and a responsive glassmorphic React client built with Vite and Tailwind CSS.

---

## 🏗️ Architecture Design

### Logical Tenant Scoping (Multi-Tenancy)
Rather than manually passing `companyId` parameters to every query function, the backend utilizes Node.js's native `AsyncLocalStorage` inside `utils/tenantContext.js`. 
1. The authentication middleware (`protect`) extracts `companyId` from the verified access token.
2. It runs downstream Express routes within the tenant context.
3. A reusable Mongoose plugin `tenantPlugin` intercepts all data validation (`pre('validate')`), querying (`find`, `findOne`, `countDocuments`, `update`, `delete`, etc.), and aggregation pipelines (`pre('aggregate')`) to automatically inject and scope operations by the company ID.

### Authentication & Sessions
- **Access Tokens**: Short-lived (15 minutes), returned in response bodies, and cached in-memory on the frontend to defend against Cross-Site Scripting (XSS).
- **Refresh Tokens**: Long-lived (7 days), stored in secure `HttpOnly`, `SameSite=Strict` cookies restricted to the `/api/auth` path.
- **Silent Refresh**: The frontend Axios client includes response interceptors that catch `401 Unauthorized` token expiry states, request a token refresh silently, queue concurrent requests, and retry them seamlessly.

---

## 📂 Project Structure

```
bolo-ai-platform/
├── README.md                 # Project Documentation
├── server/                   # Backend Application (Node.js + Express)
│   ├── package.json          # Dependencies & Scripts
│   ├── server.js             # Main server entry point
│   ├── .env.example          # Environment Template
│   ├── config/
│   │   ├── config.js         # Settings Loader & Validator
│   │   └── db.js             # MongoDB connection retry loader
│   ├── models/
│   │   ├── Company.js        # Company Model (Tenant Root)
│   │   ├── User.js           # User Model (Tenant Scoped)
│   │   └── plugins/
│   │       └── tenantPlugin.js # Reusable Multi-Tenancy Engine
│   ├── middleware/
│   │   ├── auth.js           # Protect & Role Verification
│   │   └── error.js          # Centralized Global Error Handler
│   ├── controllers/
│   │   └── authController.js # Signup, Login, Refresh, Logout Controllers
│   ├── routes/
│   │   ├── authRoutes.js     # Auth Router
│   │   └── healthRoutes.js   # Health & DB State Router
│   └── utils/
│       ├── asyncHandler.js   # Async Controller Wrapper
│       ├── errors.js         # Standard Operational Error Classes
│       └── tenantContext.js  # AsyncLocalStorage Context Manager
│
└── client/                   # Frontend Application (React + Vite)
    ├── package.json          # Frontend Dependencies
    ├── vite.config.js        # Vite & API proxy config
    ├── tailwind.config.js    # Tailwind v3 Style configs
    ├── postcss.config.js     # PostCSS Loader
    ├── index.html            # Main markup template (Outfit Font)
    ├── .env.example          # Client Env Template
    └── src/
        ├── main.jsx          # React DOM Mounting loader
        ├── App.jsx           # Main Router definitions
        ├── index.css         # Tailwind & Custom Glassmorphism styles
        ├── api/
        │   └── axios.js      # Custom Axios client with silent refresh queue
        ├── context/
        │   └── AuthContext.jsx # Authentication state provider
        ├── hooks/
        │   └── useAuth.js    # Shortcut Hook
        ├── components/
        │   └── ProtectedRoute.jsx # Route Guard for private views
        └── pages/
            ├── Login.jsx     # Dark glassmorphism Login Page
            ├── Register.jsx  # Dark glassmorphism Registration Page
            └── Dashboard.jsx # Protected multi-tenant dashboard
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **MongoDB**: An active local instance (running on port `27017`) or a MongoDB Atlas connection string.

### 2. Backend Installation & Start
1. Navigate to the backend directory:
   ```bash
   cd server
   ```
2. Setup your local configuration file:
   ```bash
   copy .env.example .env
   ```
3. Open `.env` and set your preferred settings:
   - `MONGO_URI`: Set your connection string.
   - `JWT_SECRET` and `JWT_REFRESH_SECRET`: Choose long, secure, randomized strings.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the server in development mode (with hot reloading):
   ```bash
   npm run dev
   ```
   *The backend will initialize and listen on http://localhost:5000.*

### 3. Frontend Installation & Start
1. Navigate to the frontend directory:
   ```bash
   cd ../client
   ```
2. Setup configuration variables:
   ```bash
   copy .env.example .env
   ```
   *(By default, `VITE_API_URL` is left empty in local development to automatically leverage Vite's local dev server proxy configured in `vite.config.js` to redirect `/api/*` to `http://localhost:5000`).*
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the frontend:
   ```bash
   npm run dev
   ```
   *The Vite client will launch and serve on http://localhost:5173.*

### 4. Local Testing & Webhooks Tunneling (ngrok)
For external channels like Meta WhatsApp and Twilio Voice to communicate with your local server, you must expose port 5000 using a secure tunnel:
1. Install ngrok globally or download the binary:
   ```bash
   npm install -g ngrok
   ```
2. Start a secure HTTP/WebSocket tunnel pointing to port 5000:
   ```bash
   ngrok http 5000
   ```
3. Copy the generated HTTPS forwarding address (e.g., `https://xxxx.ngrok-free.app`).
4. Paste the forwarding address into the dashboard **Channels** panel to get custom webhook callbacks:
   - **WhatsApp callback**: `https://xxxx.ngrok-free.app/api/whatsapp/webhook`
   - **Twilio Voice callback**: `https://xxxx.ngrok-free.app/api/voice/incoming-call?companyId=<your_company_id>`
5. Register these callback endpoints in your Twilio / Meta Developer console to start voice agent calls or WhatsApp message flows!

### 5. Email Inbox Channel Setup (IMAP + SMTP)
> ⚠️ **CRITICAL REQUIREMENT**: The Email Channel MUST be connected exclusively to a **dedicated customer support inbox** (e.g. `support@yourcompany.com` or `help@yourcompany.com`).
> **DO NOT** connect a personal or general-purpose inbox that receives newsletters, marketing emails, job alerts, or personal correspondence, as doing so may cause automated AI replies to be sent to non-customer senders.

---

## 🔒 API Specifications

### Core Auth Endpoints
| HTTP Method | Route | Description | Auth Scope |
|---|---|---|---|
| **POST** | `/api/auth/register` | Creates a new Company and User (role: `owner`) | Public |
| **POST** | `/api/auth/login` | Verifies login details, returns access token, sets HttpOnly refresh cookie | Public |
| **POST** | `/api/auth/refresh` | Checks refresh cookie, returns a new access token + user context | Public (reads cookie) |
| **POST** | `/api/auth/logout` | Clears refresh cookie | Public |

### System Status
| HTTP Method | Route | Description | Auth Scope |
|---|---|---|---|
| **GET** | `/health` | Evaluates Node Server state and active MongoDB connectivity status | Public |

---

## 🛡️ Security Hardening Details

### 1. Secrets Cryptography (AES-256-GCM)
Sensitive credentials (such as `Company.whatsappConfig.accessToken` and `Company.voiceConfig.twilioAuthToken`) are automatically encrypted in transit and at rest in MongoDB. 
- Encryption leverages Node.js's native `crypto` module.
- Generates a unique 12-byte initialization vector (IV) per encrypt, generating a 16-byte authentication tag for data integrity.
- **Migration**: To encrypt pre-existing plaintext tokens in place:
  ```bash
  cd server
  node scripts/encryptExistingSecrets.js
  ```

### 2. Lockout Policies & Rate Limiting
- **Auth Limiters**: The `/register` and `/login` routes have a dedicated rate limiter enforcing a maximum of 5 attempts per 15 minutes per IP.
- **Account Lockouts**: If a user attempts incorrect login combinations 5 times consecutively, their account is locked for 15 minutes.
- **Strict Password Validation**: Registration requires passwords to contain at least 8 characters, with at least one letter and one number.

### 3. Webhook Authentication (Signature Verification)
- **Twilio**: The server checks the `X-Twilio-Signature` header to ensure incoming call callbacks originate from Twilio.
- **Meta / WhatsApp**: The server verifies payload integrity using the `X-Hub-Signature-256` header (HMAC-SHA256 signature calculated from the raw payload buffer using the `META_APP_SECRET`).

### 5. AI Provider Configuration (Google Gemini & OpenAI)
The platform supports modular AI provider selection via the `AI_PROVIDER` environment variable:
- **`AI_PROVIDER=gemini`** (Default): Uses Google Generative AI SDK (`@google/generative-ai`) for embeddings (`text-embedding-004`, 768 dimensions) and completions (`gemini-1.5-flash`). Free API keys are available at [Google AI Studio](https://aistudio.google.com) without a credit card.
- **`AI_PROVIDER=openai`**: Uses OpenAI API for embeddings (`text-embedding-3-small`, 1536 dimensions) and completions (`gpt-4o-mini`).

To switch providers:
1. Update `AI_PROVIDER` in `server/.env` to `gemini` or `openai`.
2. Provide the corresponding API key (`GEMINI_API_KEY` or `OPENAI_API_KEY`).
3. **Note on Embeddings**: Gemini `text-embedding-004` produces 768-dimensional vectors while OpenAI produces 1536-dimensional vectors. When switching `AI_PROVIDER`, previously-indexed Knowledge Base documents must be purged and re-indexed.

### 6. Dependency Security Audit Notes
- **`esbuild` / `vite` (Dev-only dependencies)**: Moderate severity advisories regarding dev server port binding / local request handling (GHSA-67mh-4wv8-2f99) are present in devDependencies. These affect only the local development server during active local dev sessions and do not impact production builds or production runtime security. Therefore, updating to breaking major versions (Vite 8) is considered low priority and kept as-is.

# Bol-AI

