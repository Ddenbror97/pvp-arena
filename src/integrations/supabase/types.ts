export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      admin_devices: {
        Row: {
          created_at: string;
          id: string;
          ip_hash: string | null;
          last_seen_at: string;
          revoked_at: string | null;
          token_hash: string;
          ua_hash: string | null;
          user_id: string;
          verified_at: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          last_seen_at?: string;
          revoked_at?: string | null;
          token_hash: string;
          ua_hash?: string | null;
          user_id: string;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          last_seen_at?: string;
          revoked_at?: string | null;
          token_hash?: string;
          ua_hash?: string | null;
          user_id?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      admin_pin_attempts: {
        Row: {
          created_at: string;
          device_hash: string | null;
          id: number;
          ip_hash: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_hash?: string | null;
          id?: never;
          ip_hash?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_hash?: string | null;
          id?: never;
          ip_hash?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      admin_pin_grants: {
        Row: {
          device_id: string;
          granted_at: string;
          session_id: string;
          user_id: string;
        };
        Insert: {
          device_id: string;
          granted_at?: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          device_id?: string;
          granted_at?: string;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_pin_grants_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "admin_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_pins: {
        Row: {
          created_at: string;
          pin_hash: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          pin_hash: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          pin_hash?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      admin_stepup: {
        Row: {
          device_id: string;
          session_id: string;
          user_id: string;
          verified_at: string;
        };
        Insert: {
          device_id: string;
          session_id: string;
          user_id: string;
          verified_at?: string;
        };
        Update: {
          device_id?: string;
          session_id?: string;
          user_id?: string;
          verified_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_stepup_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "admin_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          game_id: number | null;
          game_type: string;
          id: number;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          game_id?: number | null;
          game_type?: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          game_id?: number | null;
          game_type?: string;
          id?: never;
        };
        Relationships: [];
      };
      auth_events: {
        Row: {
          challenge_id: string | null;
          created_at: string;
          details: Json;
          event: string;
          id: number;
          purpose: Database["public"]["Enums"]["otp_purpose"] | null;
          request_id: string | null;
          user_id: string | null;
        };
        Insert: {
          challenge_id?: string | null;
          created_at?: string;
          details?: Json;
          event: string;
          id?: never;
          purpose?: Database["public"]["Enums"]["otp_purpose"] | null;
          request_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          challenge_id?: string | null;
          created_at?: string;
          details?: Json;
          event?: string;
          id?: never;
          purpose?: Database["public"]["Enums"]["otp_purpose"] | null;
          request_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      btc_wallet_transfers: {
        Row: {
          admin_id: string | null;
          created_at: string;
          destination: string;
          id: string;
          sats: number;
          status: string;
          txid: string | null;
          usd_cents: number;
        };
        Insert: {
          admin_id?: string | null;
          created_at?: string;
          destination: string;
          id?: string;
          sats: number;
          status: string;
          txid?: string | null;
          usd_cents: number;
        };
        Update: {
          admin_id?: string | null;
          created_at?: string;
          destination?: string;
          id?: string;
          sats?: number;
          status?: string;
          txid?: string | null;
          usd_cents?: number;
        };
        Relationships: [];
      };
      btcpay_deposit_outputs: {
        Row: {
          created_at: string;
          invoice_id: string;
          network: string;
          sats: number;
          status: string;
          txid: string;
          updated_at: string;
          vout: number;
        };
        Insert: {
          created_at?: string;
          invoice_id: string;
          network: string;
          sats: number;
          status: string;
          txid: string;
          updated_at?: string;
          vout: number;
        };
        Update: {
          created_at?: string;
          invoice_id?: string;
          network?: string;
          sats?: number;
          status?: string;
          txid?: string;
          updated_at?: string;
          vout?: number;
        };
        Relationships: [
          {
            foreignKeyName: "btcpay_deposit_outputs_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "btcpay_invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      btcpay_invoices: {
        Row: {
          address: string | null;
          btc_due: string | null;
          btcpay_invoice_id: string;
          closed_reason: string | null;
          created_at: string;
          credited_at: string | null;
          credited_cents: number;
          credited_late_cents: number;
          credited_late_sats: number;
          credited_ontime_cents: number;
          expires_at: string | null;
          id: string;
          ledger_tx_id: string | null;
          network: string;
          required_confirmations: number;
          speed_policy: string;
          status: string;
          updated_at: string;
          usd_cents: number;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          btc_due?: string | null;
          btcpay_invoice_id: string;
          closed_reason?: string | null;
          created_at?: string;
          credited_at?: string | null;
          credited_cents?: number;
          credited_late_cents?: number;
          credited_late_sats?: number;
          credited_ontime_cents?: number;
          expires_at?: string | null;
          id: string;
          ledger_tx_id?: string | null;
          network: string;
          required_confirmations: number;
          speed_policy: string;
          status?: string;
          updated_at?: string;
          usd_cents: number;
          user_id: string;
        };
        Update: {
          address?: string | null;
          btc_due?: string | null;
          btcpay_invoice_id?: string;
          closed_reason?: string | null;
          created_at?: string;
          credited_at?: string | null;
          credited_cents?: number;
          credited_late_cents?: number;
          credited_late_sats?: number;
          credited_ontime_cents?: number;
          expires_at?: string | null;
          id?: string;
          ledger_tx_id?: string | null;
          network?: string;
          required_confirmations?: number;
          speed_policy?: string;
          status?: string;
          updated_at?: string;
          usd_cents?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "btcpay_invoices_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "btcpay_invoices_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      btcpay_payouts: {
        Row: {
          address: string;
          btcpay_payout_id: string | null;
          closed_at: string | null;
          closed_reason: string | null;
          created_at: string;
          fee_usd_cents: number;
          hold_ledger_tx_id: string | null;
          id: string;
          payout_txid: string | null;
          quote_expires_at: string | null;
          quote_sats: number | null;
          quoted_at: string | null;
          rate_micro: number | null;
          release_ledger_tx_id: string | null;
          settle_ledger_tx_id: string | null;
          status: string;
          updated_at: string;
          usd_cents: number;
          user_id: string;
        };
        Insert: {
          address: string;
          btcpay_payout_id?: string | null;
          closed_at?: string | null;
          closed_reason?: string | null;
          created_at?: string;
          fee_usd_cents?: number;
          hold_ledger_tx_id?: string | null;
          id?: string;
          payout_txid?: string | null;
          quote_expires_at?: string | null;
          quote_sats?: number | null;
          quoted_at?: string | null;
          rate_micro?: number | null;
          release_ledger_tx_id?: string | null;
          settle_ledger_tx_id?: string | null;
          status?: string;
          updated_at?: string;
          usd_cents: number;
          user_id: string;
        };
        Update: {
          address?: string;
          btcpay_payout_id?: string | null;
          closed_at?: string | null;
          closed_reason?: string | null;
          created_at?: string;
          fee_usd_cents?: number;
          hold_ledger_tx_id?: string | null;
          id?: string;
          payout_txid?: string | null;
          quote_expires_at?: string | null;
          quote_sats?: number | null;
          quoted_at?: string | null;
          rate_micro?: number | null;
          release_ledger_tx_id?: string | null;
          settle_ledger_tx_id?: string | null;
          status?: string;
          updated_at?: string;
          usd_cents?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "btcpay_payouts_hold_ledger_tx_id_fkey";
            columns: ["hold_ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "btcpay_payouts_release_ledger_tx_id_fkey";
            columns: ["release_ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "btcpay_payouts_settle_ledger_tx_id_fkey";
            columns: ["settle_ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "btcpay_payouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chain_assets: {
        Row: {
          asset_key: string;
          chain_id: number;
          contract_address: string | null;
          created_at: string;
          decimals: number;
          display_name: string;
          is_enabled: boolean;
          ledger_account_type: string;
          ledger_asset: string;
          min_deposit_units: number;
          price_feed_address: string | null;
          settlement_kind: string;
          usd_per_unit: number | null;
        };
        Insert: {
          asset_key: string;
          chain_id: number;
          contract_address?: string | null;
          created_at?: string;
          decimals: number;
          display_name: string;
          is_enabled?: boolean;
          ledger_account_type: string;
          ledger_asset: string;
          min_deposit_units: number;
          price_feed_address?: string | null;
          settlement_kind: string;
          usd_per_unit?: number | null;
        };
        Update: {
          asset_key?: string;
          chain_id?: number;
          contract_address?: string | null;
          created_at?: string;
          decimals?: number;
          display_name?: string;
          is_enabled?: boolean;
          ledger_account_type?: string;
          ledger_asset?: string;
          min_deposit_units?: number;
          price_feed_address?: string | null;
          settlement_kind?: string;
          usd_per_unit?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "chain_assets_chain_id_fkey";
            columns: ["chain_id"];
            isOneToOne: false;
            referencedRelation: "chain_networks";
            referencedColumns: ["chain_id"];
          },
        ];
      };
      chain_networks: {
        Row: {
          chain_id: number;
          created_at: string;
          credit_confirmations: number;
          finalized_confirmations: number;
          is_enabled: boolean;
          min_deposit_cents: number;
          min_withdrawal_cents: number;
          name: string;
          network_mode: string;
          safe_confirmations: number;
        };
        Insert: {
          chain_id: number;
          created_at?: string;
          credit_confirmations?: number;
          finalized_confirmations?: number;
          is_enabled?: boolean;
          min_deposit_cents?: number;
          min_withdrawal_cents?: number;
          name: string;
          network_mode: string;
          safe_confirmations?: number;
        };
        Update: {
          chain_id?: number;
          created_at?: string;
          credit_confirmations?: number;
          finalized_confirmations?: number;
          is_enabled?: boolean;
          min_deposit_cents?: number;
          min_withdrawal_cents?: number;
          name?: string;
          network_mode?: string;
          safe_confirmations?: number;
        };
        Relationships: [];
      };
      chain_treasury_accounts: {
        Row: {
          address: string;
          chain_id: number;
          created_at: string;
          is_active: boolean;
          role: string;
        };
        Insert: {
          address: string;
          chain_id: number;
          created_at?: string;
          is_active?: boolean;
          role: string;
        };
        Update: {
          address?: string;
          chain_id?: number;
          created_at?: string;
          is_active?: boolean;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chain_treasury_accounts_chain_id_fkey";
            columns: ["chain_id"];
            isOneToOne: false;
            referencedRelation: "chain_networks";
            referencedColumns: ["chain_id"];
          },
        ];
      };
      chat_presence: {
        Row: {
          last_seen_at: string;
          user_id: string;
        };
        Insert: {
          last_seen_at?: string;
          user_id: string;
        };
        Update: {
          last_seen_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      coinflip_config: {
        Row: {
          animation_ms: number;
          create_rate_limit: number;
          create_rate_window_seconds: number;
          fee_bps: number;
          id: boolean;
          max_open_per_user: number;
          max_wager: number;
          min_wager: number;
          pre_delay_ms: number;
          updated_at: string;
          waiting_timeout_seconds: number;
        };
        Insert: {
          animation_ms?: number;
          create_rate_limit?: number;
          create_rate_window_seconds?: number;
          fee_bps?: number;
          id?: boolean;
          max_open_per_user?: number;
          max_wager?: number;
          min_wager?: number;
          pre_delay_ms?: number;
          updated_at?: string;
          waiting_timeout_seconds?: number;
        };
        Update: {
          animation_ms?: number;
          create_rate_limit?: number;
          create_rate_window_seconds?: number;
          fee_bps?: number;
          id?: boolean;
          max_open_per_user?: number;
          max_wager?: number;
          min_wager?: number;
          pre_delay_ms?: number;
          updated_at?: string;
          waiting_timeout_seconds?: number;
        };
        Relationships: [];
      };
      coinflip_entries: {
        Row: {
          amount: number;
          created_at: string;
          game_id: number;
          id: string;
          idempotency_key: string;
          ledger_tx_id: string;
          side: Database["public"]["Enums"]["coin_side"];
          slot: number;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          game_id: number;
          id?: string;
          idempotency_key: string;
          ledger_tx_id: string;
          side: Database["public"]["Enums"]["coin_side"];
          slot: number;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          game_id?: number;
          id?: string;
          idempotency_key?: string;
          ledger_tx_id?: string;
          side?: Database["public"]["Enums"]["coin_side"];
          slot?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coinflip_entries_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "coinflip_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coinflip_entries_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coinflip_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coinflip_game_secrets: {
        Row: {
          game_id: number;
          server_seed: string;
        };
        Insert: {
          game_id: number;
          server_seed: string;
        };
        Update: {
          game_id?: number;
          server_seed?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coinflip_game_secrets_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "coinflip_games";
            referencedColumns: ["id"];
          },
        ];
      };
      coinflip_games: {
        Row: {
          account_type: string;
          amount: number;
          animation_end_at: string | null;
          animation_start_at: string | null;
          asset: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          creator_id: string;
          creator_side: Database["public"]["Enums"]["coin_side"];
          draw_version: number;
          expires_at: string;
          fee_amount: number | null;
          fee_bps: number;
          id: number;
          joined_at: string | null;
          money_domain: string;
          opponent_id: string | null;
          payout_amount: number | null;
          pot_amount: number;
          protocol_version: string;
          server_seed: string | null;
          server_seed_hash: string;
          settlement_started_at: string | null;
          status: Database["public"]["Enums"]["coinflip_status"];
          updated_at: string;
          winner_id: string | null;
          winning_side: Database["public"]["Enums"]["coin_side"] | null;
        };
        Insert: {
          account_type: string;
          amount: number;
          animation_end_at?: string | null;
          animation_start_at?: string | null;
          asset: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          creator_id: string;
          creator_side: Database["public"]["Enums"]["coin_side"];
          draw_version?: number;
          expires_at: string;
          fee_amount?: number | null;
          fee_bps: number;
          id?: never;
          joined_at?: string | null;
          money_domain?: string;
          opponent_id?: string | null;
          payout_amount?: number | null;
          pot_amount: number;
          protocol_version?: string;
          server_seed?: string | null;
          server_seed_hash: string;
          settlement_started_at?: string | null;
          status?: Database["public"]["Enums"]["coinflip_status"];
          updated_at?: string;
          winner_id?: string | null;
          winning_side?: Database["public"]["Enums"]["coin_side"] | null;
        };
        Update: {
          account_type?: string;
          amount?: number;
          animation_end_at?: string | null;
          animation_start_at?: string | null;
          asset?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          creator_id?: string;
          creator_side?: Database["public"]["Enums"]["coin_side"];
          draw_version?: number;
          expires_at?: string;
          fee_amount?: number | null;
          fee_bps?: number;
          id?: never;
          joined_at?: string | null;
          money_domain?: string;
          opponent_id?: string | null;
          payout_amount?: number | null;
          pot_amount?: number;
          protocol_version?: string;
          server_seed?: string | null;
          server_seed_hash?: string;
          settlement_started_at?: string | null;
          status?: Database["public"]["Enums"]["coinflip_status"];
          updated_at?: string;
          winner_id?: string | null;
          winning_side?: Database["public"]["Enums"]["coin_side"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "coinflip_games_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coinflip_games_opponent_id_fkey";
            columns: ["opponent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coinflip_payouts: {
        Row: {
          amount: number;
          attempts: number;
          beneficiary_id: string;
          created_at: string;
          game_id: number;
          idempotency_key: string;
          kind: Database["public"]["Enums"]["coinflip_payout_kind"];
          last_error: string | null;
          ledger_tx_id: string | null;
          settled_at: string | null;
          status: Database["public"]["Enums"]["payout_status"];
        };
        Insert: {
          amount: number;
          attempts?: number;
          beneficiary_id: string;
          created_at?: string;
          game_id: number;
          idempotency_key: string;
          kind: Database["public"]["Enums"]["coinflip_payout_kind"];
          last_error?: string | null;
          ledger_tx_id?: string | null;
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Update: {
          amount?: number;
          attempts?: number;
          beneficiary_id?: string;
          created_at?: string;
          game_id?: number;
          idempotency_key?: string;
          kind?: Database["public"]["Enums"]["coinflip_payout_kind"];
          last_error?: string | null;
          ledger_tx_id?: string | null;
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Relationships: [
          {
            foreignKeyName: "coinflip_payouts_beneficiary_id_fkey";
            columns: ["beneficiary_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coinflip_payouts_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "coinflip_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coinflip_payouts_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      coinflip_results: {
        Row: {
          created_at: string;
          draw_version: number;
          first_byte: number;
          game_id: number;
          hmac_hex: string;
          message: string;
          protocol_version: string;
          server_seed_hash: string;
          winner_id: string;
          winning_side: Database["public"]["Enums"]["coin_side"];
        };
        Insert: {
          created_at?: string;
          draw_version: number;
          first_byte: number;
          game_id: number;
          hmac_hex: string;
          message: string;
          protocol_version: string;
          server_seed_hash: string;
          winner_id: string;
          winning_side: Database["public"]["Enums"]["coin_side"];
        };
        Update: {
          created_at?: string;
          draw_version?: number;
          first_byte?: number;
          game_id?: number;
          hmac_hex?: string;
          message?: string;
          protocol_version?: string;
          server_seed_hash?: string;
          winner_id?: string;
          winning_side?: Database["public"]["Enums"]["coin_side"];
        };
        Relationships: [
          {
            foreignKeyName: "coinflip_results_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "coinflip_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coinflip_results_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cosmetics: {
        Row: {
          active: boolean;
          asset_key: string;
          created_at: string;
          description: string;
          id: string;
          metadata: Json;
          name: string;
          rarity: string;
          type: string;
        };
        Insert: {
          active?: boolean;
          asset_key: string;
          created_at?: string;
          description: string;
          id?: string;
          metadata?: Json;
          name: string;
          rarity: string;
          type: string;
        };
        Update: {
          active?: boolean;
          asset_key?: string;
          created_at?: string;
          description?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          rarity?: string;
          type?: string;
        };
        Relationships: [];
      };
      crypto_chain_cursor: {
        Row: {
          chain_id: number;
          last_eth_scanned_block: number | null;
          last_processed_block: number;
          updated_at: string;
        };
        Insert: {
          chain_id: number;
          last_eth_scanned_block?: number | null;
          last_processed_block: number;
          updated_at?: string;
        };
        Update: {
          chain_id?: number;
          last_eth_scanned_block?: number | null;
          last_processed_block?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crypto_chain_cursor_chain_id_fkey";
            columns: ["chain_id"];
            isOneToOne: true;
            referencedRelation: "chain_networks";
            referencedColumns: ["chain_id"];
          },
        ];
      };
      crypto_chain_inventory: {
        Row: {
          chain_id: number;
          deposit_usdc_units: number;
          deposit_wei: number;
          eth_deposit_liability_cents: number;
          eth_price_micro_usd: number | null;
          eth_withdrawn_cents: number;
          hot_key_matches: boolean | null;
          observed_at: string;
          payout_usdc_units: number;
          payout_wei: number;
          pending_eth_cents: number;
          pending_eth_wei: number;
          pending_usdc_cents: number;
          pending_usdc_units: number;
          price_ok: boolean;
        };
        Insert: {
          chain_id: number;
          deposit_usdc_units: number;
          deposit_wei: number;
          eth_deposit_liability_cents: number;
          eth_price_micro_usd?: number | null;
          eth_withdrawn_cents: number;
          hot_key_matches?: boolean | null;
          observed_at?: string;
          payout_usdc_units: number;
          payout_wei: number;
          pending_eth_cents: number;
          pending_eth_wei: number;
          pending_usdc_cents: number;
          pending_usdc_units: number;
          price_ok: boolean;
        };
        Update: {
          chain_id?: number;
          deposit_usdc_units?: number;
          deposit_wei?: number;
          eth_deposit_liability_cents?: number;
          eth_price_micro_usd?: number | null;
          eth_withdrawn_cents?: number;
          hot_key_matches?: boolean | null;
          observed_at?: string;
          payout_usdc_units?: number;
          payout_wei?: number;
          pending_eth_cents?: number;
          pending_eth_wei?: number;
          pending_usdc_cents?: number;
          pending_usdc_units?: number;
          price_ok?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "crypto_chain_inventory_chain_id_fkey";
            columns: ["chain_id"];
            isOneToOne: true;
            referencedRelation: "chain_networks";
            referencedColumns: ["chain_id"];
          },
        ];
      };
      crypto_deposit_addresses: {
        Row: {
          address: string;
          chain_id: number;
          created_at: string;
          derivation_index: number;
          derivation_version: number;
          id: string;
          user_id: string;
        };
        Insert: {
          address: string;
          chain_id: number;
          created_at?: string;
          derivation_index: number;
          derivation_version?: number;
          id?: string;
          user_id: string;
        };
        Update: {
          address?: string;
          chain_id?: number;
          created_at?: string;
          derivation_index?: number;
          derivation_version?: number;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crypto_deposit_addresses_chain_id_fkey";
            columns: ["chain_id"];
            isOneToOne: false;
            referencedRelation: "chain_networks";
            referencedColumns: ["chain_id"];
          },
          {
            foreignKeyName: "crypto_deposit_addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      crypto_deposits: {
        Row: {
          asset_key: string;
          block_hash: string | null;
          block_number: number;
          chain_id: number;
          closed_reason: string | null;
          confirmed_at: string | null;
          created_at: string;
          credited_at: string | null;
          detected_at: string;
          from_address: string;
          id: string;
          ledger_tx_id: string | null;
          log_index: number;
          price_snapshot_id: string | null;
          status: string;
          to_address: string;
          tx_hash: string;
          units: number;
          usd_cents: number;
          user_id: string | null;
        };
        Insert: {
          asset_key: string;
          block_hash?: string | null;
          block_number: number;
          chain_id: number;
          closed_reason?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          credited_at?: string | null;
          detected_at?: string;
          from_address: string;
          id?: string;
          ledger_tx_id?: string | null;
          log_index?: number;
          price_snapshot_id?: string | null;
          status?: string;
          to_address: string;
          tx_hash: string;
          units: number;
          usd_cents: number;
          user_id?: string | null;
        };
        Update: {
          asset_key?: string;
          block_hash?: string | null;
          block_number?: number;
          chain_id?: number;
          closed_reason?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          credited_at?: string | null;
          detected_at?: string;
          from_address?: string;
          id?: string;
          ledger_tx_id?: string | null;
          log_index?: number;
          price_snapshot_id?: string | null;
          status?: string;
          to_address?: string;
          tx_hash?: string;
          units?: number;
          usd_cents?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "crypto_deposits_asset_fk";
            columns: ["chain_id", "asset_key"];
            isOneToOne: false;
            referencedRelation: "chain_assets";
            referencedColumns: ["chain_id", "asset_key"];
          },
          {
            foreignKeyName: "crypto_deposits_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crypto_deposits_price_snapshot_id_fkey";
            columns: ["price_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "crypto_price_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crypto_deposits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      crypto_job_bearer: {
        Row: {
          id: boolean;
          token: string;
        };
        Insert: {
          id?: boolean;
          token: string;
        };
        Update: {
          id?: boolean;
          token?: string;
        };
        Relationships: [];
      };
      crypto_job_runs: {
        Row: {
          last_run_at: string;
          name: string;
        };
        Insert: {
          last_run_at?: string;
          name: string;
        };
        Update: {
          last_run_at?: string;
          name?: string;
        };
        Relationships: [];
      };
      crypto_job_tokens: {
        Row: {
          created_at: string;
          id: boolean;
          token_sha256: string;
        };
        Insert: {
          created_at?: string;
          id?: boolean;
          token_sha256: string;
        };
        Update: {
          created_at?: string;
          id?: boolean;
          token_sha256?: string;
        };
        Relationships: [];
      };
      crypto_price_snapshots: {
        Row: {
          asset_key: string;
          chain_id: number;
          created_at: string;
          feed_address: string;
          feed_round_id: number;
          id: string;
          max_age_seconds: number;
          observed_at: string;
          oracle_updated_at: string;
          price_micro_usd: number;
        };
        Insert: {
          asset_key: string;
          chain_id: number;
          created_at?: string;
          feed_address: string;
          feed_round_id: number;
          id?: string;
          max_age_seconds?: number;
          observed_at?: string;
          oracle_updated_at: string;
          price_micro_usd: number;
        };
        Update: {
          asset_key?: string;
          chain_id?: number;
          created_at?: string;
          feed_address?: string;
          feed_round_id?: number;
          id?: string;
          max_age_seconds?: number;
          observed_at?: string;
          oracle_updated_at?: string;
          price_micro_usd?: number;
        };
        Relationships: [
          {
            foreignKeyName: "crypto_price_snapshot_asset_fk";
            columns: ["chain_id", "asset_key"];
            isOneToOne: false;
            referencedRelation: "chain_assets";
            referencedColumns: ["chain_id", "asset_key"];
          },
        ];
      };
      crypto_settings: {
        Row: {
          auto_approve_cents: number;
          chain_id: number;
          crypto_system_enabled: boolean;
          daily_global_limit_cents: number;
          daily_limit_cents: number;
          deposits_enabled: boolean;
          environment: string;
          id: boolean;
          mainnet_enabled: boolean;
          min_deposit_cents: number;
          min_withdrawal_cents: number;
          money_domain_frozen: boolean;
          overlap_blocks: number;
          payout_float_max_cents: number;
          price_max_age_seconds: number;
          quote_ttl_seconds: number;
          real_play_enabled: boolean;
          test_credits_reset_at: string | null;
          updated_at: string;
          watch_only: boolean;
          withdrawal_fee_cents: number;
          withdrawals_enabled: boolean;
        };
        Insert: {
          auto_approve_cents?: number;
          chain_id?: number;
          crypto_system_enabled?: boolean;
          daily_global_limit_cents?: number;
          daily_limit_cents?: number;
          deposits_enabled?: boolean;
          environment?: string;
          id?: boolean;
          mainnet_enabled?: boolean;
          min_deposit_cents?: number;
          min_withdrawal_cents?: number;
          money_domain_frozen?: boolean;
          overlap_blocks?: number;
          payout_float_max_cents?: number;
          price_max_age_seconds?: number;
          quote_ttl_seconds?: number;
          real_play_enabled?: boolean;
          test_credits_reset_at?: string | null;
          updated_at?: string;
          watch_only?: boolean;
          withdrawal_fee_cents?: number;
          withdrawals_enabled?: boolean;
        };
        Update: {
          auto_approve_cents?: number;
          chain_id?: number;
          crypto_system_enabled?: boolean;
          daily_global_limit_cents?: number;
          daily_limit_cents?: number;
          deposits_enabled?: boolean;
          environment?: string;
          id?: boolean;
          mainnet_enabled?: boolean;
          min_deposit_cents?: number;
          min_withdrawal_cents?: number;
          money_domain_frozen?: boolean;
          overlap_blocks?: number;
          payout_float_max_cents?: number;
          price_max_age_seconds?: number;
          quote_ttl_seconds?: number;
          real_play_enabled?: boolean;
          test_credits_reset_at?: string | null;
          updated_at?: string;
          watch_only?: boolean;
          withdrawal_fee_cents?: number;
          withdrawals_enabled?: boolean;
        };
        Relationships: [];
      };
      crypto_withdrawal_quotes: {
        Row: {
          asset_key: string;
          chain_id: number;
          created_at: string;
          expires_at: string;
          id: string;
          price_micro_usd: number;
          price_snapshot_id: string;
          units: number;
          usd_cents: number;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          asset_key: string;
          chain_id: number;
          created_at?: string;
          expires_at: string;
          id?: string;
          price_micro_usd: number;
          price_snapshot_id: string;
          units: number;
          usd_cents: number;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          asset_key?: string;
          chain_id?: number;
          created_at?: string;
          expires_at?: string;
          id?: string;
          price_micro_usd?: number;
          price_snapshot_id?: string;
          units?: number;
          usd_cents?: number;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crypto_withdrawal_quotes_chain_id_asset_key_fkey";
            columns: ["chain_id", "asset_key"];
            isOneToOne: false;
            referencedRelation: "chain_assets";
            referencedColumns: ["chain_id", "asset_key"];
          },
          {
            foreignKeyName: "crypto_withdrawal_quotes_price_snapshot_id_fkey";
            columns: ["price_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "crypto_price_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crypto_withdrawal_quotes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      crypto_withdrawals: {
        Row: {
          asset_key: string;
          attempts: number;
          chain_id: number;
          closed_at: string | null;
          confirmed_at: string | null;
          created_at: string;
          fee_usd_cents: number;
          hold_ledger_tx_id: string | null;
          id: string;
          last_error: string | null;
          nonce: number | null;
          quote_id: string | null;
          release_ledger_tx_id: string | null;
          review_required: boolean;
          reviewed_at: string | null;
          reviewed_by: string | null;
          settle_ledger_tx_id: string | null;
          signed_raw_tx: string | null;
          status: string;
          submitted_at: string | null;
          to_address: string;
          tx_hash: string | null;
          units: number;
          usd_cents: number;
          user_id: string;
        };
        Insert: {
          asset_key: string;
          attempts?: number;
          chain_id: number;
          closed_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          fee_usd_cents?: number;
          hold_ledger_tx_id?: string | null;
          id?: string;
          last_error?: string | null;
          nonce?: number | null;
          quote_id?: string | null;
          release_ledger_tx_id?: string | null;
          review_required?: boolean;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          settle_ledger_tx_id?: string | null;
          signed_raw_tx?: string | null;
          status?: string;
          submitted_at?: string | null;
          to_address: string;
          tx_hash?: string | null;
          units: number;
          usd_cents: number;
          user_id: string;
        };
        Update: {
          asset_key?: string;
          attempts?: number;
          chain_id?: number;
          closed_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          fee_usd_cents?: number;
          hold_ledger_tx_id?: string | null;
          id?: string;
          last_error?: string | null;
          nonce?: number | null;
          quote_id?: string | null;
          release_ledger_tx_id?: string | null;
          review_required?: boolean;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          settle_ledger_tx_id?: string | null;
          signed_raw_tx?: string | null;
          status?: string;
          submitted_at?: string | null;
          to_address?: string;
          tx_hash?: string | null;
          units?: number;
          usd_cents?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crypto_withdrawals_asset_fk";
            columns: ["chain_id", "asset_key"];
            isOneToOne: false;
            referencedRelation: "chain_assets";
            referencedColumns: ["chain_id", "asset_key"];
          },
          {
            foreignKeyName: "crypto_withdrawals_hold_ledger_tx_id_fkey";
            columns: ["hold_ledger_tx_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crypto_withdrawals_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: true;
            referencedRelation: "crypto_withdrawal_quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crypto_withdrawals_release_ledger_tx_id_fkey";
            columns: ["release_ledger_tx_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crypto_withdrawals_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crypto_withdrawals_settle_ledger_tx_id_fkey";
            columns: ["settle_ledger_tx_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crypto_withdrawals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_chest_opens: {
        Row: {
          amount: number | null;
          cosmetic_id: string | null;
          fallback: boolean;
          id: string;
          kind: string;
          ledger_tx_id: string | null;
          next_at: string;
          opened_at: string;
          reward_key: string;
          ticket_id: string | null;
          user_id: string;
        };
        Insert: {
          amount?: number | null;
          cosmetic_id?: string | null;
          fallback?: boolean;
          id: string;
          kind: string;
          ledger_tx_id?: string | null;
          next_at: string;
          opened_at: string;
          reward_key: string;
          ticket_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number | null;
          cosmetic_id?: string | null;
          fallback?: boolean;
          id?: string;
          kind?: string;
          ledger_tx_id?: string | null;
          next_at?: string;
          opened_at?: string;
          reward_key?: string;
          ticket_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_chest_opens_cosmetic_id_fkey";
            columns: ["cosmetic_id"];
            isOneToOne: false;
            referencedRelation: "cosmetics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_chest_opens_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_chest_opens_reward_key_fkey";
            columns: ["reward_key"];
            isOneToOne: false;
            referencedRelation: "daily_chest_rewards";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "daily_chest_opens_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: true;
            referencedRelation: "fee_free_tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_chest_opens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_chest_pool_items: {
        Row: {
          cosmetic_id: string;
          pool: string;
        };
        Insert: {
          cosmetic_id: string;
          pool: string;
        };
        Update: {
          cosmetic_id?: string;
          pool?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_chest_pool_items_cosmetic_id_fkey";
            columns: ["cosmetic_id"];
            isOneToOne: false;
            referencedRelation: "cosmetics";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_chest_rewards: {
        Row: {
          active: boolean;
          amount: number | null;
          created_at: string;
          key: string;
          kind: string;
          pool: string | null;
          weight: number;
        };
        Insert: {
          active?: boolean;
          amount?: number | null;
          created_at?: string;
          key: string;
          kind: string;
          pool?: string | null;
          weight: number;
        };
        Update: {
          active?: boolean;
          amount?: number | null;
          created_at?: string;
          key?: string;
          kind?: string;
          pool?: string | null;
          weight?: number;
        };
        Relationships: [];
      };
      daily_chest_state: {
        Row: {
          last_opened_at: string | null;
          next_at: string | null;
          opens: number;
          user_id: string;
        };
        Insert: {
          last_opened_at?: string | null;
          next_at?: string | null;
          opens?: number;
          user_id: string;
        };
        Update: {
          last_opened_at?: string | null;
          next_at?: string | null;
          opens?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_chest_state_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_otp_challenges: {
        Row: {
          attempt_count: number;
          consumed_at: string | null;
          created_at: string;
          created_by_request_id: string;
          email: string;
          expires_at: string;
          id: string;
          ip_hash: string | null;
          last_sent_at: string | null;
          max_attempts: number;
          otp_digest: string;
          purpose: Database["public"]["Enums"]["otp_purpose"];
          resend_count: number;
          status: Database["public"]["Enums"]["otp_status"];
          user_agent_hash: string | null;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          consumed_at?: string | null;
          created_at?: string;
          created_by_request_id: string;
          email: string;
          expires_at: string;
          id: string;
          ip_hash?: string | null;
          last_sent_at?: string | null;
          max_attempts?: number;
          otp_digest: string;
          purpose: Database["public"]["Enums"]["otp_purpose"];
          resend_count?: number;
          status?: Database["public"]["Enums"]["otp_status"];
          user_agent_hash?: string | null;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          consumed_at?: string | null;
          created_at?: string;
          created_by_request_id?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          ip_hash?: string | null;
          last_sent_at?: string | null;
          max_attempts?: number;
          otp_digest?: string;
          purpose?: Database["public"]["Enums"]["otp_purpose"];
          resend_count?: number;
          status?: Database["public"]["Enums"]["otp_status"];
          user_agent_hash?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      fee_free_tickets: {
        Row: {
          created_at: string;
          id: string;
          source: string;
          source_id: string;
          used_at: string | null;
          used_game: string | null;
          used_game_id: number | null;
          user_id: string;
          waived_cents: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          source: string;
          source_id: string;
          used_at?: string | null;
          used_game?: string | null;
          used_game_id?: number | null;
          user_id: string;
          waived_cents?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          source?: string;
          source_id?: string;
          used_at?: string | null;
          used_game?: string | null;
          used_game_id?: number | null;
          user_id?: string;
          waived_cents?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fee_free_tickets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      game_chat_messages: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          game_type: string;
          id: string;
          message: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_categories: string[] | null;
          moderation_provider: string | null;
          moderation_reason: string | null;
          moderation_score: number | null;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          game_type: string;
          id?: string;
          message: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_categories?: string[] | null;
          moderation_provider?: string | null;
          moderation_reason?: string | null;
          moderation_score?: number | null;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          game_type?: string;
          id?: string;
          message?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_categories?: string[] | null;
          moderation_provider?: string | null;
          moderation_reason?: string | null;
          moderation_score?: number | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      game_chat_moderation_events: {
        Row: {
          action: string;
          created_at: string;
          id: number;
          message_id: string | null;
          moderator_id: string | null;
          reason_code: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: never;
          message_id?: string | null;
          moderator_id?: string | null;
          reason_code?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: never;
          message_id?: string | null;
          moderator_id?: string | null;
          reason_code?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "game_chat_moderation_events_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "game_chat_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      game_chat_user_restrictions: {
        Row: {
          banned: boolean;
          created_at: string;
          muted_until: string | null;
          reason: string | null;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          banned?: boolean;
          created_at?: string;
          muted_until?: string | null;
          reason?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          banned?: boolean;
          created_at?: string;
          muted_until?: string | null;
          reason?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_chat_user_restrictions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_checks: {
        Row: {
          session_id: string | null;
          session_url: string | null;
          status: string;
          updated_at: string;
          user_id: string;
          verified_at: string | null;
        };
        Insert: {
          session_id?: string | null;
          session_url?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
          verified_at?: string | null;
        };
        Update: {
          session_id?: string | null;
          session_url?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      integrity_incidents: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_note: string | null;
          check_name: string;
          details: Json;
          fingerprint: string;
          first_seen_at: string;
          id: number;
          last_alerted_at: string | null;
          last_run_id: number | null;
          last_seen_at: string;
          occurrences: number;
        };
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_note?: string | null;
          check_name: string;
          details: Json;
          fingerprint: string;
          first_seen_at?: string;
          id?: never;
          last_alerted_at?: string | null;
          last_run_id?: number | null;
          last_seen_at?: string;
          occurrences?: number;
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_note?: string | null;
          check_name?: string;
          details?: Json;
          fingerprint?: string;
          first_seen_at?: string;
          id?: never;
          last_alerted_at?: string | null;
          last_run_id?: number | null;
          last_seen_at?: string;
          occurrences?: number;
        };
        Relationships: [];
      };
      integrity_runs: {
        Row: {
          finished_at: string | null;
          id: number;
          incidents_found: number;
          started_at: string;
        };
        Insert: {
          finished_at?: string | null;
          id?: never;
          incidents_found?: number;
          started_at?: string;
        };
        Update: {
          finished_at?: string | null;
          id?: never;
          incidents_found?: number;
          started_at?: string;
        };
        Relationships: [];
      };
      integrity_scan_cursor: {
        Row: {
          last_id: number;
          name: string;
          updated_at: string;
        };
        Insert: {
          last_id?: number;
          name: string;
          updated_at?: string;
        };
        Update: {
          last_id?: number;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      jackpot_config: {
        Row: {
          account_type: string;
          asset: string;
          countdown_seconds: number;
          entry_rate_limit: number;
          entry_rate_window_seconds: number;
          extension_seconds: number;
          id: boolean;
          max_duration_seconds: number;
          max_entry: number;
          max_pot: number;
          min_entry: number;
          rake_bps: number;
          real_money_enabled: boolean;
          solo_wait_seconds: number;
          test_grant_amount: number;
          updated_at: string;
        };
        Insert: {
          account_type?: string;
          asset?: string;
          countdown_seconds?: number;
          entry_rate_limit?: number;
          entry_rate_window_seconds?: number;
          extension_seconds?: number;
          id?: boolean;
          max_duration_seconds?: number;
          max_entry?: number;
          max_pot?: number;
          min_entry?: number;
          rake_bps?: number;
          real_money_enabled?: boolean;
          solo_wait_seconds?: number;
          test_grant_amount?: number;
          updated_at?: string;
        };
        Update: {
          account_type?: string;
          asset?: string;
          countdown_seconds?: number;
          entry_rate_limit?: number;
          entry_rate_window_seconds?: number;
          extension_seconds?: number;
          id?: boolean;
          max_duration_seconds?: number;
          max_entry?: number;
          max_pot?: number;
          min_entry?: number;
          rake_bps?: number;
          real_money_enabled?: boolean;
          solo_wait_seconds?: number;
          test_grant_amount?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      jackpot_entries: {
        Row: {
          amount: number;
          created_at: string;
          game_id: number;
          id: string;
          idempotency_key: string;
          ledger_tx_id: string;
          ticket_end: number;
          ticket_start: number;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          game_id: number;
          id?: string;
          idempotency_key: string;
          ledger_tx_id: string;
          ticket_end: number;
          ticket_start: number;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          game_id?: number;
          id?: string;
          idempotency_key?: string;
          ledger_tx_id?: string;
          ticket_end?: number;
          ticket_start?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jackpot_entries_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "jackpot_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jackpot_entries_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jackpot_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      jackpot_game_secrets: {
        Row: {
          game_id: number;
          server_seed: string;
        };
        Insert: {
          game_id: number;
          server_seed: string;
        };
        Update: {
          game_id?: number;
          server_seed?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jackpot_game_secrets_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "jackpot_games";
            referencedColumns: ["id"];
          },
        ];
      };
      jackpot_games: {
        Row: {
          account_type: string;
          asset: string;
          completed_at: string | null;
          countdown_seconds: number;
          countdown_started_at: string | null;
          created_at: string;
          draw_counter: number | null;
          draw_version: number;
          drawn_at: string | null;
          entry_count: number;
          extension_seconds: number;
          id: number;
          max_duration_seconds: number;
          max_end_at: string | null;
          max_entry: number;
          min_entry: number;
          money_domain: string;
          payout_amount: number | null;
          player_count: number;
          pot_amount: number;
          protocol_version: string;
          rake_amount: number | null;
          rake_bps: number;
          scheduled_end_at: string | null;
          server_seed: string | null;
          server_seed_hash: string;
          status: Database["public"]["Enums"]["game_status"];
          updated_at: string;
          winner_id: string | null;
          winner_total: number | null;
          winning_ticket: number | null;
        };
        Insert: {
          account_type: string;
          asset: string;
          completed_at?: string | null;
          countdown_seconds: number;
          countdown_started_at?: string | null;
          created_at?: string;
          draw_counter?: number | null;
          draw_version?: number;
          drawn_at?: string | null;
          entry_count?: number;
          extension_seconds: number;
          id?: never;
          max_duration_seconds: number;
          max_end_at?: string | null;
          max_entry: number;
          min_entry: number;
          money_domain?: string;
          payout_amount?: number | null;
          player_count?: number;
          pot_amount?: number;
          protocol_version?: string;
          rake_amount?: number | null;
          rake_bps: number;
          scheduled_end_at?: string | null;
          server_seed?: string | null;
          server_seed_hash: string;
          status?: Database["public"]["Enums"]["game_status"];
          updated_at?: string;
          winner_id?: string | null;
          winner_total?: number | null;
          winning_ticket?: number | null;
        };
        Update: {
          account_type?: string;
          asset?: string;
          completed_at?: string | null;
          countdown_seconds?: number;
          countdown_started_at?: string | null;
          created_at?: string;
          draw_counter?: number | null;
          draw_version?: number;
          drawn_at?: string | null;
          entry_count?: number;
          extension_seconds?: number;
          id?: never;
          max_duration_seconds?: number;
          max_end_at?: string | null;
          max_entry?: number;
          min_entry?: number;
          money_domain?: string;
          payout_amount?: number | null;
          player_count?: number;
          pot_amount?: number;
          protocol_version?: string;
          rake_amount?: number | null;
          rake_bps?: number;
          scheduled_end_at?: string | null;
          server_seed?: string | null;
          server_seed_hash?: string;
          status?: Database["public"]["Enums"]["game_status"];
          updated_at?: string;
          winner_id?: string | null;
          winner_total?: number | null;
          winning_ticket?: number | null;
        };
        Relationships: [];
      };
      jackpot_payouts: {
        Row: {
          attempts: number;
          created_at: string;
          game_id: number;
          last_error: string | null;
          ledger_tx_id: string | null;
          next_retry_at: string | null;
          settled_at: string | null;
          status: Database["public"]["Enums"]["payout_status"];
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          game_id: number;
          last_error?: string | null;
          ledger_tx_id?: string | null;
          next_retry_at?: string | null;
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Update: {
          attempts?: number;
          created_at?: string;
          game_id?: number;
          last_error?: string | null;
          ledger_tx_id?: string | null;
          next_retry_at?: string | null;
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Relationships: [
          {
            foreignKeyName: "jackpot_payouts_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "jackpot_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jackpot_payouts_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      jackpot_players: {
        Row: {
          entry_count: number;
          first_entry_at: string;
          game_id: number;
          last_entry_at: string;
          total_amount: number;
          user_id: string;
        };
        Insert: {
          entry_count: number;
          first_entry_at: string;
          game_id: number;
          last_entry_at: string;
          total_amount: number;
          user_id: string;
        };
        Update: {
          entry_count?: number;
          first_entry_at?: string;
          game_id?: number;
          last_entry_at?: string;
          total_amount?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jackpot_players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "jackpot_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jackpot_players_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_campaigns: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          audience: string;
          awards_created: boolean;
          bankroll_at_check_cents: number | null;
          cancel_requested_at: string | null;
          closed_at: string | null;
          config_snapshot: Json | null;
          created_at: string;
          description: string;
          ends_at: string;
          finalized_at: string | null;
          funding_shortfall: boolean;
          funding_status: string;
          games: string[];
          id: string;
          min_wager_cents: number;
          name: string;
          partner_user_id: string;
          prize_pool_cents: number;
          ranked_at: string | null;
          rejection_reason: string | null;
          rules_frozen_at: string | null;
          started_at: string | null;
          starts_at: string;
          status: string;
          template_id: string;
          template_version: number;
          timezone: string;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          audience?: string;
          awards_created?: boolean;
          bankroll_at_check_cents?: number | null;
          cancel_requested_at?: string | null;
          closed_at?: string | null;
          config_snapshot?: Json | null;
          created_at?: string;
          description?: string;
          ends_at: string;
          finalized_at?: string | null;
          funding_shortfall?: boolean;
          funding_status?: string;
          games: string[];
          id?: string;
          min_wager_cents?: number;
          name: string;
          partner_user_id: string;
          prize_pool_cents: number;
          ranked_at?: string | null;
          rejection_reason?: string | null;
          rules_frozen_at?: string | null;
          started_at?: string | null;
          starts_at: string;
          status?: string;
          template_id: string;
          template_version: number;
          timezone?: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          audience?: string;
          awards_created?: boolean;
          bankroll_at_check_cents?: number | null;
          cancel_requested_at?: string | null;
          closed_at?: string | null;
          config_snapshot?: Json | null;
          created_at?: string;
          description?: string;
          ends_at?: string;
          finalized_at?: string | null;
          funding_shortfall?: boolean;
          funding_status?: string;
          games?: string[];
          id?: string;
          min_wager_cents?: number;
          name?: string;
          partner_user_id?: string;
          prize_pool_cents?: number;
          ranked_at?: string | null;
          rejection_reason?: string | null;
          rules_frozen_at?: string | null;
          started_at?: string | null;
          starts_at?: string;
          status?: string;
          template_id?: string;
          template_version?: number;
          timezone?: string;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_campaigns_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_campaigns_partner_user_id_fkey";
            columns: ["partner_user_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "leaderboard_campaigns_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_entries: {
        Row: {
          campaign_id: string;
          last_event_at: string;
          player_id: string;
          qualifying_cents: number;
          rank: number | null;
          updated_at: string;
        };
        Insert: {
          campaign_id: string;
          last_event_at: string;
          player_id: string;
          qualifying_cents: number;
          rank?: number | null;
          updated_at?: string;
        };
        Update: {
          campaign_id?: string;
          last_event_at?: string;
          player_id?: string;
          qualifying_cents?: number;
          rank?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_prize_awards: {
        Row: {
          campaign_id: string;
          created_at: string;
          final_rank: number;
          id: string;
          last_error: string | null;
          ledger_tx_id: string | null;
          paid_at: string | null;
          payout_status: string;
          player_id: string;
          reward_cents: number;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          final_rank: number;
          id?: string;
          last_error?: string | null;
          ledger_tx_id?: string | null;
          paid_at?: string | null;
          payout_status?: string;
          player_id: string;
          reward_cents: number;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          final_rank?: number;
          id?: string;
          last_error?: string | null;
          ledger_tx_id?: string | null;
          paid_at?: string | null;
          payout_status?: string;
          player_id?: string;
          reward_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_prize_awards_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_prize_awards_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_prize_awards_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_prize_holds: {
        Row: {
          award_id: string;
          completed_at: string | null;
          created_at: string;
          ledger_tx_id: string;
          qualifying_wager_cents: number;
          required_wager_cents: number;
          reward_cents: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          award_id: string;
          completed_at?: string | null;
          created_at?: string;
          ledger_tx_id: string;
          qualifying_wager_cents?: number;
          required_wager_cents: number;
          reward_cents: number;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          award_id?: string;
          completed_at?: string | null;
          created_at?: string;
          ledger_tx_id?: string;
          qualifying_wager_cents?: number;
          required_wager_cents?: number;
          reward_cents?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_prize_holds_award_id_fkey";
            columns: ["award_id"];
            isOneToOne: true;
            referencedRelation: "leaderboard_prize_awards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_prize_holds_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_prize_holds_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_prize_tiers: {
        Row: {
          campaign_id: string;
          id: string;
          rank_end: number;
          rank_start: number;
          reward_cents: number;
        };
        Insert: {
          campaign_id: string;
          id?: string;
          rank_end: number;
          rank_start: number;
          reward_cents: number;
        };
        Update: {
          campaign_id?: string;
          id?: string;
          rank_end?: number;
          rank_start?: number;
          reward_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_prize_tiers_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard_campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_prize_wagers: {
        Row: {
          amount_cents: number;
          created_at: string;
          game: string;
          source_id: string;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          game: string;
          source_id: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          game?: string;
          source_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_prize_wagers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_templates: {
        Row: {
          allowed_games: string[];
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          max_duration_seconds: number;
          max_prize_pool_cents: number;
          max_tiers: number;
          min_duration_seconds: number;
          name: string;
          status: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          allowed_games: string[];
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          max_duration_seconds: number;
          max_prize_pool_cents: number;
          max_tiers?: number;
          min_duration_seconds: number;
          name: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          allowed_games?: string[];
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          max_duration_seconds?: number;
          max_prize_pool_cents?: number;
          max_tiers?: number;
          min_duration_seconds?: number;
          name?: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_wager_events: {
        Row: {
          campaign_id: string;
          created_at: string;
          event_at: string;
          id: string;
          player_id: string;
          qualifying_cents: number;
          source_event_id: string;
          source_game_id: number;
          source_game_type: string;
          voided: boolean;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          event_at: string;
          id?: string;
          player_id: string;
          qualifying_cents: number;
          source_event_id: string;
          source_game_id: number;
          source_game_type: string;
          voided?: boolean;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          event_at?: string;
          id?: string;
          player_id?: string;
          qualifying_cents?: number;
          source_event_id?: string;
          source_game_id?: number;
          source_game_type?: string;
          voided?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_wager_events_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_wager_events_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ledger_postings: {
        Row: {
          account_id: string;
          amount: number;
          balance_after: number;
          created_at: string;
          id: number;
          tx_id: string;
        };
        Insert: {
          account_id: string;
          amount: number;
          balance_after: number;
          created_at?: string;
          id?: never;
          tx_id: string;
        };
        Update: {
          account_id?: string;
          amount?: number;
          balance_after?: number;
          created_at?: string;
          id?: never;
          tx_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_postings_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "wallet_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_postings_tx_id_fkey";
            columns: ["tx_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      ledger_transactions: {
        Row: {
          account_type: string;
          created_at: string;
          game_id: number | null;
          id: string;
          idempotency_key: string;
          kind: Database["public"]["Enums"]["tx_kind"];
          memo: string | null;
          user_id: string | null;
        };
        Insert: {
          account_type?: string;
          created_at?: string;
          game_id?: number | null;
          id?: string;
          idempotency_key: string;
          kind: Database["public"]["Enums"]["tx_kind"];
          memo?: string | null;
          user_id?: string | null;
        };
        Update: {
          account_type?: string;
          created_at?: string;
          game_id?: number | null;
          id?: string;
          idempotency_key?: string;
          kind?: Database["public"]["Enums"]["tx_kind"];
          memo?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      money_domain_config: {
        Row: {
          account_type: string;
          asset: string;
          id: boolean;
          money_domain: string;
          updated_at: string;
        };
        Insert: {
          account_type: string;
          asset: string;
          id?: boolean;
          money_domain: string;
          updated_at?: string;
        };
        Update: {
          account_type?: string;
          asset?: string;
          id?: boolean;
          money_domain?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      money_migrations: {
        Row: {
          applied_at: string;
          details: Json;
          finalized_at: string | null;
          state: string;
          updated_at: string;
          version: string;
        };
        Insert: {
          applied_at?: string;
          details?: Json;
          finalized_at?: string | null;
          state: string;
          updated_at?: string;
          version: string;
        };
        Update: {
          applied_at?: string;
          details?: Json;
          finalized_at?: string | null;
          state?: string;
          updated_at?: string;
          version?: string;
        };
        Relationships: [];
      };
      nowpayments_invoices: {
        Row: {
          created_at: string;
          credited_at: string | null;
          id: string;
          invoice_url: string | null;
          ledger_tx_id: string | null;
          nowpayments_invoice_id: string | null;
          pay_currency: string;
          payment_id: string | null;
          status: string;
          updated_at: string;
          usd_cents: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          credited_at?: string | null;
          id?: string;
          invoice_url?: string | null;
          ledger_tx_id?: string | null;
          nowpayments_invoice_id?: string | null;
          pay_currency?: string;
          payment_id?: string | null;
          status?: string;
          updated_at?: string;
          usd_cents: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          credited_at?: string | null;
          id?: string;
          invoice_url?: string | null;
          ledger_tx_id?: string | null;
          nowpayments_invoice_id?: string | null;
          pay_currency?: string;
          payment_id?: string | null;
          status?: string;
          updated_at?: string;
          usd_cents?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nowpayments_invoices_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nowpayments_invoices_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ops_stat_epoch: {
        Row: {
          id: boolean;
          started_at: string;
        };
        Insert: {
          id?: boolean;
          started_at: string;
        };
        Update: {
          id?: boolean;
          started_at?: string;
        };
        Relationships: [];
      };
      partner_acquisition_codes: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          partner_user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          partner_user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          partner_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_acquisition_codes_partner_user_id_fkey";
            columns: ["partner_user_id"];
            isOneToOne: true;
            referencedRelation: "partners";
            referencedColumns: ["user_id"];
          },
        ];
      };
      partner_profit_events: {
        Row: {
          auto_cleared_cents: number;
          created_at: string;
          day: string;
          fee_cents: number;
          game: string;
          game_id: number;
          held_cents: number;
          id: string;
          ledger_tx_id: string;
          partner_stake_cents: number;
          partner_user_id: string;
          profit_cents: number;
          user_id: string;
          winner_stake_cents: number;
        };
        Insert: {
          auto_cleared_cents: number;
          created_at?: string;
          day: string;
          fee_cents: number;
          game: string;
          game_id: number;
          held_cents: number;
          id?: string;
          ledger_tx_id: string;
          partner_stake_cents: number;
          partner_user_id: string;
          profit_cents: number;
          user_id: string;
          winner_stake_cents: number;
        };
        Update: {
          auto_cleared_cents?: number;
          created_at?: string;
          day?: string;
          fee_cents?: number;
          game?: string;
          game_id?: number;
          held_cents?: number;
          id?: string;
          ledger_tx_id?: string;
          partner_stake_cents?: number;
          partner_user_id?: string;
          profit_cents?: number;
          user_id?: string;
          winner_stake_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "partner_profit_events_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_profit_events_partner_user_id_fkey";
            columns: ["partner_user_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "partner_profit_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_profit_releases: {
        Row: {
          admin_id: string;
          amount_cents: number;
          created_at: string;
          id: string;
          partner_user_id: string;
          reason: string;
          request_id: string;
          user_id: string;
        };
        Insert: {
          admin_id: string;
          amount_cents: number;
          created_at?: string;
          id?: string;
          partner_user_id: string;
          reason: string;
          request_id: string;
          user_id: string;
        };
        Update: {
          admin_id?: string;
          amount_cents?: number;
          created_at?: string;
          id?: string;
          partner_user_id?: string;
          reason?: string;
          request_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_profit_releases_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_profit_releases_partner_user_id_fkey";
            columns: ["partner_user_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "partner_profit_releases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_referrals: {
        Row: {
          acquisition_code_id: string | null;
          created_at: string;
          partner_user_id: string;
          promo_claim_id: string | null;
          promo_code_id: string | null;
          source: string;
          user_id: string;
        };
        Insert: {
          acquisition_code_id?: string | null;
          created_at?: string;
          partner_user_id: string;
          promo_claim_id?: string | null;
          promo_code_id?: string | null;
          source?: string;
          user_id: string;
        };
        Update: {
          acquisition_code_id?: string | null;
          created_at?: string;
          partner_user_id?: string;
          promo_claim_id?: string | null;
          promo_code_id?: string | null;
          source?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_referrals_acquisition_code_id_fkey";
            columns: ["acquisition_code_id"];
            isOneToOne: false;
            referencedRelation: "partner_acquisition_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_referrals_partner_user_id_fkey";
            columns: ["partner_user_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "partner_referrals_promo_claim_id_fkey";
            columns: ["promo_claim_id"];
            isOneToOne: true;
            referencedRelation: "promo_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_referrals_promo_code_id_fkey";
            columns: ["promo_code_id"];
            isOneToOne: false;
            referencedRelation: "promo_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_referrals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_settings: {
        Row: {
          daily_profit_allowance_cents: number;
          id: boolean;
          max_topup_cents: number;
          min_topup_cents: number;
          opponent_profit_allowance_cents: number;
          updated_at: string;
        };
        Insert: {
          daily_profit_allowance_cents?: number;
          id?: boolean;
          max_topup_cents?: number;
          min_topup_cents?: number;
          opponent_profit_allowance_cents?: number;
          updated_at?: string;
        };
        Update: {
          daily_profit_allowance_cents?: number;
          id?: boolean;
          max_topup_cents?: number;
          min_topup_cents?: number;
          opponent_profit_allowance_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      partner_topups: {
        Row: {
          admin_id: string;
          amount_cents: number;
          created_at: string;
          id: string;
          ledger_tx_id: string;
          note: string | null;
          request_id: string;
          user_id: string;
        };
        Insert: {
          admin_id: string;
          amount_cents: number;
          created_at?: string;
          id?: string;
          ledger_tx_id: string;
          note?: string | null;
          request_id: string;
          user_id: string;
        };
        Update: {
          admin_id?: string;
          amount_cents?: number;
          created_at?: string;
          id?: string;
          ledger_tx_id?: string;
          note?: string | null;
          request_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_topups_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_topups_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_topups_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["user_id"];
          },
        ];
      };
      partners: {
        Row: {
          active: boolean;
          commission_bps: number;
          created_at: string;
          created_by: string;
          leaderboard: boolean;
          note: string | null;
          release_hold_cents: number;
          removed_at: string | null;
          removed_by: string | null;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          commission_bps?: number;
          created_at?: string;
          created_by: string;
          leaderboard?: boolean;
          note?: string | null;
          release_hold_cents?: number;
          removed_at?: string | null;
          removed_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          active?: boolean;
          commission_bps?: number;
          created_at?: string;
          created_by?: string;
          leaderboard?: boolean;
          note?: string | null;
          release_hold_cents?: number;
          removed_at?: string | null;
          removed_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partners_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partners_removed_by_fkey";
            columns: ["removed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partners_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partners_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_actions: {
        Row: {
          action: string;
          all_in: boolean;
          amount: number;
          cards: number[] | null;
          created_at: string;
          hand_id: number;
          id: number;
          idempotency_key: string | null;
          seat_no: number | null;
          seq: number;
          street: string;
          to_amount: number | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          all_in?: boolean;
          amount?: number;
          cards?: number[] | null;
          created_at?: string;
          hand_id: number;
          id?: never;
          idempotency_key?: string | null;
          seat_no?: number | null;
          seq: number;
          street: string;
          to_amount?: number | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          all_in?: boolean;
          amount?: number;
          cards?: number[] | null;
          created_at?: string;
          hand_id?: number;
          id?: never;
          idempotency_key?: string | null;
          seat_no?: number | null;
          seq?: number;
          street?: string;
          to_amount?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "poker_actions_hand_id_fkey";
            columns: ["hand_id"];
            isOneToOne: false;
            referencedRelation: "poker_hands";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_config: {
        Row: {
          action_seconds: number;
          between_hands_seconds: number;
          buy_in_rate_limit: number;
          buy_in_rate_window_seconds: number;
          enabled: boolean;
          fee_bps: number;
          id: boolean;
          max_active_tables: number;
          max_missed_reveals: number;
          max_tables_per_user: number;
          max_timeouts: number;
          nudge_rate_limit: number;
          nudge_rate_window_seconds: number;
          reveal_seconds: number;
          rpc_rate_limit: number;
          rpc_rate_window_seconds: number;
          runout_street_seconds: number;
          showdown_seconds: number;
          sit_out_kick_seconds: number;
          tick_tables: number;
          void_strikes_per_day: number;
        };
        Insert: {
          action_seconds?: number;
          between_hands_seconds?: number;
          buy_in_rate_limit?: number;
          buy_in_rate_window_seconds?: number;
          enabled?: boolean;
          fee_bps?: number;
          id?: boolean;
          max_active_tables?: number;
          max_missed_reveals?: number;
          max_tables_per_user?: number;
          max_timeouts?: number;
          nudge_rate_limit?: number;
          nudge_rate_window_seconds?: number;
          reveal_seconds?: number;
          rpc_rate_limit?: number;
          rpc_rate_window_seconds?: number;
          runout_street_seconds?: number;
          showdown_seconds?: number;
          sit_out_kick_seconds?: number;
          tick_tables?: number;
          void_strikes_per_day?: number;
        };
        Update: {
          action_seconds?: number;
          between_hands_seconds?: number;
          buy_in_rate_limit?: number;
          buy_in_rate_window_seconds?: number;
          enabled?: boolean;
          fee_bps?: number;
          id?: boolean;
          max_active_tables?: number;
          max_missed_reveals?: number;
          max_tables_per_user?: number;
          max_timeouts?: number;
          nudge_rate_limit?: number;
          nudge_rate_window_seconds?: number;
          reveal_seconds?: number;
          rpc_rate_limit?: number;
          rpc_rate_window_seconds?: number;
          runout_street_seconds?: number;
          showdown_seconds?: number;
          sit_out_kick_seconds?: number;
          tick_tables?: number;
          void_strikes_per_day?: number;
        };
        Relationships: [];
      };
      poker_hand_decks: {
        Row: {
          deck: number[];
          hand_id: number;
        };
        Insert: {
          deck: number[];
          hand_id: number;
        };
        Update: {
          deck?: number[];
          hand_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "poker_hand_decks_hand_id_fkey";
            columns: ["hand_id"];
            isOneToOne: true;
            referencedRelation: "poker_hands";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_hand_players: {
        Row: {
          acted: boolean;
          acted_bet: number;
          all_in: boolean;
          deal_index: number;
          end_stack: number | null;
          folded: boolean;
          hand_id: number;
          hand_name: string | null;
          hand_score: number | null;
          last_action: string | null;
          link: string;
          posts_bb: boolean;
          refund: number | null;
          reveal: string | null;
          seat_id: number;
          seat_no: number;
          shown_cards: number[] | null;
          stack: number;
          start_stack: number;
          street_bet: number;
          total_bet: number;
          user_id: string;
          wagered: number | null;
          won: number | null;
        };
        Insert: {
          acted?: boolean;
          acted_bet?: number;
          all_in?: boolean;
          deal_index: number;
          end_stack?: number | null;
          folded?: boolean;
          hand_id: number;
          hand_name?: string | null;
          hand_score?: number | null;
          last_action?: string | null;
          link: string;
          posts_bb?: boolean;
          refund?: number | null;
          reveal?: string | null;
          seat_id: number;
          seat_no: number;
          shown_cards?: number[] | null;
          stack: number;
          start_stack: number;
          street_bet?: number;
          total_bet?: number;
          user_id: string;
          wagered?: number | null;
          won?: number | null;
        };
        Update: {
          acted?: boolean;
          acted_bet?: number;
          all_in?: boolean;
          deal_index?: number;
          end_stack?: number | null;
          folded?: boolean;
          hand_id?: number;
          hand_name?: string | null;
          hand_score?: number | null;
          last_action?: string | null;
          link?: string;
          posts_bb?: boolean;
          refund?: number | null;
          reveal?: string | null;
          seat_id?: number;
          seat_no?: number;
          shown_cards?: number[] | null;
          stack?: number;
          start_stack?: number;
          street_bet?: number;
          total_bet?: number;
          user_id?: string;
          wagered?: number | null;
          won?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "poker_hand_players_hand_id_fkey";
            columns: ["hand_id"];
            isOneToOne: false;
            referencedRelation: "poker_hands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poker_hand_players_seat_id_fkey";
            columns: ["seat_id"];
            isOneToOne: false;
            referencedRelation: "poker_seats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poker_hand_players_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_hand_secrets: {
        Row: {
          hand_id: number;
          server_seed: string;
        };
        Insert: {
          hand_id: number;
          server_seed: string;
        };
        Update: {
          hand_id?: number;
          server_seed?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poker_hand_secrets_hand_id_fkey";
            columns: ["hand_id"];
            isOneToOne: true;
            referencedRelation: "poker_hands";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_hands: {
        Row: {
          account_type: string;
          action_deadline: string | null;
          asset: string;
          bb_seat: number;
          big_blind: number;
          board: number[];
          button_seat: number;
          completed_at: string | null;
          created_at: string;
          current_bet: number;
          dealt_at: string | null;
          entropy: string | null;
          fee_bps: number;
          fee_total: number | null;
          hand_no: number;
          id: number;
          last_error: string | null;
          last_raise: number;
          ledger_tx_id: string | null;
          max_seats: number;
          next_hand_at: string | null;
          pots: Json | null;
          protocol_version: string;
          reveal_deadline: string;
          runout_streets: number;
          sb_seat: number;
          server_seed: string | null;
          server_seed_hash: string;
          settle_attempts: number;
          small_blind: number;
          status: string;
          street: string;
          table_id: number;
          to_act: number | null;
          version: number;
          void_reason: string | null;
          voided_by: string[] | null;
        };
        Insert: {
          account_type: string;
          action_deadline?: string | null;
          asset: string;
          bb_seat: number;
          big_blind: number;
          board?: number[];
          button_seat: number;
          completed_at?: string | null;
          created_at?: string;
          current_bet?: number;
          dealt_at?: string | null;
          entropy?: string | null;
          fee_bps: number;
          fee_total?: number | null;
          hand_no: number;
          id?: never;
          last_error?: string | null;
          last_raise?: number;
          ledger_tx_id?: string | null;
          max_seats: number;
          next_hand_at?: string | null;
          pots?: Json | null;
          protocol_version?: string;
          reveal_deadline: string;
          runout_streets?: number;
          sb_seat: number;
          server_seed?: string | null;
          server_seed_hash: string;
          settle_attempts?: number;
          small_blind: number;
          status?: string;
          street?: string;
          table_id: number;
          to_act?: number | null;
          version?: number;
          void_reason?: string | null;
          voided_by?: string[] | null;
        };
        Update: {
          account_type?: string;
          action_deadline?: string | null;
          asset?: string;
          bb_seat?: number;
          big_blind?: number;
          board?: number[];
          button_seat?: number;
          completed_at?: string | null;
          created_at?: string;
          current_bet?: number;
          dealt_at?: string | null;
          entropy?: string | null;
          fee_bps?: number;
          fee_total?: number | null;
          hand_no?: number;
          id?: never;
          last_error?: string | null;
          last_raise?: number;
          ledger_tx_id?: string | null;
          max_seats?: number;
          next_hand_at?: string | null;
          pots?: Json | null;
          protocol_version?: string;
          reveal_deadline?: string;
          runout_streets?: number;
          sb_seat?: number;
          server_seed?: string | null;
          server_seed_hash?: string;
          settle_attempts?: number;
          small_blind?: number;
          status?: string;
          street?: string;
          table_id?: number;
          to_act?: number | null;
          version?: number;
          void_reason?: string | null;
          voided_by?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "poker_hands_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poker_hands_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "poker_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_hole_cards: {
        Row: {
          cards: number[];
          hand_id: number;
          seat_no: number;
          user_id: string;
        };
        Insert: {
          cards: number[];
          hand_id: number;
          seat_no: number;
          user_id: string;
        };
        Update: {
          cards?: number[];
          hand_id?: number;
          seat_no?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poker_hole_cards_hand_id_fkey";
            columns: ["hand_id"];
            isOneToOne: false;
            referencedRelation: "poker_hands";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_rate_limits: {
        Row: {
          n: number;
          op: string;
          user_id: string;
          window_start: string;
        };
        Insert: {
          n: number;
          op: string;
          user_id: string;
          window_start: string;
        };
        Update: {
          n?: number;
          op?: string;
          user_id?: string;
          window_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poker_rate_limits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_seats: {
        Row: {
          buy_in_count: number;
          buy_in_total: number;
          cashed_out: number | null;
          chain_link: string | null;
          close_ledger_tx: string | null;
          closed_at: string | null;
          created_at: string;
          id: number;
          idempotency_key: string;
          leaving: boolean;
          missed_reveals: number;
          owes_bb: boolean;
          pending: number;
          sat_out_at: string | null;
          seat_no: number;
          stack: number;
          state: string;
          status: string;
          table_id: number;
          timeouts: number;
          user_id: string;
        };
        Insert: {
          buy_in_count?: number;
          buy_in_total?: number;
          cashed_out?: number | null;
          chain_link?: string | null;
          close_ledger_tx?: string | null;
          closed_at?: string | null;
          created_at?: string;
          id?: never;
          idempotency_key: string;
          leaving?: boolean;
          missed_reveals?: number;
          owes_bb?: boolean;
          pending?: number;
          sat_out_at?: string | null;
          seat_no: number;
          stack?: number;
          state?: string;
          status?: string;
          table_id: number;
          timeouts?: number;
          user_id: string;
        };
        Update: {
          buy_in_count?: number;
          buy_in_total?: number;
          cashed_out?: number | null;
          chain_link?: string | null;
          close_ledger_tx?: string | null;
          closed_at?: string | null;
          created_at?: string;
          id?: never;
          idempotency_key?: string;
          leaving?: boolean;
          missed_reveals?: number;
          owes_bb?: boolean;
          pending?: number;
          sat_out_at?: string | null;
          seat_no?: number;
          stack?: number;
          state?: string;
          status?: string;
          table_id?: number;
          timeouts?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poker_seats_close_ledger_tx_fkey";
            columns: ["close_ledger_tx"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poker_seats_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "poker_tables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poker_seats_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_settlement_failures: {
        Row: {
          attempt: number;
          created_at: string;
          error: string;
          hand_id: number;
          id: number;
          source: string;
        };
        Insert: {
          attempt: number;
          created_at?: string;
          error: string;
          hand_id: number;
          id?: never;
          source: string;
        };
        Update: {
          attempt?: number;
          created_at?: string;
          error?: string;
          hand_id?: number;
          id?: never;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poker_settlement_failures_hand_id_fkey";
            columns: ["hand_id"];
            isOneToOne: false;
            referencedRelation: "poker_hands";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_table_types: {
        Row: {
          big_blind: number;
          category: string;
          enabled: boolean;
          id: number;
          label: string;
          max_buy_in: number;
          max_seats: number;
          min_buy_in: number;
          small_blind: number;
          sort: number;
        };
        Insert: {
          big_blind: number;
          category: string;
          enabled?: boolean;
          id: number;
          label: string;
          max_buy_in: number;
          max_seats?: number;
          min_buy_in: number;
          small_blind: number;
          sort?: number;
        };
        Update: {
          big_blind?: number;
          category?: string;
          enabled?: boolean;
          id?: number;
          label?: string;
          max_buy_in?: number;
          max_seats?: number;
          min_buy_in?: number;
          small_blind?: number;
          sort?: number;
        };
        Relationships: [];
      };
      poker_tables: {
        Row: {
          account_type: string;
          asset: string;
          big_blind: number;
          button_seat: number | null;
          closed_at: string | null;
          created_at: string;
          fee_bps: number;
          hand_count: number;
          hand_id: number | null;
          id: number;
          max_buy_in: number;
          max_seats: number;
          min_buy_in: number;
          money_domain: string;
          name: string;
          next_due_at: string | null;
          seated: number;
          small_blind: number;
          status: string;
          type_id: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          account_type: string;
          asset: string;
          big_blind: number;
          button_seat?: number | null;
          closed_at?: string | null;
          created_at?: string;
          fee_bps: number;
          hand_count?: number;
          hand_id?: number | null;
          id?: never;
          max_buy_in: number;
          max_seats: number;
          min_buy_in: number;
          money_domain: string;
          name: string;
          next_due_at?: string | null;
          seated?: number;
          small_blind: number;
          status?: string;
          type_id: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          account_type?: string;
          asset?: string;
          big_blind?: number;
          button_seat?: number | null;
          closed_at?: string | null;
          created_at?: string;
          fee_bps?: number;
          hand_count?: number;
          hand_id?: number | null;
          id?: never;
          max_buy_in?: number;
          max_seats?: number;
          min_buy_in?: number;
          money_domain?: string;
          name?: string;
          next_due_at?: string | null;
          seated?: number;
          small_blind?: number;
          status?: string;
          type_id?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "poker_tables_type_id_fkey";
            columns: ["type_id"];
            isOneToOne: false;
            referencedRelation: "poker_table_types";
            referencedColumns: ["id"];
          },
        ];
      };
      poker_worker_stats: {
        Row: {
          backlog: number;
          budget_exhausted: boolean;
          duration_ms: number | null;
          failed: number;
          id: boolean;
          max_overdue_ms: number;
          processed: number;
          run_at: string | null;
          skipped: number;
          stuck_hands: number;
        };
        Insert: {
          backlog?: number;
          budget_exhausted?: boolean;
          duration_ms?: number | null;
          failed?: number;
          id?: boolean;
          max_overdue_ms?: number;
          processed?: number;
          run_at?: string | null;
          skipped?: number;
          stuck_hands?: number;
        };
        Update: {
          backlog?: number;
          budget_exhausted?: boolean;
          duration_ms?: number | null;
          failed?: number;
          id?: boolean;
          max_overdue_ms?: number;
          processed?: number;
          run_at?: string | null;
          skipped?: number;
          stuck_hands?: number;
        };
        Relationships: [];
      };
      prestige_levels: {
        Row: {
          created_at: string;
          id: string;
          level: number;
          tier: string;
          title: string;
          xp_required: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          level: number;
          tier: string;
          title: string;
          xp_required: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          level?: number;
          tier?: string;
          title?: string;
          xp_required?: number;
        };
        Relationships: [];
      };
      prestige_loot_odds: {
        Row: {
          amount: number;
          weight: number;
        };
        Insert: {
          amount: number;
          weight: number;
        };
        Update: {
          amount?: number;
          weight?: number;
        };
        Relationships: [];
      };
      prestige_rewards: {
        Row: {
          amount: number | null;
          cosmetic_id: string | null;
          created_at: string;
          currency: string | null;
          id: string;
          level: number;
          metadata: Json;
          reward_type: string;
        };
        Insert: {
          amount?: number | null;
          cosmetic_id?: string | null;
          created_at?: string;
          currency?: string | null;
          id?: string;
          level: number;
          metadata?: Json;
          reward_type: string;
        };
        Update: {
          amount?: number | null;
          cosmetic_id?: string | null;
          created_at?: string;
          currency?: string | null;
          id?: string;
          level?: number;
          metadata?: Json;
          reward_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prestige_rewards_cosmetic_id_fkey";
            columns: ["cosmetic_id"];
            isOneToOne: false;
            referencedRelation: "cosmetics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prestige_rewards_level_fkey";
            columns: ["level"];
            isOneToOne: true;
            referencedRelation: "prestige_levels";
            referencedColumns: ["level"];
          },
        ];
      };
      profiles: {
        Row: {
          age_confirmed_at: string;
          avatar_url: string | null;
          created_at: string;
          id: string;
          self_excluded_until: string | null;
          username: string;
        };
        Insert: {
          age_confirmed_at: string;
          avatar_url?: string | null;
          created_at?: string;
          id: string;
          self_excluded_until?: string | null;
          username: string;
        };
        Update: {
          age_confirmed_at?: string;
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          self_excluded_until?: string | null;
          username?: string;
        };
        Relationships: [];
      };
      promo_claim_attempts: {
        Row: {
          created_at: string;
          id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promo_claim_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      promo_claims: {
        Row: {
          claimed_at: string;
          client_ip: unknown;
          completed_at: string | null;
          created_at: string;
          id: string;
          ledger_tx_id: string;
          promo_code_id: string | null;
          qualifying_wager_cents: number;
          required_wager_cents: number;
          reward_cents: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          claimed_at?: string;
          client_ip?: unknown;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          ledger_tx_id: string;
          promo_code_id?: string | null;
          qualifying_wager_cents?: number;
          required_wager_cents: number;
          reward_cents: number;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          claimed_at?: string;
          client_ip?: unknown;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          ledger_tx_id?: string;
          promo_code_id?: string | null;
          qualifying_wager_cents?: number;
          required_wager_cents?: number;
          reward_cents?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promo_claims_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promo_claims_promo_code_id_fkey";
            columns: ["promo_code_id"];
            isOneToOne: false;
            referencedRelation: "promo_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promo_claims_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      promo_codes: {
        Row: {
          active: boolean;
          claim_count: number;
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string | null;
          id: string;
          max_claims: number;
          partner_user_id: string | null;
          reward_cents: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          claim_count?: number;
          code: string;
          created_at?: string;
          created_by: string;
          expires_at?: string | null;
          id?: string;
          max_claims: number;
          partner_user_id?: string | null;
          reward_cents: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          claim_count?: number;
          code?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string | null;
          id?: string;
          max_claims?: number;
          partner_user_id?: string | null;
          reward_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promo_codes_partner_user_id_fkey";
            columns: ["partner_user_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["user_id"];
          },
        ];
      };
      promo_ip_redemptions: {
        Row: {
          created_at: string;
          ip: unknown;
        };
        Insert: {
          created_at?: string;
          ip: unknown;
        };
        Update: {
          created_at?: string;
          ip?: unknown;
        };
        Relationships: [];
      };
      promo_wagers: {
        Row: {
          amount_cents: number;
          created_at: string;
          game: string;
          source_id: string;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          game: string;
          source_id: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          game?: string;
          source_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promo_wagers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_config: {
        Row: {
          deposit_cents: number;
          enabled: boolean;
          id: boolean;
          play_cents: number;
          reward_cents: number;
        };
        Insert: {
          deposit_cents?: number;
          enabled?: boolean;
          id?: boolean;
          play_cents?: number;
          reward_cents?: number;
        };
        Update: {
          deposit_cents?: number;
          enabled?: boolean;
          id?: boolean;
          play_cents?: number;
          reward_cents?: number;
        };
        Relationships: [];
      };
      referral_invites: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          inviter_user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          inviter_user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          inviter_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_invites_inviter_user_id_fkey";
            columns: ["inviter_user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_play_events: {
        Row: {
          amount_cents: number;
          created_at: string;
          game: string;
          id: string;
          referral_id: string;
          source_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          game: string;
          id?: string;
          referral_id: string;
          source_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          game?: string;
          id?: string;
          referral_id?: string;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_play_events_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: false;
            referencedRelation: "referrals";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_reward_wagers: {
        Row: {
          amount_cents: number;
          created_at: string;
          game: string;
          source_id: string;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          game: string;
          source_id: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          game?: string;
          source_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_reward_wagers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_rewards: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          deposit_id: string | null;
          id: string;
          idempotency_key: string;
          ledger_tx_id: string | null;
          paid_at: string | null;
          playthrough_cents: number;
          playthrough_met_cents: number;
          referral_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          deposit_id?: string | null;
          id?: string;
          idempotency_key: string;
          ledger_tx_id?: string | null;
          paid_at?: string | null;
          playthrough_cents?: number;
          playthrough_met_cents?: number;
          referral_id: string;
          status: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          deposit_id?: string | null;
          id?: string;
          idempotency_key?: string;
          ledger_tx_id?: string | null;
          paid_at?: string | null;
          playthrough_cents?: number;
          playthrough_met_cents?: number;
          referral_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_rewards_deposit_id_fkey";
            columns: ["deposit_id"];
            isOneToOne: false;
            referencedRelation: "crypto_deposits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_rewards_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_rewards_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: true;
            referencedRelation: "referrals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_rewards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      referrals: {
        Row: {
          created_at: string;
          id: string;
          invite_id: string;
          inviter_user_id: string;
          qualified_at: string | null;
          qualifying_deposit_cents: number;
          qualifying_deposit_id: string | null;
          qualifying_play_cents: number;
          referred_user_id: string;
          reward_cents: number;
          rewarded_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invite_id: string;
          inviter_user_id: string;
          qualified_at?: string | null;
          qualifying_deposit_cents?: number;
          qualifying_deposit_id?: string | null;
          qualifying_play_cents?: number;
          referred_user_id: string;
          reward_cents: number;
          rewarded_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invite_id?: string;
          inviter_user_id?: string;
          qualified_at?: string | null;
          qualifying_deposit_cents?: number;
          qualifying_deposit_id?: string | null;
          qualifying_play_cents?: number;
          referred_user_id?: string;
          reward_cents?: number;
          rewarded_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referrals_invite_id_fkey";
            columns: ["invite_id"];
            isOneToOne: false;
            referencedRelation: "referral_invites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_inviter_user_id_fkey";
            columns: ["inviter_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_qualifying_deposit_id_fkey";
            columns: ["qualifying_deposit_id"];
            isOneToOne: false;
            referencedRelation: "crypto_deposits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey";
            columns: ["referred_user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      roulette_bets: {
        Row: {
          amount: number;
          color: Database["public"]["Enums"]["roulette_color"];
          created_at: string;
          game_id: number;
          id: string;
          idempotency_key: string;
          ledger_tx_id: string;
          multiplier_bps: number;
          payout_amount: number | null;
          settled_at: string | null;
          status: Database["public"]["Enums"]["roulette_bet_status"];
          user_id: string;
        };
        Insert: {
          amount: number;
          color: Database["public"]["Enums"]["roulette_color"];
          created_at?: string;
          game_id: number;
          id?: string;
          idempotency_key: string;
          ledger_tx_id: string;
          multiplier_bps: number;
          payout_amount?: number | null;
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["roulette_bet_status"];
          user_id: string;
        };
        Update: {
          amount?: number;
          color?: Database["public"]["Enums"]["roulette_color"];
          created_at?: string;
          game_id?: number;
          id?: string;
          idempotency_key?: string;
          ledger_tx_id?: string;
          multiplier_bps?: number;
          payout_amount?: number | null;
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["roulette_bet_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roulette_bets_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "roulette_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roulette_bets_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roulette_bets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      roulette_config: {
        Row: {
          betting_seconds: number;
          id: boolean;
          lock_ms: number;
          max_bet: number;
          max_bets_per_round: number;
          max_bets_per_user: number;
          max_pot: number;
          max_round_exposure: number;
          min_bet: number;
          spin_ms: number;
          stuck_cancel_seconds: number;
          updated_at: string;
          wheel_version: number;
          win_fee_bps: number;
        };
        Insert: {
          betting_seconds?: number;
          id?: boolean;
          lock_ms?: number;
          max_bet?: number;
          max_bets_per_round?: number;
          max_bets_per_user?: number;
          max_pot?: number;
          max_round_exposure?: number;
          min_bet?: number;
          spin_ms?: number;
          stuck_cancel_seconds?: number;
          updated_at?: string;
          wheel_version: number;
          win_fee_bps?: number;
        };
        Update: {
          betting_seconds?: number;
          id?: boolean;
          lock_ms?: number;
          max_bet?: number;
          max_bets_per_round?: number;
          max_bets_per_user?: number;
          max_pot?: number;
          max_round_exposure?: number;
          min_bet?: number;
          spin_ms?: number;
          stuck_cancel_seconds?: number;
          updated_at?: string;
          wheel_version?: number;
          win_fee_bps?: number;
        };
        Relationships: [
          {
            foreignKeyName: "roulette_config_wheel_version_fkey";
            columns: ["wheel_version"];
            isOneToOne: false;
            referencedRelation: "roulette_wheels";
            referencedColumns: ["version"];
          },
        ];
      };
      roulette_game_secrets: {
        Row: {
          game_id: number;
          server_seed: string;
        };
        Insert: {
          game_id: number;
          server_seed: string;
        };
        Update: {
          game_id?: number;
          server_seed?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roulette_game_secrets_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "roulette_games";
            referencedColumns: ["id"];
          },
        ];
      };
      roulette_games: {
        Row: {
          account_type: string;
          asset: string;
          bet_count: number;
          betting_ends_at: string | null;
          betting_seconds: number;
          betting_started_at: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          draw_counter: number | null;
          draw_version: number;
          house_result: number | null;
          id: number;
          last_error: string | null;
          lock_ms: number;
          locked_at: string | null;
          max_bet: number;
          max_bets_per_round: number;
          max_bets_per_user: number;
          max_pot: number;
          min_bet: number;
          money_domain: string;
          player_count: number;
          pot_amount: number;
          protocol_version: string;
          server_seed: string | null;
          server_seed_hash: string;
          settle_attempts: number;
          settlement_started_at: string | null;
          spin_end_at: string | null;
          spin_ms: number;
          spin_start_at: string | null;
          status: Database["public"]["Enums"]["roulette_status"];
          stuck_cancel_seconds: number;
          total_payout: number | null;
          updated_at: string;
          wheel_version: number;
          win_fee_bps: number;
          winning_color: Database["public"]["Enums"]["roulette_color"] | null;
          winning_slot: number | null;
        };
        Insert: {
          account_type: string;
          asset: string;
          bet_count?: number;
          betting_ends_at?: string | null;
          betting_seconds: number;
          betting_started_at?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          draw_counter?: number | null;
          draw_version?: number;
          house_result?: number | null;
          id?: never;
          last_error?: string | null;
          lock_ms: number;
          locked_at?: string | null;
          max_bet: number;
          max_bets_per_round: number;
          max_bets_per_user: number;
          max_pot: number;
          min_bet: number;
          money_domain?: string;
          player_count?: number;
          pot_amount?: number;
          protocol_version?: string;
          server_seed?: string | null;
          server_seed_hash: string;
          settle_attempts?: number;
          settlement_started_at?: string | null;
          spin_end_at?: string | null;
          spin_ms: number;
          spin_start_at?: string | null;
          status?: Database["public"]["Enums"]["roulette_status"];
          stuck_cancel_seconds: number;
          total_payout?: number | null;
          updated_at?: string;
          wheel_version: number;
          win_fee_bps?: number;
          winning_color?: Database["public"]["Enums"]["roulette_color"] | null;
          winning_slot?: number | null;
        };
        Update: {
          account_type?: string;
          asset?: string;
          bet_count?: number;
          betting_ends_at?: string | null;
          betting_seconds?: number;
          betting_started_at?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          draw_counter?: number | null;
          draw_version?: number;
          house_result?: number | null;
          id?: never;
          last_error?: string | null;
          lock_ms?: number;
          locked_at?: string | null;
          max_bet?: number;
          max_bets_per_round?: number;
          max_bets_per_user?: number;
          max_pot?: number;
          min_bet?: number;
          money_domain?: string;
          player_count?: number;
          pot_amount?: number;
          protocol_version?: string;
          server_seed?: string | null;
          server_seed_hash?: string;
          settle_attempts?: number;
          settlement_started_at?: string | null;
          spin_end_at?: string | null;
          spin_ms?: number;
          spin_start_at?: string | null;
          status?: Database["public"]["Enums"]["roulette_status"];
          stuck_cancel_seconds?: number;
          total_payout?: number | null;
          updated_at?: string;
          wheel_version?: number;
          win_fee_bps?: number;
          winning_color?: Database["public"]["Enums"]["roulette_color"] | null;
          winning_slot?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "roulette_games_wheel_version_fkey";
            columns: ["wheel_version"];
            isOneToOne: false;
            referencedRelation: "roulette_wheels";
            referencedColumns: ["version"];
          },
        ];
      };
      roulette_payouts: {
        Row: {
          amount: number;
          beneficiary_id: string;
          bet_id: string;
          created_at: string;
          game_id: number;
          idempotency_key: string;
          kind: Database["public"]["Enums"]["roulette_payout_kind"];
          ledger_tx_id: string;
        };
        Insert: {
          amount: number;
          beneficiary_id: string;
          bet_id: string;
          created_at?: string;
          game_id: number;
          idempotency_key: string;
          kind: Database["public"]["Enums"]["roulette_payout_kind"];
          ledger_tx_id: string;
        };
        Update: {
          amount?: number;
          beneficiary_id?: string;
          bet_id?: string;
          created_at?: string;
          game_id?: number;
          idempotency_key?: string;
          kind?: Database["public"]["Enums"]["roulette_payout_kind"];
          ledger_tx_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roulette_payouts_beneficiary_id_fkey";
            columns: ["beneficiary_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roulette_payouts_bet_id_fkey";
            columns: ["bet_id"];
            isOneToOne: true;
            referencedRelation: "roulette_bets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roulette_payouts_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "roulette_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roulette_payouts_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      roulette_results: {
        Row: {
          color: Database["public"]["Enums"]["roulette_color"];
          created_at: string;
          draw_counter: number;
          draw_version: number;
          game_id: number;
          hmac_hex: string;
          message: string;
          protocol_version: string;
          server_seed_hash: string;
          slot: number;
          wheel_version: number;
        };
        Insert: {
          color: Database["public"]["Enums"]["roulette_color"];
          created_at?: string;
          draw_counter: number;
          draw_version: number;
          game_id: number;
          hmac_hex: string;
          message: string;
          protocol_version: string;
          server_seed_hash: string;
          slot: number;
          wheel_version: number;
        };
        Update: {
          color?: Database["public"]["Enums"]["roulette_color"];
          created_at?: string;
          draw_counter?: number;
          draw_version?: number;
          game_id?: number;
          hmac_hex?: string;
          message?: string;
          protocol_version?: string;
          server_seed_hash?: string;
          slot?: number;
          wheel_version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "roulette_results_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "roulette_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roulette_results_wheel_version_fkey";
            columns: ["wheel_version"];
            isOneToOne: false;
            referencedRelation: "roulette_wheels";
            referencedColumns: ["version"];
          },
        ];
      };
      roulette_wheels: {
        Row: {
          created_at: string;
          layout: Database["public"]["Enums"]["roulette_color"][];
          multipliers_bps: Json;
          slot_count: number;
          version: number;
        };
        Insert: {
          created_at?: string;
          layout: Database["public"]["Enums"]["roulette_color"][];
          multipliers_bps: Json;
          slot_count: number;
          version: number;
        };
        Update: {
          created_at?: string;
          layout?: Database["public"]["Enums"]["roulette_color"][];
          multipliers_bps?: Json;
          slot_count?: number;
          version?: number;
        };
        Relationships: [];
      };
      settlement_retry: {
        Row: {
          attempts: number;
          exhausted_at: string | null;
          game: string;
          game_id: number;
          last_error: string | null;
          next_retry_at: string | null;
        };
        Insert: {
          attempts?: number;
          exhausted_at?: string | null;
          game: string;
          game_id: number;
          last_error?: string | null;
          next_retry_at?: string | null;
        };
        Update: {
          attempts?: number;
          exhausted_at?: string | null;
          game?: string;
          game_id?: number;
          last_error?: string | null;
          next_retry_at?: string | null;
        };
        Relationships: [];
      };
      signup_attempts: {
        Row: {
          created_at: string;
          email_hash: string;
          id: number;
          ip_hash: string | null;
        };
        Insert: {
          created_at?: string;
          email_hash: string;
          id?: never;
          ip_hash?: string | null;
        };
        Update: {
          created_at?: string;
          email_hash?: string;
          id?: never;
          ip_hash?: string | null;
        };
        Relationships: [];
      };
      signup_blocked_ips: {
        Row: {
          blocked_at: string;
          blocked_by: string | null;
          ip_hash: string;
          reason: string | null;
        };
        Insert: {
          blocked_at?: string;
          blocked_by?: string | null;
          ip_hash: string;
          reason?: string | null;
        };
        Update: {
          blocked_at?: string;
          blocked_by?: string | null;
          ip_hash?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "signup_blocked_ips_blocked_by_fkey";
            columns: ["blocked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      signup_verifications: {
        Row: {
          created_at: string;
          id: number;
          ip_hash: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          ip_hash: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          ip_hash?: string;
        };
        Relationships: [];
      };
      slot_bonus_budget: {
        Row: {
          budget_cents: number;
          day: string;
          reserved_cents: number;
          updated_at: string;
        };
        Insert: {
          budget_cents: number;
          day: string;
          reserved_cents?: number;
          updated_at?: string;
        };
        Update: {
          budget_cents?: number;
          day?: string;
          reserved_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      slot_bonus_events: {
        Row: {
          awarded_cents: number;
          budget_day: string;
          created_at: string;
          game_id: number;
          id: string;
          ledger_tx_id: string;
          pool_after: number;
          pool_before: number;
          requested_cents: number;
          return_tx_id: string | null;
          spin_no: number;
          status: string;
          tier: string;
          tier_bps: number;
          triggered_by: string;
          wild_count: number;
        };
        Insert: {
          awarded_cents: number;
          budget_day: string;
          created_at?: string;
          game_id: number;
          id?: string;
          ledger_tx_id: string;
          pool_after: number;
          pool_before: number;
          requested_cents: number;
          return_tx_id?: string | null;
          spin_no: number;
          status?: string;
          tier: string;
          tier_bps: number;
          triggered_by: string;
          wild_count: number;
        };
        Update: {
          awarded_cents?: number;
          budget_day?: string;
          created_at?: string;
          game_id?: number;
          id?: string;
          ledger_tx_id?: string;
          pool_after?: number;
          pool_before?: number;
          requested_cents?: number;
          return_tx_id?: string | null;
          spin_no?: number;
          status?: string;
          tier?: string;
          tier_bps?: number;
          triggered_by?: string;
          wild_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "slot_bonus_events_budget_day_fkey";
            columns: ["budget_day"];
            isOneToOne: false;
            referencedRelation: "slot_bonus_budget";
            referencedColumns: ["day"];
          },
          {
            foreignKeyName: "slot_bonus_events_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "slot_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_bonus_events_game_id_spin_no_fkey";
            columns: ["game_id", "spin_no"];
            isOneToOne: true;
            referencedRelation: "slot_spins";
            referencedColumns: ["game_id", "spin_no"];
          },
          {
            foreignKeyName: "slot_bonus_events_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_bonus_events_return_tx_id_fkey";
            columns: ["return_tx_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_bonus_events_triggered_by_fkey";
            columns: ["triggered_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      slot_bonus_tiers: {
        Row: {
          min_wilds: number;
          stake_bps: number;
          tier: string;
        };
        Insert: {
          min_wilds: number;
          stake_bps: number;
          tier: string;
        };
        Update: {
          min_wilds?: number;
          stake_bps?: number;
          tier?: string;
        };
        Relationships: [];
      };
      slot_config: {
        Row: {
          base_spins: number;
          create_rate_limit: number;
          create_rate_window_seconds: number;
          fee_bps: number;
          id: boolean;
          match_cap_bps: number;
          max_event_bonus_cents: number;
          max_match_bonus_cents: number;
          max_open_per_user: number;
          max_spins: number;
          pre_delay_ms: number;
          spin_ms: number;
          stakes: number[];
          turn_seconds: number;
          updated_at: string;
          waiting_timeout_seconds: number;
        };
        Insert: {
          base_spins?: number;
          create_rate_limit?: number;
          create_rate_window_seconds?: number;
          fee_bps?: number;
          id?: boolean;
          match_cap_bps?: number;
          max_event_bonus_cents?: number;
          max_match_bonus_cents?: number;
          max_open_per_user?: number;
          max_spins?: number;
          pre_delay_ms?: number;
          spin_ms?: number;
          stakes?: number[];
          turn_seconds?: number;
          updated_at?: string;
          waiting_timeout_seconds?: number;
        };
        Update: {
          base_spins?: number;
          create_rate_limit?: number;
          create_rate_window_seconds?: number;
          fee_bps?: number;
          id?: boolean;
          match_cap_bps?: number;
          max_event_bonus_cents?: number;
          max_match_bonus_cents?: number;
          max_open_per_user?: number;
          max_spins?: number;
          pre_delay_ms?: number;
          spin_ms?: number;
          stakes?: number[];
          turn_seconds?: number;
          updated_at?: string;
          waiting_timeout_seconds?: number;
        };
        Relationships: [];
      };
      slot_entries: {
        Row: {
          amount: number;
          created_at: string;
          game_id: number;
          id: string;
          idempotency_key: string;
          ledger_tx_id: string;
          seat: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          game_id: number;
          id?: string;
          idempotency_key: string;
          ledger_tx_id: string;
          seat: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          game_id?: number;
          id?: string;
          idempotency_key?: string;
          ledger_tx_id?: string;
          seat?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slot_entries_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "slot_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_entries_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      slot_game_secrets: {
        Row: {
          game_id: number;
          server_seed: string;
        };
        Insert: {
          game_id: number;
          server_seed: string;
        };
        Update: {
          game_id?: number;
          server_seed?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slot_game_secrets_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "slot_games";
            referencedColumns: ["id"];
          },
        ];
      };
      slot_games: {
        Row: {
          account_type: string;
          asset: string;
          base_spins: number;
          bonus_cap: number;
          bonus_total: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          creator_id: string;
          ends_at: string | null;
          expires_at: string;
          fee_amount: number | null;
          fee_bps: number;
          id: number;
          joined_at: string | null;
          last_error: string | null;
          max_spins: number;
          money_domain: string;
          next_spin: number;
          opponent_id: string | null;
          outcome: string | null;
          p2p_pot: number;
          payout_amount: number | null;
          protocol_version: string;
          score_a: number;
          score_b: number;
          server_seed: string | null;
          server_seed_hash: string;
          settle_attempts: number;
          settlement_started_at: string | null;
          spin_ms: number;
          stake: number;
          status: Database["public"]["Enums"]["slot_status"];
          turn_deadline: string | null;
          turn_opens_at: string | null;
          turn_seconds: number;
          updated_at: string;
          winner_id: string | null;
        };
        Insert: {
          account_type: string;
          asset: string;
          base_spins: number;
          bonus_cap: number;
          bonus_total?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          creator_id: string;
          ends_at?: string | null;
          expires_at: string;
          fee_amount?: number | null;
          fee_bps: number;
          id?: never;
          joined_at?: string | null;
          last_error?: string | null;
          max_spins: number;
          money_domain: string;
          next_spin?: number;
          opponent_id?: string | null;
          outcome?: string | null;
          p2p_pot: number;
          payout_amount?: number | null;
          protocol_version?: string;
          score_a?: number;
          score_b?: number;
          server_seed?: string | null;
          server_seed_hash: string;
          settle_attempts?: number;
          settlement_started_at?: string | null;
          spin_ms: number;
          stake: number;
          status?: Database["public"]["Enums"]["slot_status"];
          turn_deadline?: string | null;
          turn_opens_at?: string | null;
          turn_seconds: number;
          updated_at?: string;
          winner_id?: string | null;
        };
        Update: {
          account_type?: string;
          asset?: string;
          base_spins?: number;
          bonus_cap?: number;
          bonus_total?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          creator_id?: string;
          ends_at?: string | null;
          expires_at?: string;
          fee_amount?: number | null;
          fee_bps?: number;
          id?: never;
          joined_at?: string | null;
          last_error?: string | null;
          max_spins?: number;
          money_domain?: string;
          next_spin?: number;
          opponent_id?: string | null;
          outcome?: string | null;
          p2p_pot?: number;
          payout_amount?: number | null;
          protocol_version?: string;
          score_a?: number;
          score_b?: number;
          server_seed?: string | null;
          server_seed_hash?: string;
          settle_attempts?: number;
          settlement_started_at?: string | null;
          spin_ms?: number;
          stake?: number;
          status?: Database["public"]["Enums"]["slot_status"];
          turn_deadline?: string | null;
          turn_opens_at?: string | null;
          turn_seconds?: number;
          updated_at?: string;
          winner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "slot_games_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_games_opponent_id_fkey";
            columns: ["opponent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_games_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      slot_payouts: {
        Row: {
          amount: number;
          beneficiary_id: string;
          created_at: string;
          game_id: number;
          kind: string;
          ledger_tx_id: string;
        };
        Insert: {
          amount: number;
          beneficiary_id: string;
          created_at?: string;
          game_id: number;
          kind: string;
          ledger_tx_id: string;
        };
        Update: {
          amount?: number;
          beneficiary_id?: string;
          created_at?: string;
          game_id?: number;
          kind?: string;
          ledger_tx_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slot_payouts_beneficiary_id_fkey";
            columns: ["beneficiary_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_payouts_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "slot_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_payouts_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      slot_promo_config: {
        Row: {
          daily_budget_cents: number;
          enabled: boolean;
          id: boolean;
          updated_at: string;
          user_daily_cap_cents: number;
        };
        Insert: {
          daily_budget_cents?: number;
          enabled?: boolean;
          id?: boolean;
          updated_at?: string;
          user_daily_cap_cents?: number;
        };
        Update: {
          daily_budget_cents?: number;
          enabled?: boolean;
          id?: boolean;
          updated_at?: string;
          user_daily_cap_cents?: number;
        };
        Relationships: [];
      };
      slot_spins: {
        Row: {
          auto: boolean;
          base_score: number;
          bonus_cents: number;
          created_at: string;
          game_id: number;
          grid: number[];
          idempotency_key: string | null;
          line_score: number;
          lines: Json;
          player_id: string;
          reveal_at: string;
          score: number;
          seat: string;
          spin_no: number;
          wild_count: number;
        };
        Insert: {
          auto?: boolean;
          base_score: number;
          bonus_cents?: number;
          created_at?: string;
          game_id: number;
          grid: number[];
          idempotency_key?: string | null;
          line_score: number;
          lines?: Json;
          player_id: string;
          reveal_at: string;
          score: number;
          seat: string;
          spin_no: number;
          wild_count: number;
        };
        Update: {
          auto?: boolean;
          base_score?: number;
          bonus_cents?: number;
          created_at?: string;
          game_id?: number;
          grid?: number[];
          idempotency_key?: string | null;
          line_score?: number;
          lines?: Json;
          player_id?: string;
          reveal_at?: string;
          score?: number;
          seat?: string;
          spin_no?: number;
          wild_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "slot_spins_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "slot_games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slot_spins_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      treasury_assets: {
        Row: {
          asset_key: string;
          balance_units: number | null;
          decimals: number;
          min_reserve_units: number;
          network: string;
          observed_at: string | null;
          price_micro_usd: number | null;
          updated_at: string;
        };
        Insert: {
          asset_key: string;
          balance_units?: number | null;
          decimals: number;
          min_reserve_units?: number;
          network: string;
          observed_at?: string | null;
          price_micro_usd?: number | null;
          updated_at?: string;
        };
        Update: {
          asset_key?: string;
          balance_units?: number | null;
          decimals?: number;
          min_reserve_units?: number;
          network?: string;
          observed_at?: string | null;
          price_micro_usd?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      treasury_reservations: {
        Row: {
          asset_key: string;
          btc_payout_id: string | null;
          closed_at: string | null;
          created_at: string;
          id: string;
          network: string;
          price_micro_usd: number;
          status: string;
          units: number;
          usd_cents: number;
          user_id: string;
          withdrawal_id: string | null;
        };
        Insert: {
          asset_key: string;
          btc_payout_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          network: string;
          price_micro_usd: number;
          status?: string;
          units: number;
          usd_cents: number;
          user_id: string;
          withdrawal_id?: string | null;
        };
        Update: {
          asset_key?: string;
          btc_payout_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          network?: string;
          price_micro_usd?: number;
          status?: string;
          units?: number;
          usd_cents?: number;
          user_id?: string;
          withdrawal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "treasury_reservations_btc_payout_id_fkey";
            columns: ["btc_payout_id"];
            isOneToOne: true;
            referencedRelation: "btcpay_payouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treasury_reservations_network_asset_key_fkey";
            columns: ["network", "asset_key"];
            isOneToOne: false;
            referencedRelation: "treasury_assets";
            referencedColumns: ["network", "asset_key"];
          },
          {
            foreignKeyName: "treasury_reservations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treasury_reservations_withdrawal_id_fkey";
            columns: ["withdrawal_id"];
            isOneToOne: true;
            referencedRelation: "crypto_withdrawals";
            referencedColumns: ["id"];
          },
        ];
      };
      user_avatars: {
        Row: {
          created_at: string;
          file_size_bytes: number | null;
          height: number | null;
          id: string;
          mime_type: string | null;
          reject_reason: string | null;
          status: string;
          storage_path: string | null;
          updated_at: string;
          user_id: string;
          width: number | null;
        };
        Insert: {
          created_at?: string;
          file_size_bytes?: number | null;
          height?: number | null;
          id?: string;
          mime_type?: string | null;
          reject_reason?: string | null;
          status?: string;
          storage_path?: string | null;
          updated_at?: string;
          user_id: string;
          width?: number | null;
        };
        Update: {
          created_at?: string;
          file_size_bytes?: number | null;
          height?: number | null;
          id?: string;
          mime_type?: string | null;
          reject_reason?: string | null;
          status?: string;
          storage_path?: string | null;
          updated_at?: string;
          user_id?: string;
          width?: number | null;
        };
        Relationships: [];
      };
      user_cosmetics: {
        Row: {
          cosmetic_id: string;
          id: string;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          cosmetic_id: string;
          id?: string;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          cosmetic_id?: string;
          id?: string;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_cosmetics_cosmetic_id_fkey";
            columns: ["cosmetic_id"];
            isOneToOne: false;
            referencedRelation: "cosmetics";
            referencedColumns: ["id"];
          },
        ];
      };
      user_prestige: {
        Row: {
          current_level: number;
          equipped_crown_id: string | null;
          equipped_frame_id: string | null;
          total_xp: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          current_level?: number;
          equipped_crown_id?: string | null;
          equipped_frame_id?: string | null;
          total_xp?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          current_level?: number;
          equipped_crown_id?: string | null;
          equipped_frame_id?: string | null;
          total_xp?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_prestige_equipped_crown_id_fkey";
            columns: ["equipped_crown_id"];
            isOneToOne: false;
            referencedRelation: "cosmetics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_prestige_equipped_frame_id_fkey";
            columns: ["equipped_frame_id"];
            isOneToOne: false;
            referencedRelation: "cosmetics";
            referencedColumns: ["id"];
          },
        ];
      };
      user_reward_claims: {
        Row: {
          amount: number;
          claimed_at: string;
          currency: string;
          id: string;
          reward_id: string;
          transaction_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          claimed_at?: string;
          currency: string;
          id?: string;
          reward_id: string;
          transaction_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          claimed_at?: string;
          currency?: string;
          id?: string;
          reward_id?: string;
          transaction_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_reward_claims_reward_id_fkey";
            columns: ["reward_id"];
            isOneToOne: false;
            referencedRelation: "prestige_rewards";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_wallets: {
        Row: {
          address: string;
          became_primary_at: string | null;
          chain_type: string;
          created_at: string;
          id: string;
          is_primary: boolean;
          is_verified: boolean;
          last_seen_at: string | null;
          normalized_address: string;
          updated_at: string;
          user_id: string;
          verified_at: string | null;
          wallet_provider: string;
        };
        Insert: {
          address: string;
          became_primary_at?: string | null;
          chain_type?: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          is_verified?: boolean;
          last_seen_at?: string | null;
          normalized_address: string;
          updated_at?: string;
          user_id: string;
          verified_at?: string | null;
          wallet_provider?: string;
        };
        Update: {
          address?: string;
          became_primary_at?: string | null;
          chain_type?: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          is_verified?: boolean;
          last_seen_at?: string | null;
          normalized_address?: string;
          updated_at?: string;
          user_id?: string;
          verified_at?: string | null;
          wallet_provider?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_wallets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_accounts: {
        Row: {
          account_type: string;
          asset: string;
          balance: number;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["account_kind"];
          owner_id: string | null;
        };
        Insert: {
          account_type?: string;
          asset?: string;
          balance?: number;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["account_kind"];
          owner_id?: string | null;
        };
        Update: {
          account_type?: string;
          asset?: string;
          balance?: number;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["account_kind"];
          owner_id?: string | null;
        };
        Relationships: [];
      };
      wallet_verification_challenges: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          issued_at: string;
          message_version: number;
          nonce: string;
          normalized_address: string;
          user_id: string;
          wallet_address: string;
        };
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          issued_at: string;
          message_version?: number;
          nonce: string;
          normalized_address: string;
          user_id: string;
          wallet_address: string;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          issued_at?: string;
          message_version?: number;
          nonce?: string;
          normalized_address?: string;
          user_id?: string;
          wallet_address?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_verification_challenges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      withdraw_basis_applied: {
        Row: {
          applied_at: string;
          seq: number;
          tx_id: string;
        };
        Insert: {
          applied_at?: string;
          seq?: number;
          tx_id: string;
        };
        Update: {
          applied_at?: string;
          seq?: number;
          tx_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "withdraw_basis_applied_tx_id_fkey";
            columns: ["tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      withdraw_basis_bucket: {
        Row: {
          bonus: number;
          deposits: number;
          eligible: number;
          user_id: string;
        };
        Insert: {
          bonus?: number;
          deposits?: number;
          eligible?: number;
          user_id: string;
        };
        Update: {
          bonus?: number;
          deposits?: number;
          eligible?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      withdraw_basis_hold: {
        Row: {
          bonus_part: number;
          eligible_part: number;
          id: number;
          user_id: string;
        };
        Insert: {
          bonus_part: number;
          eligible_part: number;
          id?: number;
          user_id: string;
        };
        Update: {
          bonus_part?: number;
          eligible_part?: number;
          id?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      withdraw_basis_ledger_stake: {
        Row: {
          bonus: number;
          eligible: number;
          ledger_tx_id: string;
          stake_total: number;
          user_id: string;
        };
        Insert: {
          bonus: number;
          eligible: number;
          ledger_tx_id: string;
          stake_total: number;
          user_id: string;
        };
        Update: {
          bonus?: number;
          eligible?: number;
          ledger_tx_id?: string;
          stake_total?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "withdraw_basis_ledger_stake_ledger_tx_id_fkey";
            columns: ["ledger_tx_id"];
            isOneToOne: true;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      withdraw_basis_meta: {
        Row: {
          applied_tx_count: number;
          id: number;
          last_created_at: string | null;
          last_tx_id: string | null;
          ledger_real_tx_count: number;
          posting_count: number;
        };
        Insert: {
          applied_tx_count?: number;
          id: number;
          last_created_at?: string | null;
          last_tx_id?: string | null;
          ledger_real_tx_count?: number;
          posting_count?: number;
        };
        Update: {
          applied_tx_count?: number;
          id?: number;
          last_created_at?: string | null;
          last_tx_id?: string | null;
          ledger_real_tx_count?: number;
          posting_count?: number;
        };
        Relationships: [];
      };
      withdraw_basis_stake: {
        Row: {
          bonus: number;
          eligible: number;
          game: string;
          game_id: number;
          user_id: string;
        };
        Insert: {
          bonus: number;
          eligible: number;
          game: string;
          game_id: number;
          user_id: string;
        };
        Update: {
          bonus?: number;
          eligible?: number;
          game?: string;
          game_id?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      worker_tick_gate: {
        Row: {
          last_run_at: string;
          name: string;
        };
        Insert: {
          last_run_at?: string;
          name: string;
        };
        Update: {
          last_run_at?: string;
          name?: string;
        };
        Relationships: [];
      };
      xp_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          source_game: string;
          source_transaction_id: string;
          user_id: string;
          xp_amount: number;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          source_game: string;
          source_transaction_id: string;
          user_id: string;
          xp_amount: number;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          source_game?: string;
          source_transaction_id?: string;
          user_id?: string;
          xp_amount?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _admin_credited_deposits: {
        Args: never;
        Returns: {
          credited_at: string;
          usd_cents: number;
        }[];
      };
      _admin_open_withdrawals: {
        Args: never;
        Returns: {
          usd_cents: number;
        }[];
      };
      _admin_pin_locked: {
        Args: { p_device: string; p_ip: string; p_user: string };
        Returns: boolean;
      };
      _admin_redact: { Args: { p: Json }; Returns: Json };
      _admin_redact_text: { Args: { p: string }; Returns: string };
      _admin_settled_withdrawals: {
        Args: never;
        Returns: {
          fee_usd_cents: number;
          paid_at: string;
          usd_cents: number;
        }[];
      };
      _assert_admin: { Args: never; Returns: string };
      _assert_live_session: { Args: never; Returns: undefined };
      _assert_reward_holds: {
        Args: { p_balance: number; p_total: number; p_user: string };
        Returns: undefined;
      };
      _audit: {
        Args: {
          p_action: string;
          p_actor: string;
          p_details: Json;
          p_game: number;
        };
        Returns: undefined;
      };
      _audit_cf: {
        Args: {
          p_action: string;
          p_actor: string;
          p_details: Json;
          p_game: number;
        };
        Returns: undefined;
      };
      _audit_slot: {
        Args: {
          p_action: string;
          p_actor: string;
          p_details: Json;
          p_game: number;
        };
        Returns: undefined;
      };
      _cash_room: { Args: { p_user: string }; Returns: number };
      _coinflip_lock_wallets: {
        Args: { p_asset: string; p_type: string; p_users: string[] };
        Returns: undefined;
      };
      _coinflip_refund: {
        Args: { p_game_id: number; p_reason: string };
        Returns: undefined;
      };
      _crypto_incident: {
        Args: { p_check: string; p_details: Json; p_fp: string };
        Returns: undefined;
      };
      _crypto_release: {
        Args: { p_id: string; p_reason: string; p_status: string };
        Returns: undefined;
      };
      _daily_chest_award_xp: {
        Args: { p_open: string; p_user: string; p_xp: number };
        Returns: undefined;
      };
      _daily_chest_reward_json: {
        Args: { o: Database["public"]["Tables"]["daily_chest_opens"]["Row"] };
        Returns: Json;
      };
      _daily_chest_roll: {
        Args: never;
        Returns: {
          active: boolean;
          amount: number | null;
          created_at: string;
          key: string;
          kind: string;
          pool: string | null;
          weight: number;
        };
        SetofOptions: {
          from: "*";
          to: "daily_chest_rewards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      _ensure_open_game: { Args: never; Returns: number };
      _fair_hmac: {
        Args: { p_message: string; p_seed: string };
        Returns: string;
      };
      _fee_ticket_take: {
        Args: {
          p_fee: number;
          p_game: string;
          p_game_id: number;
          p_user: string;
        };
        Returns: boolean;
      };
      _fee_ticket_used: {
        Args: { p_game: string; p_game_id: number };
        Returns: boolean;
      };
      _is_active_partner: { Args: { p_user: string }; Returns: boolean };
      _is_house_address: { Args: { p_addr: string }; Returns: boolean };
      _jackpot_refund_waiting: { Args: { p_game_id: number }; Returns: string };
      _jsonb_add_counts: { Args: { a: Json; b: Json }; Returns: Json };
      _lb_check_timezone: { Args: { p_tz: string }; Returns: undefined };
      _lb_inflight: { Args: { p_campaign: string }; Returns: boolean };
      _lb_pay_campaign: { Args: { p_campaign: string }; Returns: undefined };
      _lb_public_row: {
        Args: { p_campaign: string; p_limit: number; p_offset: number };
        Returns: Json;
      };
      _lb_replace_tiers: {
        Args: { p_campaign: string; p_max: number; p_tiers: Json };
        Returns: number;
      };
      _lb_require_admin: { Args: never; Returns: string };
      _lb_require_partner: { Args: never; Returns: string };
      _lb_rules: {
        Args: {
          c: Database["public"]["Tables"]["leaderboard_campaigns"]["Row"];
        };
        Returns: Json;
      };
      _lb_sync: { Args: { p_campaign: string }; Returns: boolean };
      _lb_wager_deposit_cents: {
        Args: { p_amount: number; p_ledger_tx: string };
        Returns: number;
      };
      _lock_system_accounts: {
        Args: {
          p_asset: string;
          p_kinds: Database["public"]["Enums"]["account_kind"][];
          p_type: string;
        };
        Returns: undefined;
      };
      _money_deposit_snapshot: { Args: never; Returns: Json };
      _money_finalize_v1: { Args: never; Returns: Json };
      _money_migrate_v1: { Args: never; Returns: Json };
      _money_rollback_v1: { Args: never; Returns: Json };
      _money_state: { Args: never; Returns: string };
      _normalize_inet: { Args: { p: string }; Returns: unknown };
      _note_settlement_exhausted: {
        Args: { p_check: string; p_details: Json; p_fp: string };
        Returns: undefined;
      };
      _partner_deposits: {
        Args: { p_from: string; p_partner: string; p_to: string };
        Returns: {
          cents: number;
          deposits: number;
          user_id: string;
        }[];
      };
      _partner_open_withdrawal: { Args: { p_user: string }; Returns: boolean };
      _partner_post_removal_net: {
        Args: { p_removed_at: string; p_user: string };
        Returns: number;
      };
      _partner_profit_hold: { Args: { p_user: string }; Returns: number };
      _partner_profit_record: {
        Args: {
          p_fee: number;
          p_game: string;
          p_game_id: number;
          p_partner: string;
          p_partner_stake: number;
          p_profit: number;
          p_tx: string;
          p_winner: string;
          p_winner_stake: number;
        };
        Returns: undefined;
      };
      _partner_profit_txs: {
        Args: { p_user: string };
        Returns: {
          delta: number;
          ord: number;
          ts: string;
          tx_id: string;
        }[];
      };
      _partner_release_block: {
        Args: { p_balance: number; p_user: string };
        Returns: number;
      };
      _partner_release_hold: { Args: { p_user: string }; Returns: number };
      _partner_window: {
        Args: { p_bps: number; p_from: string; p_partner: string; p_to: string };
        Returns: Json;
      };
      _play_domain_open: { Args: never; Returns: boolean };
      _playthrough_stake: {
        Args: { p_game: string; p_source: string; p_user: string };
        Returns: number;
      };
      _poker_advance: { Args: { p_hand: number }; Returns: undefined };
      _poker_apply: {
        Args: {
          p_action: string;
          p_amount: number;
          p_hand: number;
          p_key: string;
          p_seat: number;
          p_source: string;
        };
        Returns: undefined;
      };
      _poker_assert_fresh_chain: {
        Args: { p_head: string; p_seat?: number };
        Returns: undefined;
      };
      _poker_call_target: {
        Args: { p_hand: number; p_seat: number };
        Returns: number;
      };
      _poker_cashout: { Args: { p_seat: number }; Returns: undefined };
      _poker_close_idle: { Args: never; Returns: undefined };
      _poker_deal: { Args: { p_hand: number }; Returns: undefined };
      _poker_dist: {
        Args: { p_from: number; p_m: number; p_seat: number };
        Returns: number;
      };
      _poker_due_tables: { Args: { p_limit: number }; Returns: number[] };
      _poker_entropy: { Args: { p_hand: number }; Returns: string };
      _poker_eval: { Args: { p_cards: number[] }; Returns: number };
      _poker_find_to_act: {
        Args: { p_from: number; p_hand: number; p_inclusive: boolean };
        Returns: number;
      };
      _poker_finish: { Args: { p_hand: number }; Returns: string };
      _poker_hand_json: { Args: { p_hand: number }; Returns: Json };
      _poker_hand_name: { Args: { p_score: number }; Returns: string };
      _poker_hand_transfers: {
        Args: { p_hand: number };
        Returns: {
          amount: number;
          exact: boolean;
          from_folded: boolean;
          from_user: string;
          split_pot: boolean;
          to_user: string;
        }[];
      };
      _poker_in_hand: { Args: { p_seat: number }; Returns: boolean };
      _poker_legal: { Args: { p_hand: number; p_seat: number }; Returns: Json };
      _poker_log: {
        Args: {
          p_action: string;
          p_all_in: boolean;
          p_amount: number;
          p_cards: number[];
          p_hand: number;
          p_key: string;
          p_seat: number;
          p_street: string;
          p_to: number;
          p_user: string;
        };
        Returns: undefined;
      };
      _poker_needs: {
        Args: { p_hand: number; p_seat: number };
        Returns: boolean;
      };
      _poker_next: {
        Args: { p_from: number; p_m: number; p_seats: number[] };
        Returns: number;
      };
      _poker_note_settle_failure: {
        Args: { p_error: string; p_hand: number; p_source: string };
        Returns: number;
      };
      _poker_open_hand: { Args: { p_table: number }; Returns: number };
      _poker_pack: { Args: { p_cat: number; p_k: number[] }; Returns: number };
      _poker_post_hand: { Args: { p_table: number }; Returns: undefined };
      _poker_pots: { Args: { p_hand: number }; Returns: Json };
      _poker_ranks_desc: {
        Args: { p_counts: number[]; p_excl: number[] };
        Returns: number[];
      };
      _poker_rate: {
        Args: {
          p_limit: number;
          p_op: string;
          p_user: string;
          p_window_seconds: number;
        };
        Returns: undefined;
      };
      _poker_record_tick: {
        Args: {
          p_exhausted: boolean;
          p_failed: number;
          p_processed: number;
          p_skipped: number;
          p_started: string;
        };
        Returns: Json;
      };
      _poker_self_excluded: { Args: { p_user: string }; Returns: boolean };
      _poker_set_turn: {
        Args: { p_hand: number; p_seat: number };
        Returns: undefined;
      };
      _poker_settle: { Args: { p_hand: number }; Returns: undefined };
      _poker_shuffle: {
        Args: { p_entropy: string; p_hand: number; p_seed: string };
        Returns: number[];
      };
      _poker_straight_top: { Args: { p_mask: number }; Returns: number };
      _poker_take_cash: {
        Args: { p_amount: number; p_pending: boolean; p_seat: number };
        Returns: string;
      };
      _poker_tick_one: { Args: { p_table: number }; Returns: string };
      _poker_tick_table: { Args: { p_table: number }; Returns: string };
      _poker_touch: { Args: { p_table: number }; Returns: undefined };
      _poker_uid: { Args: never; Returns: string };
      _poker_void: {
        Args: { p_by: string[]; p_hand: number; p_reason: string };
        Returns: undefined;
      };
      _poker_void_strikes: { Args: { p_user: string }; Returns: number };
      _post: {
        Args: { p_account: string; p_amount: number; p_tx: string };
        Returns: undefined;
      };
      _prestige_loot_roll: { Args: never; Returns: number };
      _promo_client_ip: { Args: never; Returns: unknown };
      _promo_code: { Args: { p: string }; Returns: string };
      _real_play_allowed: { Args: never; Returns: boolean };
      _referral_code: { Args: never; Returns: string };
      _referral_shared_wallet: {
        Args: { p_inviter: string; p_referred: string };
        Returns: boolean;
      };
      _require_admin_stepup: { Args: never; Returns: undefined };
      _require_server_caller: { Args: never; Returns: undefined };
      _roulette_audit: {
        Args: {
          p_action: string;
          p_actor: string;
          p_details: Json;
          p_game: number;
        };
        Returns: undefined;
      };
      _roulette_domain_valid: { Args: never; Returns: boolean };
      _roulette_ensure_open: { Args: never; Returns: number };
      _roulette_refund: {
        Args: { p_game_id: number; p_reason: string };
        Returns: undefined;
      };
      _roulette_settle: { Args: { p_game_id: number }; Returns: undefined };
      _settlement_backoff: {
        Args: { p_error: string; p_game: string; p_game_id: number };
        Returns: undefined;
      };
      _signup_slot_reason: { Args: { p_ip: string }; Returns: string };
      _slot_refund_waiting: {
        Args: { p_game_id: number; p_reason: string };
        Returns: undefined;
      };
      _slot_settle: { Args: { p_game_id: number }; Returns: string };
      _slot_spin: {
        Args: {
          p_actor: string;
          p_auto: boolean;
          p_game_id: number;
          p_key: string;
        };
        Returns: {
          auto: boolean;
          base_score: number;
          bonus_cents: number;
          created_at: string;
          game_id: number;
          grid: number[];
          idempotency_key: string | null;
          line_score: number;
          lines: Json;
          player_id: string;
          reveal_at: string;
          score: number;
          seat: string;
          spin_no: number;
          wild_count: number;
        };
        SetofOptions: {
          from: "*";
          to: "slot_spins";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      _system_account: {
        Args: {
          p_asset: string;
          p_kind: Database["public"]["Enums"]["account_kind"];
          p_type: string;
        };
        Returns: string;
      };
      _tick_gate: { Args: { p_name: string }; Returns: boolean };
      _treasury_price: {
        Args: { p_asset: string; p_network: string };
        Returns: number;
      };
      _treasury_reserve: {
        Args: {
          p_asset: string;
          p_cents: number;
          p_network: string;
          p_payout: string;
          p_price: number;
          p_units: number;
          p_user: string;
          p_withdrawal: string;
        };
        Returns: string;
      };
      _treasury_state: {
        Args: { p_asset: string; p_network: string };
        Returns: {
          available_units: number;
          balance_units: number;
          min_reserve_units: number;
          observed_at: string;
          reserved_units: number;
        }[];
      };
      _user_account: {
        Args: {
          p_asset: string;
          p_kind: Database["public"]["Enums"]["account_kind"];
          p_type: string;
          p_user: string;
        };
        Returns: string;
      };
      _withdraw_basis: { Args: { p_user: string }; Returns: Json };
      _withdraw_basis_apply_one: { Args: { p_tx: string }; Returns: undefined };
      _withdraw_basis_apply_tx: {
        Args: { p_game_id: number; p_kind: string; p_tx_id: string };
        Returns: undefined;
      };
      _withdraw_basis_assert_rebuild_idempotent: {
        Args: never;
        Returns: undefined;
      };
      _withdraw_basis_buckets_json: { Args: never; Returns: Json };
      _withdraw_basis_has_pending: { Args: never; Returns: boolean };
      _withdraw_basis_peek: { Args: { p_user: string }; Returns: Json };
      _withdraw_basis_rebuild_full: { Args: never; Returns: undefined };
      _withdraw_basis_sync: { Args: never; Returns: undefined };
      admin_active_otp: {
        Args: { p_device_hash: string; p_session: string; p_user: string };
        Returns: string;
      };
      admin_audit: {
        Args: { p_action: string; p_user: string };
        Returns: undefined;
      };
      admin_coinflip_overview: { Args: never; Returns: Json };
      admin_device_revoke: {
        Args: { p_device: string; p_user: string };
        Returns: Json;
      };
      admin_device_touch: {
        Args: {
          p_ip_hash: string;
          p_token_hash: string;
          p_ua_hash: string;
          p_user: string;
        };
        Returns: Json;
      };
      admin_device_trust: {
        Args: { p_device_hash: string; p_session: string; p_user: string };
        Returns: Json;
      };
      admin_ledger_cashflow: { Args: never; Returns: Json };
      admin_ops_query: { Args: { p_args: Json; p_kind: string }; Returns: Json };
      admin_otp_failed: { Args: { p_user: string }; Returns: undefined };
      admin_otp_open: {
        Args: { p_device_hash: string; p_session: string; p_user: string };
        Returns: Json;
      };
      admin_otp_sent: { Args: { p_user: string }; Returns: undefined };
      admin_overview: { Args: never; Returns: Json };
      admin_pin_commit: {
        Args: {
          p_device_hash: string;
          p_ip_hash: string;
          p_match: boolean;
          p_session: string;
          p_user: string;
        };
        Returns: Json;
      };
      admin_pin_create: {
        Args: {
          p_device_hash: string;
          p_pin_hash: string;
          p_session: string;
          p_user: string;
        };
        Returns: Json;
      };
      admin_pin_prepare: {
        Args: { p_device_hash: string; p_ip_hash: string; p_user: string };
        Returns: Json;
      };
      admin_prestige_summary: { Args: never; Returns: Json };
      admin_referrals: { Args: never; Returns: Json };
      admin_security_status: {
        Args: { p_device_hash: string; p_session: string; p_user: string };
        Returns: Json;
      };
      admin_signups: { Args: { p_args?: Json }; Returns: Json };
      admin_stepup_ok: {
        Args: { p_session: string; p_user: string };
        Returns: boolean;
      };
      admin_verified_email: { Args: { p_user: string }; Returns: string };
      auth_revoke_sessions: { Args: { p_user: string }; Returns: undefined };
      auth_user_by_email: { Args: { p_email: string }; Returns: Json };
      avatar_activate: {
        Args: {
          p_bytes: number;
          p_height: number;
          p_id: string;
          p_path: string;
          p_url: string;
          p_width: number;
        };
        Returns: Json;
      };
      avatar_begin: { Args: { p_user: string }; Returns: string };
      avatar_fail: {
        Args: { p_id: string; p_reason: string; p_status: string };
        Returns: undefined;
      };
      avatar_remove: { Args: { p_user: string }; Returns: Json };
      avatar_set_preset: {
        Args: { p_avatar_url: string; p_user: string };
        Returns: Json;
      };
      avatar_take_stale_paths: { Args: { p_user: string }; Returns: string[] };
      btc_float_books: { Args: never; Returns: Json };
      btc_wallet_transfer_begin: {
        Args: {
          p_admin: string;
          p_destination: string;
          p_sats: number;
          p_usd_cents: number;
        };
        Returns: string;
      };
      btc_wallet_transfer_finish: {
        Args: { p_id: string; p_ok: boolean; p_txid: string };
        Returns: undefined;
      };
      btc_wallet_transfer_state: { Args: never; Returns: Json };
      btcpay_attach_payout: {
        Args: { p_btcpay_id: string; p_id: string };
        Returns: undefined;
      };
      btcpay_credit_invoice: {
        Args: {
          p_additional: string;
          p_amount: string;
          p_currency: string;
          p_id: string;
          p_lightning_seen: boolean;
          p_onchain_settled: boolean;
          p_order_id: string;
          p_speed_policy: string;
          p_status: string;
        };
        Returns: Json;
      };
      btcpay_credit_received:
        | {
            Args: {
              p_currency: string;
              p_id: string;
              p_late_sats: number;
              p_lightning_seen: boolean;
              p_onchain_settled: boolean;
              p_ontime_sats: number;
              p_order_id: string;
              p_rate_micro: number;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_currency: string;
              p_id: string;
              p_late_sats: number;
              p_lightning_seen: boolean;
              p_onchain_settled: boolean;
              p_ontime_sats: number;
              p_order_id: string;
              p_outputs: Json;
              p_rate_micro: number;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_currency: string;
              p_id: string;
              p_lightning_seen: boolean;
              p_onchain_settled: boolean;
              p_order_id: string;
              p_paid_sats: number;
            };
            Returns: Json;
          };
      btcpay_fail_payout: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
      };
      btcpay_mark_queued: { Args: { p_id: string }; Returns: undefined };
      btcpay_note_deposit_regression: {
        Args: { p_id: string; p_outputs: Json };
        Returns: Json;
      };
      btcpay_note_payout_txid: {
        Args: { p_id: string; p_txid: string };
        Returns: undefined;
      };
      btcpay_request_payout:
        | {
            Args: { p_address: string; p_usd_cents: number; p_user: string };
            Returns: Json;
          }
        | {
            Args: {
              p_address: string;
              p_quote_expires_at: string;
              p_quote_sats: number;
              p_rate_micro: number;
              p_usd_cents: number;
              p_user: string;
            };
            Returns: Json;
          };
      btcpay_settle_payout: {
        Args: { p_id: string; p_state: string };
        Returns: undefined;
      };
      chat_heartbeat: { Args: never; Returns: number };
      chat_send: {
        Args: {
          p_game: string;
          p_message: string;
          p_reason: string;
          p_severity: string;
          p_user: string;
        };
        Returns: Json;
      };
      chat_set_restriction: {
        Args: {
          p_banned: boolean;
          p_moderator: string;
          p_muted_until: string;
          p_reason: string;
          p_user: string;
        };
        Returns: Json;
      };
      chat_set_status: {
        Args: {
          p_message: string;
          p_moderator: string;
          p_reason: string;
          p_status: string;
        };
        Returns: Json;
      };
      claim_test_credits:
        { Args: never; Returns: Json } | { Args: { p_user: string }; Returns: Json };
      coinflip_advance: { Args: { p_game_id: number }; Returns: string };
      coinflip_cancel: { Args: { p_game_id: number }; Returns: Json };
      coinflip_create: {
        Args: {
          p_amount: number;
          p_idempotency_key: string;
          p_side: Database["public"]["Enums"]["coin_side"];
        };
        Returns: Json;
      };
      coinflip_join: {
        Args: { p_game_id: number; p_idempotency_key: string };
        Returns: Json;
      };
      coinflip_outcome: {
        Args: { p_draw_version: number; p_game_id: number; p_seed: string };
        Returns: Record<string, unknown>;
      };
      coinflip_tick: { Args: never; Returns: Json };
      crypto_admin_overview: { Args: { p_admin: string }; Returns: Json };
      crypto_admin_review: {
        Args: { p_admin: string; p_approve: boolean; p_id: string };
        Returns: Json;
      };
      crypto_admin_set_min_reserve: {
        Args: {
          p_admin: string;
          p_asset: string;
          p_network: string;
          p_units: number;
        };
        Returns: Json;
      };
      crypto_admin_set_switches: {
        Args: {
          p_admin: string;
          p_deposits: boolean;
          p_system: boolean;
          p_withdrawals: boolean;
        };
        Returns: Json;
      };
      crypto_admin_treasury: { Args: { p_admin: string }; Returns: Json };
      crypto_cancel_withdrawal: {
        Args: { p_id: string; p_user: string };
        Returns: Json;
      };
      crypto_cap_row_cents: {
        Args: {
          p_cents: number;
          p_created: string;
          p_status: string;
          p_table: string;
        };
        Returns: number;
      };
      crypto_claim_global_daily: {
        Args: { p_usd_cents: number };
        Returns: undefined;
      };
      crypto_credit_deposit:
        | { Args: { p_id: string; p_price_snapshot: string }; Returns: Json }
        | {
            Args: {
              p_block_hash: string;
              p_id: string;
              p_price_snapshot: string;
            };
            Returns: Json;
          };
      crypto_get_cursor: { Args: { p_chain: number }; Returns: number };
      crypto_get_eth_cursor: { Args: { p_chain: number }; Returns: number };
      crypto_invoke_cron: { Args: { p_path: string }; Returns: number };
      crypto_my_activity: { Args: { p_user: string }; Returns: Json };
      crypto_next_withdrawals:
        | {
            Args: never;
            Returns: {
              asset_key: string;
              attempts: number;
              chain_id: number;
              closed_at: string | null;
              confirmed_at: string | null;
              created_at: string;
              fee_usd_cents: number;
              hold_ledger_tx_id: string | null;
              id: string;
              last_error: string | null;
              nonce: number | null;
              quote_id: string | null;
              release_ledger_tx_id: string | null;
              review_required: boolean;
              reviewed_at: string | null;
              reviewed_by: string | null;
              settle_ledger_tx_id: string | null;
              signed_raw_tx: string | null;
              status: string;
              submitted_at: string | null;
              to_address: string;
              tx_hash: string | null;
              units: number;
              usd_cents: number;
              user_id: string;
            }[];
            SetofOptions: {
              from: "*";
              to: "crypto_withdrawals";
              isOneToOne: false;
              isSetofReturn: true;
            };
          }
        | {
            Args: { p_chain: number };
            Returns: {
              asset_key: string;
              attempts: number;
              chain_id: number;
              closed_at: string | null;
              confirmed_at: string | null;
              created_at: string;
              fee_usd_cents: number;
              hold_ledger_tx_id: string | null;
              id: string;
              last_error: string | null;
              nonce: number | null;
              quote_id: string | null;
              release_ledger_tx_id: string | null;
              review_required: boolean;
              reviewed_at: string | null;
              reviewed_by: string | null;
              settle_ledger_tx_id: string | null;
              signed_raw_tx: string | null;
              status: string;
              submitted_at: string | null;
              to_address: string;
              tx_hash: string | null;
              units: number;
              usd_cents: number;
              user_id: string;
            }[];
            SetofOptions: {
              from: "*";
              to: "crypto_withdrawals";
              isOneToOne: false;
              isSetofReturn: true;
            };
          };
      crypto_observe_deposit:
        | {
            Args: {
              p_asset: string;
              p_block: number;
              p_from: string;
              p_log: number;
              p_to: string;
              p_tx: string;
              p_units: number;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_asset: string;
              p_block: number;
              p_chain: number;
              p_from: string;
              p_log: number;
              p_to: string;
              p_tx: string;
              p_units: number;
            };
            Returns: Json;
          };
      crypto_pending_deposits: {
        Args: { p_chain: number; p_max_block: number };
        Returns: {
          asset_key: string;
          block_hash: string | null;
          block_number: number;
          chain_id: number;
          closed_reason: string | null;
          confirmed_at: string | null;
          created_at: string;
          credited_at: string | null;
          detected_at: string;
          from_address: string;
          id: string;
          ledger_tx_id: string | null;
          log_index: number;
          price_snapshot_id: string | null;
          status: string;
          to_address: string;
          tx_hash: string;
          units: number;
          usd_cents: number;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "crypto_deposits";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      crypto_quote_withdrawal:
        | {
            Args: { p_chain: number; p_usd_cents: number; p_user: string };
            Returns: Json;
          }
        | { Args: { p_usd_cents: number; p_user: string }; Returns: Json };
      crypto_raise_incident: {
        Args: { p_check: string; p_details: Json; p_fp: string };
        Returns: undefined;
      };
      crypto_reconcile: {
        Args: { p_details: Json; p_onchain_cents: number };
        Returns: Json;
      };
      crypto_record_inventory: {
        Args: {
          p_chain: number;
          p_deposit_usdc: number;
          p_deposit_wei: number;
          p_hot_key_matches: boolean;
          p_payout_usdc: number;
          p_payout_wei: number;
          p_price_micro: number;
          p_price_ok: boolean;
        };
        Returns: Json;
      };
      crypto_record_price:
        | {
            Args: {
              p_asset: string;
              p_feed: string;
              p_observed: string;
              p_price_micro: number;
              p_round: number;
            };
            Returns: string;
          }
        | {
            Args: {
              p_asset: string;
              p_chain: number;
              p_feed: string;
              p_observed: string;
              p_price_micro: number;
              p_round: number;
            };
            Returns: string;
          }
        | {
            Args: {
              p_asset: string;
              p_chain: number;
              p_feed: string;
              p_observed: string;
              p_oracle_updated: string;
              p_price_micro: number;
              p_round: number;
            };
            Returns: string;
          };
      crypto_request_withdrawal:
        | {
            Args: {
              p_asset: string;
              p_env_ok: boolean;
              p_quote: string;
              p_usd_cents: number;
              p_user: string;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_asset: string;
              p_chain: number;
              p_env_ok: boolean;
              p_quote: string;
              p_usd_cents: number;
              p_user: string;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_asset: string;
              p_chain: number;
              p_env_ok: boolean;
              p_quote: string;
              p_to_address: string;
              p_usd_cents: number;
              p_user: string;
            };
            Returns: Json;
          };
      crypto_run_gate: {
        Args: { p_name: string; p_seconds: number };
        Returns: boolean;
      };
      crypto_set_cursor: {
        Args: { p_block: number; p_chain: number };
        Returns: undefined;
      };
      crypto_set_eth_cursor: {
        Args: { p_block: number; p_chain: number };
        Returns: undefined;
      };
      crypto_verify_job_token: { Args: { p_token: string }; Returns: boolean };
      crypto_withdrawal_broadcast: {
        Args: { p_id: string };
        Returns: undefined;
      };
      crypto_withdrawal_confirmed: {
        Args: { p_id: string };
        Returns: undefined;
      };
      crypto_withdrawal_error: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
      };
      crypto_withdrawal_failed: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
      };
      crypto_withdrawal_liquidity_pending: {
        Args: { p_id: string; p_reason: string };
        Returns: undefined;
      };
      crypto_withdrawal_signed: {
        Args: { p_hash: string; p_id: string; p_nonce: number; p_raw: string };
        Returns: undefined;
      };
      daily_chest_open: { Args: never; Returns: Json };
      daily_chest_status: { Args: never; Returns: Json };
      ensure_profile: {
        Args: { p_age_confirmed: boolean; p_username: string };
        Returns: Json;
      };
      get_my_account_status: { Args: never; Returns: Json };
      get_profile_stats: { Args: { p_user: string }; Returns: Json };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      integrity_check: { Args: never; Returns: Json };
      jackpot_draw_ticket: {
        Args: {
          p_draw_version: number;
          p_game_id: number;
          p_n: number;
          p_seed: string;
        };
        Returns: Record<string, unknown>;
      };
      jackpot_join: {
        Args: { p_amount: number; p_idempotency_key: string };
        Returns: Json;
      };
      jackpot_settle: { Args: { p_game_id: number }; Returns: string };
      jackpot_tick: { Args: never; Returns: Json };
      leaderboard_admin_campaigns: {
        Args: {
          p_limit: number;
          p_offset: number;
          p_search: string;
          p_status: string;
        };
        Returns: Json;
      };
      leaderboard_admin_decide: {
        Args: { p_action: string; p_campaign: string; p_reason: string };
        Returns: Json;
      };
      leaderboard_admin_get: { Args: { p_campaign: string }; Returns: Json };
      leaderboard_admin_save_template: { Args: { p: Json }; Returns: Json };
      leaderboard_admin_templates: { Args: never; Returns: Json };
      leaderboard_apply_prize_wager: {
        Args: { p_game: string; p_source: string; p_user: string };
        Returns: undefined;
      };
      leaderboard_my_access: { Args: never; Returns: Json };
      leaderboard_partner_cancel: {
        Args: { p_campaign: string };
        Returns: Json;
      };
      leaderboard_partner_cohort: { Args: never; Returns: Json };
      leaderboard_partner_duplicate: {
        Args: { p_campaign: string };
        Returns: Json;
      };
      leaderboard_partner_get: { Args: { p_campaign: string }; Returns: Json };
      leaderboard_partner_list: {
        Args: {
          p_limit: number;
          p_offset: number;
          p_sort: string;
          p_status: string;
        };
        Returns: Json;
      };
      leaderboard_partner_save: { Args: { p: Json }; Returns: Json };
      leaderboard_partner_submit: {
        Args: { p_campaign: string };
        Returns: Json;
      };
      leaderboard_partner_templates: { Args: never; Returns: Json };
      leaderboard_prize_restricted_cents: {
        Args: { p_user: string };
        Returns: number;
      };
      leaderboard_public_board: {
        Args: { p_campaign: string; p_limit: number; p_offset: number };
        Returns: Json;
      };
      leaderboard_public_list: { Args: never; Returns: Json };
      leaderboard_public_partner: {
        Args: { p_username: string };
        Returns: Json;
      };
      leaderboard_tick: { Args: never; Returns: Json };
      money_real_invariants: { Args: never; Returns: Json };
      nowpayments_credit_invoice: {
        Args: {
          p_id: string;
          p_invoice_id: string;
          p_order_id: string;
          p_pay_currency: string;
          p_payment_id: string;
          p_price: string;
          p_price_currency: string;
          p_status: string;
        };
        Returns: Json;
      };
      otp_challenge_info: { Args: { p_id: string }; Returns: Json };
      otp_cleanup: { Args: never; Returns: undefined };
      otp_issue: {
        Args: {
          p_digest: string;
          p_email: string;
          p_id: string;
          p_ip_hash: string;
          p_purpose: Database["public"]["Enums"]["otp_purpose"];
          p_request: string;
          p_ua_hash: string;
          p_user: string;
        };
        Returns: Json;
      };
      otp_log: {
        Args: {
          p_challenge: string;
          p_details: Json;
          p_event: string;
          p_purpose: Database["public"]["Enums"]["otp_purpose"];
          p_request: string;
          p_user: string;
        };
        Returns: undefined;
      };
      otp_mark_sent: {
        Args: {
          p_error: string;
          p_id: string;
          p_ok: boolean;
          p_request: string;
        };
        Returns: undefined;
      };
      otp_verify: {
        Args: {
          p_digest: string;
          p_id: string;
          p_purpose: Database["public"]["Enums"]["otp_purpose"];
          p_request: string;
        };
        Returns: Json;
      };
      partner_acquisition_claim: { Args: { p_code: string }; Returns: Json };
      partner_acquisition_mine: { Args: never; Returns: Json };
      partner_acquisition_peek: { Args: { p_code: string }; Returns: Json };
      partner_admin_create_code: {
        Args: {
          p_code: string;
          p_expires: string;
          p_max_claims: number;
          p_reward_cents: number;
          p_user: string;
        };
        Returns: Json;
      };
      partner_admin_detail: {
        Args: { p_from: string; p_to: string; p_user: string };
        Returns: Json;
      };
      partner_admin_list: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
      partner_admin_opponents: {
        Args: { p_from: string; p_to: string; p_user: string };
        Returns: Json;
      };
      partner_admin_release_profit: {
        Args: {
          p_amount_cents: number;
          p_partner: string;
          p_reason: string;
          p_request_id: string;
          p_user: string;
        };
        Returns: Json;
      };
      partner_admin_remove: { Args: { p_user: string }; Returns: Json };
      partner_admin_search: { Args: { p_query: string }; Returns: Json };
      partner_admin_set: {
        Args: { p_commission_bps: number; p_note: string; p_user: string };
        Returns: Json;
      };
      partner_admin_set_leaderboard: {
        Args: { p_enabled: boolean; p_user: string };
        Returns: Json;
      };
      partner_admin_topup: {
        Args: {
          p_amount_cents: number;
          p_note: string;
          p_request_id: string;
          p_user: string;
        };
        Returns: Json;
      };
      partner_profit_status: { Args: never; Returns: Json };
      partner_withdrawal_check: { Args: { p_user: string }; Returns: boolean };
      poker_act: {
        Args: {
          p_action: string;
          p_amount: number;
          p_hand: number;
          p_key: string;
          p_version: number;
        };
        Returns: Json;
      };
      poker_admin_collusion_signals: {
        Args: { p_days?: number; p_limit?: number; p_min_hands?: number };
        Returns: Json;
      };
      poker_admin_recover_settlement: {
        Args: { p_hand: number; p_mode: string; p_reason: string };
        Returns: Json;
      };
      poker_buyin_info: { Args: { p_type: number }; Returns: Json };
      poker_commit_chain: {
        Args: { p_head: string; p_table: number };
        Returns: Json;
      };
      poker_hand_detail: { Args: { p_hand: number }; Returns: Json };
      poker_leave: { Args: { p_table: number }; Returns: Json };
      poker_lobby: { Args: never; Returns: Json };
      poker_nudge: { Args: { p_table: number }; Returns: string };
      poker_reconcile: { Args: never; Returns: Json };
      poker_reveal: { Args: { p_hand: number; p_value: string }; Returns: Json };
      poker_sit: {
        Args: {
          p_buy_in: number;
          p_chain_head: string;
          p_key: string;
          p_seat: number;
          p_table: number;
          p_type: number;
        };
        Returns: Json;
      };
      poker_sit_out: {
        Args: { p_chain_head: string; p_out: boolean; p_table: number };
        Returns: Json;
      };
      poker_table_state: { Args: { p_table: number }; Returns: Json };
      poker_tick: { Args: never; Returns: Json };
      poker_top_up: {
        Args: { p_amount: number; p_table: number };
        Returns: Json;
      };
      poker_worker_health: { Args: never; Returns: Json };
      prestige_award_wager: {
        Args: {
          p_cents: number;
          p_game: string;
          p_meta: Json;
          p_source: string;
          p_user: string;
        };
        Returns: undefined;
      };
      prestige_claim: { Args: { p_reward: string }; Returns: Json };
      prestige_equip: { Args: { p_cosmetic: string }; Returns: Json };
      prestige_identities: { Args: { p_ids: string[] }; Returns: Json };
      prestige_level_for: { Args: { p_xp: number }; Returns: number };
      prestige_state: { Args: never; Returns: Json };
      prestige_sync_user: { Args: { p_user: string }; Returns: undefined };
      prestige_track: { Args: { p_event: string }; Returns: undefined };
      promo_admin_create: {
        Args: {
          p_code: string;
          p_expires: string;
          p_max_claims: number;
          p_reward_cents: number;
        };
        Returns: Json;
      };
      promo_admin_delete: { Args: { p_id: string }; Returns: Json };
      promo_admin_list: { Args: never; Returns: Json };
      promo_admin_update: {
        Args: {
          p_active: boolean;
          p_expires: string;
          p_id: string;
          p_max_claims: number;
          p_touch_expiry: boolean;
        };
        Returns: Json;
      };
      promo_apply_wager: {
        Args: { p_game: string; p_source: string; p_user: string };
        Returns: undefined;
      };
      promo_claim: { Args: { p_code: string }; Returns: Json };
      promo_mine: { Args: never; Returns: Json };
      promo_restricted_cents: { Args: { p_user: string }; Returns: number };
      promo_status: { Args: never; Returns: Json };
      pvp_minute_dispatch: { Args: never; Returns: Json };
      real_play_open: { Args: never; Returns: boolean };
      referral_apply_reward_wager: {
        Args: {
          p_cents: number;
          p_game: string;
          p_source: string;
          p_user: string;
        };
        Returns: undefined;
      };
      referral_claim: { Args: { p_code: string }; Returns: Json };
      referral_create_invite: { Args: never; Returns: Json };
      referral_dashboard: { Args: never; Returns: Json };
      referral_note_play: {
        Args: {
          p_cents: number;
          p_game: string;
          p_source: string;
          p_user: string;
        };
        Returns: undefined;
      };
      referral_peek: { Args: { p_code: string }; Returns: Json };
      referral_progress: { Args: { p_user: string }; Returns: undefined };
      referral_settled_stake: {
        Args: { p_game: string; p_source: string; p_user: string };
        Returns: number;
      };
      referral_terms: { Args: never; Returns: Json };
      referral_try_pay: { Args: { p_id: string }; Returns: undefined };
      referral_unplayed_reward_cents: {
        Args: { p_user: string };
        Returns: number;
      };
      reset_test_credits: { Args: { p_admin: string }; Returns: Json };
      roulette_advance: { Args: { p_game_id: number }; Returns: string };
      roulette_bet: {
        Args: {
          p_amount: number;
          p_color: Database["public"]["Enums"]["roulette_color"];
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      roulette_draw_slot: {
        Args: {
          p_draw_version: number;
          p_game_id: number;
          p_n: number;
          p_seed: string;
        };
        Returns: Record<string, unknown>;
      };
      roulette_integrity_check: { Args: never; Returns: Json };
      roulette_round_bets: { Args: { p_game_id: number }; Returns: Json };
      roulette_tick: { Args: never; Returns: Json };
      seo_game_snapshot: {
        Args: { p_recent?: number; p_window_days?: number };
        Returns: Json;
      };
      server_time: { Args: never; Returns: string };
      settlement_worker_health: { Args: never; Returns: Json };
      signup_rate_check: {
        Args: { p_email_hash: string; p_ip_hash: string };
        Returns: Json;
      };
      signup_verified_claim: { Args: { p_challenge: string }; Returns: Json };
      signup_verified_preview: { Args: { p_challenge: string }; Returns: Json };
      slot_advance: { Args: { p_game_id: number }; Returns: string };
      slot_cancel: { Args: { p_game_id: number }; Returns: Json };
      slot_create: {
        Args: { p_idempotency_key: string; p_stake: number };
        Returns: Json;
      };
      slot_join: {
        Args: { p_game_id: number; p_idempotency_key: string };
        Returns: Json;
      };
      slot_outcome: {
        Args: { p_game_id: number; p_seed: string; p_spin_no: number };
        Returns: Record<string, unknown>;
      };
      slot_score_v1: {
        Args: { p_grid: number[] };
        Returns: Record<string, unknown>;
      };
      slot_spin: {
        Args: {
          p_game_id: number;
          p_idempotency_key: string;
          p_spin_no: number;
        };
        Returns: Json;
      };
      slot_spin_grid: {
        Args: { p_game_id: number; p_seed: string; p_spin_no: number };
        Returns: number[];
      };
      slot_spin_grid_v2: {
        Args: { p_game_id: number; p_seed: string; p_spin_no: number };
        Returns: number[];
      };
      slot_spin_grid_v3: {
        Args: { p_game_id: number; p_seed: string; p_spin_no: number };
        Returns: number[];
      };
      slot_tick: { Args: never; Returns: Json };
      slot_tick_with_poker: { Args: never; Returns: Json };
      treasury_can_fund_cents: {
        Args: { p_asset: string; p_cents: number; p_network: string };
        Returns: boolean;
      };
      treasury_record_btc: {
        Args: { p_price_micro: number; p_sats: number };
        Returns: undefined;
      };
      update_avatar: { Args: { p_avatar_url: string }; Returns: undefined };
      wallet_consume_and_verify: {
        Args: { p_id: string; p_normalized: string; p_user: string };
        Returns: Json;
      };
      wallet_get_challenge: {
        Args: { p_id: string; p_user: string };
        Returns: Json;
      };
      wallet_issue_challenge: {
        Args: { p_address: string; p_user: string };
        Returns: Json;
      };
      wallet_log: {
        Args: { p_details: Json; p_event: string; p_user: string };
        Returns: undefined;
      };
      wallet_touch: {
        Args: { p_address: string; p_user: string };
        Returns: undefined;
      };
    };
    Enums: {
      account_kind:
        | "user_available"
        | "user_locked"
        | "game_escrow"
        | "house_revenue"
        | "test_faucet"
        | "external_custody"
        | "house_bankroll";
      app_role: "admin" | "moderator" | "user";
      coin_side: "HEADS" | "TAILS";
      coinflip_payout_kind: "WINNER" | "REFUND";
      coinflip_status: "WAITING" | "READY" | "FLIPPING" | "SETTLEMENT" | "COMPLETED" | "CANCELLED";
      game_status: "WAITING" | "ACTIVE" | "DRAWING" | "COMPLETED" | "CANCELLED";
      otp_purpose:
        | "SIGNUP_EMAIL_VERIFICATION"
        | "PASSWORD_RESET"
        | "EMAIL_CHANGE"
        | "WITHDRAWAL"
        | "ADMIN_DEVICE";
      otp_status:
        | "PENDING_SEND"
        | "ACTIVE"
        | "CONSUMED"
        | "INVALIDATED"
        | "SUPERSEDED"
        | "EXPIRED"
        | "SEND_FAILED";
      payout_status: "PENDING" | "SETTLED" | "FAILED";
      roulette_bet_status: "ACCEPTED" | "WON" | "LOST" | "REFUNDED";
      roulette_color: "RED" | "BLACK" | "YELLOW" | "GREEN";
      roulette_payout_kind: "WINNER" | "REFUND";
      roulette_status:
        "WAITING" | "BETTING" | "LOCKED" | "SPINNING" | "SETTLEMENT" | "COMPLETED" | "CANCELLED";
      slot_status: "WAITING" | "ACTIVE" | "SETTLEMENT" | "COMPLETED" | "CANCELLED";
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
        | "prestige_reward"
        | "referral_reward"
        | "promo_reward"
        | "slot_entry"
        | "slot_settlement"
        | "slot_refund"
        | "slot_bonus"
        | "partner_credit"
        | "leaderboard_prize"
        | "poker_entry"
        | "poker_hand"
        | "poker_settlement";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

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
        "house_bankroll",
      ],
      app_role: ["admin", "moderator", "user"],
      coin_side: ["HEADS", "TAILS"],
      coinflip_payout_kind: ["WINNER", "REFUND"],
      coinflip_status: ["WAITING", "READY", "FLIPPING", "SETTLEMENT", "COMPLETED", "CANCELLED"],
      game_status: ["WAITING", "ACTIVE", "DRAWING", "COMPLETED", "CANCELLED"],
      otp_purpose: [
        "SIGNUP_EMAIL_VERIFICATION",
        "PASSWORD_RESET",
        "EMAIL_CHANGE",
        "WITHDRAWAL",
        "ADMIN_DEVICE",
      ],
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
      slot_status: ["WAITING", "ACTIVE", "SETTLEMENT", "COMPLETED", "CANCELLED"],
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
        "prestige_reward",
        "referral_reward",
        "promo_reward",
        "slot_entry",
        "slot_settlement",
        "slot_refund",
        "slot_bonus",
        "partner_credit",
        "leaderboard_prize",
        "poker_entry",
        "poker_hand",
        "poker_settlement",
      ],
    },
  },
} as const;
