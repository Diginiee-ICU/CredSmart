// Proposed additions to Database["public"]["Tables"] in src/integrations/supabase/types.ts
// Position 1: Between crm_geolocations and crm_permissions
      crm_payroll_runs: {
        Row: {
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          month_year: string
          notes: string | null
          org_id: string
          staff_count: number | null
          status: string
          total_payout: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month_year: string
          notes?: string | null
          org_id: string
          staff_count?: number | null
          status?: string
          total_payout?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month_year?: string
          notes?: string | null
          org_id?: string
          staff_count?: number | null
          status?: string
          total_payout?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_payroll_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_payslips: {
        Row: {
          absent_days: number
          advance_deduction: number
          bonus_amount: number
          created_at: string
          esi_deduction: number
          gross_salary: number
          half_days: number
          id: string
          lop_days: number
          lop_deduction: number
          month_year: string
          net_salary: number
          org_id: string
          overtime_amount: number
          overtime_minutes: number
          paid_at: string | null
          payment_status: string
          payroll_run_id: string
          pf_deduction: number
          present_days: number
          salary_profile_snapshot: Json
          staff_id: string
          updated_at: string
          working_days_in_month: number
        }
        Insert: {
          absent_days?: number
          advance_deduction?: number
          bonus_amount?: number
          created_at?: string
          esi_deduction?: number
          gross_salary?: number
          half_days?: number
          id?: string
          lop_days?: number
          lop_deduction?: number
          month_year: string
          net_salary?: number
          org_id: string
          overtime_amount?: number
          overtime_minutes?: number
          paid_at?: string | null
          payment_status?: string
          payroll_run_id: string
          pf_deduction?: number
          present_days?: number
          salary_profile_snapshot: Json
          staff_id: string
          updated_at?: string
          working_days_in_month: number
        }
        Update: {
          absent_days?: number
          advance_deduction?: number
          bonus_amount?: number
          created_at?: string
          esi_deduction?: number
          gross_salary?: number
          half_days?: number
          id?: string
          lop_days?: number
          lop_deduction?: number
          month_year?: string
          net_salary?: number
          org_id?: string
          overtime_amount?: number
          overtime_minutes?: number
          paid_at?: string | null
          payment_status?: string
          payroll_run_id?: string
          pf_deduction?: number
          present_days?: number
          salary_profile_snapshot?: Json
          staff_id?: string
          updated_at?: string
          working_days_in_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_payslips_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "crm_payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }

// Position 2: Between crm_roles and crm_staff_roles
      crm_salary_adjustments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          id: string
          month_year: string | null
          org_id: string
          requested_by: string | null
          staff_id: string
          status: string
          type: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          month_year?: string | null
          org_id: string
          requested_by?: string | null
          staff_id: string
          status?: string
          type: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          month_year?: string | null
          org_id?: string
          requested_by?: string | null
          staff_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_salary_adjustments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_salary_profiles: {
        Row: {
          allowed_leaves_per_month: number
          base_amount: number
          created_at: string
          currency: string
          esi_deduction_percent: number | null
          hourly_overtime_rate: number | null
          id: string
          is_active: boolean
          org_id: string
          pf_deduction_percent: number | null
          salary_type: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          allowed_leaves_per_month?: number
          base_amount?: number
          created_at?: string
          currency?: string
          esi_deduction_percent?: number | null
          hourly_overtime_rate?: number | null
          id?: string
          is_active?: boolean
          org_id: string
          pf_deduction_percent?: number | null
          salary_type?: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          allowed_leaves_per_month?: number
          base_amount?: number
          created_at?: string
          currency?: string
          esi_deduction_percent?: number | null
          hourly_overtime_rate?: number | null
          id?: string
          is_active?: boolean
          org_id?: string
          pf_deduction_percent?: number | null
          salary_type?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_salary_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
