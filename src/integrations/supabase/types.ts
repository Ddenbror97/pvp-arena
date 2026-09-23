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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          game_id: number | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          game_id?: number | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          game_id?: number | null
          id?: never
        }
        Relationships: []
      }
      jackpot_config: {
        Row: {
          account_type: string
          asset: string
          countdown_seconds: number
          entry_rate_limit: number
          entry_rate_window_seconds: number
          extension_seconds: number
          id: boolean
          max_duration_seconds: number
          max_entry: number
          min_entry: number
          rake_bps: number
          real_money_enabled: boolean
          test_grant_amount: number
          updated_at: string
        }
        Insert: {
          account_type?: string
          asset?: string
          countdown_seconds?: number
          entry_rate_limit?: number
          entry_rate_window_seconds?: number
          extension_seconds?: number
          id?: boolean
          max_duration_seconds?: number
          max_entry?: number
          min_entry?: number
          rake_bps?: number
          real_money_enabled?: boolean
          test_grant_amount?: number
          updated_at?: string
        }
        Update: {
          account_type?: string
          asset?: string
          countdown_seconds?: number
          entry_rate_limit?: number
          entry_rate_window_seconds?: number
          extension_seconds?: number
          id?: boolean
          max_duration_seconds?: number
          max_entry?: number
          min_entry?: number
          rake_bps?: number
          real_money_enabled?: boolean
          test_grant_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      jackpot_entries: {
        Row: {
          amount: number
          created_at: string
          game_id: number
          id: string
          idempotency_key: string
          ledger_tx_id: string
          ticket_end: number
          ticket_start: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          game_id: number
          id?: string
          idempotency_key: string
          ledger_tx_id: string
          ticket_end: number
          ticket_start: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          game_id?: number
          id?: string
          idempotency_key?: string
          ledger_tx_id?: string
          ticket_end?: number
          ticket_start?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_entries_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "jackpot_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_entries_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_game_secrets: {
        Row: {
          game_id: number
          server_seed: string
        }
        Insert: {
          game_id: number
          server_seed: string
        }
        Update: {
          game_id?: number
          server_seed?: string
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_game_secrets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "jackpot_games"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_games: {
        Row: {
          account_type: string
          asset: string
          completed_at: string | null
          countdown_seconds: number
          countdown_started_at: string | null
          created_at: string
          draw_counter: number | null
          draw_version: number
          drawn_at: string | null
          entry_count: number
          extension_seconds: number
          id: number
          max_duration_seconds: number
          max_end_at: string | null
          max_entry: number
          min_entry: number
          payout_amount: number | null
          player_count: number
          pot_amount: number
          protocol_version: string
          rake_amount: number | null
          rake_bps: number
          scheduled_end_at: string | null
          server_seed: string | null
          server_seed_hash: string
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
          winner_id: string | null
          winner_total: number | null
          winning_ticket: number | null
        }
        Insert: {
          account_type: string
          asset: string
          completed_at?: string | null
          countdown_seconds: number
          countdown_started_at?: string | null
          created_at?: string
          draw_counter?: number | null
          draw_version?: number
          drawn_at?: string | null
          entry_count?: number
          extension_seconds: number
          id?: never
          max_duration_seconds: number
          max_end_at?: string | null
          max_entry: number
          min_entry: number
          payout_amount?: number | null
          player_count?: number
          pot_amount?: number
          protocol_version?: string
          rake_amount?: number | null
          rake_bps: number
          scheduled_end_at?: string | null
          server_seed?: string | null
          server_seed_hash: string
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          winner_id?: string | null
          winner_total?: number | null
          winning_ticket?: number | null
        }
        Update: {
          account_type?: string
          asset?: string
          completed_at?: string | null
          countdown_seconds?: number
          countdown_started_at?: string | null
          created_at?: string
          draw_counter?: number | null
          draw_version?: number
          drawn_at?: string | null
          entry_count?: number
          extension_seconds?: number
          id?: never
          max_duration_seconds?: number
          max_end_at?: string | null
          max_entry?: number
          min_entry?: number
          payout_amount?: number | null
          player_count?: number
          pot_amount?: number
          protocol_version?: string
          rake_amount?: number | null
          rake_bps?: number
          scheduled_end_at?: string | null
          server_seed?: string | null
          server_seed_hash?: string
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          winner_id?: string | null
          winner_total?: number | null
          winning_ticket?: number | null
        }
        Relationships: []
      }
      jackpot_payouts: {
        Row: {
          attempts: number
          created_at: string
          game_id: number
          last_error: string | null
          ledger_tx_id: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          attempts?: number
          created_at?: string
          game_id: number
          last_error?: string | null
          ledger_tx_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          attempts?: number
          created_at?: string
          game_id?: number
          last_error?: string | null
          ledger_tx_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_payouts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "jackpot_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_payouts_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_players: {
        Row: {
          entry_count: number
          first_entry_at: string
          game_id: number
          last_entry_at: string
          total_amount: number
          user_id: string
        }
        Insert: {
          entry_count: number
          first_entry_at: string
          game_id: number
          last_entry_at: string
          total_amount: number
          user_id: string
        }
        Update: {
          entry_count?: number
          first_entry_at?: string
          game_id?: number
          last_entry_at?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "jackpot_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_postings: {
        Row: {
          account_id: string
          amount: number
          balance_after: number
          created_at: string
          id: number
          tx_id: string
        }
        Insert: {
          account_id: string
          amount: number
          balance_after: number
          created_at?: string
          id?: never
          tx_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number
          created_at?: string
          id?: never
          tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_postings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_postings_tx_id_fkey"
            columns: ["tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          account_type: string
          created_at: string
          game_id: number | null
          id: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["tx_kind"]
          memo: string | null
          user_id: string | null
        }
        Insert: {
          account_type?: string
          created_at?: string
          game_id?: number | null
          id?: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["tx_kind"]
          memo?: string | null
          user_id?: string | null
        }
        Update: {
          account_type?: string
          created_at?: string
          game_id?: number | null
          id?: string
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          memo?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_confirmed_at: string
          avatar_url: string | null
          created_at: string
          id: string
          self_excluded_until: string | null
          username: string
        }
        Insert: {
          age_confirmed_at: string
          avatar_url?: string | null
          created_at?: string
          id: string
          self_excluded_until?: string | null
          username: string
        }
        Update: {
          age_confirmed_at?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          self_excluded_until?: string | null
          username?: string
        }
        Relationships: []
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
      wallet_accounts: {
        Row: {
          account_type: string
          asset: string
          balance: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["account_kind"]
          owner_id: string | null
        }
        Insert: {
          account_type?: string
          asset?: string
          balance?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["account_kind"]
          owner_id?: string | null
        }
        Update: {
          account_type?: string
          asset?: string
          balance?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["account_kind"]
          owner_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _audit: {
        Args: {
          p_action: string
          p_actor: string
          p_details: Json
          p_game: number
        }
        Returns: undefined
      }
      _ensure_open_game: { Args: never; Returns: number }
      _post: {
        Args: { p_account: string; p_amount: number; p_tx: string }
        Returns: undefined
      }
      _system_account: {
        Args: {
          p_asset: string
          p_kind: Database["public"]["Enums"]["account_kind"]
          p_type: string
        }
        Returns: string
      }
      _user_account: {
        Args: {
          p_asset: string
          p_kind: Database["public"]["Enums"]["account_kind"]
          p_type: string
          p_user: string
        }
        Returns: string
      }
      admin_overview: { Args: never; Returns: Json }
      claim_test_credits: { Args: never; Returns: Json }
      ensure_profile: {
        Args: { p_age_confirmed: boolean; p_username: string }
        Returns: Json
      }
      get_profile_stats: { Args: { p_user: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      jackpot_draw_ticket: {
        Args: {
          p_draw_version: number
          p_game_id: number
          p_n: number
          p_seed: string
        }
        Returns: Record<string, unknown>
      }
      jackpot_join: {
        Args: { p_amount: number; p_idempotency_key: string }
        Returns: Json
      }
      jackpot_settle: { Args: { p_game_id: number }; Returns: string }
      jackpot_tick: { Args: never; Returns: Json }
      server_time: { Args: never; Returns: string }
      update_avatar: { Args: { p_avatar_url: string }; Returns: undefined }
    }
    Enums: {
      account_kind:
        | "user_available"
        | "user_locked"
        | "game_escrow"
        | "house_revenue"
        | "test_faucet"
      app_role: "admin" | "moderator" | "user"
      game_status: "WAITING" | "ACTIVE" | "DRAWING" | "COMPLETED" | "CANCELLED"
      payout_status: "PENDING" | "SETTLED" | "FAILED"
      tx_kind:
        | "test_credit_grant"
        | "jackpot_entry"
        | "jackpot_settlement"
        | "deposit"
        | "withdrawal"
        | "refund"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_kind: [
        "user_available",
        "user_locked",
        "game_escrow",
        "house_revenue",
        "test_faucet",
      ],
      app_role: ["admin", "moderator", "user"],
      game_status: ["WAITING", "ACTIVE", "DRAWING", "COMPLETED", "CANCELLED"],
      payout_status: ["PENDING", "SETTLED", "FAILED"],
      tx_kind: [
        "test_credit_grant",
        "jackpot_entry",
        "jackpot_settlement",
        "deposit",
        "withdrawal",
        "refund",
      ],
    },
  },
} as const
