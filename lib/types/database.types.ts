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
        }
        Insert: {
          id: string
          name?: string
          email?: string
          role?: 'user' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'user' | 'admin'
          created_at?: string
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          id: string
          user_id: string
          date: string
          start_time: string
          end_time: string
          duration_minutes: number | null
          project: string
          project_id: string | null   // Phase 2: FK to projects.id (nullable – transition)
          description: string | null
          status: 'draft' | 'submitted' | 'approved'
          rejection_reason: string | null
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
          project: string
          project_id?: string | null
          description?: string | null
          status?: 'draft' | 'submitted' | 'approved'
          rejection_reason?: string | null
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
          project?: string
          project_id?: string | null
          description?: string | null
          status?: 'draft' | 'submitted' | 'approved'
          rejection_reason?: string | null
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
        ]
      }
      // ── Phase 2: Multi-company tables ───────────────────────
      companies: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          id: string
          company_id: string
          user_id: string | null
          email: string
          role: 'admin' | 'member'
          status: 'pending' | 'active' | 'inactive'
          invited_at: string
          joined_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          user_id?: string | null
          email: string
          role?: 'admin' | 'member'
          status?: 'pending' | 'active' | 'inactive'
          invited_at?: string
          joined_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string | null
          email?: string
          role?: 'admin' | 'member'
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

// ── MVP convenience aliases (unchanged) ─────────────────────
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Timesheet = Database['public']['Tables']['timesheets']['Row']
export type TimesheetInsert = Database['public']['Tables']['timesheets']['Insert']
export type TimesheetUpdate = Database['public']['Tables']['timesheets']['Update']

// ── Phase 2 aliases ─────────────────────────────────────────
export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']

export type CompanyMember = Database['public']['Tables']['company_members']['Row']
export type CompanyMemberInsert = Database['public']['Tables']['company_members']['Insert']

export type Invitation = Database['public']['Tables']['invitations']['Row']
export type InvitationInsert = Database['public']['Tables']['invitations']['Insert']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
