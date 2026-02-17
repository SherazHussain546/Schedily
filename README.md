# Schedily - The Future of Professional Social Coordination

**Schedily** is a premium social coordination and scheduling platform engineered for high-performance professional environments. Developed by **Sheraz Hussain** at **SYNC TECH Solutions**, Schedily operates as a social network for productivity, allowing teams to synchronize shifts, meetings, and tasks through a seamless "Tag and Dispatch" ecosystem.

---

### 🛑 PRIVATE REPOSITORY NOTICE
**This repository is the intellectual property of SYNC TECH Solutions.** 
Unauthorized cloning, distribution, or reproduction of this codebase is strictly prohibited. For licensing inquiries, please contact [synctech.ie](https://synctech.ie).

---

## 🏗️ Built & Powered By
- **Company**: [SYNC TECH Solutions](https://synctech.ie)
- **Lead Developer**: [Sheraz Hussain](https://sheraz.synctech.ie)
- **Tech Stack**: Next.js 15, Firebase (Auth/Firestore), Genkit AI, ShadCN UI.

---

## 🚀 Deployment Guide (Netlify)

To host Schedily on Netlify, follow these steps to ensure your secrets are secure:

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Schedily Social Coordination"
git branch -M main
git remote add origin https://github.com/SherazHussain546/Schedily.git
git push -u origin main
```

### 2. Configure Netlify Environment Variables
Once you import the project into Netlify, go to **Site Settings > Environment Variables** and add:
- `GEMINI_API_KEY`: Your Google AI Studio API key.

*Note: Your Firebase public configuration in `src/firebase/config.ts` is bundled automatically. Security is enforced by Firestore Security Rules.*

---

## 🌟 Key Features
- **Social Network Model**: Follow colleagues to build a custom coordination directory.
- **Tag & Dispatch System**: Securely push tasks directly into a teammate's schedule.
- **Smart ICS Engine**: Generates standard Vcalendar files with built-in preparation alarms.
- **Privacy-First Design**: Personal schedules are protected by advanced Firestore Security Rules.

---

## 🔍 SEO & Metadata
- **Keywords**: Professional Scheduling, Retail Shift Management, Social Coordination, Team Productivity, Schedily, ICS Calendar Generator, SYNC TECH Solutions, Sheraz Hussain, Next.js 15, Firebase Scheduling.
- **Description**: Schedily is the premier social coordination hub for professional teams, enabling seamless shift tagging and calendar synchronization.

© 2025 SYNC TECH Solutions. All rights reserved.
