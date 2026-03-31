# 🚀 Deployment Guide: VillagKart Sales Tracker

This guide provides step-by-step instructions for deploying your MERN application using **Vercel** for the frontend and **Render** for the backend.

---

## 🛠️ Prerequisites

1.  **GitHub Repo**: Ensure your latest code is pushed to your GitHub repository.
2.  **Accounts**:
    *   [Vercel Account](https://vercel.com) (Frontend)
    *   [Render Account](https://render.com) (Backend)
    *   [Supabase Account](https://supabase.com) (Database)

---

## 🏗️ Step 1: Backend Deployment (Render)

We'll deploy the Node.js/Express API first to get your backend URL.

1.  **Create a Web Service**:
    *   Go to your [Render Dashboard](https://dashboard.render.com).
    *   Click **New +** ➔ **Web Service**.
    *   Connect your GitHub repository.
2.  **Configure Settings**:
    *   **Name**: `villagkart-backend`
    *   **Runtime**: `Node`
    *   **Root Directory**: `backend` (Leave blank if you use the `render.yaml` Blueprint below)
    *   **Build Command**: `npm install && npx prisma generate`
    *   **Start Command**: `npm start`
3.  **Environment Variables**:
    *   Click **Advanced** ➔ **Add Environment Variable**.
    *   `DATABASE_URL`: Your Supabase/Prisma connection string.
    *   `JWT_SECRET`: A long, random string (e.g., `SuperSecretKey123`).
    *   `PORT`: `5000` (Optional, Render detects this).
4.  **Deploy**: Click **Create Web Service**. Wait for the build to finish.
    *   **🔴 Copy your backend URL** (e.g., `https://villagkart-backend.onrender.com`).

---

## 🎨 Step 2: Frontend Deployment (Vercel)

Now we'll deploy the React/Vite frontend.

1.  **Import Project**:
    *   Go to your [Vercel Dashboard](https://vercel.com/dashboard).
    *   Click **Add New...** ➔ **Project**.
    *   Import your GitHub repository.
2.  **Configure Project**:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: `frontend`
    *   **Output Directory**: `dist`
3.  **Environment Variables**:
    *   Expand **Environment Variables**.
    *   Add **Key**: `VITE_API_URL`
    *   Add **Value**: Paste your Render backend URL (e.g., `https://villagkart-backend.onrender.com`).
4.  **Deploy**: Click **Deploy**. Vercel will build your static site.
    *   **🟢 Copy your frontend URL** (e.g., `https://villagkart-sales.vercel.app`).

---

## 🔐 Step 3: Final Production Tweak (CORS)

Once you have your **Vercel URL**, you should update your backend to only allow requests from that specific URL for better security.

1.  In `backend/.env`, add:
    ```env
    FRONTEND_URL=https://villagkart-sales.vercel.app
    ```
2.  In `backend/app.js`, refine the CORS:
    ```javascript
    app.use(cors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true
    }));
    ```

---

## 📈 Database Migrations (Supabase)

Since you are using **Prisma**, remember to sync your schema with your live database:

```bash
# From the backend directory
npx prisma db push
```

---

## ✅ Deployment Checklist

- [ ] Backend is live on Render (Check logs for "Server running").
- [ ] Database is connected (Check Prisma logs).
- [ ] Frontend is live on Vercel.
- [ ] `VITE_API_URL` environment variable is set in Vercel settings.
- [ ] Test the Login screen on the live URL.

---

### 🆘 Troubleshooting

- **404 on Refresh**: The included `vercel.json` in your `frontend/` folder handles this automatically.
- **CORS Error**: Ensure `VITE_API_URL` in Vercel **does not** end with a trailing slash (e.g., use `https://api.com` NOT `https://api.com/`).
- **Build Fails**: Check current Node.js version. Both Vercel and Render default to v18/v20+, which works with your code.
