import express from "express"
const router =express.Router();

import { userauthenticate } from "../middlewares/authenticate.js";
import { addDoctor, getAllDoctors } from "../controller/doctorController.js";


router.post("/add",userauthenticate,addDoctor);
router.get("/get",getAllDoctors)




export default router ;