
export interface User {
  id: string;
  userid: string;
  name: string;
  role: string;
  password?: string; // Added for sign-in check
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  total_time: string | null;
  created_at: string;
  notes: string | null; // Added for session notes
}

export interface IdleRecord {
  id: string;
  user_id: string;
  attendance_id: string;
  idle_start: string;
  idle_end: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface IncidentReport {
  id: string;
  created_at: string; // Submission timestamp
  user_id: string;
  user_name: string;
  subject: string;
  body: string;
  image_url: string | null;
  status: 'submitted' | 'in_progress' | 'resolved';
  incident_date: string;
  work_hours: number | null;
}

// Basic Supabase schema typing for better type safety
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: User;
        Update: Partial<User>;
      };
      attendance: {
        Row: AttendanceRecord;
        Insert: Partial<AttendanceRecord> & { user_id: string; clock_in: string };
        Update: Partial<AttendanceRecord>;
      };
      idle_time: {
        Row: IdleRecord;
        Insert: Partial<IdleRecord> & { user_id: string; attendance_id: string; idle_start: string };
        Update: Partial<IdleRecord>;
      };
      incident_reports: {
        Row: IncidentReport;
        Insert: Partial<IncidentReport> & { user_id: string; user_name: string; subject: string; body: string; incident_date: string };
        Update: Partial<IncidentReport>;
      }
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}