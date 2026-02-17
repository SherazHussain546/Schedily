# Schedily - Professional Social Coordination

Schedily is a modern professional networking and scheduling platform built with Next.js, Firebase, and Genkit.

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up environment variables**:
   - Copy `.env.example` to `.env.local`.
   - Add your `GEMINI_API_KEY` if using GenAI features.
4. **Run development server**: `npm run dev`

## 🛡️ Security & Environment Variables

- **Public Config**: The Firebase configuration in `src/firebase/config.ts` is public by design. Firebase security is enforced by **Firestore Security Rules**, not by hiding these keys.
- **Server Secrets**: Any `GEMINI_API_KEY` used for AI flows must be kept in `.env.local` and never committed to version control.
- **.gitignore**: We have included a `.gitignore` to prevent sensitive files like `node_modules`, `.next`, and `.env` from being uploaded to GitHub.

## 📦 Deployment

### GitHub
Push this repository to a private or public GitHub repository. Ensure your `.env` files are not tracked.

### Netlify / Vercel
1. Connect your GitHub repository.
2. Set the build command to `npm run build`.
3. Set the output directory to `.next`.
4. Add your environment variables (like `GEMINI_API_KEY`) in the deployment dashboard.

### Firebase App Hosting
The project is pre-configured with `apphosting.yaml` for seamless deployment to Google's Firebase App Hosting.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Firestore
- **Authentication**: Firebase Auth
- **Styling**: Tailwind CSS + ShadCN UI
- **AI**: Genkit
