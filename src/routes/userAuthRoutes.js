import express from "express"
const router =express.Router();
import { registerUser } from "../controller/userController.js";
import { userauthenticate } from "../middlewares/authenticate.js";



router.get('/me',userauthenticate, (req,res) => res.json(req.user))
router.post('/register',userauthenticate,registerUser)




export default router ;