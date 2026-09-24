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
          game_type: string
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          game_id?: number | null
          game_type?: string
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          game_id?: number | null
          game_type?: string
          id?: never
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          challenge_id: string | null
          created_at: string
          details: Json
          event: string
          id: number
          purpose: Database["public"]["Enums"]["otp_purpose"] | null
          request_id: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          details?: Json
          event: string
          id?: never
          purpose?: Database["public"]["Enums"]["otp_purpose"] | null
          request_id?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          details?: Json
          event?: string
          id?: never
          purpose?: Database["public"]["Enums"]["otp_purpose"] | null
          request_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coinflip_config: {
        Row: {
          animation_ms: number
          create_rate_limit: number
          create_rate_window_seconds: number
          fee_bps: number
          id: boolean
          max_open_per_user: number
          max_wager: number
          min_wager: number
          pre_delay_ms: number
          updated_at: string
          waiting_timeout_seconds: number
        }
        Insert: {
          animation_ms?: number
          create_rate_limit?: number
          create_rate_window_seconds?: number
          fee_bps?: number
          id?: boolean
          max_open_per_user?: number
          max_wager?: number
          min_wager?: number
          pre_delay_ms?: number
          updated_at?: string
          waiting_timeout_seconds?: number
        }
        Update: {
          animation_ms?: number
          create_rate_limit?: number
          create_rate_window_seconds?: number
          fee_bps?: number
          id?: boolean
          max_open_per_user?: number
          max_wager?: number
          min_wager?: number
          pre_delay_ms?: number
          updated_at?: string
          waiting_timeout_seconds?: number
        }
        Relationships: []
      }
      coinflip_entries: {
        Row: {
          amount: number
          created_at: string
          game_id: number
          id: string
          idempotency_key: string
          ledger_tx_id: string
          side: Database["public"]["Enums"]["coin_side"]
          slot: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          game_id: number
          id?: string
          idempotency_key: string
          ledger_tx_id: string
          side: Database["public"]["Enums"]["coin_side"]
          slot: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          game_id?: number
          id?: string
          idempotency_key?: string
          ledger_tx_id?: string
          side?: Database["public"]["Enums"]["coin_side"]
          slot?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coinflip_entries_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "coinflip_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coinflip_entries_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coinflip_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coinflip_game_secrets: {
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
            foreignKeyName: "coinflip_game_secrets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "coinflip_games"
            referencedColumns: ["id"]
          },
        ]
      }
      coinflip_games: {
        Row: {
          account_type: string
          amount: number
          animation_end_at: string | null
          animation_start_at: string | null
          asset: string
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          creator_id: string
          creator_side: Database["public"]["Enums"]["coin_side"]
          draw_version: number
          expires_at: string
          fee_amount: number | null
          fee_bps: number
          id: number
          joined_at: string | null
          opponent_id: string | null
          payout_amount: number | null
          pot_amount: number
          protocol_version: string
          server_seed: string | null
          server_seed_hash: string
          settlement_started_at: string | null
          status: Database["public"]["Enums"]["coinflip_status"]
          updated_at: string
          winner_id: string | null
          winning_side: Database["public"]["Enums"]["coin_side"] | null
        }
        Insert: {
          account_type: string
          amount: number
          animation_end_at?: string | null
          animation_start_at?: string | null
          asset: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id: string
          creator_side: Database["public"]["Enums"]["coin_side"]
          draw_version?: number
          expires_at: string
          fee_amount?: number | null
          fee_bps: number
          id?: never
          joined_at?: string | null
          opponent_id?: string | null
          payout_amount?: number | null
          pot_amount: number
          protocol_version?: string
          server_seed?: string | null
          server_seed_hash: string
          settlement_started_at?: string | null
          status?: Database["public"]["Enums"]["coinflip_status"]
          updated_at?: string
          winner_id?: string | null
          winning_side?: Database["public"]["Enums"]["coin_side"] | null
        }
        Update: {
          account_type?: string
          amount?: number
          animation_end_at?: string | null
          animation_start_at?: string | null
          asset?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          creator_side?: Database["public"]["Enums"]["coin_side"]
          draw_version?: number
          expires_at?: string
          fee_amount?: number | null
          fee_bps?: number
          id?: never
          joined_at?: string | null
          opponent_id?: string | null
          payout_amount?: number | null
          pot_amount?: number
          protocol_version?: string
          server_seed?: string | null
          server_seed_hash?: string
          settlement_started_at?: string | null
          status?: Database["public"]["Enums"]["coinflip_status"]
          updated_at?: string
          winner_id?: string | null
          winning_side?: Database["public"]["Enums"]["coin_side"] | null
        }
        Relationships: [
          {
            foreignKeyName: "coinflip_games_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coinflip_games_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coinflip_payouts: {
        Row: {
          amount: number
          attempts: number
          beneficiary_id: string
          created_at: string
          game_id: number
          idempotency_key: string
          kind: Database["public"]["Enums"]["coinflip_payout_kind"]
          last_error: string | null
          ledger_tx_id: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount: number
          attempts?: number
          beneficiary_id: string
          created_at?: string
          game_id: number
          idempotency_key: string
          kind: Database["public"]["Enums"]["coinflip_payout_kind"]
          last_error?: string | null
          ledger_tx_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount?: number
          attempts?: number
          beneficiary_id?: string
          created_at?: string
          game_id?: number
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["coinflip_payout_kind"]
          last_error?: string | null
          ledger_tx_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "coinflip_payouts_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coinflip_payouts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "coinflip_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coinflip_payouts_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      coinflip_results: {
        Row: {
          created_at: string
          draw_version: number
          first_byte: number
          game_id: number
          hmac_hex: string
          message: string
          protocol_version: string
          server_seed_hash: string
          winner_id: string
          winning_side: Database["public"]["Enums"]["coin_side"]
        }
        Insert: {
          created_at?: string
          draw_version: number
          first_byte: number
          game_id: number
          hmac_hex: string
          message: string
          protocol_version: string
          server_seed_hash: string
          winner_id: string
          winning_side: Database["public"]["Enums"]["coin_side"]
        }
        Update: {
          created_at?: string
          draw_version?: number
          first_byte?: number
          game_id?: number
          hmac_hex?: string
          message?: string
          protocol_version?: string
          server_seed_hash?: string
          winner_id?: string
          winning_side?: Database["public"]["Enums"]["coin_side"]
        }
        Relationships: [
          {
            foreignKeyName: "coinflip_results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "coinflip_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coinflip_results_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otp_challenges: {
        Row: {
          attempt_count: number
          consumed_at: string | null
          created_at: string
          created_by_request_id: string
          email: string
          expires_at: string
          id: string
          ip_hash: string | null
          last_sent_at: string | null
          max_attempts: number
          otp_digest: string
          purpose: Database["public"]["Enums"]["otp_purpose"]
          resend_count: number
          status: Database["public"]["Enums"]["otp_status"]
          user_agent_hash: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number
          consumed_at?: string | null
          created_at?: string
          created_by_request_id: string
          email: string
          expires_at: string
          id: string
          ip_hash?: string | null
          last_sent_at?: string | null
          max_attempts?: number
          otp_digest: string
          purpose: Database["public"]["Enums"]["otp_purpose"]
          resend_count?: number
          status?: Database["public"]["Enums"]["otp_status"]
          user_agent_hash?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number
          consumed_at?: string | null
          created_at?: string
          created_by_request_id?: string
          email?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          last_sent_at?: string | null
          max_attempts?: number
          otp_digest?: string
          purpose?: Database["public"]["Enums"]["otp_purpose"]
          resend_count?: number
          status?: Database["public"]["Enums"]["otp_status"]
          user_agent_hash?: string | null
          user_id?: string
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
      user_wallets: {
        Row: {
          address: string
          chain_type: string
          created_at: string
          id: string
          is_primary: boolean
          is_verified: boolean
          last_seen_at: string | null
          normalized_address: string
          updated_at: string
          user_id: string
          verified_at: string | null
          wallet_provider: string
        }
        Insert: {
          address: string
          chain_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          last_seen_at?: string | null
          normalized_address: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          wallet_provider?: string
        }
        Update: {
          address?: string
          chain_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          last_seen_at?: string | null
          normalized_address?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          wallet_provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      wallet_verification_challenges: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          issued_at: string
          message_version: number
          nonce: string
          normalized_address: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          issued_at: string
          message_version?: number
          nonce: string
          normalized_address: string
          user_id: string
          wallet_address: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          issued_at?: string
          message_version?: number
          nonce?: string
          normalized_address?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_verification_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      _audit_cf: {
        Args: {
          p_action: string
          p_actor: string
          p_details: Json
          p_game: number
        }
        Returns: undefined
      }
      _coinflip_lock_wallets: {
        Args: { p_asset: string; p_type: string; p_users: string[] }
        Returns: undefined
      }
      _coinflip_refund: {
        Args: { p_game_id: number; p_reason: string }
        Returns: undefined
      }
      _ensure_open_game: { Args: never; Returns: number }
      _fair_hmac: {
        Args: { p_message: string; p_seed: string }
        Returns: string
      }
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
      admin_coinflip_overview: { Args: never; Returns: Json }
      admin_overview: { Args: never; Returns: Json }
      auth_user_by_email: { Args: { p_email: string }; Returns: Json }
      claim_test_credits: { Args: never; Returns: Json }
      coinflip_advance: { Args: { p_game_id: number }; Returns: string }
      coinflip_cancel: { Args: { p_game_id: number }; Returns: Json }
      coinflip_create: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_side: Database["public"]["Enums"]["coin_side"]
        }
        Returns: Json
      }
      coinflip_join: {
        Args: { p_game_id: number; p_idempotency_key: string }
        Returns: Json
      }
      coinflip_outcome: {
        Args: { p_draw_version: number; p_game_id: number; p_seed: string }
        Returns: Record<string, unknown>
      }
      coinflip_tick: { Args: never; Returns: Json }
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
      otp_challenge_info: { Args: { p_id: string }; Returns: Json }
      otp_cleanup: { Args: never; Returns: undefined }
      otp_issue: {
        Args: {
          p_digest: string
          p_email: string
          p_id: string
          p_ip_hash: string
          p_purpose: Database["public"]["Enums"]["otp_purpose"]
          p_request: string
          p_ua_hash: string
          p_user: string
        }
        Returns: Json
      }
      otp_log: {
        Args: {
          p_challenge: string
          p_details: Json
          p_event: string
          p_purpose: Database["public"]["Enums"]["otp_purpose"]
          p_request: string
          p_user: string
        }
        Returns: undefined
      }
      otp_mark_sent: {
        Args: {
          p_error: string
          p_id: string
          p_ok: boolean
          p_request: string
        }
        Returns: undefined
      }
      otp_verify: {
        Args: {
          p_digest: string
          p_id: string
          p_purpose: Database["public"]["Enums"]["otp_purpose"]
          p_request: string
        }
        Returns: Json
      }
      server_time: { Args: never; Returns: string }
      update_avatar: { Args: { p_avatar_url: string }; Returns: undefined }
      wallet_consume_and_verify: {
        Args: { p_id: string; p_normalized: string; p_user: string }
        Returns: Json
      }
      wallet_get_challenge: {
        Args: { p_id: string; p_user: string }
        Returns: Json
      }
      wallet_issue_challenge: {
        Args: { p_address: string; p_user: string }
        Returns: Json
      }
      wallet_log: {
        Args: { p_details: Json; p_event: string; p_user: string }
        Returns: undefined
      }
      wallet_touch: {
        Args: { p_address: string; p_user: string }
        Returns: undefined
      }
    }
    Enums: {
      account_kind:
        | "user_available"
        | "user_locked"
        | "game_escrow"
        | "house_revenue"
        | "test_faucet"
      app_role: "admin" | "moderator" | "user"
      coin_side: "HEADS" | "TAILS"
      coinflip_payout_kind: "WINNER" | "REFUND"
      coinflip_status:
        | "WAITING"
        | "READY"
        | "FLIPPING"
        | "SETTLEMENT"
        | "COMPLETED"
        | "CANCELLED"
      game_status: "WAITING" | "ACTIVE" | "DRAWING" | "COMPLETED" | "CANCELLED"
      otp_purpose: "SIGNUP_EMAIL_VERIFICATION"
      otp_status:
        | "PENDING_SEND"
        | "ACTIVE"
        | "CONSUMED"
        | "INVALIDATED"
        | "SUPERSEDED"
        | "EXPIRED"
        | "SEND_FAILED"
      payout_status: "PENDING" | "SETTLED" | "FAILED"
      tx_kind:
        | "test_credit_grant"
        | "jackpot_entry"
        | "jackpot_settlement"
        | "deposit"
        | "withdrawal"
        | "refund"
        | "coinflip_entry"
        | "coinflip_settlement"
        | "coinflip_refund"
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
      coin_side: ["HEADS", "TAILS"],
      coinflip_payout_kind: ["WINNER", "REFUND"],
      coinflip_status: [
        "WAITING",
        "READY",
        "FLIPPING",
        "SETTLEMENT",
        "COMPLETED",
        "CANCELLED",
      ],
      game_status: ["WAITING", "ACTIVE", "DRAWING", "COMPLETED", "CANCELLED"],
      otp_purpose: ["SIGNUP_EMAIL_VERIFICATION"],
      otp_status: [
        "PENDING_SEND",
        "ACTIVE",
        "CONSUMED",
        "INVALIDATED",
        "SUPERSEDED",
        "EXPIRED",
        "SEND_FAILED",
      ],
      payout_status: ["PENDING", "SETTLED", "FAILED"],
      tx_kind: [
        "test_credit_grant",
        "jackpot_entry",
        "jackpot_settlement",
        "deposit",
        "withdrawal",
        "refund",
        "coinflip_entry",
        "coinflip_settlement",
        "coinflip_refund",
      ],
    },
  },
} as const
