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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      article_feedback: {
        Row: {
          article_id: string
          created_at: string
          value: number
          voter_key: string
        }
        Insert: {
          article_id: string
          created_at?: string
          value: number
          voter_key: string
        }
        Update: {
          article_id?: string
          created_at?: string
          value?: number
          voter_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          body_md: string
          cover_image_url: string | null
          fact_status: string | null
          helpful_down: number
          helpful_up: number
          id: string
          pipeline_ran_at: string | null
          published_at: string | null
          search: unknown
          slug: string
          sources: Json
          spoiler_level: string
          status: string
          summary: string | null
          tags: string[]
          title: string
          type: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          body_md?: string
          cover_image_url?: string | null
          fact_status?: string | null
          helpful_down?: number
          helpful_up?: number
          id?: string
          pipeline_ran_at?: string | null
          published_at?: string | null
          search?: unknown
          slug: string
          sources?: Json
          spoiler_level?: string
          status?: string
          summary?: string | null
          tags?: string[]
          title: string
          type: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          body_md?: string
          cover_image_url?: string | null
          fact_status?: string | null
          helpful_down?: number
          helpful_up?: number
          id?: string
          pipeline_ran_at?: string | null
          published_at?: string | null
          search?: unknown
          slug?: string
          sources?: Json
          spoiler_level?: string
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string
          type?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_logs: {
        Row: {
          anon_hash: string | null
          answer: string | null
          chunk_ids: number[]
          created_at: string
          feedback: number | null
          id: number
          include_spoilers: boolean
          input_tokens: number | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          question: string
          top_score: number | null
          user_id: string | null
        }
        Insert: {
          anon_hash?: string | null
          answer?: string | null
          chunk_ids?: number[]
          created_at?: string
          feedback?: number | null
          id?: never
          include_spoilers?: boolean
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          question: string
          top_score?: number | null
          user_id?: string | null
        }
        Update: {
          anon_hash?: string | null
          answer?: string | null
          chunk_ids?: number[]
          created_at?: string
          feedback?: number | null
          id?: never
          include_spoilers?: boolean
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          question?: string
          top_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ask_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_weekly: {
        Row: {
          clip_ids: number[]
          created_at: string
          week: string
        }
        Insert: {
          clip_ids?: number[]
          created_at?: string
          week: string
        }
        Update: {
          clip_ids?: number[]
          created_at?: string
          week?: string
        }
        Relationships: []
      }
      clips: {
        Row: {
          approved_at: string | null
          caption: string | null
          category: string
          created_at: string
          creator_name: string | null
          creator_url: string | null
          duration_sec: number | null
          external_id: string
          id: number
          platform: string
          reject_reason: string | null
          score: number
          source: string
          status: string
          submitted_by: string | null
          thumbnail_url: string | null
          title: string
          url: string
          views_on_platform: number | null
        }
        Insert: {
          approved_at?: string | null
          caption?: string | null
          category?: string
          created_at?: string
          creator_name?: string | null
          creator_url?: string | null
          duration_sec?: number | null
          external_id: string
          id?: never
          platform: string
          reject_reason?: string | null
          score?: number
          source?: string
          status?: string
          submitted_by?: string | null
          thumbnail_url?: string | null
          title: string
          url: string
          views_on_platform?: number | null
        }
        Update: {
          approved_at?: string | null
          caption?: string | null
          category?: string
          created_at?: string
          creator_name?: string | null
          creator_url?: string | null
          duration_sec?: number | null
          external_id?: string
          id?: never
          platform?: string
          reject_reason?: string | null
          score?: number
          source?: string
          status?: string
          submitted_by?: string | null
          thumbnail_url?: string | null
          title?: string
          url?: string
          views_on_platform?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clips_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clips_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          description: string | null
          id: number
          is_locked: boolean
          is_qa: boolean
          name: string
          slug: string
          sort_order: number
          spoilers_allowed: boolean
        }
        Insert: {
          description?: string | null
          id?: number
          is_locked?: boolean
          is_qa?: boolean
          name: string
          slug: string
          sort_order?: number
          spoilers_allowed?: boolean
        }
        Update: {
          description?: string | null
          id?: number
          is_locked?: boolean
          is_qa?: boolean
          name?: string
          slug?: string
          sort_order?: number
          spoilers_allowed?: boolean
        }
        Relationships: []
      }
      ingest_runs: {
        Row: {
          chunks_upserted: number
          errors: Json
          finished_at: string | null
          id: number
          pages_changed: number
          pages_seen: number
          source_id: string
          started_at: string
        }
        Insert: {
          chunks_upserted?: number
          errors?: Json
          finished_at?: string | null
          id?: never
          pages_changed?: number
          pages_seen?: number
          source_id: string
          started_at?: string
        }
        Update: {
          chunks_upserted?: number
          errors?: Json
          finished_at?: string | null
          id?: never
          pages_changed?: number
          pages_seen?: number
          source_id?: string
          started_at?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          attribution: string | null
          chunk_index: number
          content: string
          embedding: string | null
          id: number
          is_spoiler: boolean
          license: string | null
          section: string | null
          source_ref: string
          source_type: string
          title: string | null
          tsv: unknown
          updated_at: string
          url: string | null
        }
        Insert: {
          attribution?: string | null
          chunk_index?: number
          content: string
          embedding?: string | null
          id?: never
          is_spoiler?: boolean
          license?: string | null
          section?: string | null
          source_ref: string
          source_type: string
          title?: string | null
          tsv?: unknown
          updated_at?: string
          url?: string | null
        }
        Update: {
          attribution?: string | null
          chunk_index?: number
          content?: string
          embedding?: string | null
          id?: never
          is_spoiler?: boolean
          license?: string | null
          section?: string | null
          source_ref?: string
          source_type?: string
          title?: string | null
          tsv?: unknown
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          id: number
          labels: string[]
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          id?: never
          labels?: string[]
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          id?: never
          labels?: string[]
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirm_sent_at: string | null
          confirm_token: string | null
          confirmed_at: string | null
          created_at: string
          email: string
          id: number
          lists: string[]
          pending_lists: string[]
          status: string
        }
        Insert: {
          confirm_sent_at?: string | null
          confirm_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: never
          lists?: string[]
          pending_lists?: string[]
          status?: string
        }
        Update: {
          confirm_sent_at?: string | null
          confirm_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: never
          lists?: string[]
          pending_lists?: string[]
          status?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          emailed_at: string | null
          id: number
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emailed_at?: string | null
          id?: never
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          emailed_at?: string | null
          id?: never
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          ai_sources: Json | null
          author_id: string | null
          body_md: string
          created_at: string
          edited_at: string | null
          id: number
          is_ai: boolean
          reply_to_post_id: number | null
          score: number
          status: string
          thread_id: number
        }
        Insert: {
          ai_sources?: Json | null
          author_id?: string | null
          body_md: string
          created_at?: string
          edited_at?: string | null
          id?: never
          is_ai?: boolean
          reply_to_post_id?: number | null
          score?: number
          status?: string
          thread_id: number
        }
        Update: {
          ai_sources?: Json | null
          author_id?: string | null
          body_md?: string
          created_at?: string
          edited_at?: string | null
          id?: never
          is_ai?: boolean
          reply_to_post_id?: number | null
          score?: number
          status?: string
          thread_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_reply_to_post_id_fkey"
            columns: ["reply_to_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_confirmed_at: string
          avatar_url: string | null
          banned_until: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_banned: boolean
          notify_email_replies: boolean
          platform: string | null
          reputation: number
          role: string
          terms_accepted_at: string
          username: string
        }
        Insert: {
          age_confirmed_at: string
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_banned?: boolean
          notify_email_replies?: boolean
          platform?: string | null
          reputation?: number
          role?: string
          terms_accepted_at: string
          username: string
        }
        Update: {
          age_confirmed_at?: string
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean
          notify_email_replies?: boolean
          platform?: string | null
          reputation?: number
          role?: string
          terms_accepted_at?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: number
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: never
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: never
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_usernames: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tags: {
        Row: {
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      threads: {
        Row: {
          accepted_post_id: number | null
          author_id: string | null
          body_md: string
          category_id: number
          created_at: string
          edited_at: string | null
          excerpt: string | null
          id: number
          is_spoiler: boolean
          last_activity_at: string
          reply_count: number
          score: number
          search: unknown
          slug: string
          status: string
          tags: string[]
          title: string
        }
        Insert: {
          accepted_post_id?: number | null
          author_id?: string | null
          body_md: string
          category_id: number
          created_at?: string
          edited_at?: string | null
          excerpt?: string | null
          id?: never
          is_spoiler?: boolean
          last_activity_at?: string
          reply_count?: number
          score?: number
          search?: unknown
          slug: string
          status?: string
          tags?: string[]
          title: string
        }
        Update: {
          accepted_post_id?: number | null
          author_id?: string | null
          body_md?: string
          category_id?: number
          created_at?: string
          edited_at?: string | null
          excerpt?: string | null
          id?: never
          is_spoiler?: boolean
          last_activity_at?: string
          reply_count?: number
          score?: number
          search?: unknown
          slug?: string
          status?: string
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_accepted_post_fk"
            columns: ["accepted_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          target_id: number
          target_type: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          target_id: number
          target_type: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          target_id?: number
          target_type?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_pages: {
        Row: {
          content_text: string | null
          fetched_at: string | null
          id: number
          is_spoiler: boolean
          license: string | null
          page_id: number
          revision_id: number | null
          source_id: string
          title: string
          url: string
        }
        Insert: {
          content_text?: string | null
          fetched_at?: string | null
          id?: never
          is_spoiler?: boolean
          license?: string | null
          page_id: number
          revision_id?: number | null
          source_id: string
          title: string
          url: string
        }
        Update: {
          content_text?: string | null
          fetched_at?: string | null
          id?: never
          is_spoiler?: boolean
          license?: string | null
          page_id?: number
          revision_id?: number | null
          source_id?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          platform: string | null
          reputation: number | null
          role: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          platform?: string | null
          reputation?: number | null
          role?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          platform?: string | null
          reputation?: number | null
          role?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_profile: {
        Args: never
        Returns: {
          age_confirmed_at: string
          avatar_url: string
          banned_until: string
          bio: string
          created_at: string
          display_name: string
          id: string
          is_banned: boolean
          notify_email_replies: boolean
          platform: string
          reputation: number
          role: string
          terms_accepted_at: string
          username: string
        }[]
      }
      hot_clips: {
        Args: { p_category?: string; p_limit?: number; p_offset?: number }
        Returns: {
          approved_at: string | null
          caption: string | null
          category: string
          created_at: string
          creator_name: string | null
          creator_url: string | null
          duration_sec: number | null
          external_id: string
          id: number
          platform: string
          reject_reason: string | null
          score: number
          source: string
          status: string
          submitted_by: string | null
          thumbnail_url: string | null
          title: string
          url: string
          views_on_platform: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clips"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      hot_rank: {
        Args: { p_created_at: string; p_score: number }
        Returns: number
      }
      hot_threads: {
        Args: { p_category_id?: number; p_cursor?: number; p_limit?: number }
        Returns: {
          accepted_post_id: number | null
          author_id: string | null
          body_md: string
          category_id: number
          created_at: string
          edited_at: string | null
          excerpt: string | null
          id: number
          is_spoiler: boolean
          last_activity_at: string
          reply_count: number
          score: number
          search: unknown
          slug: string
          status: string
          tags: string[]
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "threads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      match_chunks: {
        Args: {
          include_spoilers?: boolean
          match_count?: number
          query_embedding: string
        }
        Returns: {
          attribution: string
          content: string
          id: number
          is_spoiler: boolean
          license: string
          section: string
          similarity: number
          source_ref: string
          source_type: string
          title: string
          url: string
        }[]
      }
      search_chunks_fts: {
        Args: { include_spoilers?: boolean; match_count?: number; q: string }
        Returns: {
          attribution: string
          content: string
          id: number
          is_spoiler: boolean
          license: string
          rank: number
          section: string
          source_ref: string
          source_type: string
          title: string
          url: string
        }[]
      }
      set_seed_admin: { Args: { p_email: string }; Returns: boolean }
      similar_threads: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          id: number
          reply_count: number
          similarity: number
          slug: string
          status: string
          title: string
        }[]
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
    Enums: {},
  },
} as const
