import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/sendResponse";
import {
  createIssueService,
  deleteIssueService,
  getAllIssuesService,
  getSingleIssueService,
  updateIssueService,
} from "./issue.service";
import type {
  CreateIssueBody,
  IssueFilters,
  UpdateIssueBody,
} from "./issue.interface";



const getIssueIdFromParams = (req: Request): string => {

    const issueId = req.params.id;

  if (typeof issueId !== "string" || !issueId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Issue id is required");
  }

  return issueId;


};

export const  createIssue = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const issue = await  createIssueService(req.body as CreateIssueBody, req.user);

  return sendSuccess(
    res,
    StatusCodes.CREATED,
    "Issue created successfully",
    issue
      );


});

export const getAllIssues = catchAsync(async (req: Request, res: Response) => {
    const filters: IssueFilters = {};

  if (typeof req.query.sort === "string") {
    filters.sort = req.query.sort;

    }

  if (typeof req.query.type === "string") {
    filters.type = req.query.type;

  }

  if (typeof req.query.status === "string") {
    filters.status = req.query.status;

  }



  const issues = await getAllIssuesService(filters);

  return sendSuccess(
    res,
    StatusCodes.OK,
    "Issues retrived successfully",
    issues
  );

});


export const getSingleIssue = catchAsync(
  async (req: Request, res: Response) => {
    const issueId = getIssueIdFromParams(req);
    const issue = await getSingleIssueService(issueId);


    return  sendSuccess(
      res,
      StatusCodes.OK,
      "Issue retrived successfully",
      issue

    );
  }


);

export const updateIssue = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const issueId = getIssueIdFromParams(req);

  const issue = await updateIssueService(
    issueId,
    req.body as UpdateIssueBody,
    req.user
  );

  return sendSuccess(
    res,
    StatusCodes.OK,
    "Issue updated successfully",
    issue

  );

});

export const deleteIssue = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

    const issueId = getIssueIdFromParams(req);

   await  deleteIssueService(issueId, req.user);

  return sendSuccess(res, StatusCodes.OK, "Issue deleted successfully");



});
