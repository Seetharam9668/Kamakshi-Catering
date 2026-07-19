"""
Kamakshi Catering - Flask Backend
Prop. Vikhyat | Nizampet, Hyderabad
"""

from flask import Flask, request, jsonify, render_template, session, redirect, url_for
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import psycopg2.extras
import os
import uuid
import json
import urllib.request
import urllib.parse
import urllib.error

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "kamakshi_secret_2024")

# ─── Configuration ────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "database": os.getenv("DB_NAME",     "kamakshi_db"),
    "user":     os.getenv("DB_USER",     "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
    "port":     os.getenv("DB_PORT",     "5432"),
}

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Kamakshi")

# WhatsApp config
OWNER_PHONE    = os.getenv("OWNER_WHATSAPP_PHONE", "")
WATI_API_URL   = os.getenv("WATI_API_URL", "")
WATI_API_TOKEN = os.getenv("WATI_API_TOKEN", "")

UPLOAD_FOLDER   = os.path.join(os.path.dirname(__file__), "static", "uploads")
GALLERY_FOLDER  = os.path.join(os.path.dirname(__file__), "static", "images")
os.makedirs(UPLOAD_FOLDER,  exist_ok=True)
os.makedirs(GALLERY_FOLDER, exist_ok=True)
MAX_IMAGE_SIZE = 5 * 1024 * 1024

def create_database_if_not_exists():
    conn = psycopg2.connect(
        host=DB_CONFIG["host"],
        database="postgres",          # Connect to default database
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        port=DB_CONFIG["port"]
    )

    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

    cur = conn.cursor()

    cur.execute(
        "SELECT 1 FROM pg_database WHERE datname = %s",
        (DB_CONFIG["database"],)
    )

    if cur.fetchone() is None:
        cur.execute(f'CREATE DATABASE "{DB_CONFIG["database"]}"')
        print(f"✅ Database '{DB_CONFIG['database']}' created.")
    else:
        print(f"✅ Database '{DB_CONFIG['database']}' already exists.")

    cur.close()
    conn.close()

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


def init_db():
    sql = """
    CREATE TABLE IF NOT EXISTS reviews (
        id              SERIAL PRIMARY KEY,
        customer_name   VARCHAR(100) NOT NULL,
        rating          INT CHECK (rating >= 1 AND rating <= 5),
        review_message  TEXT NOT NULL,
        photo_filename  VARCHAR(255),
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
        id           SERIAL PRIMARY KEY,
        full_name    VARCHAR(150) NOT NULL,
        phone        VARCHAR(20)  NOT NULL,
        event_type   VARCHAR(100) NOT NULL,
        event_date   DATE         NOT NULL,
        guests       INT          DEFAULT 0,
        menu         TEXT,
        message      TEXT,
        status       VARCHAR(20)  DEFAULT 'pending',
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS menu    TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status  VARCHAR(20) DEFAULT 'pending';
    ALTER TABLE reviews  ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(255);

    CREATE TABLE IF NOT EXISTS gallery (
        id             SERIAL PRIMARY KEY,
        photo_filename VARCHAR(255) NOT NULL,
        caption        VARCHAR(200) DEFAULT '',
        sort_order     INT          DEFAULT 0,
        is_static      BOOLEAN      DEFAULT FALSE,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(200) NOT NULL,
        category   VARCHAR(100) NOT NULL DEFAULT 'General',
        is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
        sort_order INT          NOT NULL DEFAULT 0,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    );
    """
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute(sql)
    cur.execute("ALTER TABLE gallery ADD COLUMN IF NOT EXISTS is_static BOOLEAN DEFAULT FALSE")
    conn.commit()
    cur.close()
    conn.close()


def seed_gallery():
    """Insert the default static images into DB on first run (only if table is empty)."""
    defaults = [
        ("images/banana-leaf.png",   "Banana Leaf Spread", 1),
        ("images/sambar-rice.png",   "Sambar & Rice",      2),
        ("images/wedding-feast.png", "Wedding Feast",      3),
        ("images/sweets.png",        "Sweets Platter",     4),
        ("images/event.png",         "Event Setup",        5),
        ("images/curries.png",       "Curries & Sides",    6),
    ]
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM gallery")
    count = cur.fetchone()[0]
    if count == 0:
        for filename, caption, order in defaults:
            cur.execute(
                "INSERT INTO gallery (photo_filename, caption, sort_order, is_static) VALUES (%s, %s, %s, TRUE)",
                (filename, caption, order)
            )
        conn.commit()
        print("✅ Default gallery images seeded into DB.")
    cur.close()
    conn.close()


def seed_menu():
    """Seed menu_items with all the original hardcoded items on first run."""
    default_items = [
        # Curries / కూరలు
        ("ఆలుగడ్డ / Potato",                          "కూరలు / Curries",       1),
        ("టమాట కూర / Tomato Curry",                   "కూరలు / Curries",       2),
        ("గుత్తి వంకాయ / Stuffed Brinjal",             "కూరలు / Curries",       3),
        ("వంకాయ / Brinjal",                            "కూరలు / Curries",       4),
        ("దొండకాయ కూర / Ivy Gourd",                    "కూరలు / Curries",       5),
        ("క్యాబేజీ / Cabbage",                         "కూరలు / Curries",       6),
        ("సొరకాయ కూర / Snake Gourd",                   "కూరలు / Curries",       7),
        ("కాకరకాయ / Bitter Gourd",                     "కూరలు / Curries",       8),
        ("చిక్కుడుకాయ / Broad Beans",                   "కూరలు / Curries",       9),
        ("బీన్స్ క్యారెట్ / Beans Carrot",               "కూరలు / Curries",      10),
        ("అరటికాయ / Raw Banana",                       "కూరలు / Curries",      11),
        ("చామగడ్డ / Chamagadda",                       "కూరలు / Curries",      12),
        ("కంద / Kanda",                                "కూరలు / Curries",      13),
        ("కంద బచ్చలి / Kanda Bachali",                  "కూరలు / Curries",      14),
        # Rice / రైస్ ఐటమ్స్
        ("ప్లేన్ రైస్ / Plain Rice",                     "రైస్ ఐటమ్స్ / Rice Items", 1),
        ("లెమన్ రైస్ / Lemon Rice",                     "రైస్ ఐటమ్స్ / Rice Items", 2),
        ("పులిహోర / Pulihora",                          "రైస్ ఐటమ్స్ / Rice Items", 3),
        ("కొబ్బరి అన్నం / Coconut Rice",                 "రైస్ ఐటమ్స్ / Rice Items", 4),
        ("టమాట రైస్ / Tomato Rice",                     "రైస్ ఐటమ్స్ / Rice Items", 5),
        ("వెజ్ బిర్యాని / Veg Biryani",                  "రైస్ ఐటమ్స్ / Rice Items", 6),
        ("పన్నీర్ బిర్యాని / Paneer Biryani",             "రైస్ ఐటమ్స్ / Rice Items", 7),
        ("మష్రూమ్ బిర్యాని / Mushroom Biryani",          "రైస్ ఐటమ్స్ / Rice Items", 8),
        ("జీరా రైస్ / Jeera Rice",                      "రైస్ ఐటమ్స్ / Rice Items", 9),
        ("కదంబం / Kadambam",                             "రైస్ ఐటమ్స్ / Rice Items", 10),
        ("దద్ధోజనం / Curd Rice",                        "రైస్ ఐటమ్స్ / Rice Items", 11),
        # Pickles / పచ్చళ్ళు
        ("ఆవకాయ / Avakaya",                             "పచ్చళ్ళు / Pickles",    1),
        ("గోంగూర పచ్చడి / Gongura Pachadi",              "పచ్చళ్ళు / Pickles",    2),
        ("టమాట పచ్చడి / Tomato Pachadi",                 "పచ్చళ్ళు / Pickles",    3),
        ("కొబ్బరి పచ్చడి / Coconut Pachadi",              "పచ్చళ్ళు / Pickles",    4),
        ("పుదీనా పచ్చడి / Pudina Pachadi",                "పచ్చళ్ళు / Pickles",    5),
        ("దొండకాయ పచ్చడి / Dondakaya Pachadi",            "పచ్చళ్ళు / Pickles",    6),
        ("బీరకాయ పచ్చడి / Beerakaya Pachadi",             "పచ్చళ్ళు / Pickles",    7),
        ("సొరకాయ పచ్చడి / Sorakaya Pachadi",              "పచ్చళ్ళు / Pickles",    8),
        ("పెరుగు పచ్చడి / Perugu Pachadi",                "పచ్చళ్ళు / Pickles",    9),
        # Sweets / స్వీట్స్
        ("చెక్కర పొంగలి / Sweet Pongal",                 "స్వీట్స్ / Sweets",      1),
        ("బాదుషా / Badusha",                            "స్వీట్స్ / Sweets",      2),
        ("డబల్ కా మీటా / Double Ka Meetha",              "స్వీట్స్ / Sweets",      3),
        ("బూంది లడ్డు / Boondi Laddu",                   "స్వీట్స్ / Sweets",      4),
        ("సేమ్యా పాయసం / Semiya Payasam",                 "స్వీట్స్ / Sweets",      5),
        ("సున్నుండలు / Sunnundalu",                      "స్వీట్స్ / Sweets",      6),
        # Dal / పప్పులు
        ("అన్ని రకాల కూరలు పప్పు / All Vegetable Dal",    "పప్పులు / Dal Items",   1),
        ("ఆకు కూరలు పప్పు / Leafy Vegetable Dal",         "పప్పులు / Dal Items",   2),
        # Pulusu / పులుసులు
        ("సొరకాయ పులుసు / Sorakaya Pulusu",               "పులుసులు / Pulusu",     1),
        ("గుమ్మడికాయ పులుసు / Gummadikaya Pulusu",         "పులుసులు / Pulusu",     2),
        ("తోటకూర పులుసు / Thotakura Pulusu",               "పులుసులు / Pulusu",     3),
        ("గోంగూర పులుసు / Gongura Pulusu",                 "పులుసులు / Pulusu",     4),
        # Tiffins / టిఫిన్స్
        ("ఇడ్లీ / Idli",                                 "టిఫిన్స్ / Tiffins",    1),
        ("వడ / Vada",                                    "టిఫిన్స్ / Tiffins",    2),
        ("బోండా / Bonda",                                "టిఫిన్స్ / Tiffins",    3),
        ("పూరీ / Puri",                                   "టిఫిన్స్ / Tiffins",    4),
        ("పొంగల్ / Pongal",                               "టిఫిన్స్ / Tiffins",    5),
        ("చపాతి / Chapati",                               "టిఫిన్స్ / Tiffins",    6),
        # North Indian / నార్త్ ఇండియన్
        ("పన్నీర్ 65 / Paneer 65",                        "నార్త్ ఇండియన్ / North Indian", 1),
        ("వెజ్ ఫ్రైడ్ రైస్ / Veg Fried Rice",              "నార్త్ ఇండియన్ / North Indian", 2),
        ("వెజ్ మంచూరియా / Veg Manchurian",                 "నార్త్ ఇండియన్ / North Indian", 3),
        ("గోబీ మంచూరియా / Gobi Manchurian",               "నార్త్ ఇండియన్ / North Indian", 4),
        ("పన్నీర్ బటర్ మసాలా కర్రీ / Paneer Butter Masala", "నార్త్ ఇండియన్ / North Indian", 5),
        # Snacks / స్నాక్స్
        ("అనియన్ పకోడీ / Onion Pakoda",                   "స్నాక్స్ / Snacks",     1),
        ("బజ్జి మిర్చి / Bajji Mirchi",                    "స్నాక్స్ / Snacks",     2),
        ("మసాల వడ / Masala Vada",                        "స్నాక్స్ / Snacks",     3),
        ("పెరుగు వడ / Perugu Vada",                       "స్నాక్స్ / Snacks",     4),
        # Side dishes / సైడ్ డిష్
        ("అప్పడాలు / Appadalu",                           "సైడ్ డిష్ / Side Dishes", 1),
        ("వడియాలు / Vadiyalu",                            "సైడ్ డిష్ / Side Dishes", 2),
        ("రైతా / Raita",                                  "సైడ్ డిష్ / Side Dishes", 3),
        ("పెరుగు / Perugu (Curd)",                        "సైడ్ డిష్ / Side Dishes", 4),
    ]

    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM menu_items")
    count = cur.fetchone()[0]
    if count == 0:
        for name, category, sort_order in default_items:
            cur.execute(
                "INSERT INTO menu_items (name, category, sort_order, is_active) VALUES (%s, %s, %s, TRUE)",
                (name, category, sort_order)
            )
        conn.commit()
        print(f"✅ {len(default_items)} default menu items seeded into DB.")
    cur.close()
    conn.close()


def send_whatsapp_notification(booking: dict):
    msg = (
        f"🎉 *New Booking — Kamakshi Catering*\n\n"
        f"👤 Name      : {booking['full_name']}\n"
        f"📞 Phone     : {booking['phone']}\n"
        f"🎊 Event     : {booking['event_type']}\n"
        f"📅 Date      : {booking['event_date']}\n"
        f"👥 Guests    : {booking['guests']}\n"
        f"📍 Address   : {booking.get('address') or '—'}\n"
        f"🍽️ Menu      : {booking.get('menu') or '—'}\n"
        f"📝 Message   : {booking.get('message') or '—'}\n\n"
        f"_Please call the customer to confirm._"
    )

    if WATI_API_URL and WATI_API_TOKEN and OWNER_PHONE:
        try:
            payload = json.dumps({
                "template_name":  "booking_notification",
                "broadcast_name": "booking_alert",
                "parameters": [{"name": "body", "value": msg}],
            }).encode("utf-8")
            req_url = f"{WATI_API_URL}/api/v1/sendTemplateMessage?whatsappNumber={OWNER_PHONE}"
            req = urllib.request.Request(
                req_url, data=payload,
                headers={
                    "Authorization": f"Bearer {WATI_API_TOKEN}",
                    "Content-Type":  "application/json",
                },
                method="POST",
            )
            urllib.request.urlopen(req, timeout=5)
            print("✅ WhatsApp notification sent via WATI.")
            return
        except Exception as e:
            print(f"⚠️  WATI notification failed: {e}")

    if OWNER_PHONE:
        encoded = urllib.parse.quote(msg)
        link    = f"https://wa.me/{OWNER_PHONE}?text={encoded}"
        print(f"\n📲 WhatsApp owner link (click to send):\n{link}\n")
    else:
        print("ℹ️  OWNER_WHATSAPP_PHONE not set — skipping notification.")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ── Admin Panel ───────────────────────────────────────────────────────────────

@app.route("/admin", methods=["GET", "POST"])
def admin():
    error = None

    if request.method == "POST" and "password" in request.form:
        if request.form["password"] == ADMIN_PASSWORD:
            session["admin"] = True
        else:
            error = "❌ Wrong password. Try again."

    if not session.get("admin"):
        return render_template("admin_login.html", error=error)

    conn = get_db_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        "SELECT id, customer_name, rating, review_message, photo_filename, created_at "
        "FROM reviews ORDER BY created_at DESC"
    )
    reviews = cur.fetchall()

    cur.execute(
        "SELECT id, full_name, phone, event_type, event_date, guests, address, menu, message, status, created_at "
        "FROM bookings WHERE status != 'done' ORDER BY created_at DESC"
    )
    pending_bookings = cur.fetchall()

    cur.execute(
        "SELECT id, full_name, phone, event_type, event_date, guests, address, menu, message, status, created_at "
        "FROM bookings WHERE status = 'done' ORDER BY created_at DESC"
    )
    completed_bookings = cur.fetchall()

    cur.execute(
        "SELECT id, photo_filename, caption, sort_order, is_static FROM gallery ORDER BY sort_order ASC, created_at DESC"
    )
    raw_items = cur.fetchall()
    gallery_items = []
    for g in raw_items:
        gallery_items.append({
            "id":             g["id"],
            "photo_filename": g["photo_filename"],
            "photo_url":      f"/static/{g['photo_filename']}",
            "caption":        g["caption"] or "",
            "sort_order":     g["sort_order"],
            "is_static":      g["is_static"],
        })

    # ── Menu items for admin panel ──
    cur.execute(
        "SELECT id, name, category, is_active, sort_order "
        "FROM menu_items ORDER BY category ASC, sort_order ASC, id ASC"
    )
    menu_items = cur.fetchall()

    cur.close()
    conn.close()

    for r in reviews:
        r["photo_url"]  = f"/static/uploads/{r['photo_filename']}" if r["photo_filename"] else None
        r["created_at"] = r["created_at"].strftime("%d %b %Y")

    # Combined list used only for the stats counter
    bookings = pending_bookings + completed_bookings

    for b in pending_bookings + completed_bookings:
        b["created_at"] = b["created_at"].strftime("%d %b %Y")
        b["event_date"] = b["event_date"].strftime("%d %b %Y") if b["event_date"] else "—"

    return render_template(
        "admin.html",
        reviews=reviews,
        bookings=bookings,
        pending_bookings=pending_bookings,
        completed_bookings=completed_bookings,
        gallery_items=gallery_items,
        menu_items=menu_items,
    )


@app.route("/admin/logout")
def admin_logout():
    session.pop("admin", None)
    return redirect(url_for("admin"))


@app.route("/admin/delete-review/<int:review_id>", methods=["POST"])
def delete_review(review_id):
    if not session.get("admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        cur.execute("SELECT photo_filename FROM reviews WHERE id = %s", (review_id,))
        row = cur.fetchone()
        if row and row[0]:
            photo_path = os.path.join(UPLOAD_FOLDER, row[0])
            if os.path.exists(photo_path):
                os.remove(photo_path)

        cur.execute("DELETE FROM reviews WHERE id = %s", (review_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/mark-done/<int:booking_id>", methods=["POST"])
def mark_done(booking_id):
    if not session.get("admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("UPDATE bookings SET status = 'done' WHERE id = %s", (booking_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Booking Search ────────────────────────────────────────────────────────────

@app.route("/admin/search-bookings", methods=["GET"])
def search_bookings():
    if not session.get("admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"success": True, "pending": [], "completed": []})

    pattern = f"%{q}%"
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT id, full_name, phone, event_type, event_date,
                   guests, address, menu, message, status, created_at
            FROM bookings
            WHERE (
                full_name  ILIKE %s OR
                phone      ILIKE %s OR
                event_type ILIKE %s
            )
            ORDER BY created_at DESC
            """,
            (pattern, pattern, pattern)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        pending, completed = [], []
        for b in rows:
            record = dict(b)
            record["created_at"] = record["created_at"].strftime("%d %b %Y")
            record["event_date"] = record["event_date"].strftime("%d %b %Y") if record["event_date"] else "—"
            if record["status"] == "done":
                completed.append(record)
            else:
                pending.append(record)

        return jsonify({"success": True, "pending": pending, "completed": completed})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Reviews ───────────────────────────────────────────────────────────────────

@app.route("/reviews", methods=["GET"])
def get_reviews():
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id, customer_name, rating, review_message, photo_filename, created_at "
            "FROM reviews ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        reviews = []
        for r in rows:
            photo_url = f"/static/uploads/{r['photo_filename']}" if r["photo_filename"] else None
            reviews.append({
                "id":             r["id"],
                "customer_name":  r["customer_name"],
                "rating":         r["rating"],
                "review_message": r["review_message"],
                "photo_url":      photo_url,
                "created_at":     r["created_at"].strftime("%d %b %Y"),
            })
        return jsonify({"success": True, "reviews": reviews})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/add-review", methods=["POST"])
def add_review():
    name    = (request.form.get("customer_name")  or "").strip()
    rating  = request.form.get("rating")
    message = (request.form.get("review_message") or "").strip()

    if not name or not message:
        return jsonify({"success": False, "error": "Name and message are required."}), 400
    try:
        rating = int(rating)
        if not (1 <= rating <= 5):
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Rating must be 1–5."}), 400

    photo_filename = None
    photo_file     = request.files.get("photo")
    if photo_file and photo_file.filename:
        allowed = {"jpg", "jpeg", "png", "webp", "gif"}
        ext     = photo_file.filename.rsplit(".", 1)[-1].lower()
        if ext not in allowed:
            return jsonify({"success": False, "error": "Photo must be JPG, PNG, WEBP, or GIF."}), 400
        photo_data = photo_file.read()
        if len(photo_data) > MAX_IMAGE_SIZE:
            return jsonify({"success": False, "error": "Photo must be under 5 MB."}), 400
        import re as _re
        slug = _re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or uuid.uuid4().hex
        photo_filename = f"{slug}.{ext}"
        if os.path.exists(os.path.join(UPLOAD_FOLDER, photo_filename)):
            photo_filename = f"{slug}-{uuid.uuid4().hex[:6]}.{ext}"
        with open(os.path.join(UPLOAD_FOLDER, photo_filename), "wb") as f:
            f.write(photo_data)

    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute(
            "INSERT INTO reviews (customer_name, rating, review_message, photo_filename) "
            "VALUES (%s, %s, %s, %s) RETURNING id, created_at",
            (name, rating, message, photo_filename),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        photo_url = f"/static/uploads/{photo_filename}" if photo_filename else None
        return jsonify({
            "success": True,
            "message": "Review submitted successfully!",
            "review": {
                "id":             row[0],
                "customer_name":  name,
                "rating":         rating,
                "review_message": message,
                "photo_url":      photo_url,
                "created_at":     row[1].strftime("%d %b %Y"),
            },
        }), 201

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Bookings ──────────────────────────────────────────────────────────────────

@app.route("/book-event", methods=["POST"])
def book_event():
    data       = request.get_json()
    full_name  = (data.get("full_name")  or "").strip()
    phone      = (data.get("phone")      or "").strip()
    event_type = (data.get("event_type") or "").strip()
    event_date = (data.get("event_date") or "").strip()
    guests     = data.get("guests")
    address    = (data.get("address")    or "").strip()
    menu       = (data.get("menu")       or "").strip()
    message    = (data.get("message")    or "").strip()

    if not all([full_name, phone, event_type, event_date]):
        return jsonify({"success": False, "error": "Please fill all required fields."}), 400

    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute(
            "INSERT INTO bookings (full_name, phone, event_type, event_date, guests, address, menu, message) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (full_name, phone, event_type, event_date, guests or 0, address, menu, message),
        )
        conn.commit()
        cur.close()
        conn.close()

        try:
            send_whatsapp_notification({
                "full_name":  full_name,
                "phone":      phone,
                "event_type": event_type,
                "event_date": event_date,
                "guests":     guests or 0,
                "address":    address,
                "menu":       menu,
                "message":    message,
            })
        except Exception as notify_err:
            print(f"⚠️  Notification error (booking still saved): {notify_err}")

        return jsonify({"success": True, "message": "Booking enquiry received! We'll contact you soon."}), 201

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Gallery ───────────────────────────────────────────────────────────────────

@app.route("/gallery", methods=["GET"])
def get_gallery():
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id, photo_filename, caption, sort_order, is_static "
            "FROM gallery ORDER BY sort_order ASC, created_at DESC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        items = []
        for r in rows:
            items.append({
                "id":         r["id"],
                "photo_url":  f"/static/{r['photo_filename']}",
                "caption":    r["caption"] or "",
                "sort_order": r["sort_order"],
                "is_static":  r["is_static"],
            })
        return jsonify({"success": True, "gallery": items})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/add-gallery", methods=["POST"])
def add_gallery():
    if not session.get("admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    caption    = (request.form.get("caption") or "").strip()
    photo_file = request.files.get("photo")

    if not photo_file or not photo_file.filename:
        return jsonify({"success": False, "error": "A photo is required."}), 400

    allowed = {"jpg", "jpeg", "png", "webp", "gif"}
    ext     = photo_file.filename.rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        return jsonify({"success": False, "error": "Photo must be JPG, PNG, WEBP, or GIF."}), 400

    photo_data = photo_file.read()
    if len(photo_data) > MAX_IMAGE_SIZE:
        return jsonify({"success": False, "error": "Photo must be under 5 MB."}), 400

    photo_filename = f"gal_{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(GALLERY_FOLDER, photo_filename)

    # New uploads always become sort_order = 1 (appear first).
    # Every existing gallery item is shifted down by one to make room.
    sort_order = 1

    try:
        with open(save_path, "wb") as f:
            f.write(photo_data)

        conn = get_db_connection()
        cur  = conn.cursor()

        # Shift all existing items down by one so the new upload can take position 1.
        cur.execute("UPDATE gallery SET sort_order = sort_order + 1")

        db_filename = f"images/{photo_filename}"
        cur.execute(
            "INSERT INTO gallery (photo_filename, caption, sort_order, is_static) VALUES (%s, %s, %s, FALSE) RETURNING id",
            (db_filename, caption, sort_order),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({
            "success": True,
            "item": {
                "id":         new_id,
                "photo_url":  f"/static/images/{photo_filename}",
                "caption":    caption,
                "sort_order": sort_order,
                "is_static":  False,
            }
        }), 201
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/update-gallery-order", methods=["POST"])
def update_gallery_order():
    """Persist a new drag-and-drop gallery order.
    Expects JSON: { "order": [id1, id2, id3, ...] } where the list is in the
    desired display order (first item -> sort_order 1, second -> 2, etc.)."""
    if not session.get("admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data  = request.get_json(silent=True) or {}
    order = data.get("order")

    if not isinstance(order, list) or not order:
        return jsonify({"success": False, "error": "A non-empty 'order' list is required."}), 400

    try:
        ids = [int(i) for i in order]
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid gallery id in order list."}), 400

    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        for position, item_id in enumerate(ids, start=1):
            cur.execute(
                "UPDATE gallery SET sort_order = %s WHERE id = %s",
                (position, item_id),
            )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/delete-gallery/<int:item_id>", methods=["POST"])
def delete_gallery(item_id):
    if not session.get("admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("SELECT photo_filename, is_static, sort_order FROM gallery WHERE id = %s", (item_id,))
        row = cur.fetchone()
        if row:
            filename, is_static, deleted_sort_order = row[0], row[1], row[2]
            if not is_static and filename:
                photo_path = os.path.join(os.path.dirname(__file__), "static", filename)
                if os.path.exists(photo_path):
                    os.remove(photo_path)

        cur.execute("DELETE FROM gallery WHERE id = %s", (item_id,))

        # Resequence: close the gap left behind by shifting every item that came
        # after the deleted one down by one, so sort_order stays contiguous
        # (1, 2, 3, ... with no gaps).
        if row is not None and deleted_sort_order is not None:
            cur.execute(
                "UPDATE gallery SET sort_order = sort_order - 1 WHERE sort_order > %s",
                (deleted_sort_order,)
            )

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Menu Items (Public) ───────────────────────────────────────────────────────

@app.route("/menu", methods=["GET"])
def get_menu():
    """Return all active menu items grouped by category."""
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id, name, category, sort_order "
            "FROM menu_items WHERE is_active = TRUE "
            "ORDER BY category ASC, sort_order ASC, id ASC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Group by category
        grouped = {}
        for row in rows:
            cat = row["category"]
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append({"id": row["id"], "name": row["name"]})

        return jsonify({"success": True, "menu": grouped})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Menu Items (Admin) ────────────────────────────────────────────────────────

@app.route("/admin/add-menu", methods=["POST"])
def admin_add_menu():
    if not session.get("admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data     = request.get_json()
    name     = (data.get("name")     or "").strip()
    category = (data.get("category") or "General").strip()

    if not name:
        return jsonify({"success": False, "error": "Item name is required."}), 400
    if not category:
        category = "General"

    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        # Sort order = last in that category
        cur.execute(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM menu_items WHERE category = %s",
            (category,)
        )
        next_order = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO menu_items (name, category, sort_order, is_active) "
            "VALUES (%s, %s, %s, TRUE) RETURNING id",
            (name, category, next_order)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({
            "success": True,
            "item": {"id": new_id, "name": name, "category": category, "is_active": True}
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/delete-menu/<int:item_id>", methods=["POST"])
def admin_delete_menu(item_id):
    if not session.get("admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("DELETE FROM menu_items WHERE id = %s", (item_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/admin/update-menu/<int:item_id>", methods=["POST"])
def admin_update_menu(item_id):
    """Update name, category, or toggle is_active."""
    if not session.get("admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data      = request.get_json()
    name      = (data.get("name")     or "").strip() or None
    category  = (data.get("category") or "").strip() or None
    is_active = data.get("is_active")   # bool or None

    if name is None and category is None and is_active is None:
        return jsonify({"success": False, "error": "Nothing to update."}), 400

    sets, vals = [], []
    if name      is not None: sets.append("name = %s");      vals.append(name)
    if category  is not None: sets.append("category = %s");  vals.append(category)
    if is_active is not None: sets.append("is_active = %s"); vals.append(bool(is_active))

    vals.append(item_id)
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f"UPDATE menu_items SET {', '.join(sets)} WHERE id = %s RETURNING id, name, category, is_active",
            vals
        )
        updated = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not updated:
            return jsonify({"success": False, "error": "Item not found."}), 404
        return jsonify({"success": True, "item": dict(updated)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        create_database_if_not_exists()   # NEW

        init_db()
        print("✅ Database tables ready.")

        seed_gallery()
        seed_menu()

    except Exception as e:
        print(f"⚠️ DB init failed: {e}")

    app.run(debug=True, host="0.0.0.0", port=5000)