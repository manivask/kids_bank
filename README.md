# Kids Banking App 🏦 - Safe, Fun & Scalable Banking for Real Kids

A tablet-friendly financial learning application built for real kids. Supports **50+ concurrent kid profiles**, personalized login & registration, automated **5-minute session inactivity auto-logout**, dual Checking (Wallet) and Savings (Piggy Bank) accounts, and authorized **in-app Parent Credits & Job Bonuses**.

---

## 🌟 What's New in v2.0 (Kids Banking App)

### 1. 🔐 Kid Login & Registration System
- **Real Kid Registration Form**:
  - Kid's Full Name
  - School Name
  - Parent / Guardian Name
  - Date of Birth (DOB)
  - Custom Login User Name (e.g. `lucas8`, `maya`)
  - 4-Digit Security PIN
  - Banking Avatar selection (🦁, 🚀, 🦕, 🦄, 🐼, 🐯, 🦊, ⚽, 🎨, 🌟)
  - **Instant $25 Welcome Account Gift** ($25 Checking / $50 Savings) on registration!
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
