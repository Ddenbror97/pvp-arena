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
      chain_assets: {
        Row: {
          asset_key: string
          chain_id: number
          contract_address: string | null
          created_at: string
          decimals: number
          display_name: string
          is_enabled: boolean
          ledger_account_type: string
          ledger_asset: string
          min_deposit_units: number
          price_feed_address: string | null
          settlement_kind: string
          usd_per_unit: number | null
        }
        Insert: {
          asset_key: string
          chain_id: number
          contract_address?: string | null
          created_at?: string
          decimals: number
          display_name: string
          is_enabled?: boolean
          ledger_account_type: string
          ledger_asset: string
          min_deposit_units: number
          price_feed_address?: string | null
          settlement_kind: string
          usd_per_unit?: number | null
        }
        Update: {
          asset_key?: string
          chain_id?: number
          contract_address?: string | null
          created_at?: string
          decimals?: number
          display_name?: string
          is_enabled?: boolean
          ledger_account_type?: string
          ledger_asset?: string
          min_deposit_units?: number
          price_feed_address?: string | null
          settlement_kind?: string
          usd_per_unit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chain_assets_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chain_networks"
            referencedColumns: ["chain_id"]
          },
        ]
      }
      chain_networks: {
        Row: {
          chain_id: number
          created_at: string
          credit_confirmations: number
          finalized_confirmations: number
          is_enabled: boolean
          min_deposit_cents: number
          min_withdrawal_cents: number
          name: string
          network_mode: string
          safe_confirmations: number
        }
        Insert: {
          chain_id: number
          created_at?: string
          credit_confirmations?: number
          finalized_confirmations?: number
          is_enabled?: boolean
          min_deposit_cents?: number
          min_withdrawal_cents?: number
          name: string
          network_mode: string
          safe_confirmations?: number
        }
        Update: {
          chain_id?: number
          created_at?: string
          credit_confirmations?: number
          finalized_confirmations?: number
          is_enabled?: boolean
          min_deposit_cents?: number
          min_withdrawal_cents?: number
          name?: string
          network_mode?: string
          safe_confirmations?: number
        }
        Relationships: []
      }
      chain_treasury_accounts: {
        Row: {
          address: string
          chain_id: number
          created_at: string
          is_active: boolean
          role: string
        }
        Insert: {
          address: string
          chain_id: number
          created_at?: string
          is_active?: boolean
          role: string
        }
        Update: {
          address?: string
          chain_id?: number
          created_at?: string
          is_active?: boolean
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_treasury_accounts_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chain_networks"
            referencedColumns: ["chain_id"]
          },
        ]
      }
      chat_presence: {
        Row: {
          last_seen_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          user_id?: string
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
      crypto_chain_cursor: {
        Row: {
          chain_id: number
          last_processed_block: number
          updated_at: string
        }
        Insert: {
          chain_id: number
          last_processed_block: number
          updated_at?: string
        }
        Update: {
          chain_id?: number
          last_processed_block?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_chain_cursor_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: true
            referencedRelation: "chain_networks"
            referencedColumns: ["chain_id"]
          },
        ]
      }
      crypto_deposit_addresses: {
        Row: {
          address: string
          chain_id: number
          created_at: string
          derivation_index: number
          id: string
          user_id: string
        }
        Insert: {
          address: string
          chain_id: number
          created_at?: string
          derivation_index: number
          id?: string
          user_id: string
        }
        Update: {
          address?: string
          chain_id?: number
          created_at?: string
          derivation_index?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposit_addresses_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chain_networks"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "crypto_deposit_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_deposits: {
        Row: {
          asset_key: string
          block_number: number
          chain_id: number
          closed_reason: string | null
          confirmed_at: string | null
          created_at: string
          credited_at: string | null
          detected_at: string
          from_address: string
          id: string
          ledger_tx_id: string | null
          log_index: number
          price_snapshot_id: string | null
          status: string
          to_address: string
          tx_hash: string
          units: number
          usd_cents: number
          user_id: string | null
        }
        Insert: {
          asset_key: string
          block_number: number
          chain_id: number
          closed_reason?: string | null
          confirmed_at?: string | null
          created_at?: string
          credited_at?: string | null
          detected_at?: string
          from_address: string
          id?: string
          ledger_tx_id?: string | null
          log_index?: number
          price_snapshot_id?: string | null
          status?: string
          to_address: string
          tx_hash: string
          units: number
          usd_cents: number
          user_id?: string | null
        }
        Update: {
          asset_key?: string
          block_number?: number
          chain_id?: number
          closed_reason?: string | null
          confirmed_at?: string | null
          created_at?: string
          credited_at?: string | null
          detected_at?: string
          from_address?: string
          id?: string
          ledger_tx_id?: string | null
          log_index?: number
          price_snapshot_id?: string | null
          status?: string
          to_address?: string
          tx_hash?: string
          units?: number
          usd_cents?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposits_asset_fk"
            columns: ["chain_id", "asset_key"]
            isOneToOne: false
            referencedRelation: "chain_assets"
            referencedColumns: ["chain_id", "asset_key"]
          },
          {
            foreignKeyName: "crypto_deposits_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_deposits_price_snapshot_id_fkey"
            columns: ["price_snapshot_id"]
            isOneToOne: false
            referencedRelation: "crypto_price_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_job_runs: {
        Row: {
          last_run_at: string
          name: string
        }
        Insert: {
          last_run_at?: string
          name: string
        }
        Update: {
          last_run_at?: string
          name?: string
        }
        Relationships: []
      }
      crypto_job_tokens: {
        Row: {
          created_at: string
          id: boolean
          token_sha256: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          token_sha256: string
        }
        Update: {
          created_at?: string
          id?: boolean
          token_sha256?: string
        }
        Relationships: []
      }
      crypto_price_snapshots: {
        Row: {
          asset_key: string
          chain_id: number
          created_at: string
          feed_address: string
          feed_round_id: number
          id: string
          max_age_seconds: number
          observed_at: string
          price_micro_usd: number
        }
        Insert: {
          asset_key: string
          chain_id: number
          created_at?: string
          feed_address: string
          feed_round_id: number
          id?: string
          max_age_seconds?: number
          observed_at?: string
          price_micro_usd: number
        }
        Update: {
          asset_key?: string
          chain_id?: number
          created_at?: string
          feed_address?: string
          feed_round_id?: number
          id?: string
          max_age_seconds?: number
          observed_at?: string
          price_micro_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "crypto_price_snapshot_asset_fk"
            columns: ["chain_id", "asset_key"]
            isOneToOne: false
            referencedRelation: "chain_assets"
            referencedColumns: ["chain_id", "asset_key"]
          },
        ]
      }
      crypto_settings: {
        Row: {
          auto_approve_cents: number
          chain_id: number
          crypto_system_enabled: boolean
          daily_global_limit_cents: number
          daily_limit_cents: number
          deposits_enabled: boolean
          environment: string
          id: boolean
          mainnet_enabled: boolean
          min_deposit_cents: number
          min_withdrawal_cents: number
          overlap_blocks: number
          payout_float_max_cents: number
          price_max_age_seconds: number
          quote_ttl_seconds: number
          test_credits_reset_at: string | null
          updated_at: string
          watch_only: boolean
          withdrawal_fee_cents: number
          withdrawals_enabled: boolean
        }
        Insert: {
          auto_approve_cents?: number
          chain_id?: number
          crypto_system_enabled?: boolean
          daily_global_limit_cents?: number
          daily_limit_cents?: number
          deposits_enabled?: boolean
          environment?: string
          id?: boolean
          mainnet_enabled?: boolean
          min_deposit_cents?: number
          min_withdrawal_cents?: number
          overlap_blocks?: number
          payout_float_max_cents?: number
          price_max_age_seconds?: number
          quote_ttl_seconds?: number
          test_credits_reset_at?: string | null
          updated_at?: string
          watch_only?: boolean
          withdrawal_fee_cents?: number
          withdrawals_enabled?: boolean
        }
        Update: {
          auto_approve_cents?: number
          chain_id?: number
          crypto_system_enabled?: boolean
          daily_global_limit_cents?: number
          daily_limit_cents?: number
          deposits_enabled?: boolean
          environment?: string
          id?: boolean
          mainnet_enabled?: boolean
          min_deposit_cents?: number
          min_withdrawal_cents?: number
          overlap_blocks?: number
          payout_float_max_cents?: number
          price_max_age_seconds?: number
          quote_ttl_seconds?: number
          test_credits_reset_at?: string | null
          updated_at?: string
          watch_only?: boolean
          withdrawal_fee_cents?: number
          withdrawals_enabled?: boolean
        }
        Relationships: []
      }
      crypto_withdrawal_quotes: {
        Row: {
          asset_key: string
          chain_id: number
          created_at: string
          expires_at: string
          id: string
          price_micro_usd: number
          price_snapshot_id: string
          units: number
          usd_cents: number
          used_at: string | null
          user_id: string
        }
        Insert: {
          asset_key: string
          chain_id: number
          created_at?: string
          expires_at: string
          id?: string
          price_micro_usd: number
          price_snapshot_id: string
          units: number
          usd_cents: number
          used_at?: string | null
          user_id: string
        }
        Update: {
          asset_key?: string
          chain_id?: number
          created_at?: string
          expires_at?: string
          id?: string
          price_micro_usd?: number
          price_snapshot_id?: string
          units?: number
          usd_cents?: number
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_withdrawal_quotes_chain_id_asset_key_fkey"
            columns: ["chain_id", "asset_key"]
            isOneToOne: false
            referencedRelation: "chain_assets"
            referencedColumns: ["chain_id", "asset_key"]
          },
          {
            foreignKeyName: "crypto_withdrawal_quotes_price_snapshot_id_fkey"
            columns: ["price_snapshot_id"]
            isOneToOne: false
            referencedRelation: "crypto_price_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_withdrawal_quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_withdrawals: {
        Row: {
          asset_key: string
          attempts: number
          chain_id: number
          closed_at: string | null
          confirmed_at: string | null
          created_at: string
          fee_usd_cents: number
          hold_ledger_tx_id: string | null
          id: string
          last_error: string | null
          nonce: number | null
          quote_id: string | null
          release_ledger_tx_id: string | null
          review_required: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          settle_ledger_tx_id: string | null
          signed_raw_tx: string | null
          status: string
          submitted_at: string | null
          to_address: string
          tx_hash: string | null
          units: number
          usd_cents: number
          user_id: string
        }
        Insert: {
          asset_key: string
          attempts?: number
          chain_id: number
          closed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          fee_usd_cents?: number
          hold_ledger_tx_id?: string | null
          id?: string
          last_error?: string | null
          nonce?: number | null
          quote_id?: string | null
          release_ledger_tx_id?: string | null
          review_required?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          settle_ledger_tx_id?: string | null
          signed_raw_tx?: string | null
          status?: string
          submitted_at?: string | null
          to_address: string
          tx_hash?: string | null
          units: number
          usd_cents: number
          user_id: string
        }
        Update: {
          asset_key?: string
          attempts?: number
          chain_id?: number
          closed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          fee_usd_cents?: number
          hold_ledger_tx_id?: string | null
          id?: string
          last_error?: string | null
          nonce?: number | null
          quote_id?: string | null
          release_ledger_tx_id?: string | null
          review_required?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          settle_ledger_tx_id?: string | null
          signed_raw_tx?: string | null
          status?: string
          submitted_at?: string | null
          to_address?: string
          tx_hash?: string | null
          units?: number
          usd_cents?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_withdrawals_asset_fk"
            columns: ["chain_id", "asset_key"]
            isOneToOne: false
            referencedRelation: "chain_assets"
            referencedColumns: ["chain_id", "asset_key"]
          },
          {
            foreignKeyName: "crypto_withdrawals_hold_ledger_tx_id_fkey"
            columns: ["hold_ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_withdrawals_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "crypto_withdrawal_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_withdrawals_release_ledger_tx_id_fkey"
            columns: ["release_ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_withdrawals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_withdrawals_settle_ledger_tx_id_fkey"
            columns: ["settle_ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_withdrawals_user_id_fkey"
            columns: ["user_id"]
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
      game_chat_messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          game_type: string
          id: string
          message: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_categories: string[] | null
          moderation_provider: string | null
          moderation_reason: string | null
          moderation_score: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          game_type: string
          id?: string
          message: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_categories?: string[] | null
          moderation_provider?: string | null
          moderation_reason?: string | null
          moderation_score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          game_type?: string
          id?: string
          message?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_categories?: string[] | null
          moderation_provider?: string | null
          moderation_reason?: string | null
          moderation_score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_chat_moderation_events: {
        Row: {
          action: string
          created_at: string
          id: number
          message_id: string | null
          moderator_id: string | null
          reason_code: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          message_id?: string | null
          moderator_id?: string | null
          reason_code?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          message_id?: string | null
          moderator_id?: string | null
          reason_code?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_chat_moderation_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "game_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      game_chat_user_restrictions: {
        Row: {
          banned: boolean
          created_at: string
          muted_until: string | null
          reason: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          banned?: boolean
          created_at?: string
          muted_until?: string | null
          reason?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          banned?: boolean
          created_at?: string
          muted_until?: string | null
          reason?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_chat_user_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_incidents: {
        Row: {
          check_name: string
          details: Json
          fingerprint: string
          first_seen_at: string
          id: number
          last_run_id: number | null
          last_seen_at: string
          occurrences: number
        }
        Insert: {
          check_name: string
          details: Json
          fingerprint: string
          first_seen_at?: string
          id?: never
          last_run_id?: number | null
          last_seen_at?: string
          occurrences?: number
        }
        Update: {
          check_name?: string
          details?: Json
          fingerprint?: string
          first_seen_at?: string
          id?: never
          last_run_id?: number | null
          last_seen_at?: string
          occurrences?: number
        }
        Relationships: []
      }
      integrity_runs: {
        Row: {
          finished_at: string | null
          id: number
          incidents_found: number
          started_at: string
        }
        Insert: {
          finished_at?: string | null
          id?: never
          incidents_found?: number
          started_at?: string
        }
        Update: {
          finished_at?: string | null
          id?: never
          incidents_found?: number
          started_at?: string
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
          max_pot: number
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
          max_pot?: number
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
          max_pot?: number
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
      roulette_bets: {
        Row: {
          amount: number
          color: Database["public"]["Enums"]["roulette_color"]
          created_at: string
          game_id: number
          id: string
          idempotency_key: string
          ledger_tx_id: string
          multiplier_bps: number
          payout_amount: number | null
          settled_at: string | null
          status: Database["public"]["Enums"]["roulette_bet_status"]
          user_id: string
        }
        Insert: {
          amount: number
          color: Database["public"]["Enums"]["roulette_color"]
          created_at?: string
          game_id: number
          id?: string
          idempotency_key: string
          ledger_tx_id: string
          multiplier_bps: number
          payout_amount?: number | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["roulette_bet_status"]
          user_id: string
        }
        Update: {
          amount?: number
          color?: Database["public"]["Enums"]["roulette_color"]
          created_at?: string
          game_id?: number
          id?: string
          idempotency_key?: string
          ledger_tx_id?: string
          multiplier_bps?: number
          payout_amount?: number | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["roulette_bet_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roulette_bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "roulette_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_bets_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roulette_config: {
        Row: {
          betting_seconds: number
          id: boolean
          lock_ms: number
          max_bet: number
          max_bets_per_round: number
          max_bets_per_user: number
          max_pot: number
          min_bet: number
          spin_ms: number
          stuck_cancel_seconds: number
          updated_at: string
          wheel_version: number
        }
        Insert: {
          betting_seconds?: number
          id?: boolean
          lock_ms?: number
          max_bet?: number
          max_bets_per_round?: number
          max_bets_per_user?: number
          max_pot?: number
          min_bet?: number
          spin_ms?: number
          stuck_cancel_seconds?: number
          updated_at?: string
          wheel_version: number
        }
        Update: {
          betting_seconds?: number
          id?: boolean
          lock_ms?: number
          max_bet?: number
          max_bets_per_round?: number
          max_bets_per_user?: number
          max_pot?: number
          min_bet?: number
          spin_ms?: number
          stuck_cancel_seconds?: number
          updated_at?: string
          wheel_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "roulette_config_wheel_version_fkey"
            columns: ["wheel_version"]
            isOneToOne: false
            referencedRelation: "roulette_wheels"
            referencedColumns: ["version"]
          },
        ]
      }
      roulette_game_secrets: {
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
            foreignKeyName: "roulette_game_secrets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "roulette_games"
            referencedColumns: ["id"]
          },
        ]
      }
      roulette_games: {
        Row: {
          account_type: string
          asset: string
          bet_count: number
          betting_ends_at: string | null
          betting_seconds: number
          betting_started_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          draw_counter: number | null
          draw_version: number
          house_result: number | null
          id: number
          last_error: string | null
          lock_ms: number
          locked_at: string | null
          max_bet: number
          max_bets_per_round: number
          max_bets_per_user: number
          max_pot: number
          min_bet: number
          player_count: number
          pot_amount: number
          protocol_version: string
          server_seed: string | null
          server_seed_hash: string
          settle_attempts: number
          settlement_started_at: string | null
          spin_end_at: string | null
          spin_ms: number
          spin_start_at: string | null
          status: Database["public"]["Enums"]["roulette_status"]
          stuck_cancel_seconds: number
          total_payout: number | null
          updated_at: string
          wheel_version: number
          winning_color: Database["public"]["Enums"]["roulette_color"] | null
          winning_slot: number | null
        }
        Insert: {
          account_type: string
          asset: string
          bet_count?: number
          betting_ends_at?: string | null
          betting_seconds: number
          betting_started_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          draw_counter?: number | null
          draw_version?: number
          house_result?: number | null
          id?: never
          last_error?: string | null
          lock_ms: number
          locked_at?: string | null
          max_bet: number
          max_bets_per_round: number
          max_bets_per_user: number
          max_pot: number
          min_bet: number
          player_count?: number
          pot_amount?: number
          protocol_version?: string
          server_seed?: string | null
          server_seed_hash: string
          settle_attempts?: number
          settlement_started_at?: string | null
          spin_end_at?: string | null
          spin_ms: number
          spin_start_at?: string | null
          status?: Database["public"]["Enums"]["roulette_status"]
          stuck_cancel_seconds: number
          total_payout?: number | null
          updated_at?: string
          wheel_version: number
          winning_color?: Database["public"]["Enums"]["roulette_color"] | null
          winning_slot?: number | null
        }
        Update: {
          account_type?: string
          asset?: string
          bet_count?: number
          betting_ends_at?: string | null
          betting_seconds?: number
          betting_started_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          draw_counter?: number | null
          draw_version?: number
          house_result?: number | null
          id?: never
          last_error?: string | null
          lock_ms?: number
          locked_at?: string | null
          max_bet?: number
          max_bets_per_round?: number
          max_bets_per_user?: number
          max_pot?: number
          min_bet?: number
          player_count?: number
          pot_amount?: number
          protocol_version?: string
          server_seed?: string | null
          server_seed_hash?: string
          settle_attempts?: number
          settlement_started_at?: string | null
          spin_end_at?: string | null
          spin_ms?: number
          spin_start_at?: string | null
          status?: Database["public"]["Enums"]["roulette_status"]
          stuck_cancel_seconds?: number
          total_payout?: number | null
          updated_at?: string
          wheel_version?: number
          winning_color?: Database["public"]["Enums"]["roulette_color"] | null
          winning_slot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roulette_games_wheel_version_fkey"
            columns: ["wheel_version"]
            isOneToOne: false
            referencedRelation: "roulette_wheels"
            referencedColumns: ["version"]
          },
        ]
      }
      roulette_payouts: {
        Row: {
          amount: number
          beneficiary_id: string
          bet_id: string
          created_at: string
          game_id: number
          idempotency_key: string
          kind: Database["public"]["Enums"]["roulette_payout_kind"]
          ledger_tx_id: string
        }
        Insert: {
          amount: number
          beneficiary_id: string
          bet_id: string
          created_at?: string
          game_id: number
          idempotency_key: string
          kind: Database["public"]["Enums"]["roulette_payout_kind"]
          ledger_tx_id: string
        }
        Update: {
          amount?: number
          beneficiary_id?: string
          bet_id?: string
          created_at?: string
          game_id?: number
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["roulette_payout_kind"]
          ledger_tx_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roulette_payouts_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_payouts_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: true
            referencedRelation: "roulette_bets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_payouts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "roulette_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_payouts_ledger_tx_id_fkey"
            columns: ["ledger_tx_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      roulette_results: {
        Row: {
          color: Database["public"]["Enums"]["roulette_color"]
          created_at: string
          draw_counter: number
          draw_version: number
          game_id: number
          hmac_hex: string
          message: string
          protocol_version: string
          server_seed_hash: string
          slot: number
          wheel_version: number
        }
        Insert: {
          color: Database["public"]["Enums"]["roulette_color"]
          created_at?: string
          draw_counter: number
          draw_version: number
          game_id: number
          hmac_hex: string
          message: string
          protocol_version: string
          server_seed_hash: string
          slot: number
          wheel_version: number
        }
        Update: {
          color?: Database["public"]["Enums"]["roulette_color"]
          created_at?: string
          draw_counter?: number
          draw_version?: number
          game_id?: number
          hmac_hex?: string
          message?: string
          protocol_version?: string
          server_seed_hash?: string
          slot?: number
          wheel_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "roulette_results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "roulette_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_results_wheel_version_fkey"
            columns: ["wheel_version"]
            isOneToOne: false
            referencedRelation: "roulette_wheels"
            referencedColumns: ["version"]
          },
        ]
      }
      roulette_wheels: {
        Row: {
          created_at: string
          layout: Database["public"]["Enums"]["roulette_color"][]
          multipliers_bps: Json
          slot_count: number
          version: number
        }
        Insert: {
          created_at?: string
          layout: Database["public"]["Enums"]["roulette_color"][]
          multipliers_bps: Json
          slot_count: number
          version: number
        }
        Update: {
          created_at?: string
          layout?: Database["public"]["Enums"]["roulette_color"][]
          multipliers_bps?: Json
          slot_count?: number
          version?: number
        }
        Relationships: []
      }
      signup_attempts: {
        Row: {
          created_at: string
          email_hash: string
          id: number
          ip_hash: string | null
        }
        Insert: {
          created_at?: string
          email_hash: string
          id?: never
          ip_hash?: string | null
        }
        Update: {
          created_at?: string
          email_hash?: string
          id?: never
          ip_hash?: string | null
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
      worker_tick_gate: {
        Row: {
          last_run_at: string
          name: string
        }
        Insert: {
          last_run_at?: string
          name: string
        }
        Update: {
          last_run_at?: string
          name?: string
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
      _crypto_incident: {
        Args: { p_check: string; p_details: Json; p_fp: string }
        Returns: undefined
      }
      _crypto_release: {
        Args: { p_id: string; p_reason: string; p_status: string }
        Returns: undefined
      }
      _ensure_open_game: { Args: never; Returns: number }
      _fair_hmac: {
        Args: { p_message: string; p_seed: string }
        Returns: string
      }
      _is_house_address: { Args: { p_addr: string }; Returns: boolean }
      _post: {
        Args: { p_account: string; p_amount: number; p_tx: string }
        Returns: undefined
      }
      _roulette_audit: {
        Args: {
          p_action: string
          p_actor: string
          p_details: Json
          p_game: number
        }
        Returns: undefined
      }
      _roulette_ensure_open: { Args: never; Returns: number }
      _roulette_refund: {
        Args: { p_game_id: number; p_reason: string }
        Returns: undefined
      }
      _roulette_settle: { Args: { p_game_id: number }; Returns: undefined }
      _system_account: {
        Args: {
          p_asset: string
          p_kind: Database["public"]["Enums"]["account_kind"]
          p_type: string
        }
        Returns: string
      }
      _tick_gate: { Args: { p_name: string }; Returns: boolean }
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
      chat_heartbeat: { Args: never; Returns: number }
      chat_send: {
        Args: {
          p_game: string
          p_message: string
          p_reason: string
          p_severity: string
          p_user: string
        }
        Returns: Json
      }
      chat_set_restriction: {
        Args: {
          p_banned: boolean
          p_moderator: string
          p_muted_until: string
          p_reason: string
          p_user: string
        }
        Returns: Json
      }
      chat_set_status: {
        Args: {
          p_message: string
          p_moderator: string
          p_reason: string
          p_status: string
        }
        Returns: Json
      }
      claim_test_credits:
        | { Args: never; Returns: Json }
        | { Args: { p_user: string }; Returns: Json }
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
      crypto_admin_overview: { Args: { p_admin: string }; Returns: Json }
      crypto_admin_review: {
        Args: { p_admin: string; p_approve: boolean; p_id: string }
        Returns: Json
      }
      crypto_admin_set_switches: {
        Args: {
          p_admin: string
          p_deposits: boolean
          p_system: boolean
          p_withdrawals: boolean
        }
        Returns: Json
      }
      crypto_cancel_withdrawal: {
        Args: { p_id: string; p_user: string }
        Returns: Json
      }
      crypto_credit_deposit: {
        Args: { p_id: string; p_price_snapshot: string }
        Returns: Json
      }
      crypto_get_cursor: { Args: { p_chain: number }; Returns: number }
      crypto_my_activity: { Args: { p_user: string }; Returns: Json }
      crypto_next_withdrawals:
        | {
            Args: never
            Returns: {
              asset_key: string
              attempts: number
              chain_id: number
              closed_at: string | null
              confirmed_at: string | null
              created_at: string
              fee_usd_cents: number
              hold_ledger_tx_id: string | null
              id: string
              last_error: string | null
              nonce: number | null
              quote_id: string | null
              release_ledger_tx_id: string | null
              review_required: boolean
              reviewed_at: string | null
              reviewed_by: string | null
              settle_ledger_tx_id: string | null
              signed_raw_tx: string | null
              status: string
              submitted_at: string | null
              to_address: string
              tx_hash: string | null
              units: number
              usd_cents: number
              user_id: string
            }[]
            SetofOptions: {
              from: "*"
              to: "crypto_withdrawals"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_chain: number }
            Returns: {
              asset_key: string
              attempts: number
              chain_id: number
              closed_at: string | null
              confirmed_at: string | null
              created_at: string
              fee_usd_cents: number
              hold_ledger_tx_id: string | null
              id: string
              last_error: string | null
              nonce: number | null
              quote_id: string | null
              release_ledger_tx_id: string | null
              review_required: boolean
              reviewed_at: string | null
              reviewed_by: string | null
              settle_ledger_tx_id: string | null
              signed_raw_tx: string | null
              status: string
              submitted_at: string | null
              to_address: string
              tx_hash: string | null
              units: number
              usd_cents: number
              user_id: string
            }[]
            SetofOptions: {
              from: "*"
              to: "crypto_withdrawals"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      crypto_observe_deposit:
        | {
            Args: {
              p_asset: string
              p_block: number
              p_from: string
              p_log: number
              p_to: string
              p_tx: string
              p_units: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_asset: string
              p_block: number
              p_chain: number
              p_from: string
              p_log: number
              p_to: string
              p_tx: string
              p_units: number
            }
            Returns: Json
          }
      crypto_pending_deposits: {
        Args: { p_chain: number; p_max_block: number }
        Returns: {
          asset_key: string
          block_number: number
          chain_id: number
          closed_reason: string | null
          confirmed_at: string | null
          created_at: string
          credited_at: string | null
          detected_at: string
          from_address: string
          id: string
          ledger_tx_id: string | null
          log_index: number
          price_snapshot_id: string | null
          status: string
          to_address: string
          tx_hash: string
          units: number
          usd_cents: number
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "crypto_deposits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      crypto_quote_withdrawal:
        | {
            Args: { p_chain: number; p_usd_cents: number; p_user: string }
            Returns: Json
          }
        | { Args: { p_usd_cents: number; p_user: string }; Returns: Json }
      crypto_raise_incident: {
        Args: { p_check: string; p_details: Json; p_fp: string }
        Returns: undefined
      }
      crypto_reconcile: {
        Args: { p_details: Json; p_onchain_cents: number }
        Returns: Json
      }
      crypto_record_price:
        | {
            Args: {
              p_asset: string
              p_feed: string
              p_observed: string
              p_price_micro: number
              p_round: number
            }
            Returns: string
          }
        | {
            Args: {
              p_asset: string
              p_chain: number
              p_feed: string
              p_observed: string
              p_price_micro: number
              p_round: number
            }
            Returns: string
          }
      crypto_request_withdrawal:
        | {
            Args: {
              p_asset: string
              p_env_ok: boolean
              p_quote: string
              p_usd_cents: number
              p_user: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_asset: string
              p_chain: number
              p_env_ok: boolean
              p_quote: string
              p_usd_cents: number
              p_user: string
            }
            Returns: Json
          }
      crypto_run_gate: {
        Args: { p_name: string; p_seconds: number }
        Returns: boolean
      }
      crypto_set_cursor: {
        Args: { p_block: number; p_chain: number }
        Returns: undefined
      }
      crypto_verify_job_token: { Args: { p_token: string }; Returns: boolean }
      crypto_withdrawal_broadcast: {
        Args: { p_id: string }
        Returns: undefined
      }
      crypto_withdrawal_confirmed: {
        Args: { p_id: string }
        Returns: undefined
      }
      crypto_withdrawal_error: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      crypto_withdrawal_failed: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      crypto_withdrawal_liquidity_pending: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      crypto_withdrawal_signed: {
        Args: { p_hash: string; p_id: string; p_nonce: number; p_raw: string }
        Returns: undefined
      }
      ensure_profile: {
        Args: { p_age_confirmed: boolean; p_username: string }
        Returns: Json
      }
      get_my_account_status: { Args: never; Returns: Json }
      get_profile_stats: { Args: { p_user: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      integrity_check: { Args: never; Returns: Json }
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
      reset_test_credits: { Args: { p_admin: string }; Returns: Json }
      roulette_advance: { Args: { p_game_id: number }; Returns: string }
      roulette_bet: {
        Args: {
          p_amount: number
          p_color: Database["public"]["Enums"]["roulette_color"]
          p_idempotency_key: string
        }
        Returns: Json
      }
      roulette_draw_slot: {
        Args: {
          p_draw_version: number
          p_game_id: number
          p_n: number
          p_seed: string
        }
        Returns: Record<string, unknown>
      }
      roulette_integrity_check: { Args: never; Returns: Json }
      roulette_tick: { Args: never; Returns: Json }
      server_time: { Args: never; Returns: string }
      signup_rate_check: {
        Args: { p_email_hash: string; p_ip_hash: string }
        Returns: Json
      }
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
        | "external_custody"
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
      roulette_bet_status: "ACCEPTED" | "WON" | "LOST" | "REFUNDED"
      roulette_color: "RED" | "BLACK" | "YELLOW" | "GREEN"
      roulette_payout_kind: "WINNER" | "REFUND"
      roulette_status:
        | "WAITING"
        | "BETTING"
        | "LOCKED"
        | "SPINNING"
        | "SETTLEMENT"
        | "COMPLETED"
        | "CANCELLED"
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
        | "roulette_entry"
        | "roulette_settlement"
        | "roulette_refund"
        | "test_credit_reset"
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
        "external_custody",
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
      roulette_bet_status: ["ACCEPTED", "WON", "LOST", "REFUNDED"],
      roulette_color: ["RED", "BLACK", "YELLOW", "GREEN"],
      roulette_payout_kind: ["WINNER", "REFUND"],
      roulette_status: [
        "WAITING",
        "BETTING",
        "LOCKED",
        "SPINNING",
        "SETTLEMENT",
        "COMPLETED",
        "CANCELLED",
      ],
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
        "roulette_entry",
        "roulette_settlement",
        "roulette_refund",
        "test_credit_reset",
      ],
    },
  },
} as const
