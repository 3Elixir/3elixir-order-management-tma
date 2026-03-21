# Technical Design Specification: Native Telegram Mini App (TMA) Authentication for Strapi

## 1. Objective

To implement a secure, passwordless authentication flow between a Telegram Mini App and Strapi. This approach replaces the insecure "shared password" workaround with a native cryptographic validation flow, enabling automatic user registration and seamless integration with Strapi's Role-Based Access Control (RBAC).

## 2. Architecture Overview

The Next.js frontend will pass the raw Telegram payload (`initDataRaw`) directly to a new custom Strapi endpoint. Strapi will act as the source of truth: validating the payload, performing a "find-or-create" operation on the user, and issuing a native Strapi JWT.

### 2.1 Authentication Sequence

1. **Frontend (TMA):** Retrieves `initDataRaw` from the Telegram SDK.
2. **Middleware (Next.js tRPC):** Forwards `initDataRaw` directly to Strapi.
3. **Backend (Strapi):**
   - Cryptographically validates `initDataRaw` using the `TELEGRAM_BOT_TOKEN`.
   - Checks the timestamp to prevent replay attacks.
   - Extracts the `telegram_id` and user profile data.
   - **Queries DB:** Looks for an existing user with this `telegram_id`.
   - **If User Exists:** Generates and returns a Strapi JWT.
   - **If User Missing:** Auto-creates a new user record (Provider: `telegram`), assigns default Role, generates and returns a Strapi JWT.

---

## 3. Strapi Backend Implementation Requirements

### 3.1 Database / Schema Changes

The default Strapi `Users-Permissions` plugin user model must be extended to support Telegram identities.

- **Target Model:** `plugin::users-permissions.user`
- **New Field:** Add `telegram_id`
  - **Type:** String
  - **Attributes:** Unique, Private (optional but recommended)

### 3.2 Environment Variables

Strapi must have access to the Telegram Bot Token to perform the HMAC-SHA256 cryptographic validation.

- `TELEGRAM_BOT_TOKEN="your_bot_token_here"`

### 3.3 New API Route & Controller

A new custom route must be created within the Strapi application.

- **Method:** `POST`
- **Path:** `/api/auth/telegram/login` (or similar)
- **Permissions:** This endpoint must be accessible to the `Public` role in Strapi's RBAC settings.

#### Controller Logic (Implementation Guide):

The backend team will need to create a custom controller. Here is the exact logic flow required:

```javascript
const { validate, parse } = require('@tma.js/init-data-node');

module.exports = {
  async telegramLogin(ctx) {
    const { initDataRaw } = ctx.request.body;

    if (!initDataRaw) {
      return ctx.badRequest('initDataRaw is required');
    }

    try {
      // 1. Cryptographic Validation
      // Throws error if signature is invalid or data is tampered with
      // IMPORTANT: Add an expiration threshold (e.g., 86400 seconds / 24 hours)
      validate(initDataRaw, process.env.TELEGRAM_BOT_TOKEN, { expiresIn: 86400 });

      // 2. Parse Validated Data
      const tmaData = parse(initDataRaw);
      const telegramUser = tmaData.user;

      if (!telegramUser || !telegramUser.id) {
        return ctx.badRequest('Invalid Telegram user data');
      }

      const telegramIdStr = telegramUser.id.toString();

      // 3. Find or Create User
      let user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { telegram_id: telegramIdStr },
      });

      if (!user) {
        // Auto-Registration Flow
        const defaultRole = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { type: 'authenticated' },
        });

        // Create new user securely (No password required)
        user = await strapi.entityService.create('plugin::users-permissions.user', {
          data: {
            username: telegramUser.username || `tg_${telegramIdStr}`,
            email: `${telegramIdStr}@telegram.local`, // Dummy email to satisfy Strapi constraints
            provider: 'telegram',
            telegram_id: telegramIdStr,
            role: defaultRole.id,
            confirmed: true,
            blocked: false,
          },
        });
      }

      // 4. Issue Native Strapi JWT
      const jwtService = strapi.plugin('users-permissions').service('jwt');
      const token = jwtService.issue({ id: user.id });

      // 5. Sanitize and Return
      const sanitizedUser = await strapi.plugin('users-permissions').service('user').sanitizeOutput(user, ctx);

      return ctx.send({
        jwt: token,
        user: sanitizedUser,
      });

    } catch (error) {
      strapi.log.error('Telegram Auth Error:', error);
      return ctx.unauthorized('Invalid Telegram authentication data');
    }
  }
};
```

---

## 4. Security & Edge Case Considerations

### 4.1 Replay Attacks (Crucial)

The validation function **must** check the `auth_date` timestamp against the current server time and reject payloads older than a reasonable threshold (e.g., 24 hours). Without this, a leaked `initDataRaw` string grants permanent access.

### 4.2 Dummy Emails

Strapi's default `Users-Permissions` plugin strictly requires a unique `email` field. Since Telegram does not always provide an email, the backend must generate a deterministic dummy email (e.g., `<telegram_id>@telegram.local`) during auto-registration to satisfy database constraints.

### 4.3 Provider Field

Ensure the `provider` field on the user model is set to `'telegram'` (or similar) rather than `'local'`. This signals that this user does not use a standard password for authentication.

## 5. Next.js Integration (Brief)

Once the Strapi endpoint is live, the Next.js backend will simply forward the `initDataRaw` string directly to the new `/api/auth/telegram/login` endpoint and pass the resulting JWT to the frontend. No validation, `@tma.js` dependencies, or password management will be needed in the Next.js layer.
