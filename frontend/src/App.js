import React, { useState, useEffect } from "react";
import {
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  LogOut,
} from "lucide-react";

const API_URL = "http://localhost:8000/api";

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Nevmo</h1>
            <p className="text-blue-100">Your Modern Payment Solution</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl">
            {errors.submit && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
                <p className="text-red-700">{errors.submit}</p>
              </div>
            )}

            <div className="p-6">
              {activeTab === "login" ? (
                <>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Welcome back
                  </h2>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        placeholder="Email"
                        className={`w-full p-3 rounded-lg border ${
                          errors.email ? "border-red-500" : "border-gray-200"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                        value={loginData.email}
                        onChange={(e) =>
                          setLoginData({ ...loginData, email: e.target.value })
                        }
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Password"
                        className={`w-full p-3 rounded-lg border ${
                          errors.password ? "border-red-500" : "border-gray-200"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            password: e.target.value,
                          })
                        }
                      />
                      {errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.password}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 mr-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
                      >
                        {loading ? "Logging in..." : "Login"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("register")}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Create Account
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <button
                      onClick={() => setActiveTab("login")}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      ← Back
                    </button>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      Create Account
                    </h2>
                  </div>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Name"
                        className={`w-full p-3 rounded-lg border ${
                          errors.name ? "border-red-500" : "border-gray-200"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                        value={registerData.name}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            name: e.target.value,
                          })
                        }
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email"
                        className={`w-full p-3 rounded-lg border ${
                          errors.email ? "border-red-500" : "border-gray-200"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            email: e.target.value,
                          })
                        }
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Password"
                        className={`w-full p-3 rounded-lg border ${
                          errors.password ? "border-red-500" : "border-gray-200"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            password: e.target.value,
                          })
                        }
                      />
                      {errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.password}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
                    >
                      {loading ? "Creating Account..." : "Create Account"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Nevmo</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-white/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Welcome back</p>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.name}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <DollarSign className="h-8 w-8 text-blue-500" />$
              {balance.toFixed(2)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>

            {errors.transaction && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                {errors.transaction}
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
              <button
                onClick={() => handleTransaction("deposit")}
                disabled={transactionLoading}
                className="flex items-center gap-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <ArrowDownCircle className="h-4 w-4" />
                <span className="hidden md:inline">Deposit</span>
              </button>
              <button
                onClick={() => handleTransaction("withdraw")}
                disabled={transactionLoading}
                className="flex items-center gap-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <ArrowUpCircle className="h-4 w-4" />
                <span className="hidden md:inline">Withdraw</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <History className="h-5 w-5" />
              Transaction History
            </div>
          </div>

          {errors.transactions && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 m-4 text-red-700 text-sm rounded">
              {errors.transactions}
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium capitalize">
                      {transaction.type}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
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
              </div>
            ))}

            {transactions.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No transactions yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
