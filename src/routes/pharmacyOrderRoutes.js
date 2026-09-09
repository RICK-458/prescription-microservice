import express from "express";

import { userauthenticate } from "../middlewares/authenticate.js";
import {
  dispensePharmacyOrder,
  getMyPharmacyOrders,
  getPharmacyOrderById,
  getPharmacyQueue,
  notifyPatientAboutOrder,
  updatePharmacyOrderStatus,
} from "../controller/pharmacyOrderController.js";

const router = express.Router();

// ===============================
// Patient routes
// ===============================

// Orders this patient has sent to pharmacies.
// Must precede /:id or it is swallowed by the param route.
router.get("/mine", userauthenticate, getMyPharmacyOrders);

// ===============================
// Pharmacist routes
// ===============================

// Incoming queue for the pharmacist's own pharmacy (?status= to filter)
router.get("/", userauthenticate, getPharmacyQueue);

// Single order with line items and live stock
router.get("/:id", userauthenticate, getPharmacyOrderById);

// Move an order along: pending -> accepted -> processing -> ready -> completed
router.patch("/:id/status", userauthenticate, updatePharmacyOrderStatus);

// Hand medicines over and draw down inventory
router.post("/:id/dispense", userauthenticate, dispensePharmacyOrder);

// Quick message to the patient about their order
router.post("/:id/notify", userauthenticate, notifyPatientAboutOrder);

export default router;
