# Kids Banking App 🏦 - Safe, Fun & Scalable Banking for Real Kids

A tablet-friendly financial learning application built for real kids. Supports **50+ concurrent kid profiles**, personalized login & registration, automated **5-minute session inactivity auto-logout**, dual Checking (Wallet) and Savings (Piggy Bank) accounts, and authorized **in-app Parent Credits & Job Bonuses**.

---

## 🌟 What's New in v2.0 (Kids Banking App)

### 1. 🔐 Kid Login & Registration System
- **Real Kid Registration Form**:
  - Kid's First Name and Last Name
  - School Name
  - First and Last Name for Parent / Guardian 1; Parent / Guardian 2 is optional
  - Optional kid email address, stored with the profile for future account-recovery support
  - Date of Birth (DOB)
  - Custom Login User Name (e.g. `lucas8`, `maya`)
  - 4-Digit Security PIN
  - Banking Avatar selection (🦁, 🚀, 🦕, 🦄, 🐼, 🐯, 🦊, ⚽, 🎨, 🌟)
  - **Instant $25 Welcome Account Gift** ($25 Checking / $50 Savings) on registration!
- The optional email is collected for potential future recovery; PIN recovery is not automated yet.
- **Kid Login Form**:
  - Sign in using **Username** + **4-digit PIN**
  - Quick Demo Chips (`leo`, `maya`, `sammy`, `emma4`)
- **Kid Directory Hub**:
  - Pre-seeded with **50+ unique kid accounts** across diverse schools and age groups.
  - Live instant search filter by name, username, school, or parent.

### 2. ⏱️ 5-Minute Inactivity Auto-Logout
- Detects user mouse movements, touches, clicks, scrolling, and keypresses.
- Displays an interactive **Auto-Logout Countdown Timer** (`⏱️ Auto-Logout: 4:52`) in the navigation bar during active sessions.
- Displays a 30-second warning alert with audio cue before timeout.
- Safely ends the session and returns to login view upon 5 minutes of inactivity.
- Dedicated **Log Out** button (`🚪 Log Out`) in header and kid banner for manual sign-out.

### 3. 🎁 In-App Parent Credit & Job Bonus Center
- Parents can reward their child directly inside the child's dashboard view.
- Click **"🎁 Parent Credit / Bonus"** on the child banner:
  - **Monthly Allowance Credits**: Distributed by savings percentage (e.g., 70% Wallet / 30% Piggy Bank).
  - **Job / Chore Bonuses**: Pick from preset chores (Making Bed, Dishes, Reading, Homework, Pet Care) or custom rewards.
  - **Direct Bonus Deposits**: Instant credit to Wallet.
  - Requires **Parent Password / PIN** verification (Default: `9999` or `1234`) to confirm authorization before funds are credited.

---

## 📱 Quick Access Credentials

| Profile | Username | PIN | School | Default Balances |
| :--- | :--- | :--- | :--- | :--- |
| **Leo** 🦁 | `leo` | `1234` | Lincoln Elementary | Wallet: $34.50 \| Piggy: $65.00 |
| **Maya** 🚀 | `maya` | `5678` | Oakridge Academy | Wallet: $48.00 \| Piggy: $115.00 |
| **Sammy** 🦕 | `sammy` | `1111` | Sunrise Middle School | Wallet: $16.50 \| Piggy: $32.00 |
| **Emma** 🦄 | `emma4` | `1548` | Maple Valley School | Wallet: $28.25 \| Piggy: $47.00 |
| **Parent Zone** 🔑 | Admin | `9999` *(or 1234)* | All 50+ Accounts | Master Controls & Audit |

---

## 🚀 Running the App

Run the built-in development server:
```bash
python server.py
```
Open in browser:
👉 **[http://127.0.0.1:8085](http://127.0.0.1:8085)**

*(Or double-click `start_app.bat` to launch on Windows).*

## 🔒 Supabase Guardian Preview

The GitHub Pages build can run in either demo mode (the existing local-storage app)
or Supabase mode. Supabase mode provides guardian sign-up/sign-in and guardian-owned
child profiles. It does not enable child PIN login, banking transactions, or balance
changes. Do not use real children's information until the project configuration and
account flows have been validated with synthetic data.

The existing Supabase project has `users`, `children`, and `transactions` tables.
The reviewed schema showed RLS enabled but no policies, and a legacy
`children.pin` column. The additive migration at
[`supabase/migrations/20261106000000_guardian_access.sql`](./supabase/migrations/20261106000000_guardian_access.sql):

- Adds guardian/child profile fields and transaction display fields without deleting existing rows.
- Adds a confirmed-email guardian-link function and owner-scoped RLS policies.
- Replaces API table-wide grants with column-level grants so app clients cannot read the legacy PIN.
- Does not seed demo data or copy, hash, or otherwise use existing PIN values.

The first migration has been applied. Apply
[`supabase/migrations/20261107000000_create_child_rpc.sql`](./supabase/migrations/20261107000000_create_child_rpc.sql)
through the Supabase SQL Editor before using child-profile creation. It adds a
guardian-authorized RPC that creates a child profile and its welcome ledger entries
atomically, deriving ownership from the signed-in guardian link. The frontend does
not read or write child PINs.

To enable Supabase mode on GitHub Pages:

1. Add the project's **publishable** key as the GitHub repository Actions variable
   `SUPABASE_PUBLISHABLE_KEY` (Settings → Secrets and variables → Actions → Variables).
   A legacy `anon` JWT is also accepted. Never configure a `service_role` or
   `sb_secret_` key.
2. In Supabase Auth URL Configuration, allow the GitHub Pages app URL
   `https://manivask.github.io/kids_bank/` as a redirect URL.
3. Rerun the Pages workflow or push to `main`. Without the variable, the site stays
   in demo mode. With the variable configured, Supabase errors are shown and the
   app does not fall back to local storage.

Money movement remains disabled in this connected preview until dedicated atomic,
guardian-authorized database operations are implemented and tested.
