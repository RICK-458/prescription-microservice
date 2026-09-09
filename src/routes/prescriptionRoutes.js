import express from "express";

import { userauthenticate } from "../middlewares/authenticate.js";
import {
  createPrescription,
  getDoctorPrescriptions,
  getPatientPrescriptions,
  getPrescriptionById,
  sendPrescriptionToPharmacy,
} from "../controller/prescriptionController.js";

const router = express.Router();

// ===============================
// Doctor routes
// ===============================

// Issue a prescription
router.post("/", userauthenticate, createPrescription);

// Prescriptions this doctor has issued
router.get("/doctor/mine", userauthenticate, getDoctorPrescriptions);

// ===============================
// Patient routes
// ===============================

// Prescriptions written for this patient
router.get("/patient/mine", userauthenticate, getPatientPrescriptions);

// Forward a prescription to a chosen pharmacy
router.post("/:id/send-to-pharmacy", userauthenticate, sendPrescriptionToPharmacy);

// ===============================
// Shared
// ===============================

// Single prescription — readable by its doctor, its patient, or a pharmacist
// holding an order for it. Registered last so the literal paths above win.
router.get("/:id", userauthenticate, getPrescriptionById);

export default router;
