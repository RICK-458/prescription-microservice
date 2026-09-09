import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";


import userAuthRoutes from "./routes/userAuthRoutes.js";
import doctorRoutes from  "./routes/doctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import pharmacyRoutes from "./routes/pharmacyRoutes.js"
import pharmacistRoutes from "./routes/pharrmacistRoutes.js"
import appointmentRoutes from "./routes/appointmentRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import pharmacyOrderRoutes from "./routes/pharmacyOrderRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { clerkMiddleware } from "@clerk/express";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Security and utility middlewares
app.use(helmet()); // Sets secure HTTP headers
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(morgan("dev")); // Logs HTTP requests

// Body parsing middleware
app.use(express.json());
app.use(clerkMiddleware());


// Routes
app.use("/api/v1/user", userAuthRoutes);
app.use("/api/v1/user/doctor", doctorRoutes);
app.use("/api/v1/user/patient", patientRoutes);
app.use("/api/v1/appointments",appointmentRoutes);
app.use("/api/v1/pharmacies",pharmacyRoutes)
app.use("/api/v1/pharmacist",pharmacistRoutes)
app.use("/api/v1/prescriptions", prescriptionRoutes);
app.use("/api/v1/pharmacy-orders", pharmacyOrderRoutes);
app.use("/api/v1/notifications", notificationRoutes);
// Add patient routes here when you create them
// import patientRoutes from "./routes/patientRoutes.js";
// app.use("/api/v1/patient", patientRoutes);

// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Global Error Handler (must be the last middleware)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server started on port: ${port}`);
});
