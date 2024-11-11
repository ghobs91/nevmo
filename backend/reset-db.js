const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/nevmo", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to MongoDB");

    // Drop the entire database
    await mongoose.connection.dropDatabase();
    console.log("Database dropped successfully");

    // Close the connection
    await mongoose.connection.close();
    console.log("Connection closed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
