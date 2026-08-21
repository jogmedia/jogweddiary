export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          address: string | null
          business_name: string
          currency: string
          email: string | null
          gstin: string | null
          id: string
          invoice_prefix: string
          logo_url: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_name?: string
          currency?: string
          email?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_name?: string
          currency?: string
          email?: string | null
          gstin?: string | null
          id?: string
          invoice_prefix?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          account_id: string | null
          acquired_date: string | null
          asset_name: string
          asset_value: number
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          account_id?: string | null
          acquired_date?: string | null
          asset_name: string
          asset_value?: number
          created_at?: string
          id?: string
          notes?: string | null
        }
        Update: {
          account_id?: string | null
          acquired_date?: string | null
          asset_name?: string
          asset_value?: number
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string
          created_at: string
          current_balance: number
          id: string
          is_active: boolean
          opening_balance: number
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name: string
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          opening_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          account_code: string | null
          account_name: string
          account_type: string
          created_at: string
          id: string
          is_active: boolean
          is_cash: boolean
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_code?: string | null
          account_name: string
          account_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_cash?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string | null
          account_name?: string
          account_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_cash?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      delivery_records: {
        Row: {
          created_at: string
          delivered_by: string | null
          delivery_date: string | null
          delivery_type: string
          file_link: string | null
          id: string
          notes: string | null
          project_id: string
        }
        Insert: {
          created_at?: string
          delivered_by?: string | null
          delivery_date?: string | null
          delivery_type: string
          file_link?: string | null
          id?: string
          notes?: string | null
          project_id: string
        }
        Update: {
          created_at?: string
          delivered_by?: string | null
          delivery_date?: string | null
          delivery_type?: string
          file_link?: string | null
          id?: string
          notes?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_records_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          id: string
          notes: string | null
          transaction_date: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          transaction_date?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      expense_transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          id: string
          is_cash: boolean
          notes: string | null
          project_id: string | null
          transaction_date: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          is_cash?: boolean
          notes?: string | null
          project_id?: string | null
          transaction_date?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          is_cash?: boolean
          notes?: string | null
          project_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      income_transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          id: string
          is_cash: boolean
          notes: string | null
          project_id: string | null
          transaction_date: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          is_cash?: boolean
          notes?: string | null
          project_id?: string | null
          transaction_date?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          is_cash?: boolean
          notes?: string | null
          project_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          memo: string | null
          reference_no: string | null
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          memo?: string | null
          reference_no?: string | null
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          memo?: string | null
          reference_no?: string | null
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: []
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          client_id: string | null
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
          project_id: string | null
        }
        Insert: {
          account_id: string
          client_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          project_id?: string | null
        }
        Update: {
          account_id?: string
          client_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          account_id: string | null
          created_at: string
          due_date: string | null
          id: string
          liability_name: string
          liability_value: number
          notes: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          liability_name: string
          liability_value?: number
          notes?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          liability_name?: string
          liability_value?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          assigned_at: string
          block_sent_at: string | null
          event_id: string | null
          id: string
          project_id: string
          reminder_sent_at: string | null
          role_in_project: string | null
          staff_id: string
        }
        Insert: {
          assigned_at?: string
          block_sent_at?: string | null
          event_id?: string | null
          id?: string
          project_id: string
          reminder_sent_at?: string | null
          role_in_project?: string | null
          staff_id: string
        }
        Update: {
          assigned_at?: string
          block_sent_at?: string | null
          event_id?: string | null
          id?: string
          project_id?: string
          reminder_sent_at?: string | null
          role_in_project?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "project_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist_items: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          item_name: string
          item_status: string
          item_type: string | null
          notes: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          item_name: string
          item_status?: string
          item_type?: string | null
          notes?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          item_name?: string
          item_status?: string
          item_type?: string | null
          notes?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_events: {
        Row: {
          arrival_time: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          event_date: string
          event_time: string | null
          event_type: string
          google_maps_link: string | null
          id: string
          location: string | null
          muhurtham_time: string | null
          notes: string | null
          project_id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          arrival_time?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          event_date: string
          event_time?: string | null
          event_type: string
          google_maps_link?: string | null
          id?: string
          location?: string | null
          muhurtham_time?: string | null
          notes?: string | null
          project_id: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          arrival_time?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          event_date?: string
          event_time?: string | null
          event_type?: string
          google_maps_link?: string | null
          id?: string
          location?: string | null
          muhurtham_time?: string | null
          notes?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string
          created_at: string
          expense_date: string
          id: string
          notes: string | null
          paid_to: string | null
          payment_mode: string | null
          project_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          paid_to?: string | null
          payment_mode?: string | null
          project_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          paid_to?: string | null
          payment_mode?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_exports: {
        Row: {
          created_by: string | null
          export_type: string
          exported_at: string
          file_name: string | null
          file_url: string | null
          id: string
          project_id: string
          sent_to_whatsapp: boolean
        }
        Insert: {
          created_by?: string | null
          export_type: string
          exported_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          project_id: string
          sent_to_whatsapp?: boolean
        }
        Update: {
          created_by?: string | null
          export_type?: string
          exported_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          project_id?: string
          sent_to_whatsapp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "project_exports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_logistics: {
        Row: {
          accommodation_notes: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          created_at: string
          equipment_notes: string | null
          id: string
          project_id: string
          team_arrival_time: string | null
          travel_required: boolean
          updated_at: string
          vehicle_details: string | null
        }
        Insert: {
          accommodation_notes?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          created_at?: string
          equipment_notes?: string | null
          id?: string
          project_id: string
          team_arrival_time?: string | null
          travel_required?: boolean
          updated_at?: string
          vehicle_details?: string | null
        }
        Update: {
          accommodation_notes?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          created_at?: string
          equipment_notes?: string | null
          id?: string
          project_id?: string
          team_arrival_time?: string | null
          travel_required?: boolean
          updated_at?: string
          vehicle_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_logistics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_payments: {
        Row: {
          account: string | null
          amount: number
          bank_account_id: string | null
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_mode: string
          project_id: string
          received_by: string | null
          reference_no: string | null
        }
        Insert: {
          account?: string | null
          amount: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_mode?: string
          project_id: string
          received_by?: string | null
          reference_no?: string | null
        }
        Update: {
          account?: string | null
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_mode?: string
          project_id?: string
          received_by?: string | null
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      project_permissions_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          project_id: string
          staff_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          project_id: string
          staff_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          project_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_permissions_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_permissions_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      project_reimbursables: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          entry_date: string
          id: string
          item_name: string
          kind: string
          notes: string | null
          payment_mode: string
          project_id: string
          reference_no: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          item_name: string
          kind?: string
          notes?: string | null
          payment_mode?: string
          project_id: string
          reference_no?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          item_name?: string
          kind?: string
          notes?: string | null
          payment_mode?: string
          project_id?: string
          reference_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_reimbursables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_reimbursables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          due_date: string | null
          id: string
          project_id: string
          task_name: string
          task_status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          project_id: string
          task_name: string
          task_status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          project_id?: string
          task_name?: string
          task_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          advance_account: string | null
          advance_amount: number
          advance_date: string | null
          album_editing_done: boolean
          album_printed: boolean
          album_proof_link: string | null
          album_status: string
          backup_drive: string | null
          backup_folder: string | null
          balance_due: number
          client_approval_status: string
          client_id: string
          client_revision_note: string | null
          client_selection_note: string | null
          courier_dispatched_date: string | null
          created_at: string
          deliverables: Json
          delivery_status: string
          editing_status: string
          event_date: string
          final_delivery_done: boolean
          google_maps_link: string | null
          id: string
          layout_status: string
          nearest_railway_station: string | null
          notes: string | null
          package_name: string | null
          payment_due_date: string | null
          payment_status: string
          photo_selection_done: boolean
          place_district: string | null
          project_name: string
          project_status: string
          raw_backup_done: boolean
          raw_drive_link: string | null
          raw_sent_date: string | null
          selection_received_date: string | null
          sent_to_printing_date: string | null
          shoot_status: string
          total_amount: number
          travel_booking_status: string | null
          travel_mode: string | null
          travel_notes: string | null
          travel_required: boolean
          travel_ticket_name: string | null
          travel_ticket_path: string | null
          updated_at: string
          venue: string | null
          video_editing_done: boolean
        }
        Insert: {
          advance_account?: string | null
          advance_amount?: number
          advance_date?: string | null
          album_editing_done?: boolean
          album_printed?: boolean
          album_proof_link?: string | null
          album_status?: string
          backup_drive?: string | null
          backup_folder?: string | null
          balance_due?: number
          client_approval_status?: string
          client_id: string
          client_revision_note?: string | null
          client_selection_note?: string | null
          courier_dispatched_date?: string | null
          created_at?: string
          deliverables?: Json
          delivery_status?: string
          editing_status?: string
          event_date: string
          final_delivery_done?: boolean
          google_maps_link?: string | null
          id?: string
          layout_status?: string
          nearest_railway_station?: string | null
          notes?: string | null
          package_name?: string | null
          payment_due_date?: string | null
          payment_status?: string
          photo_selection_done?: boolean
          place_district?: string | null
          project_name: string
          project_status?: string
          raw_backup_done?: boolean
          raw_drive_link?: string | null
          raw_sent_date?: string | null
          selection_received_date?: string | null
          sent_to_printing_date?: string | null
          shoot_status?: string
          total_amount?: number
          travel_booking_status?: string | null
          travel_mode?: string | null
          travel_notes?: string | null
          travel_required?: boolean
          travel_ticket_name?: string | null
          travel_ticket_path?: string | null
          updated_at?: string
          venue?: string | null
          video_editing_done?: boolean
        }
        Update: {
          advance_account?: string | null
          advance_amount?: number
          advance_date?: string | null
          album_editing_done?: boolean
          album_printed?: boolean
          album_proof_link?: string | null
          album_status?: string
          backup_drive?: string | null
          backup_folder?: string | null
          balance_due?: number
          client_approval_status?: string
          client_id?: string
          client_revision_note?: string | null
          client_selection_note?: string | null
          courier_dispatched_date?: string | null
          created_at?: string
          deliverables?: Json
          delivery_status?: string
          editing_status?: string
          event_date?: string
          final_delivery_done?: boolean
          google_maps_link?: string | null
          id?: string
          layout_status?: string
          nearest_railway_station?: string | null
          notes?: string | null
          package_name?: string | null
          payment_due_date?: string | null
          payment_status?: string
          photo_selection_done?: boolean
          place_district?: string | null
          project_name?: string
          project_status?: string
          raw_backup_done?: boolean
          raw_drive_link?: string | null
          raw_sent_date?: string | null
          selection_received_date?: string | null
          sent_to_printing_date?: string | null
          shoot_status?: string
          total_amount?: number
          travel_booking_status?: string | null
          travel_mode?: string | null
          travel_notes?: string | null
          travel_required?: boolean
          travel_ticket_name?: string | null
          travel_ticket_path?: string | null
          updated_at?: string
          venue?: string | null
          video_editing_done?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          active_status: boolean
          created_at: string
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_status?: boolean
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_status?: boolean
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      staff_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          staff_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          staff_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_balance_sheet: {
        Args: { as_of_date: string }
        Returns: {
          liabilities_plus_equity: number
          total_assets: number
          total_equity: number
          total_liabilities: number
        }[]
      }
      get_cash_flow_report: {
        Args: { end_date: string; start_date: string }
        Returns: {
          cash_in: number
          cash_out: number
          closing_cash: number
          opening_cash: number
        }[]
      }
      get_pending_dues_report: {
        Args: never
        Returns: {
          event_date: string
          pending_due: number
          project_id: string
          project_name: string
          received_amount: number
          total_amount: number
        }[]
      }
      get_portal: {
        Args: { _project_id: string }
        Returns: {
          album_proof_link: string
          client_approval_status: string
          client_name: string
          client_revision_note: string
          client_selection_note: string
          courier_dispatched_date: string
          delivery_status: string
          event_date: string
          layout_status: string
          package_name: string
          project_id: string
          project_name: string
          raw_drive_link: string
          raw_sent_date: string
          selection_received_date: string
          sent_to_printing_date: string
          venue: string
        }[]
      }
      get_profit_and_loss: {
        Args: { end_date: string; start_date: string }
        Returns: {
          net_profit: number
          total_direct_costs: number
          total_income: number
          total_operating_expenses: number
        }[]
      }
      get_project_profit_report: {
        Args: never
        Returns: {
          balance_due: number
          project_id: string
          project_name: string
          project_profit: number
          total_amount: number
          total_expenses: number
          total_received: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_assigned: { Args: { _project_id: string }; Returns: boolean }
      portal_set_approval: {
        Args: { _note?: string; _project_id: string; _status: string }
        Returns: undefined
      }
      portal_submit_selection: {
        Args: { _note: string; _project_id: string }
        Returns: undefined
      }
      recalc_bank_balance: {
        Args: { _bank_account_id: string }
        Returns: undefined
      }
      recalc_project_balance: {
        Args: { _project_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
