# Deployment Guide - Family Reminder App

## 🚀 Vercel Deployment (Recommended)

### **Prerequisites**
1. [Vercel Account](https://vercel.com)
2. [Vercel CLI](https://vercel.com/cli): `npm i -g vercel`
3. GitHub repository (optional but recommended)

### **Option 1: GitHub Integration (Easiest)**

1. **Push to GitHub:**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Connect your GitHub repository
   - Vercel will auto-detect the configuration

3. **Set Environment Variables:**
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add: `JWT_SECRET` = `your-super-secret-jwt-key-here`

4. **Deploy:**
   - Vercel auto-deploys on every push to main branch

### **Option 2: Direct CLI Deployment**

1. **Login to Vercel:**
```bash
vercel login
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Set Environment Variables:**
```bash
vercel env add JWT_SECRET
# Enter your secret key when prompted
```

## ⚠️ **Important Notes**

### **Database Considerations**
- **Serverless functions** are stateless - database resets on each deployment
- **For production**, consider these alternatives:

#### **Option A: Vercel Postgres (Recommended)**
```bash
npm install @vercel/postgres
```
Update `lib/db.js` to use Vercel Postgres instead of SQLite.

#### **Option B: PlanetScale MySQL**
```bash
npm install mysql2
```

#### **Option C: Supabase PostgreSQL**
```bash
npm install @supabase/supabase-js
```

### **Current Setup Limitations**
- **SQLite in serverless** = data doesn't persist between deployments
- **File storage in /tmp** = temporary, gets cleared

## 🏗️ **Alternative Deployment Options**

### **1. Railway (Full-stack friendly)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```
- **Pros:** Persistent database, supports SQLite
- **Cons:** Paid service

### **2. Render**
- Deploy as a web service
- **Pros:** Free tier, persistent storage
- **Cons:** Slower cold starts

### **3. Heroku**
- Use Heroku Postgres add-on
- **Pros:** Mature platform
- **Cons:** No free tier anymore

## 🔧 **Production Checklist**

- [ ] Set strong `JWT_SECRET` in environment variables
- [ ] Choose persistent database solution
- [ ] Test with multiple users
- [ ] Set up monitoring (optional)
- [ ] Configure custom domain (optional)

## 📱 **Testing Deployment**

1. **Register new users** from different devices/browsers
2. **Create events** and verify they appear for all users
3. **Test editing permissions** (only creators can edit)
4. **Verify responsive design** on mobile

## 🛠️ **Troubleshooting**

**Common Issues:**
- **Database not found:** Check file paths in production
- **CORS errors:** Environment variable not set correctly
- **JWT errors:** Verify `JWT_SECRET` is set in Vercel
- **Build fails:** Check Node.js version compatibility

Your app is now ready for global deployment! 🌍