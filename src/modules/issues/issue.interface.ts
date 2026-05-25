import type { UserRole } from "../auth/auth.interface";

export type IssueType = "bug" | "feature_request";
export type IssueStatus = "open" | "in_progress" | "resolved";

export interface Issue {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface  Reporter {
  id: number;
  name: string;
  role: UserRole;

  }

export interface IssueWithReporter {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter: Reporter;
  created_at: Date;
  updated_at: Date;

  }

export  interface CreateIssueBody {
  title: string;
  description: string;
  type: IssueType;


   }

export   interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;


}

  export interface IssueFilters { 
  sort?: string;
  type?: string;
  status?: string;


}