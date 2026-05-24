import { StatusCodes } from "http-status-codes";
import { pool } from "../../config/db";
import { AppError } from "../../utils/AppError";
import type { JwtUserPayload } from "../auth/auth.interface";
import type {
  CreateIssueBody,
  Issue,
  IssueFilters,
  IssueStatus,
  IssueType,
  IssueWithReporter,
  Reporter,
  UpdateIssueBody,
} from "./issue.interface";

const allowedIssueTypes: IssueType[] = ["bug", "feature_request"];
const allowedIssueStatuses: IssueStatus[] = ["open", "in_progress", "resolved"];

const isIssueType = (value: unknown): value is IssueType => {
  return (
    typeof value === "string" &&
    allowedIssueTypes.includes(value as IssueType)
  );
};

const isIssueStatus = (value: unknown): value is IssueStatus => {
  return (
    typeof value === "string" &&
    allowedIssueStatuses.includes(value as IssueStatus)
  );
};

const parseIssueId = (id: string): number => {
  const issueId = Number(id);

  if (!Number.isInteger(issueId) || issueId <= 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid issue id");
  }

  return issueId;
};

const validateCreateIssue = (payload: CreateIssueBody): void => {
  const { title, description, type } = payload;

  if (!title || typeof title !== "string" || !title.trim()) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Title is required");
  }

  if (title.trim().length > 150) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Title must be maximum 150 characters"
    );
  }

  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length < 20
  ) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Description must be at least 20 characters"
    );
  }

  if (!isIssueType(type)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Type must be bug or feature_request"
    );
  }
};

const attachReportersToIssues = async (
  issues: Issue[]
): Promise<IssueWithReporter[]> => {
  if (issues.length === 0) {
    return [];
  }

  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];

  const reportersResult = await pool.query<Reporter>(
    "SELECT id, name, role FROM users WHERE id = ANY($1::int[])",
    [reporterIds]
  );

  const reporterMap = new Map<number, Reporter>();

  reportersResult.rows.forEach((reporter) => {
    reporterMap.set(reporter.id, reporter);
  });

  return issues.map((issue) => {
    const reporter = reporterMap.get(issue.reporter_id);

    return {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter: reporter || {
        id: issue.reporter_id,
        name: "Unknown",
        role: "contributor",
      },
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    };
  });
};

export const createIssueService = async (
  payload: CreateIssueBody,
  user: JwtUserPayload
): Promise<Issue> => {
  validateCreateIssue(payload);

  const reporterResult = await pool.query<{ id: number }>(
    "SELECT id FROM users WHERE id = $1",
    [user.id]
  );

  const reporter = reporterResult.rows[0];

  if (!reporter) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Reporter account not found");
  }

  const result = await pool.query<Issue>(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [payload.title.trim(), payload.description.trim(), payload.type, user.id]
  );

  const createdIssue = result.rows[0];

  if (!createdIssue) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Issue creation failed"
    );
  }

  return createdIssue;
};

export const getAllIssuesService = async (
  filters: IssueFilters
): Promise<IssueWithReporter[]> => {
  const sort = filters.sort || "newest";

  if (sort !== "newest" && sort !== "oldest") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Sort must be newest or oldest");
  }

  if (filters.type && !isIssueType(filters.type)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Type must be bug or feature_request"
    );
  }

  if (filters.status && !isIssueStatus(filters.status)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Status must be open, in_progress, or resolved"
    );
  }

  const conditions: string[] = [];
  const values: string[] = [];

  if (filters.type) {
    values.push(filters.type);
    conditions.push(`type = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderDirection = sort === "oldest" ? "ASC" : "DESC";

  const result = await pool.query<Issue>(
    `SELECT * FROM issues ${whereClause} ORDER BY created_at ${orderDirection}`,
    values
  );

  return attachReportersToIssues(result.rows);
};

export const getSingleIssueService = async (
  id: string
): Promise<IssueWithReporter> => {
  const issueId = parseIssueId(id);

  const result = await pool.query<Issue>("SELECT * FROM issues WHERE id = $1", [
    issueId,
  ]);

  const issue = result.rows[0];

  if (!issue) {
    throw new AppError(StatusCodes.NOT_FOUND, "Issue not found");
  }

  const issuesWithReporters = await attachReportersToIssues([issue]);

  const issueWithReporter = issuesWithReporters[0];

  if (!issueWithReporter) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to load issue reporter"
    );
  }

  return issueWithReporter;
};

export const updateIssueService = async (
  id: string,
  payload: UpdateIssueBody,
  user: JwtUserPayload
): Promise<Issue> => {
  const issueId = parseIssueId(id);

  const existingIssueResult = await pool.query<Issue>(
    "SELECT * FROM issues WHERE id = $1",
    [issueId]
  );

  const existingIssue = existingIssueResult.rows[0];

  if (!existingIssue) {
    throw new AppError(StatusCodes.NOT_FOUND, "Issue not found");
  }

  if (user.role === "contributor") {
    if (existingIssue.reporter_id !== user.id) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Contributors can update only their own issues"
      );
    }

    if (existingIssue.status !== "open") {
      throw new AppError(
        StatusCodes.CONFLICT,
        "Contributors can update only open issues"
      );
    }

    if (payload.status !== undefined) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Contributors cannot update issue status"
      );
    }
  }

  const setClauses: string[] = [];
  const values: Array<string | number> = [];

  if (payload.title !== undefined) {
    if (
      typeof payload.title !== "string" ||
      !payload.title.trim() ||
      payload.title.trim().length > 150
    ) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Title is required and must be maximum 150 characters"
      );
    }

    values.push(payload.title.trim());
    setClauses.push(`title = $${values.length}`);
  }

  if (payload.description !== undefined) {
    if (
      typeof payload.description !== "string" ||
      payload.description.trim().length < 20
    ) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Description must be at least 20 characters"
      );
    }

    values.push(payload.description.trim());
    setClauses.push(`description = $${values.length}`);
  }

  if (payload.type !== undefined) {
    if (!isIssueType(payload.type)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Type must be bug or feature_request"
      );
    }

    values.push(payload.type);
    setClauses.push(`type = $${values.length}`);
  }

  if (payload.status !== undefined) {
    if (user.role !== "maintainer") {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Only maintainers can update issue status"
      );
    }

    if (!isIssueStatus(payload.status)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Status must be open, in_progress, or resolved"
      );
    }

    values.push(payload.status);
    setClauses.push(`status = $${values.length}`);
  }

  if (setClauses.length === 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "At least one valid field is required"
    );
  }

  values.push(issueId);

  const result = await pool.query<Issue>(
    `UPDATE issues
     SET ${setClauses.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  const updatedIssue = result.rows[0];

  if (!updatedIssue) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Issue update failed"
    );
  }

  return updatedIssue;
};

export const deleteIssueService = async (
  id: string,
  user: JwtUserPayload
): Promise<void> => {
  if (user.role !== "maintainer") {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Only maintainers can delete issues"
    );
  }

  const issueId = parseIssueId(id);

  const result = await pool.query<{ id: number }>(
    "DELETE FROM issues WHERE id = $1 RETURNING id",
    [issueId]
  );

  if ((result.rowCount || 0) === 0) {
    throw new AppError(StatusCodes.NOT_FOUND, "Issue not found");
  }
};