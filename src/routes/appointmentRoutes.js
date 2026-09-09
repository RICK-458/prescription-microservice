import express from "express"
const router =express.Router();

import { userauthenticate } from "../middlewares/authenticate.js";
import {
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
} from "../controller/appointmentController.js";




// ===============================
// Patient routes
// ===============================

// Book appointment
router.post("/", userauthenticate, bookAppointment);

// Get logged-in patient's appointments
router.get("/my", userauthenticate, getMyAppointments);

// Get doctor's appointments (must precede /:id or it is swallowed by the param route)
router.get("/doctor", userauthenticate, getDoctorAppointments);

// Get single appointment
router.get("/:id", userauthenticate, getAppointmentById);

// Cancel appointment
router.patch("/:id/cancel", userauthenticate, cancelAppointment);


// ===============================
// Doctor routes
// ===============================

// Update appointment status
router.patch("/:id/status", userauthenticate, updateAppointmentStatus);











export default router ;