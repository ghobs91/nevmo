import React, { useState, useEffect } from "react";
import {
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
} from "lucide-react";

const API_URL = "http://localhost:3000/api";

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("login");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);

  // Form validation
  const validateLoginForm = () => {
    const errors = {};
    if (!loginData.email) errors.email = "Email is required";
    if (!loginData.email.includes("@")) errors.email = "Invalid email format";
    if (!loginData.password) errors.password = "Password is required";
    return errors;
  };

  const validateRegisterForm = () => {
    const errors = {};
    if (!registerData.name) errors.name = "Name is required";
    if (registerData.name.length < 2)
      errors.name = "Name must be at least 2 characters";
    if (!registerData.email) errors.email = "Email is required";
    if (!registerData.email.includes("@"))
      errors.email = "Invalid email format";
    if (!registerData.password) errors.password = "Password is required";
    if (registerData.password.length < 8)
      errors.password = "Password must be at least 8 characters";
    return errors;
  };

  const validateTransaction = (amount) => {
    if (!amount || isNaN(amount)) return "Invalid amount";
    if (parseFloat(amount) <= 0) return "Amount must be positive";
    return null;
  };

  // API calls with error handling
  const handleLogin = async (e) => {
    e.preventDefault();
    const formErrors = validateLoginForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);
      setBalance(data.user.balance);
      fetchTransactions();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formErrors = validateRegisterForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);
      setBalance(data.user.balance);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async (type) => {
    const validationError = validateTransaction(amount);
    if (validationError) {
      setErrors({ transaction: validationError });
      return;
    }

    if (type === "withdraw" && parseFloat(amount) > balance) {
      setErrors({ transaction: "Insufficient funds" });
      return;
    }

    setTransactionLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_URL}/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `${type} failed`);
      }

      setBalance(data.balance);
      setTransactions([data.transaction, ...transactions]);
      setAmount("");
    } catch (error) {
      setErrors({ transaction: error.message });
    } finally {
      setTransactionLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      setErrors({ transactions: error.message });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchTransactions();
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to Nevmo
            </h1>
            <p className="text-gray-600">Your Digital Payment Solution</p>
          </div>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.submit}
            </div>
          )}

          <div className="flex mb-4">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2 ${
                activeTab === "login"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-500"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-2 ${
                activeTab === "register"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-500"
              }`}
            >
              Register
            </button>
          </div>

          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className={`w-full p-2 border rounded ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  className={`w-full p-2 border rounded ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? "Loading..." : "Login"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Name"
                  className={`w-full p-2 border rounded ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  value={registerData.name}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, name: e.target.value })
                  }
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className={`w-full p-2 border rounded ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, email: e.target.value })
                  }
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  className={`w-full p-2 border rounded ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      password: e.target.value,
                    })
                  }
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? "Loading..." : "Register"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome, {user.name}
            </h2>
            <p className="text-gray-600">Manage your account</p>
          </div>
          <div className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <DollarSign className="h-6 w-6" />
            Balance: ${balance.toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Transactions</h2>

          {errors.transaction && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.transaction}
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded"
            />
            <button
              onClick={() => handleTransaction("deposit")}
              disabled={transactionLoading}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300"
            >
              <ArrowDownCircle className="h-4 w-4" /> Deposit
            </button>
            <button
              onClick={() => handleTransaction("withdraw")}
              disabled={transactionLoading}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-red-300"
            >
              <ArrowUpCircle className="h-4 w-4" /> Withdraw
            </button>
          </div>

          <div>
            <div className="font-semibold flex items-center gap-2 mb-3">
              <History className="h-4 w-4" /> Transaction History
            </div>
            {errors.transactions && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {errors.transactions}
              </div>
            )}
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium capitalize">
                      {transaction.type}
                    </span>
                    <span className="text-gray-500 text-sm ml-2">
                      {new Date(transaction.date).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`font-medium ${
                      transaction.type === "deposit"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "deposit" ? "+" : "-"}$
                    {transaction.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
