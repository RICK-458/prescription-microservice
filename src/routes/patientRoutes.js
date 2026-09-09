import express from "express"
const router =express.Router();

import { userauthenticate } from "../middlewares/authenticate.js";
import {addPatient} from "../controller/patientController.js";


router.post("/add",userauthenticate,addPatient);





export default router ;