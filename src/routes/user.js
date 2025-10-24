import express from "express";

import {
  CreateUser,
  GetAllUsers,
  GetOneUser,
  ResetUserPassword,
  ChangeUserPassword,
  UnblockUser,
  UpdateUser,
  RemoveAgenciesFromUser,
  ActivateUser,
  GetAllMenu,
  BlockUser,
  AddAgencyToUser,
  GetOtherAgenciesOfUser,
  SetRefreshTime,
  GetLoggedUserDetails,
  UpdateLoggedUser,
  BlockIpAddress,
  GetAllRoles,
  ChangeStateUser,
} from "../controllers/userController.js";
import { authenticate, restrict } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").post(authenticate, GetAllUsers);

router.post("/menu", authenticate, GetAllMenu);

router.post("/roles", authenticate, restrict(5), GetAllRoles);
router
  .route("/agencies")
  .post(authenticate, AddAgencyToUser)
  .put(authenticate, RemoveAgenciesFromUser);
router.post("/create", authenticate, restrict(5), CreateUser);
router.post("/detail", authenticate, restrict(5), GetOneUser);
router.post("/detailme", authenticate, GetLoggedUserDetails);
router.post("/other", authenticate, restrict(5), GetOtherAgenciesOfUser);
router.put("/update", authenticate, restrict(5), UpdateUser);
router.put("/updateme", authenticate, UpdateLoggedUser); // modifer ca
router.put("/activate", authenticate, restrict(5), ActivateUser);
router.put("/block", authenticate, BlockUser);
router.put("/blockip", BlockIpAddress);
router.put("/unblock", authenticate, restrict(5), UnblockUser);
router.put("/reset", authenticate, restrict(5), ResetUserPassword);
router.put("/changepassword", authenticate, ChangeUserPassword);
router.put("/refresh", authenticate, SetRefreshTime);
router.put("/state", authenticate, restrict(5), ChangeStateUser);
export default router;
