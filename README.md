
# Schedily - Professional Social Coordination

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

## 🛡️ Security & Privacy
Schedily is built with a "Security by Design" philosophy. 
- **Firebase Config**: The public configuration in `src/firebase/config.ts` is safe to remain in the code. In Firebase, client-side security is enforced by **Firestore Security Rules**, not by hiding API keys.
- **Private Secrets**: Sensitive keys like `GEMINI_API_KEY` are managed via environment variables and are excluded from version control via `.gitignore`.
- **Data Protection**: All personal schedules and team communications are protected by role-based access control.

---

## 🚀 Deployment Guide (Netlify)

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

---

## 🌟 Key Features
- **Social Coordination Hub**: Tag colleagues instantly to build a custom coordination directory.
- **Professional Groups**: Create team circles with shared schedules and real-time chat.
- **Bulk Sync Engine**: Generate a single `.ics` file for your entire professional schedule.
- **Real-Time Interaction**: Built-in group knowledge sharing and team discussions.

© 2025 SYNC TECH Solutions. All rights reserved.
