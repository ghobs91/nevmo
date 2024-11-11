# Nevmo Payment System

A simple payment system that allows users to manage accounts and perform transactions.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.0 or higher)
- npm or yarn

## Project Structure

```
nevmo/
├── frontend/         # React frontend application
├── backend/         # Node.js/Express backend application
└── README.md
```

## Setup & Running Locally

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Make sure MongoDB is running locally. If you haven't started MongoDB, start it using:
```bash
mongod
```

4. Create a `.env` file in the backend directory with the following content:
```
PORT=8000
MONGODB_URI=mongodb://localhost:27017/nevmo
JWT_SECRET=your-secret-key
```

5. Start the backend server:
```bash
npm start
```

The backend server will run on `http://localhost:8000`

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory with the following content:
```
REACT_APP_API_URL=http://localhost:8000/api
```

4. Start the frontend development server:
```bash
npm start
```

The frontend application will open in your default browser at `http://localhost:3001`

## Testing the Application

1. Create a new account:
   - Click "Create Account" on the login page
   - Fill in your details
   - Submit the form

2. Log in with your credentials

3. Test the following features:
   - View your account balance
   - Make a deposit
   - Make a withdrawal
   - View transaction history

## API Endpoints

The backend provides the following API endpoints:

- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `GET /api/account` - Get user account details
- `GET /api/transactions` - Get user's transaction history
- `POST /api/deposit` - Make a deposit
- `POST /api/withdraw` - Make a withdrawal

## Dependencies

### Backend
- express
- mongoose
- bcryptjs
- jsonwebtoken
- cors
- zod

### Frontend
- react
- lucide-react
- tailwindcss

## License

MIT
