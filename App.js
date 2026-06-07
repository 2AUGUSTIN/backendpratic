const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const StockIn = require('./model/StockIn');
const StockOut = require('./model/StockOut');
const User = require('./model/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3000;

connectDB();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://your-frontend-domain.onrender.com' // Add your frontend URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());
const SECRET = "SECRET_KEY";

/* ==========================
   AUTH MIDDLEWARE
========================== */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.query.token || req.body.token;

    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. No token provided",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    const decoded = jwt.verify(token, SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: error.name === 'TokenExpiredError'
        ? 'Session expired. Please login again'
        : 'Invalid token. Please login again',
    });
  }
};

/* ==========================
   REGISTER
========================== */
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(
      password,
      salt
    );

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

/* ==========================
   LOGIN
========================== */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required",
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

/* ==========================
   PROFILE
========================== */
app.get(
  "/profile",
  authMiddleware,
  async (req, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  }
);

/* ==========================
   LOGOUT
========================== */
app.post("/auth/logout", (req, res) => {
  res.json({
    message: "Logout successful",
  });
});
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// STOCK IN CRUD
app.post('/stock-ins', authMiddleware, async (req, res) => {
  try {
    const stockIn = new StockIn({
      ...req.body,
      userId: req.user._id,
    });
    const savedStockIn = await stockIn.save();
    res.status(201).json(savedStockIn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/stock-ins', authMiddleware, async (req, res) => {
  try {
    const stockIns = await StockIn.find().populate('userId');
    res.json(stockIns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/stock-ins/:id', authMiddleware, async (req, res) => {
  try {
    const stockIn = await StockIn.findById(req.params.id).populate('userId');
    if (!stockIn) {
      return res.status(404).json({ message: 'StockIn not found' });
    }
    res.json(stockIn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/stock-ins/:id', authMiddleware, async (req, res) => {
  try {
    const updatedStockIn = await StockIn.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedStockIn) {
      return res.status(404).json({ message: 'StockIn not found' });
    }
    res.json(updatedStockIn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/stock-ins/:id', authMiddleware, async (req, res) => {
  try {
    const deletedStockIn = await StockIn.findByIdAndDelete(req.params.id);
    if (!deletedStockIn) {
      return res.status(404).json({ message: 'StockIn not found' });
    }
    res.json({ message: 'StockIn deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/stock-ins/:id/stock-outs', authMiddleware, async (req, res) => {
  try {
    const stockOuts = await StockOut.find({ stockInId: req.params.id }).populate('stockInId').populate('userId');
    res.json(stockOuts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// STOCK OUT CRUD
app.post('/stock-outs', authMiddleware, async (req, res) => {
  try {
    const stockOut = new StockOut({
      ...req.body,
      userId: req.user._id,
      stockOutDate: req.body.stockOutDate || new Date(),
    });
    const savedStockOut = await stockOut.save();
    res.status(201).json(savedStockOut);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/stock-outs', authMiddleware, async (req, res) => {
  try {
    const stockOuts = await StockOut.find().populate('stockInId').populate('userId');
    res.json(stockOuts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/stock-outs/:id', authMiddleware, async (req, res) => {
  try {
    const stockOut = await StockOut.findById(req.params.id).populate('stockInId').populate('userId');
    if (!stockOut) {
      return res.status(404).json({ message: 'StockOut not found' });
    }
    res.json(stockOut);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/stock-outs/:id', authMiddleware, async (req, res) => {
  try {
    const updatedStockOut = await StockOut.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedStockOut) {
      return res.status(404).json({ message: 'StockOut not found' });
    }
    res.json(updatedStockOut);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/stock-outs/:id', authMiddleware, async (req, res) => {
  try {
    const deletedStockOut = await StockOut.findByIdAndDelete(req.params.id);
    if (!deletedStockOut) {
      return res.status(404).json({ message: 'StockOut not found' });
    }
    res.json({ message: 'StockOut deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    let updated = await StockIn.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (updated) {
      return res.json(updated);
    }

    updated = await StockOut.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (updated) {
      return res.json(updated);
    }

    res.status(404).json({ message: 'Record not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//report 
app.get("/report", authMiddleware, async (req, res) => {
  try {
    const stockIns = await StockIn.find().populate("userId");
    const stockOuts = await StockOut.find()
      .populate("stockInId")
      .populate("userId");

    const totalQuantityIn = stockIns.reduce(
      (sum, entry) => sum + (entry.totalQuantityIn || entry.quantityIn || 0),
      0
    );
    const totalQuantityOut = stockOuts.reduce(
      (sum, entry) => sum + (entry.totalQuantityOut || entry.quantityOut || 0),
      0
    );

    res.json({
      stockIns,
      stockOuts,
      summary: {
        totalStockIn: totalQuantityIn,
        totalStockOut: totalQuantityOut,
        stockInCount: stockIns.length,
        stockOutCount: stockOuts.length,
        outstandingStock: totalQuantityIn - totalQuantityOut,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const stockIns = await StockIn.find().populate('userId');
    const stockOuts = await StockOut.find().populate('stockInId').populate('userId');

    const totalQuantityIn = stockIns.reduce(
      (sum, entry) => sum + (entry.totalQuantityIn || entry.quantityIn || 0),
      0
    );
    const totalQuantityOut = stockOuts.reduce(
      (sum, entry) => sum + (entry.totalQuantityOut || entry.quantityOut || 0),
      0
    );

    res.json({
      stockIns,
      stockOuts,
      summary: {
        totalStockIn: totalQuantityIn,
        totalStockOut: totalQuantityOut,
        stockInCount: stockIns.length,
        stockOutCount: stockOuts.length,
        outstandingStock: totalQuantityIn - totalQuantityOut,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//user
// GET ALL USERS
app.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});