
# Schedily - Professional Social Coordination

Schedily is a modern professional networking and scheduling platform built with Next.js, Firebase, and Genkit.

## 🚀 GitHub Deployment

Follow these commands to push your project to your repository:

```bash
git init
git add .
git commit -m "Initial commit: Schedily Social Coordination Platform"
git branch -M main
git remote add origin https://github.com/SherazHussain546/Schedily.git
git push -u origin main
```

## 🌐 Netlify Hosting

1. **Connect to GitHub**: Log in to [Netlify](https://www.netlify.com/) and click **"Add new site"** > **"Import an existing project"**.
2. **Authorize**: Select GitHub and find your **Schedily** repository.
3. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish directory**: `.next`
4. **Environment Variables**: If you add AI features later, add your `GEMINI_API_KEY` in the Netlify site settings under **Environment variables**.
5. **Deploy**: Click **"Deploy Schedily"**.

## 🛡️ Security Note

- **Public Config**: Firebase configuration in `src/firebase/config.ts` is public by design. 
- **Database Safety**: All data is protected by **Firestore Security Rules** located in `firestore.rules`. These rules ensure users can only modify their own data.
- **Secrets**: Your `.env` file is ignored by git to prevent accidental exposure of private keys.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Firestore
- **Authentication**: Firebase Auth
- **Styling**: Tailwind CSS + ShadCN UI
- **AI**: Genkit
