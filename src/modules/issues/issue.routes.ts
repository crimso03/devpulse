import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  createIssue,
  deleteIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
} from "./issue.controller";



 const router = Router();

router.post("/", requireAuth, createIssue);
router.get("/", getAllIssues);
router.get("/:id", getSingleIssue);
router.patch("/:id", requireAuth, updateIssue);
router.delete("/:id", requireAuth, deleteIssue);


export default router;