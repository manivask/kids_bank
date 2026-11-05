# KidsBank 🏦 - Tablet-Friendly Kids Financial Learning & Bank App

KidsBank is a clean, compact, tablet-optimized progressive web application designed to teach children positive money habits through hands-on banking. It provides dual **Child Mode** and **Parent Zone** interfaces with 4-digit PIN authentication, real-time checking and savings balances, goal tracking, child-entered spending, scheduled allowances, and parent-awarded chore bonuses.

---

## ✨ Key Features

### 👧 Child Mode
- **4-Digit PIN Security**: Touchscreen-friendly numeric keypad for individual child profile login.
- **Dual Accounts**:
  - 👛 **My Wallet (Checking)**: Daily spending money for snacks, toys, outings, and treats.
  - 🐷 **Piggy Bank (Savings)**: Long-term savings with an animated **Savings Goal Meter** (e.g., saving for a LEGO set or video game).
- **Child-Entered Spending**:
  - Categorized spending (🧸 Toys, 🍦 Snacks, 📚 Books, 🎮 Games, 🎟️ Outings, 🎁 Gifts).
  - Quick amount buttons (`+$1.00`, `+$2.00`, `+$5.00`, `+$10.00`) and custom amounts.
  - Built-in validation prevents overspending beyond account balance.
- **Money Transfers**: Quick transfer between Wallet and Piggy Bank.
- **Interactive History**: Filter transactions by All, Spending, Allowance, Chores, or Transfers.
- **Delightful Feedback**: Synthesized Web Audio API sound effects (coin dings, fanfare, tactile clicks) and confetti celebration bursts.

### 👨‍👩‍👧 Parent Zone (Protected by Parent PIN: `9999`)
- **Children Overview**: View all child balances, account statuses, and allowance rules.
- **1-Click Allowance Payout**: Automatically calculates and distributes checking/savings splits (e.g., 70% Wallet / 30% Savings).
- **Chore & Activity Bonus Center**: Award bonuses from preset chores (Making Bed, Reading, Pet Care, Kindness) or create custom rewards on the fly.
- **Master Transaction Audit**: Comprehensive transaction log across all kids with 1-click **Undo / Delete** to revert mistakes and restore balances.
- **Data Portability**: Full JSON export and import for backups and device syncing.

---

## 📱 Tablet-Friendly UX & Accessibility

- **Touch Target Sizing**: All interactive buttons meet or exceed the recommended 48×48px touch boundary for comfortable tablet use (iPad, Android tablets).
- **On-Screen Keypads**: Dedicated on-screen numeric keypads for both PIN authentication and amount entries, alongside hardware keyboard support.
- **Responsive Layout**: Adapts seamlessly between portrait tablet, landscape tablet, phone, and desktop screens.
- **Zero Audio Assets**: Sound effects are generated entirely in real-time via the browser's native **Web Audio API**—no missing audio files, external network requests, or lag.

---

## 🏗️ Architecture & Cloud Migration Ready

KidsBank uses a modular **Repository + Storage Adapter** architecture (`js/data-store.js`):

```
                   ┌───────────────────────────────┐
                   │    KidsBankDataStore (API)    │
                   └──────────────┬────────────────┘
                                  │
          ┌───────────────────────┴───────────────────────┐
          │                                               │
┌───────────────────────┐                     ┌──────────────────────────────┐
│  LocalStorageAdapter  │ (Current)           │     CloudStorageAdapter      │ (Next Phase)
│ - Offline First       │                     │ - Cloudflare Workers / KV / D1
│ - Seed JSON Fallback  │                     │ - Firebase Firestore SDK     │
└───────────────────────┘                     └──────────────────────────────┘
```

To migrate to **Cloudflare** or **Firebase**:
1. Implement the `CloudStorageAdapter` interface (`load()`, `save()`, `reset()`) in `js/data-store.js`.
2. Instantiate `KidsBankDataStore(new CloudStorageAdapter())`.
3. All UI components, validation logic, sound engines, and modals continue running without modification.

---

## 🚀 Quick Start & How to Run

### Option 1: Python Server (Recommended)
Run the lightweight built-in server:
```bash
python server.py
```
Open your browser to:
[http://127.0.0.1:8085](http://127.0.0.1:8085)

### Option 2: Windows Batch Launcher
Double-click `start_app.bat` to launch the server and automatically open the application in your default browser.

### Option 3: Direct File
Open `index.html` directly in any modern browser.

---

## 🔑 Default Demo Credentials

| Role | Profile | Default PIN | Initial Balances |
| :--- | :--- | :--- | :--- |
| **Child** | Leo 🦁 | `1234` | Wallet: $34.50 \| Piggy: $65.00 |
| **Child** | Maya 🚀 | `5678` | Wallet: $48.00 \| Piggy: $115.00 |
| **Child** | Sammy 🦕 | `1111` | Wallet: $16.50 \| Piggy: $32.00 |
| **Parent** | Parent Zone 🔑 | `9999` | Full Administrative Controls |

---

## 📂 Project Directory Structure

```
apps/kids_bank/
├── css/
│   └── styles.css          # Responsive tablet CSS design system
├── data/
│   └── initial-data.json   # Seed accounts, chores, categories & transactions
├── js/
│   ├── app.js              # UI controller, events, views, modal logic
│   ├── confetti.js         # Canvas particle burst engine
│   ├── data-store.js       # Modular Data Store & Storage Adapters
│   └── sound-fx.js         # Web Audio API sound synthesizer
├── .gitignore              # Ignores local temp files & cache
├── index.html              # Tablet single-page application entry point
├── README.md               # Documentation & architecture guide
├── server.py               # Zero-dependency local development server
└── start_app.bat           # 1-click Windows launcher
```

