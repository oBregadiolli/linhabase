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
          description: string | null
          status: 'draft' | 'submitted' | 'approved'
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
          description?: string | null
          status?: 'draft' | 'submitted' | 'approved'
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
          description?: string | null
          status?: 'draft' | 'submitted' | 'approved'
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Timesheet = Database['public']['Tables']['timesheets']['Row']
export type TimesheetInsert = Database['public']['Tables']['timesheets']['Insert']
export type TimesheetUpdate = Database['public']['Tables']['timesheets']['Update']
