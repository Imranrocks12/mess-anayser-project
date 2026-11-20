# MessMate 🍽️
> Smart Mess Billing, Food Entry & Reconciliation Engine

MessMate is a comprehensive web application designed for hostel, shared apartment, and community mess management. It streamlines daily food consumption tracking, automates bill import from WhatsApp and receipts, and provides item-wise reconciliation against in-charge mess bills.

---

## ✨ Features

- **Daily Food Entry**: Quick itemized meal recording (Breakfast, Lunch, Dinner) across all active mess members with copy-from-yesterday draft capabilities.
- **Member Management**: Track active members, join dates, and individual dues with customizable profiles.
- **Menu & Pricing**: Configurable food items and unit pricing with automatic rate history synchronization.
- **Mess Bill Import (WhatsApp / OCR)**:
  - Paste WhatsApp bill messages for automatic parsing into itemized line totals.
  - OCR support for scanned/photographed mess receipts.
  - Live arithmetic discrepancy detection to ensure line items always match the reported grand total.
- **Reconciliation Engine**:
  - Compares daily recorded food ledger items directly against mess in-charge bill line items.
  - Instant discrepancy audit alerts with clear mismatch identification.
  - Weekly period navigation arrows and one-click `(Current Week)` quick jump.
- **WhatsApp Bill Summary**:
  - One-click generated WhatsApp summary containing period dates, status, meal-wise subtotals, and individual member dues.
  - Direct clipboard copy and WhatsApp Web share links.
- **Export & Document Centre**:
  - Comprehensive PDF bill generation with itemized statements for each member.
  - Multi-sheet Excel exports with styled audit summaries and formulas.
- **Cloud Synchronization & Auth**:
  - Multi-device login and cross-device sync powered by Firebase Firestore.
  - Confirmation prompts on cloud push and pull to prevent accidental overwrites.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Generation**: jsPDF + jspdf-autotable
- **Spreadsheet Export**: ExcelJS
- **OCR Engine**: Tesseract.js
- **Cloud Backend**: Firebase (Firestore & Auth)
- **Deployment**: Netlify

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Imranrocks12/mess-anayser-project.git
   cd mess-anayser-project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## 📄 License
Private project developed by Imran.
