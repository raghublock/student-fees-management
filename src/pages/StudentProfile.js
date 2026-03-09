import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database;
  SECRET_KEY: string;
}

const app = new Hono<{ Bindings: Bindings }>()

const SECRET = "bikaner-super-secret-2026";

app.use('/api/*', cors({
  origin: '*', 
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'], 
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
}))

// ==========================================
// 1. AUTH ROUTES
// ==========================================
app.post('/api/register-admin', async (c) => {
  const { name, email, password } = await c.req.json()
  try {
    await c.env.DB.prepare("INSERT INTO admins (name, email, password) VALUES (?, ?, ?)").bind(name, email, password).run()
    return c.json({ message: "Admin registered successfully" }, 201)
  } catch (error) {
    return c.json({ error: "Email already exists" }, 400)
  }
})

app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json()
  const admin: any = await c.env.DB.prepare("SELECT * FROM admins WHERE email = ? AND password = ?").bind(email, password).first()

  if (!admin) return c.json({ error: "Galat Email ya Password" }, 401)

  const payload = { id: admin.id, email: admin.email, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) }
  const token = await sign(payload, SECRET)
  
  return c.json({ success: true, token, admin: { name: admin.name, email: admin.email } })
})

// ==========================================
// 2. JWT MIDDLEWARE
// ==========================================
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  if (path === '/api/login' || path === '/api/register-admin') return next();
  if (c.req.method === 'OPTIONS') return next(); 

  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: "Token nahi mila" }, 401);

  const token = authHeader.replace('Bearer ', '').trim();
  try {
    await verify(token, SECRET, "HS256");
    await next();
  } catch (err: any) {
    return c.json({ error: `Token Error: ${err.message}` }, 401);
  }
})

// ==========================================
// 3. STUDENTS ROUTES (With PRO Status Check & Smart Delete 🗑️)
// ==========================================
app.get('/api/students', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT s.*, 
    (SELECT COUNT(*) FROM student_plans WHERE student_id = s.id) > 0 as has_active_plan
    FROM students s 
    ORDER BY s.id DESC
  `).all()
  return c.json(results)
})

app.post('/api/student/add', async (c) => {
  try {
    const body = await c.req.json();
    const { name, total_fees, paid_fees, due_fees, extra_fees, mobile, whatsapp, email, photo } = body;
    const safeEmail = email ? email : `dummy-${Date.now()}@bikaner.com`;
    
    await c.env.DB.prepare(
      `INSERT INTO students (name, total_fees, paid_fees, due_fees, extra_fees, mobile, whatsapp, email, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(name, total_fees, paid_fees, due_fees, extra_fees, mobile, whatsapp, safeEmail, photo).run();
    
    return c.json({ success: true, message: "Student added" }, 201);
  } catch (error: any) {
    return c.json({ error: `DB Error: ${error.message}` }, 500);
  }
})

app.put('/api/student/update/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json();
    const { name, total_fees, paid_fees, due_fees, extra_fees, mobile, whatsapp, email, photo } = body;
    const safeEmail = email ? email : `dummy-${id}@bikaner.com`;

    await c.env.DB.prepare(`UPDATE students SET name=?, total_fees=?, paid_fees=?, due_fees=?, extra_fees=?, mobile=?, whatsapp=?, email=?, photo=? WHERE id=?`).bind(name, total_fees, paid_fees, due_fees, extra_fees, mobile, whatsapp, safeEmail, photo, id).run()
    return c.json({ success: true, message: "Student updated" })
  } catch (error: any) {
    return c.json({ error: `DB Error: ${error.message}` }, 500);
  }
})

// 🚀 NAYA MASTER DELETE ROUTE (History mitane aur crash rokne ke liye)
app.delete('/api/student/delete/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // 1. Photo link nikaalo
    const student: any = await c.env.DB.prepare("SELECT photo FROM students WHERE id=?").bind(id).first();

    // 2. Agar photo Cloudinary par hai, toh usko cloud se udao
    if (student && student.photo && student.photo.includes('cloudinary.com')) {
      try {
          const photoUrl = student.photo;
          const urlParts = photoUrl.split('/upload/');
          
          if (urlParts.length === 2) {
            let path = urlParts[1];
            path = path.replace(/^v\d+\//, ''); 
            const publicId = path.substring(0, path.lastIndexOf('.')); 

            const CLOUD_NAME = "doaodzwor";
            const API_KEY = "635621981192985"; 
            const API_SECRET = "_wlqQI9YgXOcyMo01DxjksMXLx4"; 
            
            const authHeader = 'Basic ' + btoa(`${API_KEY}:${API_SECRET}`);

            // Cloudinary Admin API ko delete command bhejna
            await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload`, {
              method: 'DELETE',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ public_ids: [publicId] })
            });
          }
      } catch (e) {
          // Galti se bhi agar Cloudinary na chale, toh database ka delete nahi rukna chahiye!
          console.log("Photo udane mein error, lekin DB se delete continue rahega.");
      }
    }

    // 3. 🚨 ASLI FIX: Pehle bacche ki FEES aur PLAN HISTORY ko udao, tabhi wo khud ud payega
    await c.env.DB.prepare("DELETE FROM fees WHERE student_id=?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM student_plans WHERE student_id=?").bind(id).run();

    // 4. Aakhir mein us bacche ka naam/record udao
    await c.env.DB.prepare("DELETE FROM students WHERE id=?").bind(id).run();
    
    return c.json({ success: true, message: "Student, History aur Photo deleted safely!" });
  } catch (error: any) {
    return c.json({ error: `Delete fail ho gaya: ${error.message}` }, 500);
  }
})

// ==========================================
// 4. CUSTOM PLANS ROUTES (With Delete 🗑️)
// ==========================================
app.post('/api/plans/purchase', async (c) => {
  const body = await c.req.json();
  const { student_id, plan_name, duration_months, price, start_date } = body;

  const start = new Date(start_date);
  const expiry = new Date(start.setMonth(start.getMonth() + parseInt(duration_months)));
  const expiry_date = expiry.toISOString().split('T')[0];

  try {
    await c.env.DB.prepare(
      "INSERT INTO student_plans (student_id, plan_name, duration_months, price, start_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(student_id, plan_name, duration_months, price, start_date, expiry_date).run();
    
    return c.json({ success: true, message: "Plan activated!" });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/api/plans/history', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT sp.*, s.name as student_name 
    FROM student_plans sp 
    JOIN students s ON sp.student_id = s.id 
    ORDER BY sp.id DESC
  `).all();
  return c.json(results);
});

app.delete('/api/plans/delete/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare("DELETE FROM student_plans WHERE id = ?").bind(id).run();
    return c.json({ success: true, message: "Plan deleted successfully" });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ==========================================
// 5. FEES ROUTES
// ==========================================
app.post('/api/fees/add', async (c) => {
  const { student_id, amount, paid_on, mode, description, status, month } = await c.req.json()
  await c.env.DB.prepare(
    "INSERT INTO fees (student_id, amount, paid_on, mode, description, status, month) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(student_id, amount, paid_on, mode, description, status || 'Paid', month || 'General').run()
  return c.json({ success: true, message: "Fees record added" }, 201)
})

app.put('/api/fees/update/:id', async (c) => {
  const id = c.req.param('id')
  const { amount, paid_on, mode, description, status, month } = await c.req.json()
  await c.env.DB.prepare(
    "UPDATE fees SET amount=?, paid_on=?, mode=?, description=?, status=?, month=? WHERE id=?"
  ).bind(amount, paid_on, mode, description, status, month, id).run()
  return c.json({ success: true, message: "Fees updated" })
})

app.delete('/api/fees/delete/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare("DELETE FROM fees WHERE id=?").bind(id).run()
  return c.json({ success: true, message: "Fees record deleted" })
})

app.get('/api/fees/history', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT fees.*, students.name as student_name 
    FROM fees JOIN students ON fees.student_id = students.id 
    ORDER BY fees.paid_on DESC
  `).all()
  return c.json(results)
})

// ==========================================
// 6. 📊 ANALYTICS & REPORTS ROUTES
// ==========================================

// A. Default This Month Stats
app.get('/api/analytics/revenue', async (c) => {
  try {
    const revenue = await c.env.DB.prepare(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM fees WHERE strftime('%m', paid_on) = strftime('%m', 'now') AND strftime('%Y', paid_on) = strftime('%Y', 'now')) as regular_monthly,
        (SELECT COALESCE(SUM(price), 0) FROM student_plans WHERE strftime('%m', start_date) = strftime('%m', 'now') AND strftime('%Y', start_date) = strftime('%Y', 'now')) as pro_monthly
    `).first();

    const stats = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM (SELECT student_id, MIN(min_date) as first_date FROM (SELECT student_id, MIN(paid_on) as min_date FROM fees GROUP BY student_id UNION SELECT student_id, MIN(start_date) as min_date FROM student_plans GROUP BY student_id) GROUP BY student_id) WHERE strftime('%m', first_date) = strftime('%m', 'now') AND strftime('%Y', first_date) = strftime('%Y', 'now')) as new_joining,
        (SELECT COUNT(*) FROM students s WHERE NOT EXISTS (SELECT 1 FROM fees WHERE student_id = s.id AND paid_on >= date('now', '-30 days')) AND NOT EXISTS (SELECT 1 FROM student_plans WHERE student_id = s.id AND expiry_date >= date('now'))) as exits
    `).first();

    return c.json({ revenue, stats });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// B. 📅 Custom Date Range API
app.post('/api/analytics/custom', async (c) => {
  const { startDate, endDate } = await c.req.json();
  try {
    const revenueResult = await c.env.DB.prepare(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM fees WHERE paid_on >= ? AND paid_on <= ?) as custom_regular,
        (SELECT COALESCE(SUM(price), 0) FROM student_plans WHERE start_date >= ? AND start_date <= ?) as custom_pro
    `).bind(startDate, endDate, startDate, endDate).first();

    const joinResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as custom_joined FROM (
        SELECT student_id, MIN(min_date) as first_date FROM (
          SELECT student_id, MIN(paid_on) as min_date FROM fees GROUP BY student_id
          UNION
          SELECT student_id, MIN(start_date) as min_date FROM student_plans GROUP BY student_id
        ) GROUP BY student_id
      ) WHERE first_date >= ? AND first_date <= ?
    `).bind(startDate, endDate).first();

    return c.json({ 
      customRegular: revenueResult.custom_regular, 
      customPro: revenueResult.custom_pro,
      customJoined: joinResult.custom_joined 
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// C. Bulk WhatsApp API
app.get('/api/analytics/pending-reminders', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT id, name, whatsapp, due_fees 
      FROM students 
      WHERE due_fees > 0
    `).all();
    return c.json(results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app
