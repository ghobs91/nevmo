const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { z } = require("zod");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection (use environment variable in production)
mongoose
  .connect("mongodb://localhost:27017/nevmo", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Add this to ensure consistent email casing
    trim: true, // Remove whitespace
  },
  name: { type: String, required: true },
  password: { type: String, required: true, select: false },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
UserSchema.index({ email: 1 }, { unique: true });

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["deposit", "withdraw"], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const User = mongoose.model("User", UserSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

// Create indexes when the application starts
const createIndexes = async () => {
  try {
    await User.createIndexes();
    console.log("Indexes created successfully");
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
};

// Validation Schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const transactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
});

// JWT secret (use environment variable in production)
const JWT_SECRET = "your-secret-key";

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }
  res.status(500).json({ error: "Internal server error" });
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid token" });
  }
};

// Register new user
app.post("/api/register", async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    console.log("Registration attempt for email:", validatedData.email);

    // Clear any existing users with this email (temporary debug fix)
    await User.deleteMany({ email: validatedData.email });

    // Double check the email doesn't exist (with debug logging)
    const existingUser = await User.findOne({ email: validatedData.email });
    console.log("Existing user check result:", existingUser);

    if (existingUser) {
      console.log("Email already exists:", validatedData.email);
      return res.status(400).json({ error: "Email already registered" });
    }

    // Log the user data we're about to save
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    const userData = {
      email: validatedData.email,
      name: validatedData.name,
      password: hashedPassword,
      balance: 0,
    };
    console.log("Creating new user:", { ...userData, password: "[HIDDEN]" });

    const user = new User(userData);
    await user.save();

    console.log("User saved successfully:", user.email);

    const token = jwt.sign({ email: user.email }, JWT_SECRET);
    res.status(201).json({
      token,
      user: {
        email: user.email,
        name: user.name,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    next(error);
  }
});

// Login route
app.post("/api/login", async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Explicitly select the password field (MongoDB might exclude it by default)
    const user = await User.findOne({ email: validatedData.email }).select(
      "+password",
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Add debug logging
    console.log("Login attempt:", {
      email: validatedData.email,
      hasPassword: !!user.password,
      providedPassword: !!validatedData.password,
    });

    // Ensure both passwords exist before comparing
    if (!user.password || !validatedData.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(
      validatedData.password,
      user.password,
    );
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET);
    res.json({
      token,
      user: {
        email: user.email,
        name: user.name,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
});

// Get user account details
app.get("/api/account", authenticateToken, async (req, res) => {
  res.json({
    email: req.user.email,
    name: req.user.name,
    balance: req.user.balance,
  });
});

// Get transaction history
app.get("/api/transactions", authenticateToken, async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ date: -1 })
      .limit(50)
      .lean() // Convert to plain JavaScript objects
      .exec();

    // Format transactions for frontend
    const formattedTransactions = transactions.map((t) => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      date: t.date,
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error("Fetch transactions error:", error);
    next(error);
  }
});

// Process deposit
app.post("/api/deposit", authenticateToken, async (req, res, next) => {
  try {
    const { amount } = transactionSchema.parse(req.body);

    // Update user balance
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { balance: amount } }, // Use atomic increment
      { new: true }, // Return updated document
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: "deposit",
      amount: amount,
    });
    await transaction.save();

    res.json({
      balance: user.balance,
      transaction: {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
      },
    });
  } catch (error) {
    console.error("Deposit error:", error);
    next(error);
  }
});

// Process withdrawal
app.post("/api/withdraw", authenticateToken, async (req, res, next) => {
  try {
    const { amount } = transactionSchema.parse(req.body);

    // First check if user has sufficient balance
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (currentUser.balance < amount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    // Update user balance
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { balance: -amount } }, // Use atomic decrement
      { new: true },
    );

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: "withdraw",
      amount: amount,
    });
    await transaction.save();

    res.json({
      balance: user.balance,
      transaction: {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
      },
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    next(error);
  }
});

mongoose
  .connect("mongodb://localhost:27017/nevmo", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    return createIndexes();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
