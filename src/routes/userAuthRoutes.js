import express from "express"
const router =express.Router();
import { registerUser, getMyProfile } from "../controller/userController.js";
import { userauthenticate } from "../middlewares/authenticate.js";



router.get('/me', userauthenticate, getMyProfile)
router.post('/register',userauthenticate,registerUser)




export default router ;