# 🛒 VillagKart Sales Tracker

A premium, mobile-first sales tracking and inventory management system designed for **VillagKart**. This platform empowers sales agents with rapid entry tools, real-time analytics, and automated reporting.

---

## ✨ Features

- 🏎️ **Rapid Sales Entry**: Optimized for speed with sticky UI elements and mobile-first product grids.
- 📊 **Real-time Analytics**: Interactive dashboards featuring sales trends, profit tracking, and top-performing products.
- 📄 **Invoice Generation**: Instant PDF invoice creation for customers.
- 🚛 **Vehicle Management**: Track vehicle documentation and driver assignments.
- 💰 **Profit Tracking**: Automated profit calculation based on historical landing prices.
- 📶 **PWA Support**: Built with offline-first capabilities for reliable field use.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS & Framer Motion (for premium animations)
- **State Management**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js & Express
- **Database**: PostgreSQL via Prisma & Supabase
- **Authentication**: JWT (JSON Web Tokens)
- **File Handling**: Multer for document uploads

---

## 📂 Project Structure

```text
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Route-level components
│   │   └── store/      # Zustand state management
├── backend/           # Node.js + Express server
│   ├── controllers/    # Request handlers
│   ├── routes/         # API endpoints
│   └── prisma/         # Database schema & migrations
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or Supabase account)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd villagkart
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   # Create a .env file and add your DATABASE_URL and JWT_SECRET
   npx prisma generate
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   # Create a .env file and add your VITE_API_URL
   npm run dev
   ```

---

## 🎨 Design Philosophy

VillagKart uses a professional **Emerald Green** and **Vibrant Orange** color palette, emphasizing clarity, visual hierarchy, and a premium Glassmorphism aesthetic.

---

## 📄 License

Internal use only for VillagKart.
