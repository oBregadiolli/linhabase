export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'user' | 'admin'
          created_at: string
          active_company_id: string | null
          avatar_url: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          id: string
          name?: string
          email?: string
          role?: 'user' | 'admin'
          created_at?: string
          active_company_id?: string | null
          avatar_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'user' | 'admin'
          created_at?: string
          active_company_id?: string | null
          avatar_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_active_company_id_fkey'
            columns: ['active_company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      timesheets: {
        Row: {
          id: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          duration_minutes: number | null
          project_id: string | null
          description: string | null
          status: 'draft' | 'submitted' | 'approved' | 'rejected'
          rejection_reason: string | null
          company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          duration_minutes?: number | null
          project_id?: string | null
          description?: string | null
          status?: 'draft' | 'submitted' | 'approved' | 'rejected'
          rejection_reason?: string | null
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number | null
          project_id?: string | null
          description?: string | null
          status?: 'draft' | 'submitted' | 'approved' | 'rejected'
          rejection_reason?: string | null
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'timesheets_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'timesheets_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'timesheets_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      // ── Multi-company tables ──────────────────────────────────
      companies: {
        Row: {
          id: string
          name: string
          owner_id: string
          slug: string | null
          logo_url: string | null
          plan: 'free' | 'pro' | 'enterprise'
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          slug?: string | null
          logo_url?: string | null
          plan?: 'free' | 'pro' | 'enterprise'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          slug?: string | null
          logo_url?: string | null
          plan?: 'free' | 'pro' | 'enterprise'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          id: string
          company_id: string
          user_id: string | null
          email: string
          role: 'owner' | 'admin' | 'manager' | 'member'
          status: 'pending' | 'active' | 'inactive'
          invited_at: string
          joined_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          user_id?: string | null
          email: string
          role?: 'owner' | 'admin' | 'manager' | 'member'
          status?: 'pending' | 'active' | 'inactive'
          invited_at?: string
          joined_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string | null
          email?: string
          role?: 'owner' | 'admin' | 'manager' | 'member'
          status?: 'pending' | 'active' | 'inactive'
          invited_at?: string
          joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'company_members_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      invitations: {
        Row: {
          id: string
          company_id: string
          email: string
          token: string
          role: string
          expires_at: string
          accepted_at: string | null
          revoked_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          email: string
          token: string
          role?: string
          expires_at: string
          accepted_at?: string | null
          revoked_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          token?: string
          role?: string
          expires_at?: string
          accepted_at?: string | null
          revoked_at?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          id: string
          company_id: string
          name: string
          color: string | null
          active: boolean
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          color?: string | null
          active?: boolean
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          color?: string | null
          active?: boolean
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
      activity_log: {
        Row: {
          id: string
          company_id: string
          user_id: string | null
          action: string
          target_type: string | null
          target_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id?: string | null
          action: string
          target_type?: string | null
          target_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string | null
          action?: string
          target_type?: string | null
          target_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_log_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { token_input: string }
        Returns: Json
      }
      lookup_invitation_by_token: {
        Args: { token_input: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ── Convenience aliases ─────────────────────────────────────────
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Timesheet = Database['public']['Tables']['timesheets']['Row']
export type TimesheetInsert = Database['public']['Tables']['timesheets']['Insert']
export type TimesheetUpdate = Database['public']['Tables']['timesheets']['Update']

export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']

export type CompanyMember = Database['public']['Tables']['company_members']['Row']
export type CompanyMemberInsert = Database['public']['Tables']['company_members']['Insert']

export type Invitation = Database['public']['Tables']['invitations']['Row']
export type InvitationInsert = Database['public']['Tables']['invitations']['Insert']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']

export type ActivityLog = Database['public']['Tables']['activity_log']['Row']
export type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert']

// ── Role type for company_members (matches DB CHECK constraint) ──
export type CompanyRole = 'owner' | 'admin' | 'manager' | 'member'

// ── Plan type for companies (matches DB CHECK constraint) ────────
export type CompanyPlan = 'free' | 'pro' | 'enterprise'

// ── Timesheet status (matches DB CHECK constraint) ──────────────
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
