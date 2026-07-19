# 🪔 Kamakshi Catering — Setup Guide

## What's new in this version
- 🎨 Deep Saffron `#e65100` + Gold `#f59e0b` + Cream `#fff8f0` theme
- 📸 Photo upload in reviews (saved to `static/uploads/`, shown on review cards)
- 📱 WhatsApp notification to owner when a booking is submitted
- 🗄️ Updated PostgreSQL schema (`photo_filename` column on reviews)

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set up environment
cp .env.example .env
# → edit .env with your DB credentials and WhatsApp phone

# 3. Create database & tables
psql -U postgres -c "CREATE DATABASE kamakshi_db;"
psql -U postgres -d kamakshi_db -f schema.sql

# 4. Run the app
python app.py
# → open http://localhost:5000
```

---

## WhatsApp Notification — How It Works

When a customer submits a booking, the server sends the owner a WhatsApp message with all booking details.

### Option A — WATI (Recommended for production)
1. Sign up at https://www.wati.io (free tier: 1,000 conversations/month)
2. Set `WATI_API_URL`, `WATI_API_TOKEN`, and `OWNER_WHATSAPP_PHONE` in `.env`
3. Create a message template named `booking_notification` in your WATI dashboard

### Option B — wa.me link (Zero setup, works immediately)
- Leave `WATI_API_URL` blank in `.env`
- Set only `OWNER_WHATSAPP_PHONE` (e.g. `919876543210`)
- When a booking comes in, the **server terminal** will print a `wa.me` link
- The owner can open this link on their phone → WhatsApp opens with the message pre-filled → tap Send

> **Tip for easy access**: on a VPS, use `tmux` or `screen` so the terminal stays running, or redirect stdout to a log file and tail it.

---

## Photo Upload
- Customers can attach one photo (JPG/PNG/WEBP/GIF, max 5 MB) with their review
- Photos are saved to `static/uploads/` with a UUID filename
- Photos are displayed on review cards in the website
- To serve uploads correctly in production (nginx), add:
  ```nginx
  location /static/uploads/ {
      alias /path/to/kamakshi_catering/static/uploads/;
  }
  ```

---

## Production Deployment (quick notes)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```
Point nginx to port 5000 and add the static uploads location block above.
