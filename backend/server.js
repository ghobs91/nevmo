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
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["deposit", "withdraw"], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const User = mongoose.model("User", UserSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);

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

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    const user = new User({
      ...validatedData,
      password: hashedPassword,
    });

    await user.save();

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
    next(error);
  }
});

// Login
app.post("/api/login", async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const user = await User.findOne({ email: validatedData.email });

    if (!user) {
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
      .limit(50);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Process deposit
app.post("/api/deposit", authenticateToken, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = transactionSchema.parse(req.body);

    const user = await User.findById(req.user._id).session(session);
    user.balance += amount;
    await user.save();

    const transaction = new Transaction({
      userId: user._id,
      type: "deposit",
      amount,
    });
    await transaction.save({ session });

    await session.commitTransaction();
    res.json({
      balance: user.balance,
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// Process withdrawal
app.post("/api/withdraw", authenticateToken, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = transactionSchema.parse(req.body);

    const user = await User.findById(req.user._id).session(session);
    if (amount > user.balance) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    user.balance -= amount;
    await user.save();

    const transaction = new Transaction({
      userId: user._id,
      type: "withdraw",
      amount,
    });
    await transaction.save({ session });

    await session.commitTransaction();
    res.json({
      balance: user.balance,
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
