# Bolo AI Platform — Production Deployment Guide

This document outlines the step-by-step checklist to deploy the multi-tenant Bolo AI Platform in a secure, scalable production environment.

---

## 1. Recommended Production Architecture

For a robust and cost-effective initial launch:

| Component | Dev Stack | Recommended Production Option | Alternates |
| :--- | :--- | :--- | :--- |
| **Backend Engine** | Docker Local | **AWS App Runner** (automatic TLS, scaling) | Render / Railway / ECS Fargate |
| **Frontend Assets** | Docker Local | **AWS App Runner** (or **Vercel** / **AWS S3 + CloudFront**) | Netlify |
| **Database** | local MongoDB | **MongoDB Atlas** (Shared M0/M10+ Cluster) | Self-hosted EC2 (not recommended) |
| **Redis Cache** | local Redis | **Upstash Redis** (Serverless) | Redis Cloud / AWS ElastiCache |

---

## 2. Infrastructure Setup Walkthrough

### Step 2.1: Database (MongoDB Atlas)
1. Register/Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Shared Cluster (e.g. M0 tier) in your target region.
3. Under **Database Access**, create a user account with read/write privileges.
4. Under **Network Access**, add `0.0.0.0/0` temporarily, or restrict to the specific outbound CIDR IPs of your AWS App Runner instance (recommended).
5. Copy your connection string (looks like `mongodb+srv://<user>:<password>@cluster.mongodb.net/bolo-prod`).

### Step 2.2: Cache (Upstash Redis)
1. Sign up on [Upstash Console](https://console.upstash.com).
2. Create a new Serverless Redis Database.
3. Copy the URL string (looks like `redis://default:<password>@<endpoint>.upstash.io:6379`).

### Step 2.3: AWS Elastic Container Registry (ECR)
Run these commands in your local CLI (configured with AWS privileges) to prepare docker repositories:
```bash
# Log in to ECR
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.<your-region>.amazonaws.com

# Create repos
aws ecr create-repository --repository-name bolo-server --region <your-region>
aws ecr create-repository --repository-name bolo-client --region <your-region>
```

### Step 2.4: Deploy Backend Server to AWS App Runner
1. Open the **AWS App Runner Console** and click **Create Service**.
2. Source: **Container Registry**, Provider: **Amazon ECR**.
3. Select Container Image: Choose `bolo-server:latest`.
4. Deployment settings: **Automatic** (starts deployment whenever GitHub pushes a new tag via CD).
5. Under **Configuration / Variables**, add these required environment variables:

| Variable | Description / Recommended Value |
| :--- | :--- |
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `MONGO_URI` | *Your MongoDB Atlas production connection string* |
| `REDIS_URL` | *Your Upstash Redis connection string* |
| `JWT_SECRET` | *Strong, randomly generated 32-character string* |
| `JWT_REFRESH_SECRET` | *Another strong, randomly generated 32-character string* |
| `ENCRYPTION_KEY` | *Precisely a 32-byte hex key (64 characters) to encrypt Twilio/Meta keys* |
| `CLIENT_URL` | *Production URL of the client front-end* |
| `OPENAI_API_KEY` | *Your production OpenAI API key* |
| `RAZORPAY_KEY_ID` | *Razorpay Production API key ID* |
| `RAZORPAY_KEY_SECRET` | *Razorpay Production API Key Secret* |
| `RAZORPAY_WEBHOOK_SECRET` | *A secure secret string shared with Razorpay webhook settings* |
| `META_APP_SECRET` | *Meta App Dashboard secret to authenticate WhatsApp callbacks* |
| `SUPERADMIN_EMAIL` | *Default superadmin account email address* |
| `SUPERADMIN_PASSWORD` | *Extremely strong password for superadmin* |

6. Review & Launch. App Runner generates a secure `https://<random-id>.<region>.awsapprunner.com` endpoint for your server.

### Step 2.5: Deploy Client Frontend
If deploying the Docker container to App Runner:
1. Select container image: Choose `bolo-client:latest`.
2. Environment Variables:
   - `VITE_API_URL`: Set to the Server App Runner URL (e.g. `https://<server-id>.<region>.awsapprunner.com`).
3. Set Port to `80`. Review & Launch.

---

## 3. Communication Webhook Relays

Once the production URLs are live, you must migrate external webhook links:

### 3.1: Meta WhatsApp Webhook Setup
1. Log in to the [Meta Developer Portal](https://developers.facebook.com).
2. Go to **WhatsApp** -> **Configuration**.
3. In **Callback URL**, input:
   `https://<your-production-server-domain>/api/whatsapp/webhook`
4. Set **Verify Token** to match the verification values defined inside your company config dashboard.
5. Subscribe to `messages` events.

### 3.2: Twilio Voice Webhook Setup
1. Log in to the [Twilio Console](https://console.twilio.com).
2. Go to **Phone Numbers** -> **Active Numbers** and click on your number.
3. Under **Voice & Fax**, look for **A Call Comes In** (Configure to webhook, HTTP POST).
4. Input:
   `https://<your-production-server-domain>/api/voice/incoming-call?companyId=<your-company-mongodb-id>`

---

## 4. Razorpay Payments Live Mode

To handle real currency transactions:
1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Switch from **Test Mode** to **Live Mode** in the bottom left.
3. Go to **Settings** -> **API Keys** and generate live credentials. Update server `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
4. Go to **Settings** -> **Webhooks** and click **Add New Webhook**:
   - Webhook URL: `https://<your-production-server-domain>/api/billing/webhook`
   - Secret: Input a custom secret and update server `RAZORPAY_WEBHOOK_SECRET`.
   - Active Events: Choose `subscription.activated`, `subscription.charged`, `subscription.pending`, and `subscription.halted`.

---

## 5. Pre-Launch Security & Stability Checklist

- [ ] **SSL Enforced**: Verify all client and server connections utilize `https://` protocols.
- [ ] **ENCRYPTION_KEY Backup**: Backup the `ENCRYPTION_KEY` securely. Losing this key prevents the application from decrypting company Twilio and WhatsApp tokens.
- [ ] **MongoDB Atlas IP Access**: Ensure MongoDB Atlas has a restricted IP allowlist rather than `0.0.0.0/0`.
- [ ] **Error Monitoring**: Integrate Sentry inside `server.js` and `App.jsx` for production exception tracking.
- [ ] **Rate Limiting**: Review and adjust values in `express-rate-limit` inside `server.js` to mitigate DDoS issues.

---

## 6. Rollback Plan

If a production release introduces bugs or crashes:

1. Locate the ECR tag of the previous stable build in ECR (e.g. `bolo-server:abcdef` where `abcdef` is the git commit SHA).
2. Pull and re-tag this build as latest, or adjust AWS App Runner configurations directly:
   - Go to App Runner service settings -> **Update image**.
   - Input the previous stable image URI: `<aws-account-id>.dkr.ecr.<your-region>.amazonaws.com/bolo-server:abcdef`.
3. Click **Deploy**. App Runner will route traffic back to the stable build immediately with zero downtime.
