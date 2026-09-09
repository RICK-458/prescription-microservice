import express from "express"
const router =express.Router();

import { userauthenticate } from "../middlewares/authenticate.js";
import {createPharmacy,getPharmacies,getPharmacy} from "../controller/pharmacyController.js";


router.post("/add", userauthenticate, createPharmacy);

router.get("/", getPharmacies);

router.get("/:id", getPharmacy);






export default router ;