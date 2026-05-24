export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      reviews: {
        Row: {
          id: string
          slug: string
          status: 'draft' | 'published'
          product: string
          category: string
          marketplace: string
          price_old: string
          price_new: string
          affiliate_url: string
          image_url: string
          ads_enabled: boolean
          meta_title: string
          meta_description: string
          meta_keywords: string
          meta_reading_time: number
          meta_canonical: string | null
          meta_og_image: string | null
          hero_headline_line1: string
          hero_headline_line2: string
          hero_headline_em: string
          hero_lead: string
          hero_overall_score: number
          hero_bars: Json
          specs: Json
          sections: Json
          compare_table: Json
          pros: string[]
          cons: string[]
          testimonials: Json
          verdict_score: number
          verdict_label: string
          verdict_text: string
          verdict_note: string
          schema_rating_value: number
          schema_review_count: number
          google_rank: number | null
          last_rank_check: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          status: 'draft' | 'published'
          product: string
          category: string
          marketplace: string
          price_old: string
          price_new: string
          affiliate_url: string
          image_url: string
          ads_enabled?: boolean
          meta_title: string
          meta_description: string
          meta_keywords: string
          meta_reading_time: number
          meta_canonical?: string | null
          meta_og_image?: string | null
          hero_headline_line1: string
          hero_headline_line2: string
          hero_headline_em: string
          hero_lead: string
          hero_overall_score: number
          hero_bars?: Json
          specs?: Json
          sections?: Json
          compare_table?: Json
          pros?: string[]
          cons?: string[]
          testimonials?: Json
          verdict_score: number
          verdict_label: string
          verdict_text: string
          verdict_note: string
          schema_rating_value: number
          schema_review_count: number
          google_rank?: number | null
          last_rank_check?: string | null
        }
        Update: {
          id?: string
          slug?: string
          status?: 'draft' | 'published'
          product?: string
          category?: string
          marketplace?: string
          price_old?: string
          price_new?: string
          affiliate_url?: string
          image_url?: string
          ads_enabled?: boolean
          meta_title?: string
          meta_description?: string
          meta_keywords?: string
          meta_reading_time?: number
          meta_canonical?: string | null
          meta_og_image?: string | null
          hero_headline_line1?: string
          hero_headline_line2?: string
          hero_headline_em?: string
          hero_lead?: string
          hero_overall_score?: number
          hero_bars?: Json
          specs?: Json
          sections?: Json
          compare_table?: Json
          pros?: string[]
          cons?: string[]
          testimonials?: Json
          verdict_score?: number
          verdict_label?: string
          verdict_text?: string
          verdict_note?: string
          schema_rating_value?: number
          schema_review_count?: number
          google_rank?: number | null
          last_rank_check?: string | null
        }
      }
    }
    Views: {}
    Functions: {
      get_published_reviews: {
        Args: Record<string, never>
        Returns: {
          id: string
          slug: string
          status: string
          product: string
          category: string
          meta_title: string
          meta_description: string
          meta_reading_time: number
          hero_overall_score: number
          ads_enabled: boolean
          created_at: string
          updated_at: string
          google_rank: number | null
          last_rank_check: string | null
        }[]
      }
      get_review_by_slug: {
        Args: { slug_param: string }
        Returns: Database['public']['Tables']['reviews']['Row'][]
      }
    }
    Enums: {}
  }
}
