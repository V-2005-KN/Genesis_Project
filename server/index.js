import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { initialData } from "./data/seedData.js";
import {
  authDb,
  initializeAuthUsers,
  generateTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  checkAccountLockout,
  recordFailedLogin,
  resetFailedLogin,
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
  verifyAccessToken,
  requireRole,
  getSafeUsers,
  addAuthUser,
  removeAuthUser,
  updateAuthUserPassword,
  getVaultInspectionInfo
} from "./services/authService.js";
import { generatePredictiveAnalytics } from "./services/predictiveService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize users from users.csv into authDb
initializeAuthUsers();

// 1. Security Headers via Helmet
app.use(helmet({ contentSecurityPolicy: false }));

// 2. Cookie Parser
app.use(cookieParser());

// 3. Strict CORS with Credentials Support
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "10mb" }));

// Handle invalid JSON body syntax errors gracefully without crashing the server process
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error(`[SERVER] Malformed JSON payload received on ${req.method} ${req.url}: ${err.message}`);
    return res.status(400).json({ success: false, message: "Invalid JSON format in request payload" });
  }
  next(err);
});

// 4. Rate Limiter for Login Endpoint (relaxed in development for seamless demo testing)
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 15 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please wait 15 minutes." }
});

// In-memory active auth session state
let currentUserSession = null;

// In-memory data store initialized from seed data
let db = JSON.parse(JSON.stringify(initialData));

// Helper: Calculate wait time for an order based on queue ahead
function calculateWaitTime(canteenId, orderItems = []) {
  const canteen = db.canteens.find((c) => c.id === canteenId);
  const rushFactor = canteen?.crowdLevel === "Rush Hour" ? 1.5 : canteen?.crowdLevel === "Busy" ? 1.25 : 1.0;
  
  // Pending orders in this canteen (cooking or received)
  const pendingOrders = db.orders.filter(
    (o) => o.canteenId === canteenId && ["received", "cooking"].includes(o.status)
  );

  let totalPrepTimeAhead = 0;
  pendingOrders.forEach((o) => {
    const orderPrep = (o.items || []).reduce((acc, item) => Math.max(acc, item?.prepTimeMinutes || 3), 0);
    totalPrepTimeAhead += orderPrep;
  });

  const currentOrderPrep = (orderItems || []).reduce((acc, item) => Math.max(acc, item?.prepTimeMinutes || 3), 0);
  const estimatedMinutes = Math.max(3, Math.round((totalPrepTimeAhead * 0.6 + currentOrderPrep) * rushFactor));
  return {
    estimatedMinutes,
    ordersAhead: pendingOrders.length,
    crowdLevel: canteen?.crowdLevel || "Moderate"
  };
}

// ----------------- SECURE AUTHENTICATION & JWT ROUTES -----------------
app.post("/api/auth/register", async (req, res) => {
  const { name, email, username, password, role } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: "Name, email, and password are required" });
  }

  // Password strength validation
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  // Check for duplicate
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = (username || cleanEmail.split('@')[0]).trim().toLowerCase();
  const existing = authDb.users.find((u) => u.email === cleanEmail || u.username === cleanUsername);
  if (existing) {
    return res.status(409).json({ success: false, message: "User with this email or username already exists" });
  }

  const passwordHash = await hashPassword(password);
  const newUser = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    role: (role || "student").toLowerCase(),
    username: cleanUsername,
    email: cleanEmail,
    passwordHash,
    failedLoginAttempts: 0,
    isLocked: false,
    lockoutUntil: null,
    createdAt: new Date().toISOString()
  };
  authDb.users.push(newUser);

  // Generate tokens & set HttpOnly refresh cookie
  const { accessToken, refreshToken } = await generateTokens(newUser);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth"
  });

  const safeUser = { id: newUser.id, name: newUser.name, role: newUser.role, username: newUser.username, email: newUser.email };
  currentUserSession = safeUser;
  return res.status(201).json({ success: true, user: safeUser, accessToken, message: "Registration successful" });
});

app.post("/api/auth/login", loginRateLimiter, async (req, res) => {
  const { identifier, username, email, password, expectedRole } = req.body || {};
  const idInput = (identifier || username || email || "").trim().toLowerCase();
  const passInput = (password || "").trim();
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  if (!idInput || !passInput) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Find user in authDb
  const matchedUser = authDb.users.find(
    (u) => u.username.toLowerCase() === idInput || u.email.toLowerCase() === idInput
  );

  if (!matchedUser) {
    console.warn(`[SECURITY AUDIT] Failed login attempt for unknown user: "${idInput}" from IP: ${ip} at ${new Date().toISOString()}`);
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Check account lockout
  const lockout = checkAccountLockout(matchedUser);
  if (lockout.isLocked) {
    console.warn(`[SECURITY AUDIT] Blocked login attempt on locked account: ${matchedUser.username} from IP: ${ip}`);
    return res.status(423).json({ success: false, message: lockout.message });
  }

  // Verify password with bcrypt
  const isMatch = await verifyPassword(matchedUser, passInput);
  if (!isMatch) {
    recordFailedLogin(matchedUser);
    console.warn(`[SECURITY AUDIT] Failed password for: ${matchedUser.username} (Attempt ${matchedUser.failedLoginAttempts}/5) from IP: ${ip}`);
    if (matchedUser.isLocked) {
      return res.status(423).json({
        success: false,
        message: "Account has been temporarily locked for 15 minutes due to multiple failed login attempts."
      });
    }
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Role verification (if expectedRole specified by the portal)
  if (expectedRole) {
    const reqRole = expectedRole.toLowerCase();
    const userRole = (matchedUser.role || '').toLowerCase();
    const matches =
      reqRole === userRole ||
      (reqRole === 'cook' && ['cook', 'chef'].includes(userRole)) ||
      (reqRole === 'staff' && ['staff', 'counter', 'counter_staff'].includes(userRole));

    if (!matches) {
      console.warn(`[SECURITY AUDIT] Role mismatch: ${matchedUser.username} (${matchedUser.role}) tried logging into ${expectedRole} portal from IP: ${ip}`);
      return res.status(403).json({
        success: false,
        message: `Access denied: Your account role (${matchedUser.role}) is not authorized for this portal.`
      });
    }
  }

  // Reset failure count on success
  resetFailedLogin(matchedUser);

  // Generate short-lived JWT access token & 7-day refresh token
  const { accessToken, refreshToken } = await generateTokens(matchedUser);

  // Set HttpOnly, Secure, SameSite refresh cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth"
  });

  const safeUser = {
    id: matchedUser.id,
    name: matchedUser.name,
    role: matchedUser.role,
    username: matchedUser.username,
    email: matchedUser.email
  };
  currentUserSession = safeUser;

  console.info(`[SECURITY AUDIT] Successful login for: ${matchedUser.username} (${matchedUser.role}) from IP: ${ip} at ${new Date().toISOString()}`);
  return res.json({
    success: true,
    user: safeUser,
    accessToken,
    message: "Login successful"
  });
});

app.post("/api/auth/refresh", async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (!rawRefreshToken) {
    return res.status(401).json({ success: false, message: "Refresh token missing" });
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(rawRefreshToken);

    // Set rotated refresh cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth"
    });

    return res.json({ success: true, accessToken });
  } catch (err) {
    console.warn(`[SECURITY AUDIT] Refresh token failure: ${err.message}`);
    res.clearCookie("refreshToken", { path: "/api/auth" });
    return res.status(403).json({ success: false, message: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (rawRefreshToken) {
    revokeRefreshToken(rawRefreshToken);
  }
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth"
  });
  currentUserSession = null;
  res.json({ success: true, message: "Logged out successfully" });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || "amrita_campus_jwt_access_secret_key_2026_super_secure"
      );
      return res.json({
        success: true,
        user: {
          id: decoded.sub,
          name: decoded.name,
          role: decoded.role,
          username: decoded.username,
          email: decoded.email
        }
      });
    } catch (e) {
      // Access token expired - client should call /api/auth/refresh
    }
  }

  if (currentUserSession) {
    return res.json({ success: true, user: currentUserSession });
  }
  res.status(401).json({ success: false, message: "Not authenticated" });
});

app.post("/api/auth/guest", (req, res) => {
  const guestUser = {
    id: `guest_${Date.now()}`,
    name: "Guest Visitor",
    role: "guest",
    username: "guest-visitor",
    email: "guest@campus.edu",
    isGuest: true
  };
  currentUserSession = guestUser;

  const accessToken = jwt.sign(
    { sub: guestUser.id, name: guestUser.name, username: guestUser.username, email: guestUser.email, role: guestUser.role },
    process.env.JWT_ACCESS_SECRET || "amrita_campus_jwt_access_secret_key_2026_super_secure",
    { expiresIn: "2h" }
  );

  res.json({ success: true, user: guestUser, accessToken, message: "Logged in as temporary guest" });
});

// ----------------- ADMIN USER MANAGEMENT & THEFT-PROOF VAULT APIS -----------------

// Admin: List all registered accounts (passwords never exposed)
app.get("/api/admin/users", (req, res) => {
  try {
    const users = getSafeUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Add new user with salted bcrypt hashing and AES-256 vault encryption
app.post("/api/admin/users", async (req, res) => {
  try {
    const { name, username, email, role, password } = req.body;
    const createdUser = await addAuthUser({ name, username, email, role, password });
    res.status(201).json({
      success: true,
      message: `User '${createdUser.username}' created with salted bcrypt hash and encrypted into AES-256 vault.`,
      data: createdUser
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Admin: Remove a user by username or ID
app.delete("/api/admin/users/:idOrUsername", (req, res) => {
  try {
    const { idOrUsername } = req.params;
    const result = removeAuthUser(idOrUsername);
    res.json({
      success: true,
      message: `User '${result.removedUsername}' permanently deleted and purged from encrypted vault.`
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Admin: Update / Reset user password
app.put("/api/admin/users/:idOrUsername/password", async (req, res) => {
  try {
    const { idOrUsername } = req.params;
    const { newPassword } = req.body;
    const result = await updateAuthUserPassword(idOrUsername, newPassword);
    res.json({
      success: true,
      message: result.message
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Physical Theft Simulation & Disk Vault Inspector
// Demonstrates that even if the physical file or hard drive is stolen, it is unreadable ciphertext
app.get("/api/admin/vault/inspect", (req, res) => {
  try {
    const inspection = getVaultInspectionInfo();
    res.json({ success: true, data: inspection });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------- PRIVACY-COMPLIANT STUDENT SPENDING TRACKER -----------------
// STRICT PRIVACY COMPLIANCE: Records ONLY non-sensitive high-level spending metrics
// (orderId, orderTotal, date, canteenId, itemsCount). ZERO banking/card/UPI credentials stored.
app.get("/api/student/spending", (req, res) => {
  if (!currentUserSession || currentUserSession.role !== "student") {
    return res.status(200).json({
      success: true,
      data: {
        totalSpentAmount: 0,
        orderCount: 0,
        spendingHistory: [],
        studentName: currentUserSession?.name || "Student",
      },
    });
  }

  const studentId = currentUserSession.id || currentUserSession.username;
  const history = (db.studentSpending || {})[studentId] || [];
  const totalSpentAmount = history.reduce((sum, h) => sum + (h.orderTotal || 0), 0);
  const orderCount = history.length;

  res.json({
    success: true,
    data: {
      totalSpentAmount,
      orderCount,
      spendingHistory: history,
      studentName: currentUserSession.name,
    },
  });
});

// ----------------- CANTEEN DEMAND PREDICTION & FESTIVAL SPIKE WARNINGS -----------------
app.get("/api/canteen/forecast", (req, res) => {
  try {
    const { canteenId = 'all' } = req.query;
    const forecastData = generatePredictiveAnalytics(canteenId);
    res.json({ success: true, data: forecastData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/canteens", (req, res) => {
  const dynamicCanteens = db.canteens.map((c) => {
    const activeCount = db.orders.filter(
      (o) => o.canteenId === c.id && ["serving", "ready", "cooking", "received"].includes(o.status)
    ).length;
    return {
      ...c,
      activeOrdersCount: activeCount
    };
  });
  res.json({ success: true, data: dynamicCanteens });
});

app.post("/api/canteens", (req, res) => {
  const newCanteen = {
    id: req.body.id || `canteen-${Date.now()}`,
    name: req.body.name,
    code: req.body.code || `C${db.canteens.length + 1}`,
    location: req.body.location || "Central Campus, Amrita Ettimadai",
    timings: req.body.timings || "08:00 AM - 10:00 PM",
    status: "open",
    crowdLevel: req.body.crowdLevel || "Low",
    avgWaitTimeMinutes: parseInt(req.body.avgWaitTimeMinutes || 5, 10),
    activeOrdersCount: 0,
    counterSpeed: req.body.counterSpeed || "Fast",
    image: req.body.image || ""
  };
  db.canteens.push(newCanteen);
  res.json({ success: true, data: newCanteen });
});

app.delete("/api/canteens/:id", (req, res) => {
  const { id } = req.params;
  const index = db.canteens.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ success: false, message: "Canteen not found" });

  db.canteens.splice(index, 1);
  db.menuItems = db.menuItems.filter((m) => m.canteenId !== id);
  res.json({ success: true, message: "Canteen deleted successfully" });
});

app.put("/api/canteens/:id", (req, res) => {
  const { id } = req.params;
  const canteen = db.canteens.find((c) => c.id === id);
  if (!canteen) return res.status(404).json({ success: false, message: "Canteen not found" });

  Object.assign(canteen, req.body);
  res.json({ success: true, data: canteen });
});

app.put("/api/canteens/:id/crowd", (req, res) => {
  const { id } = req.params;
  const { crowdLevel } = req.body;
  const canteen = db.canteens.find((c) => c.id === id);
  if (!canteen) return res.status(404).json({ success: false, message: "Canteen not found" });

  canteen.crowdLevel = crowdLevel;
  if (crowdLevel === "Low") canteen.avgWaitTimeMinutes = 5;
  else if (crowdLevel === "Moderate") canteen.avgWaitTimeMinutes = 10;
  else if (crowdLevel === "Busy") canteen.avgWaitTimeMinutes = 18;
  else if (crowdLevel === "Rush Hour") canteen.avgWaitTimeMinutes = 25;

  res.json({ success: true, data: canteen });
});

// Canteen Demand Forecasting & Predictive Warning Engine (Past, Present, Future + Holiday/Fest Spikes)
app.get("/api/canteen/forecast", (req, res) => {
  try {
    const { canteenId = "all" } = req.query;
    const analytics = generatePredictiveAnalytics(canteenId);
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error generating forecast", error: err.message });
  }
});

app.get("/api/menu", (req, res) => {
  const { canteenId, category, search } = req.query;
  let items = [...db.menuItems];
  if (canteenId) items = items.filter((i) => i.canteenId === canteenId);
  if (category && category !== "All") items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }
  res.json({ success: true, data: items });
});

app.post("/api/menu", (req, res) => {
  const newItem = {
    id: `m_${Date.now()}`,
    ...req.body,
    stock: parseInt(req.body.stock || 10, 10),
    price: parseFloat(req.body.price || 50),
    prepTimeMinutes: parseInt(req.body.prepTimeMinutes || 5, 10)
  };
  db.menuItems.unshift(newItem);
  res.json({ success: true, data: newItem });
});

app.put("/api/menu/:id", (req, res) => {
  const { id } = req.params;
  const itemIndex = db.menuItems.findIndex((i) => i.id === id);
  if (itemIndex === -1) return res.status(404).json({ success: false, message: "Item not found" });

  const oldStock = db.menuItems[itemIndex].stock;
  const updatedItem = { ...db.menuItems[itemIndex], ...req.body };
  db.menuItems[itemIndex] = updatedItem;

  // Trigger "Notify Me" notifications if item was restocked from 0!
  if (oldStock === 0 && updatedItem.stock > 0) {
    const subs = db.stockNotifications.filter((s) => s.itemId === id && !s.notified);
    subs.forEach((sub) => {
      sub.notified = true;
      db.notifications.unshift({
        id: `nt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        title: "Back in Stock Alert!",
        message: `Good news! "${updatedItem.name}" is back in stock at ${updatedItem.canteenId === "canteen-1" ? "Canteen 1" : "Canteen 2"} with ${updatedItem.stock} available.`,
        type: "stock",
        timestamp: new Date().toISOString(),
        read: false
      });
    });
  }

  res.json({ success: true, data: updatedItem });
});

app.delete("/api/menu/:id", (req, res) => {
  const { id } = req.params;
  db.menuItems = db.menuItems.filter((m) => m.id !== id);
  res.json({ success: true, data: { id } });
});

// "Notify Me" subscription when an item is out of stock (Slide 4)
app.post("/api/menu/:id/notify-me", (req, res) => {
  const { id } = req.params;
  const item = db.menuItems.find((i) => i.id === id);
  if (!item) return res.status(404).json({ success: false, message: "Item not found" });

  const existing = db.stockNotifications.find((s) => s.itemId === id && s.studentId === "student-current" && !s.notified);
  if (!existing) {
    db.stockNotifications.push({
      id: `sn_${Date.now()}`,
      itemId: id,
      itemName: item.name,
      studentId: "student-current",
      createdAt: new Date().toISOString(),
      notified: false
    });
  }

  res.json({ success: true, message: `You will be alerted when "${item.name}" is back in stock!` });
});

// ----------------- ORDERS & LIVE QUEUE -----------------
app.get("/api/orders", (req, res) => {
  const { canteenId, studentOnly, priorityOnly } = req.query;
  let orders = [...db.orders];
  if (canteenId) orders = orders.filter((o) => o.canteenId === canteenId);
  if (studentOnly === "true") orders = orders.filter((o) => o.isCurrentUser);
  if (priorityOnly === "true") orders = orders.filter((o) => o.isPriority || o.isFaculty);

  // Priority sorting: Active faculty priority orders bubble to the top of cooking/ready queue
  orders.sort((a, b) => {
    const aActive = ["cooking", "ready", "received", "serving"].includes(a.status);
    const bActive = ["cooking", "ready", "received", "serving"].includes(b.status);
    if (aActive && bActive) {
      if ((a.isPriority || a.isFaculty) && !(b.isPriority || b.isFaculty)) return -1;
      if (!(a.isPriority || a.isFaculty) && (b.isPriority || b.isFaculty)) return 1;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json({ success: true, data: orders });
});

// Live Queue Board with Dedicated Faculty Priority Queue (Slide 8)
app.get("/api/queue/:canteenId", (req, res) => {
  const { canteenId } = req.params;
  const canteen = db.canteens.find((c) => c.id === canteenId);
  const activeOrders = db.orders.filter(
    (o) => o.canteenId === canteenId && ["serving", "ready", "cooking", "received"].includes(o.status)
  );

  // Group by status
  const serving = activeOrders.filter((o) => o.status === "serving");
  const ready = activeOrders.filter((o) => o.status === "ready");
  const cooking = activeOrders.filter((o) => ["cooking", "received"].includes(o.status));

  // Faculty Priority Lane separation
  const facultyQueue = activeOrders.filter((o) => o.isPriority || o.isFaculty);
  const regularQueue = activeOrders.filter((o) => !o.isPriority && !o.isFaculty);

  // Within cooking & ready, prioritize faculty tokens
  cooking.sort((a, b) => {
    if ((a.isPriority || a.isFaculty) && !(b.isPriority || b.isFaculty)) return -1;
    if (!(a.isPriority || a.isFaculty) && (b.isPriority || b.isFaculty)) return 1;
    return 0;
  });

  // Current user order if any
  const myOrder = activeOrders.find((o) => o.isCurrentUser);
  let ordersAhead = 0;
  let estimatedWait = 0;

  if (myOrder) {
    if (myOrder.isPriority || myOrder.isFaculty) {
      // Faculty express calculation
      const facCooking = cooking.filter((o) => o.isPriority || o.isFaculty);
      const idx = facCooking.findIndex((o) => o.id === myOrder.id);
      ordersAhead = Math.max(0, (idx > 0 ? idx : 0));
      estimatedWait = myOrder.estimatedWaitMinutes || 3;
    } else {
      const idx = cooking.findIndex((o) => o.id === myOrder.id);
      ordersAhead = ready.length + (idx > 0 ? idx : 0);
      estimatedWait = myOrder.estimatedWaitMinutes;
    }
  }

  res.json({
    success: true,
    data: {
      canteen,
      serving,
      ready,
      cooking,
      facultyQueue,
      regularQueue,
      myOrder,
      ordersAhead,
      estimatedWait
    }
  });
});

// Create Order (Slide 7: Stock reserved at payment, single-use token generated)
app.post("/api/orders", (req, res) => {
  const { canteenId, items, paymentMethod } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Cart cannot be empty" });
  }

  const canteen = db.canteens.find((c) => c.id === canteenId);
  if (!canteen) return res.status(404).json({ success: false, message: "Invalid canteen" });

  // 1. Verify stock availability
  for (const cartItem of items) {
    const menuItem = db.menuItems.find((m) => m.id === cartItem.id);
    if (!menuItem) {
      return res.status(400).json({ success: false, message: `Item "${cartItem.name}" not found` });
    }
    if (menuItem.stock < cartItem.quantity) {
      return res.status(400).json({
        success: false,
        message: `Sorry, "${menuItem.name}" only has ${menuItem.stock} portions left.`
      });
    }
  }

  // 2. Compute total amount
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 3. Process payment via Wallet or Mock UPI
  if (paymentMethod === "Wallet") {
    if (db.wallet.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance (₹${db.wallet.balance}). Please top up or pay via UPI.`
      });
    }
    db.wallet.balance -= totalAmount;
    db.wallet.transactions.unshift({
      id: `tx_${Date.now()}`,
      type: "debit",
      amount: totalAmount,
      description: `Prepaid Order at ${canteen.name}`,
      timestamp: new Date().toISOString()
    });
  }

  // 4. Reserve stock instantly
  items.forEach((cartItem) => {
    const menuItem = db.menuItems.find((m) => m.id === cartItem.id);
    if (menuItem) menuItem.stock = Math.max(0, menuItem.stock - cartItem.quantity);
  });

  // 5. Generate unique single-use token (e.g. C1-048 or C1-FAC-048)
  const canteenPrefix = canteen.code || (canteenId === "canteen-1" ? "C1" : "C2");
  const existingTokens = db.orders
    .filter((o) => o.canteenId === canteenId)
    .map((o) => {
      const match = o.token.match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    });
  const nextNum = Math.max(42, ...(existingTokens.length ? existingTokens : [42])) + 1;

  const isFacultyOrder =
    Boolean(req.body.isFaculty) ||
    Boolean(req.body.customerRole === "faculty") ||
    Boolean(currentUserSession && currentUserSession.role === "faculty");

  const token = isFacultyOrder
    ? `${canteenPrefix}-FAC-${String(nextNum).padStart(3, "0")}`
    : `${canteenPrefix}-${String(nextNum).padStart(3, "0")}`;

  // 6. Dynamic wait-time calculation (Faculty Priority Queue receives 50% accelerated preparation)
  const waitInfo = calculateWaitTime(canteenId, items);
  const estimatedWait = isFacultyOrder
    ? Math.max(2, Math.round(waitInfo.estimatedMinutes * 0.45))
    : waitInfo.estimatedMinutes;

  const newOrder = {
    id: `ord_${Date.now()}`,
    token,
    canteenId,
    canteenName: canteen.name,
    studentName: req.body.customerName || (currentUserSession ? currentUserSession.name : (isFacultyOrder ? "Dr. Balakrishnan P (Faculty)" : "You (Karthik)")),
    studentRoll: isFacultyOrder
      ? (currentUserSession ? `Faculty (${currentUserSession.username})` : "Faculty Priority Member")
      : (currentUserSession ? currentUserSession.username : "CS24B001"),
    isCurrentUser: true,
    isFaculty: isFacultyOrder,
    isPriority: isFacultyOrder,
    priorityTag: isFacultyOrder ? "⚡ FACULTY VIP PRIORITY" : null,
    items,
    totalAmount,
    paymentMethod: paymentMethod || "Wallet",
    paymentStatus: "paid",
    status: "cooking",
    estimatedWaitMinutes: estimatedWait,
    createdAt: new Date().toISOString(),
    qrCodeData: `CAMPUS_HUB_${token}_SECRET_${Date.now()}`
  };

  db.orders.unshift(newOrder);

  // STRICT PRIVACY COMPLIANCE: Store ONLY non-sensitive high-level spending metrics
  // (orderId, orderTotal, date, canteenId, itemsCount). ZERO banking or credential data stored.
  if (currentUserSession && currentUserSession.role === "student") {
    const studentId = currentUserSession.id || currentUserSession.username;
    db.studentSpending = db.studentSpending || {};
    db.studentSpending[studentId] = db.studentSpending[studentId] || [];
    db.studentSpending[studentId].unshift({
      orderId: newOrder.id,
      token: newOrder.token,
      orderTotal: totalAmount,
      date: newOrder.createdAt,
      canteenName: canteen.name,
      itemsCount: items.length
    });
  }

  // In-app notification
  db.notifications.unshift({
    id: `nt_${Date.now()}`,
    title: isFacultyOrder ? "⚡ Faculty Priority Order Confirmed" : "Order Placed Successfully",
    message: isFacultyOrder
      ? `VIP Token #${token} confirmed in Faculty Priority Queue! Fast-track prep: ~${estimatedWait} min.`
      : `Order #${token} confirmed. Your token is ready! Estimated wait: ~${waitInfo.estimatedMinutes} min.`,
    type: "order",
    timestamp: new Date().toISOString(),
    read: false
  });

  res.json({
    success: true,
    data: newOrder,
    message: `Order confirmed! Pickup token: ${token}`
  });
});

// Update order status (Staff Panel)
app.put("/api/orders/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = db.orders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });

  order.status = status;
  if (status === "ready") {
    order.estimatedWaitMinutes = 0;
    db.notifications.unshift({
      id: `nt_${Date.now()}`,
      title: "Food Ready for Pickup! 🍽️",
      message: `Token #${order.token} is ready at ${order.canteenName} counter. Please collect!`,
      type: "order",
      timestamp: new Date().toISOString(),
      read: false
    });
  } else if (status === "serving") {
    order.estimatedWaitMinutes = 0;
  } else if (status === "collected") {
    order.collectedAt = new Date().toISOString();
  } else if (status === "cancelled") {
    // Auto-refund to wallet (Slide 7)
    db.wallet.balance += order.totalAmount;
    db.wallet.transactions.unshift({
      id: `tx_ref_${Date.now()}`,
      type: "credit",
      amount: order.totalAmount,
      description: `Auto-refund for cancelled order #${order.token}`,
      timestamp: new Date().toISOString()
    });
  }

  res.json({ success: true, data: order });
});

// Verify single-use token at pickup counter (Slide 6, 7)
app.post("/api/orders/verify-token", (req, res) => {
  const { token, canteenId } = req.body;
  if (!token) return res.status(400).json({ success: false, message: "Token is required" });

  const cleanToken = token.trim().toUpperCase();
  const order = db.orders.find((o) => o.token.toUpperCase() === cleanToken);

  if (!order) {
    return res.status(404).json({ success: false, message: `Token "${cleanToken}" not found in system` });
  }

  if (canteenId && order.canteenId !== canteenId) {
    return res.status(400).json({
      success: false,
      message: `Token #${cleanToken} belongs to ${order.canteenName}, not this counter!`
    });
  }

  if (order.status === "collected") {
    return res.status(400).json({
      success: false,
      message: `Token #${cleanToken} has ALREADY been collected on ${new Date(order.collectedAt).toLocaleTimeString()}. Single-use token prevents queue-jumping.`
    });
  }

  if (order.status === "cancelled") {
    return res.status(400).json({ success: false, message: `Token #${cleanToken} was cancelled and refunded.` });
  }

  // Mark as collected
  order.status = "collected";
  order.collectedAt = new Date().toISOString();

  db.notifications.unshift({
    id: `nt_${Date.now()}`,
    title: "Order Collected! Enjoy your meal 🎉",
    message: `Order #${order.token} verified and collected. Thank you for using Smart Campus Hub!`,
    type: "order",
    timestamp: new Date().toISOString(),
    read: false
  });

  res.json({
    success: true,
    data: order,
    message: `Verified successfully! Token #${cleanToken} marked as collected.`
  });
});

// ----------------- WALLET -----------------
app.get("/api/wallet", (req, res) => {
  res.json({ success: true, data: db.wallet });
});

app.post("/api/wallet/topup", (req, res) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  db.wallet.balance += numAmount;
  db.wallet.transactions.unshift({
    id: `tx_${Date.now()}`,
    type: "credit",
    amount: numAmount,
    description: "Wallet Top-up via Fast UPI",
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    data: db.wallet,
    message: `₹${numAmount} successfully added to your campus wallet!`
  });
});

// ----------------- CAMPUS MAP & STORES -----------------
app.get("/api/map", (req, res) => {
  const { category, search } = req.query;
  let locations = [...db.campusLocations];
  if (category && category !== "All") {
    locations = locations.filter((l) => l.category.toLowerCase() === category.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    locations = locations.filter(
      (l) => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.building.toLowerCase().includes(q)
    );
  }
  res.json({ success: true, data: locations });
});

app.post("/api/map", (req, res) => {
  const lat = Number(req.body.lat) || 10.9036;
  const lng = Number(req.body.lng) || 76.8997;
  const newLocation = {
    id: req.body.id || `loc_${Date.now()}`,
    ...req.body,
    lat,
    lng,
    coordinates: {
      x: req.body.coordinates?.x || 50,
      y: req.body.coordinates?.y || 50,
      lat,
      lng
    }
  };

  // If this establishment is a Canteen or Food & Dining, handle relational Canteen creation / link
  if (req.body.createCanteen || req.body.category === 'Food & Dining') {
    const canteenId = req.body.relatedCanteenId || `canteen-${Date.now()}`;
    newLocation.relatedCanteenId = canteenId;
    if (!db.canteens.some(c => c.id === canteenId)) {
      db.canteens.push({
        id: canteenId,
        name: req.body.name,
        code: req.body.code || req.body.name.substring(0, 3).toUpperCase(),
        location: req.body.address || `${req.body.building || 'Campus'}, Amrita Ettimadai`,
        timings: req.body.timings || "08:00 AM - 09:30 PM",
        status: "open",
        crowdLevel: "Low",
        avgWaitTimeMinutes: 5,
        activeOrdersCount: 0,
        counterSpeed: "Normal"
      });
    }
  }

  db.campusLocations.push(newLocation);
  res.json({ success: true, data: newLocation, canteens: db.canteens });
});

app.put("/api/map/:id", (req, res) => {
  const { id } = req.params;
  const idx = db.campusLocations.findIndex((l) => l.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Location not found" });

  const oldLoc = db.campusLocations[idx];
  const lat = req.body.lat !== undefined ? Number(req.body.lat) : oldLoc.lat;
  const lng = req.body.lng !== undefined ? Number(req.body.lng) : oldLoc.lng;

  const updatedLoc = {
    ...oldLoc,
    ...req.body,
    lat,
    lng,
    coordinates: {
      ...(oldLoc.coordinates || {}),
      ...(req.body.coordinates || {}),
      lat,
      lng
    }
  };

  db.campusLocations[idx] = updatedLoc;

  // Relational update: If this location is linked to a canteen (or named/identified as one), sync with Canteen & Staff view!
  const relatedCanteenId = updatedLoc.relatedCanteenId || (id === 'loc-1' ? 'canteen-1' : id === 'loc-2' ? 'canteen-2' : id === 'loc-3' ? 'canteen-3' : id === 'loc-it' ? 'canteen-it' : null);
  
  if (relatedCanteenId) {
    const cIdx = db.canteens.findIndex((c) => c.id === relatedCanteenId);
    if (cIdx !== -1) {
      if (req.body.name) db.canteens[cIdx].name = req.body.name;
      if (req.body.timings) db.canteens[cIdx].timings = req.body.timings;
      if (req.body.address || req.body.building) {
        db.canteens[cIdx].location = req.body.address || `${req.body.building}, Amrita Ettimadai`;
      }
      // Update orders that reference this canteen
      if (req.body.name && db.orders) {
        db.orders.forEach(o => {
          if (o.canteenId === relatedCanteenId) o.canteenName = req.body.name;
        });
      }
    }
  }

  res.json({ success: true, data: db.campusLocations[idx], canteens: db.canteens });
});

app.delete("/api/map/:id", (req, res) => {
  const { id } = req.params;
  const idx = db.campusLocations.findIndex((l) => l.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Location not found" });

  const removed = db.campusLocations.splice(idx, 1)[0];
  res.json({ success: true, data: removed, canteens: db.canteens });
});

// ----------------- LOST & FOUND -----------------
app.get("/api/lost-found", (req, res) => {
  const { type, category, status, search } = req.query;
  let items = [...db.lostAndFound];
  if (type) items = items.filter((i) => i.type === type);
  if (category && category !== "All") items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
  if (status && status !== "All") items = items.filter((i) => i.status === status);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.location.toLowerCase().includes(q));
  }
  res.json({ success: true, data: items });
});

app.post("/api/lost-found", (req, res) => {
  const imageUrl =
    req.body.imageUrl ||
    req.body.photoUrl ||
    req.body.image ||
    (req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` : null) ||
    "https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=500&auto=format&fit=crop&q=80";

  const newItem = {
    id: `lf_${Date.now()}`,
    title: req.body.title,
    type: req.body.type || "found",
    category: req.body.category || "General",
    location: req.body.location,
    lat: req.body.lat ? Number(req.body.lat) : null,
    lng: req.body.lng ? Number(req.body.lng) : null,
    markedOnMap: req.body.markedOnMap === 'true' || Boolean(req.body.markedOnMap),
    date: req.body.date || new Date().toISOString(),
    description: req.body.description,
    reportedBy: req.body.reportedBy || "Student (Karthik)",
    contactInfo: req.body.contactInfo || "student@campus.edu",
    status: "open",
    imageUrl,
    claims: []
  };
  db.lostAndFound.unshift(newItem);
  res.json({ success: true, data: newItem, message: "Item reported successfully to the Lost & Found portal!" });
});

app.post("/api/lost-found/:id/claim", (req, res) => {
  const { id } = req.params;
  const { claimantName, claimantRoll, claimantPhone, proofDetails } = req.body;
  const item = db.lostAndFound.find((i) => i.id === id);
  if (!item) return res.status(404).json({ success: false, message: "Item not found" });

  const claim = {
    id: `claim_${Date.now()}`,
    claimantName: claimantName || "Karthik",
    claimantRoll: claimantRoll || "CS24B001",
    claimantPhone: claimantPhone || "9876543210",
    proofDetails: proofDetails || "Claim submitted via Smart Campus Hub",
    date: new Date().toISOString(),
    status: "pending"
  };

  item.claims.push(claim);
  item.status = "claimed";

  res.json({ success: true, data: claim, message: "Claim request submitted for verification!" });
});

app.put("/api/lost-found/:id/claim/:claimId", (req, res) => {
  const { id, claimId } = req.params;
  const { action } = req.body; // "approve" or "reject"
  const item = db.lostAndFound.find((i) => i.id === id);
  if (!item) return res.status(404).json({ success: false, message: "Item not found" });

  const claim = item.claims.find((c) => c.id === claimId);
  if (!claim) return res.status(404).json({ success: false, message: "Claim not found" });

  if (action === "approve") {
    claim.status = "approved";
    item.status = "verified_returned";
  } else {
    claim.status = "rejected";
    if (item.claims.every((c) => c.status === "rejected")) {
      item.status = "open";
    }
  }

  res.json({ success: true, data: item });
});

// ----------------- CAMPUS ISSUE RESOLUTION SYSTEM -----------------
// 5-Stage Life Cycle: 1. Report -> 2. Route -> 3. Act -> 4. Notify -> 5. Resolve
app.get("/api/issues", (req, res) => {
  try {
    const { category, status, search } = req.query;
    let issues = [...(db.campusIssues || [])];
    if (category && category !== "All") issues = issues.filter((i) => i.category?.toLowerCase() === category.toLowerCase());
    if (status && status !== "All") issues = issues.filter((i) => i.status === status);
    if (search) {
      const q = search.toLowerCase();
      issues = issues.filter((i) => i.title?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.location?.toLowerCase().includes(q));
    }
    issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json({ success: true, data: issues });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error fetching issues", error: err.message });
  }
});

app.post("/api/issues", (req, res) => {
  try {
    const { title, category, location, description, priority, photoUrl } = req.body || {};
    if (!title || !description || !location) {
      return res.status(400).json({ success: false, message: "Title, location and description are required" });
    }

    const count = (db.campusIssues || []).length + 45;
    const ticketNumber = `ISS-2026-${String(count).padStart(3, "0")}`;

    // Department auto-routing based on category
    let department = "Campus Estate Management";
    const catLower = (category || "").toLowerCase();
    if (catLower.includes("wifi") || catLower.includes("it")) {
      department = "Campus IT Network Services";
    } else if (catLower.includes("water") || catLower.includes("plumbing")) {
      department = "Estate & Plumbing Facilities";
    } else if (catLower.includes("electric") || catLower.includes("power")) {
      department = "Electrical Maintenance Cell";
    } else if (catLower.includes("sanitation") || catLower.includes("restroom")) {
      department = "Housekeeping & Campus Hygiene";
    } else if (catLower.includes("classroom") || catLower.includes("projector")) {
      department = "Audio-Visual Technical Team";
    } else if (catLower.includes("tree") || catLower.includes("ground") || catLower.includes("hostel")) {
      department = "Hostel & Grounds Horticulture Cell";
    } else if (catLower.includes("hazard") || catLower.includes("safety")) {
      department = "Campus Safety & Emergency Cell";
    }

    const newIssue = {
      id: `iss_${Date.now()}`,
      ticketNumber,
      title: title.trim(),
      category: category || "General Facilities",
      location: location.trim(),
      lat: req.body.lat ? Number(req.body.lat) : null,
      lng: req.body.lng ? Number(req.body.lng) : null,
      markedOnMap: req.body.markedOnMap === 'true' || Boolean(req.body.markedOnMap),
      description: description.trim(),
      priority: priority || "Medium",
      status: "reported", // Stage 1
      currentStageIndex: 1, // 1: Report, 2: Route, 3: Act, 4: Notify, 5: Resolve
      reportedBy: "Karthik (CS24B001)",
      department,
      assignedStaff: "Pending Route",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : null,
      timeline: [
        {
          stage: "Report",
          status: "reported",
          message: photoUrl
            ? "Issue reported by student with problem details, location marker, and photo attachment."
            : "Issue reported by student with problem details and location marker.",
          timestamp: new Date().toISOString(),
          actor: "Karthik"
        }
      ]
    };

    db.campusIssues.unshift(newIssue);

    db.notifications.unshift({
      id: `nt_${Date.now()}`,
      title: `Campus Issue Created (${ticketNumber})`,
      message: `Your issue "${title}" was logged and queued for administrative routing.`,
      type: "issue",
      timestamp: new Date().toISOString(),
      read: false
    });

    res.status(201).json({
      success: true,
      data: newIssue,
      message: `Issue logged under ticket #${ticketNumber}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error logging issue", error: err.message });
  }
});

// Advance stage / Update issue (5-Stage Lifecycle: Report -> Route -> Act -> Notify -> Resolve)
app.put("/api/issues/:id/stage", (req, res) => {
  try {
    const { id } = req.params;
    const { targetStage, assignedStaff, note } = req.body || {};
    const issue = db.campusIssues.find((i) => i.id === id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

    const now = new Date().toISOString();
    issue.updatedAt = now;

    if (targetStage === "Route" || targetStage === 2) {
      issue.currentStageIndex = 2;
      issue.status = "routed";
      if (assignedStaff) issue.assignedStaff = assignedStaff;
      issue.timeline.push({
        stage: "Route",
        status: "routed",
        message: note || `Routed to ${issue.department}. Assigned staff: ${issue.assignedStaff}.`,
        timestamp: now,
        actor: "Campus Admin"
      });
      db.notifications.unshift({
        id: `nt_${Date.now()}`,
        title: `Issue Routed (${issue.ticketNumber})`,
        message: `Your issue was assigned to ${issue.assignedStaff || issue.department}.`,
        type: "issue",
        timestamp: now,
        read: false
      });
    } else if (targetStage === "Act" || targetStage === 3) {
      issue.currentStageIndex = 3;
      issue.status = "in_progress";
      issue.timeline.push({
        stage: "Act",
        status: "in_progress",
        message: note || "Staff actively addressing the issue on-site.",
        timestamp: now,
        actor: issue.assignedStaff || "Staff"
      });
      db.notifications.unshift({
        id: `nt_${Date.now()}`,
        title: `Work in Progress (${issue.ticketNumber})`,
        message: `Maintenance staff is currently resolving: ${issue.title}`,
        type: "issue",
        timestamp: now,
        read: false
      });
    } else if (targetStage === "Notify" || targetStage === 4) {
      issue.currentStageIndex = 4;
      issue.timeline.push({
        stage: "Notify",
        status: "in_progress",
        message: note || "Work completed and undergoing validation. Student notified.",
        timestamp: now,
        actor: "Operations System"
      });
    } else if (targetStage === "Resolve" || targetStage === 5) {
      issue.currentStageIndex = 5;
      issue.status = "resolved";
      issue.timeline.push({
        stage: "Resolve",
        status: "resolved",
        message: note || "Issue verified and resolved. Ticket closed.",
        timestamp: now,
        actor: "Campus Admin"
      });
      db.notifications.unshift({
        id: `nt_${Date.now()}`,
        title: `Issue Resolved! 🎉 (${issue.ticketNumber})`,
        message: `Your reported issue "${issue.title}" has been marked resolved. Thank you!`,
        type: "issue",
        timestamp: now,
        read: false
      });
    }

    res.status(200).json({ success: true, data: issue });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error updating issue stage", error: err.message });
  }
});

// ----------------- NOTIFICATIONS & STATS -----------------
app.get("/api/notifications", (req, res) => {
  res.json({ success: true, data: db.notifications });
});

app.post("/api/notifications/mark-read", (req, res) => {
  db.notifications.forEach((n) => (n.read = true));
  res.json({ success: true, message: "All notifications marked as read" });
});

app.get("/api/stats", (req, res) => {
  const totalRevenue = db.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const activeOrdersCount = db.orders.filter((o) => ["received", "cooking", "ready", "serving"].includes(o.status)).length;
  const completedOrdersCount = db.orders.filter((o) => o.status === "collected").length;
  const openIssuesCount = db.campusIssues.filter((i) => i.status !== "resolved").length;
  const resolvedIssuesCount = db.campusIssues.filter((i) => i.status === "resolved").length;
  const openLostFoundCount = db.lostAndFound.filter((i) => i.status !== "verified_returned").length;

  res.json({
    success: true,
    data: {
      totalRevenue,
      totalOrders: db.orders.length,
      activeOrdersCount,
      completedOrdersCount,
      openIssuesCount,
      resolvedIssuesCount,
      openLostFoundCount,
      canteens: db.canteens.map((c) => ({
        id: c.id,
        name: c.name,
        crowdLevel: c.crowdLevel,
        avgWaitTime: c.avgWaitTimeMinutes
      }))
    }
  });
});

// Serve frontend client in production if built
const distPath = fs.existsSync(path.join(__dirname, "../dist"))
  ? path.join(__dirname, "../dist")
  : path.join(__dirname, "../client/dist");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) {
      return res.sendFile(path.join(distPath, "index.html"));
    }
    next();
  });
}

// Process-level crash guards to ensure server resilience
process.on('uncaughtException', (err) => {
  console.error('[PROCESS ERROR] Uncaught exception prevented:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[PROCESS ERROR] Unhandled rejection prevented:', reason);
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Campus Hub Server running on http://localhost:${PORT} and network interfaces`);
  });
}

export default app;
