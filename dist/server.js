
      import { createRequire } from "module";
      const require = createRequire(import.meta.url);
    

// src/app.ts
import express from "express";
import cors from "cors";

// src/modules/auth/auth.routes.ts
import { Router } from "express";

// src/modules/auth/auth.controller.ts
import { StatusCodes as StatusCodes2 } from "http-status-codes";

// src/utils/catchAsync.ts
var catchAsync = (controller) => {
  return (req, res, next) => {
    Promise.resolve(controller(req, res, next)).catch(next);
  };
};

// src/utils/sendResponse.ts
var sendSuccess = (res, statusCode, message, data) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data !== void 0 && { data }
  });
};
var sendError = (res, statusCode, message, errors) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...errors !== void 0 && { errors }
  });
};

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

// src/config/db.ts
import pg from "pg";

// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();
var env = {
  port: process.env.PORT || "5000",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  nodeEnv: process.env.NODE_ENV || "development"
};
if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}
if (!env.jwtSecret) {
  throw new Error("JWT_SECRET is missing");
}
if (env.bcryptSaltRounds < 8 || env.bcryptSaltRounds > 12) {
  throw new Error("BCRYPT_SALT_ROUNDS must be between 8 and 12");
}

// src/config/db.ts
var { Pool } = pg;
var pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});
var connectDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query("SELECT NOW()");
    console.log("Database connected successfully");
  } finally {
    client.release();
  }
};

// src/utils/AppError.ts
var AppError = class extends Error {
  statusCode;
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
};

// src/modules/auth/auth.service.ts
var allowedRoles = ["contributor", "maintainer"];
var isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
var toPublicUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
};
var signupService = async (payload) => {
  const { name, email, password, role } = payload;
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Name is required");
  }
  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Valid email is required");
  }
  if (!password || typeof password !== "string") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Password is required");
  }
  const selectedRole = role || "contributor";
  if (!allowedRoles.includes(selectedRole)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Role must be contributor or maintainer"
    );
  }
  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email.toLowerCase()]
  );
  if ((existingUser.rowCount || 0) > 0) {
    throw new AppError(StatusCodes.CONFLICT, "Email already exists");
  }
  const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name.trim(), email.toLowerCase(), hashedPassword, selectedRole]
  );
  const createdUser = result.rows[0];
  if (!createdUser) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "User registration failed"
    );
  }
  return createdUser;
};
var loginService = async (payload) => {
  const { email, password } = payload;
  if (!email || typeof email !== "string") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Email is required");
  }
  if (!password || typeof password !== "string") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Password is required");
  }
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email.toLowerCase()
  ]);
  const user = result.rows[0];
  if (!user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }
  const isPasswordMatched = await bcrypt.compare(password, user.password);
  if (!isPasswordMatched) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }
  const tokenPayload = {
    id: user.id,
    name: user.name,
    role: user.role
  };
  const signOptions = {
    expiresIn: env.jwtExpiresIn
  };
  const token = jwt.sign(tokenPayload, env.jwtSecret, signOptions);
  return {
    token,
    user: toPublicUser(user)
  };
};

// src/modules/auth/auth.controller.ts
var signup = catchAsync(async (req, res) => {
  const user = await signupService(req.body);
  return sendSuccess(
    res,
    StatusCodes2.CREATED,
    "User registered successfully",
    user
  );
});
var login = catchAsync(async (req, res) => {
  const loginData = await loginService(req.body);
  return sendSuccess(res, StatusCodes2.OK, "Login successful", loginData);
});

// src/modules/auth/auth.routes.ts
var router = Router();
router.post("/signup", signup);
router.post("/login", login);
var auth_routes_default = router;

// src/modules/issues/issue.routes.ts
import { Router as Router2 } from "express";

// src/middleware/auth.middleware.ts
import jwt2 from "jsonwebtoken";
import { StatusCodes as StatusCodes3 } from "http-status-codes";
var allowedRoles2 = ["contributor", "maintainer"];
var requireAuth = (req, _res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new AppError(StatusCodes3.UNAUTHORIZED, "Authorization token missing");
    }
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : authorization;
    if (!token) {
      throw new AppError(StatusCodes3.UNAUTHORIZED, "Authorization token missing");
    }
    const decoded = jwt2.verify(token, env.jwtSecret);
    if (typeof decoded !== "object" || decoded === null) {
      throw new AppError(StatusCodes3.UNAUTHORIZED, "Invalid token");
    }
    const user = decoded;
    if (!user.id || !user.name || !allowedRoles2.includes(user.role)) {
      throw new AppError(StatusCodes3.UNAUTHORIZED, "Invalid token payload");
    }
    req.user = {
      id: user.id,
      name: user.name,
      role: user.role
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError(StatusCodes3.UNAUTHORIZED, "Invalid or expired token"));
  }
};

// src/modules/issues/issue.controller.ts
import { StatusCodes as StatusCodes5 } from "http-status-codes";

// src/modules/issues/issue.service.ts
import { StatusCodes as StatusCodes4 } from "http-status-codes";
var allowedIssueTypes = ["bug", "feature_request"];
var allowedIssueStatuses = ["open", "in_progress", "resolved"];
var isIssueType = (value) => {
  return typeof value === "string" && allowedIssueTypes.includes(value);
};
var isIssueStatus = (value) => {
  return typeof value === "string" && allowedIssueStatuses.includes(value);
};
var parseIssueId = (id) => {
  const issueId = Number(id);
  if (!Number.isInteger(issueId) || issueId <= 0) {
    throw new AppError(StatusCodes4.BAD_REQUEST, "Invalid issue id");
  }
  return issueId;
};
var validateCreateIssue = (payload) => {
  const { title, description, type } = payload;
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new AppError(StatusCodes4.BAD_REQUEST, "Title is required");
  }
  if (title.trim().length > 150) {
    throw new AppError(
      StatusCodes4.BAD_REQUEST,
      "Title must be maximum 150 characters"
    );
  }
  if (!description || typeof description !== "string" || description.trim().length < 20) {
    throw new AppError(
      StatusCodes4.BAD_REQUEST,
      "Description must be at least 20 characters"
    );
  }
  if (!isIssueType(type)) {
    throw new AppError(
      StatusCodes4.BAD_REQUEST,
      "Type must be bug or feature_request"
    );
  }
};
var attachReportersToIssues = async (issues) => {
  if (issues.length === 0) {
    return [];
  }
  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];
  const reportersResult = await pool.query(
    "SELECT id, name, role FROM users WHERE id = ANY($1::int[])",
    [reporterIds]
  );
  const reporterMap = /* @__PURE__ */ new Map();
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
        role: "contributor"
      },
      created_at: issue.created_at,
      updated_at: issue.updated_at
    };
  });
};
var createIssueService = async (payload, user) => {
  validateCreateIssue(payload);
  const reporterResult = await pool.query(
    "SELECT id FROM users WHERE id = $1",
    [user.id]
  );
  const reporter = reporterResult.rows[0];
  if (!reporter) {
    throw new AppError(StatusCodes4.UNAUTHORIZED, "Reporter account not found");
  }
  const result = await pool.query(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [payload.title.trim(), payload.description.trim(), payload.type, user.id]
  );
  const createdIssue = result.rows[0];
  if (!createdIssue) {
    throw new AppError(
      StatusCodes4.INTERNAL_SERVER_ERROR,
      "Issue creation failed"
    );
  }
  return createdIssue;
};
var getAllIssuesService = async (filters) => {
  const sort = filters.sort || "newest";
  if (sort !== "newest" && sort !== "oldest") {
    throw new AppError(StatusCodes4.BAD_REQUEST, "Sort must be newest or oldest");
  }
  if (filters.type && !isIssueType(filters.type)) {
    throw new AppError(
      StatusCodes4.BAD_REQUEST,
      "Type must be bug or feature_request"
    );
  }
  if (filters.status && !isIssueStatus(filters.status)) {
    throw new AppError(
      StatusCodes4.BAD_REQUEST,
      "Status must be open, in_progress, or resolved"
    );
  }
  const conditions = [];
  const values = [];
  if (filters.type) {
    values.push(filters.type);
    conditions.push(`type = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderDirection = sort === "oldest" ? "ASC" : "DESC";
  const result = await pool.query(
    `SELECT * FROM issues ${whereClause} ORDER BY created_at ${orderDirection}`,
    values
  );
  return attachReportersToIssues(result.rows);
};
var getSingleIssueService = async (id) => {
  const issueId = parseIssueId(id);
  const result = await pool.query("SELECT * FROM issues WHERE id = $1", [
    issueId
  ]);
  const issue = result.rows[0];
  if (!issue) {
    throw new AppError(StatusCodes4.NOT_FOUND, "Issue not found");
  }
  const issuesWithReporters = await attachReportersToIssues([issue]);
  const issueWithReporter = issuesWithReporters[0];
  if (!issueWithReporter) {
    throw new AppError(
      StatusCodes4.INTERNAL_SERVER_ERROR,
      "Failed to load issue reporter"
    );
  }
  return issueWithReporter;
};
var updateIssueService = async (id, payload, user) => {
  const issueId = parseIssueId(id);
  const existingIssueResult = await pool.query(
    "SELECT * FROM issues WHERE id = $1",
    [issueId]
  );
  const existingIssue = existingIssueResult.rows[0];
  if (!existingIssue) {
    throw new AppError(StatusCodes4.NOT_FOUND, "Issue not found");
  }
  if (user.role === "contributor") {
    if (existingIssue.reporter_id !== user.id) {
      throw new AppError(
        StatusCodes4.FORBIDDEN,
        "Contributors can update only their own issues"
      );
    }
    if (existingIssue.status !== "open") {
      throw new AppError(
        StatusCodes4.CONFLICT,
        "Contributors can update only open issues"
      );
    }
    if (payload.status !== void 0) {
      throw new AppError(
        StatusCodes4.FORBIDDEN,
        "Contributors cannot update issue status"
      );
    }
  }
  const setClauses = [];
  const values = [];
  if (payload.title !== void 0) {
    if (typeof payload.title !== "string" || !payload.title.trim() || payload.title.trim().length > 150) {
      throw new AppError(
        StatusCodes4.BAD_REQUEST,
        "Title is required and must be maximum 150 characters"
      );
    }
    values.push(payload.title.trim());
    setClauses.push(`title = $${values.length}`);
  }
  if (payload.description !== void 0) {
    if (typeof payload.description !== "string" || payload.description.trim().length < 20) {
      throw new AppError(
        StatusCodes4.BAD_REQUEST,
        "Description must be at least 20 characters"
      );
    }
    values.push(payload.description.trim());
    setClauses.push(`description = $${values.length}`);
  }
  if (payload.type !== void 0) {
    if (!isIssueType(payload.type)) {
      throw new AppError(
        StatusCodes4.BAD_REQUEST,
        "Type must be bug or feature_request"
      );
    }
    values.push(payload.type);
    setClauses.push(`type = $${values.length}`);
  }
  if (payload.status !== void 0) {
    if (user.role !== "maintainer") {
      throw new AppError(
        StatusCodes4.FORBIDDEN,
        "Only maintainers can update issue status"
      );
    }
    if (!isIssueStatus(payload.status)) {
      throw new AppError(
        StatusCodes4.BAD_REQUEST,
        "Status must be open, in_progress, or resolved"
      );
    }
    values.push(payload.status);
    setClauses.push(`status = $${values.length}`);
  }
  if (setClauses.length === 0) {
    throw new AppError(
      StatusCodes4.BAD_REQUEST,
      "At least one valid field is required"
    );
  }
  values.push(issueId);
  const result = await pool.query(
    `UPDATE issues
     SET ${setClauses.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );
  const updatedIssue = result.rows[0];
  if (!updatedIssue) {
    throw new AppError(
      StatusCodes4.INTERNAL_SERVER_ERROR,
      "Issue update failed"
    );
  }
  return updatedIssue;
};
var deleteIssueService = async (id, user) => {
  if (user.role !== "maintainer") {
    throw new AppError(
      StatusCodes4.FORBIDDEN,
      "Only maintainers can delete issues"
    );
  }
  const issueId = parseIssueId(id);
  const result = await pool.query(
    "DELETE FROM issues WHERE id = $1 RETURNING id",
    [issueId]
  );
  if ((result.rowCount || 0) === 0) {
    throw new AppError(StatusCodes4.NOT_FOUND, "Issue not found");
  }
};

// src/modules/issues/issue.controller.ts
var getIssueIdFromParams = (req) => {
  const issueId = req.params.id;
  if (typeof issueId !== "string" || !issueId) {
    throw new AppError(StatusCodes5.BAD_REQUEST, "Issue id is required");
  }
  return issueId;
};
var createIssue = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(StatusCodes5.UNAUTHORIZED, "Authentication required");
  }
  const issue = await createIssueService(req.body, req.user);
  return sendSuccess(
    res,
    StatusCodes5.CREATED,
    "Issue created successfully",
    issue
  );
});
var getAllIssues = catchAsync(async (req, res) => {
  const filters = {};
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
    StatusCodes5.OK,
    "Issues retrived successfully",
    issues
  );
});
var getSingleIssue = catchAsync(
  async (req, res) => {
    const issueId = getIssueIdFromParams(req);
    const issue = await getSingleIssueService(issueId);
    return sendSuccess(
      res,
      StatusCodes5.OK,
      "Issue retrived successfully",
      issue
    );
  }
);
var updateIssue = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(StatusCodes5.UNAUTHORIZED, "Authentication required");
  }
  const issueId = getIssueIdFromParams(req);
  const issue = await updateIssueService(
    issueId,
    req.body,
    req.user
  );
  return sendSuccess(
    res,
    StatusCodes5.OK,
    "Issue updated successfully",
    issue
  );
});
var deleteIssue = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(StatusCodes5.UNAUTHORIZED, "Authentication required");
  }
  const issueId = getIssueIdFromParams(req);
  await deleteIssueService(issueId, req.user);
  return sendSuccess(res, StatusCodes5.OK, "Issue deleted successfully");
});

// src/modules/issues/issue.routes.ts
var router2 = Router2();
router2.post("/", requireAuth, createIssue);
router2.get("/", getAllIssues);
router2.get("/:id", getSingleIssue);
router2.patch("/:id", requireAuth, updateIssue);
router2.delete("/:id", requireAuth, deleteIssue);
var issue_routes_default = router2;

// src/middleware/notFound.middleware.ts
import { StatusCodes as StatusCodes6 } from "http-status-codes";
var notFoundMiddleware = (req, res) => {
  return sendError(
    res,
    StatusCodes6.NOT_FOUND,
    `Route ${req.originalUrl} not found`
  );
};

// src/middleware/error.middleware.ts
import { StatusCodes as StatusCodes7 } from "http-status-codes";
var errorMiddleware = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message);
  }
  const databaseError = err;
  if (databaseError.code === "23505") {
    return sendError(
      res,
      StatusCodes7.CONFLICT,
      "Duplicate resource",
      databaseError.detail
    );
  }
  if (databaseError.code === "23514") {
    return sendError(
      res,
      StatusCodes7.BAD_REQUEST,
      "Database validation failed",
      databaseError.detail
    );
  }
  console.error(err);
  return sendError(
    res,
    StatusCodes7.INTERNAL_SERVER_ERROR,
    "Internal server error"
  );
};

// src/app.ts
var app = express();
app.use(cors());
app.use(express.json());
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "DevPulse API running"
  });
});
app.use("/api/auth", auth_routes_default);
app.use("/api/issues", issue_routes_default);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
var app_default = app;

// src/server.ts
var startServer = async () => {
  try {
    await connectDatabase();
    app_default.listen(Number(env.port), () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
startServer();
//# sourceMappingURL=server.js.map