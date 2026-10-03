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
      agenda_eventos: {
        Row: {
          atualizado_em: string
          criado_em: string
          data: string
          data_fim: string | null
          descricao: string
          hora_fim: string
          hora_inicio: string
          id: string
          local: string
          status: string
          tipo: string
          usuario_id: string
          valor: number | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data: string
          data_fim?: string | null
          descricao?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          local?: string
          status?: string
          tipo: string
          usuario_id: string
          valor?: number | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data?: string
          data_fim?: string | null
          descricao?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          local?: string
          status?: string
          tipo?: string
          usuario_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_eventos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "app_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      app_usuarios: {
        Row: {
          banda_id: string
          criado_em: string
          id: string
          pode_adicionar_shows: boolean
          pode_agenda: boolean
          pode_apagar: boolean
          pode_backup: boolean
          pode_editar: boolean
          senha_hash: string
          senha_visivel: string
          usuario: string
        }
        Insert: {
          banda_id: string
          criado_em?: string
          id?: string
          pode_adicionar_shows?: boolean
          pode_agenda?: boolean
          pode_apagar?: boolean
          pode_backup?: boolean
          pode_editar?: boolean
          senha_hash: string
          senha_visivel?: string
          usuario: string
        }
        Update: {
          banda_id?: string
          criado_em?: string
          id?: string
          pode_adicionar_shows?: boolean
          pode_agenda?: boolean
          pode_apagar?: boolean
          pode_backup?: boolean
          pode_editar?: boolean
          senha_hash?: string
          senha_visivel?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_usuarios_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: false
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
        ]
      }
      bandas: {
        Row: {
          criado_em: string
          id: string
          keygen: string
          nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          keygen: string
          nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          keygen?: string
          nome?: string
        }
        Relationships: []
      }
      contratos_configuracoes: {
        Row: { banda_id: string; dados: Json; atualizado_em: string }
        Insert: { banda_id: string; dados?: Json; atualizado_em?: string }
        Update: { banda_id?: string; dados?: Json; atualizado_em?: string }
        Relationships: [{ foreignKeyName: "contratos_configuracoes_banda_id_fkey"; columns: ["banda_id"]; isOneToOne: true; referencedRelation: "bandas"; referencedColumns: ["id"] }]
      }
      contratos_eventos: {
        Row: { id: string; banda_id: string; usuario_id: string; numero: string; ano: number; sequencia: number; versao: number; status: string; dados: Json; pdf_caminho: string | null; pdf_emissao: string | null; criado_em: string; atualizado_em: string }
        Insert: { id?: string; banda_id: string; usuario_id: string; numero: string; ano: number; sequencia: number; versao?: number; status?: string; dados?: Json; pdf_caminho?: string | null; pdf_emissao?: string | null; criado_em?: string; atualizado_em?: string }
        Update: { id?: string; banda_id?: string; usuario_id?: string; numero?: string; ano?: number; sequencia?: number; versao?: number; status?: string; dados?: Json; pdf_caminho?: string | null; pdf_emissao?: string | null; criado_em?: string; atualizado_em?: string }
        Relationships: [
          { foreignKeyName: "contratos_eventos_banda_id_fkey"; columns: ["banda_id"]; isOneToOne: false; referencedRelation: "bandas"; referencedColumns: ["id"] },
          { foreignKeyName: "contratos_eventos_usuario_id_fkey"; columns: ["usuario_id"]; isOneToOne: false; referencedRelation: "app_usuarios"; referencedColumns: ["id"] },
        ]
      }
      contratos_versoes: {
        Row: { id: string; contrato_id: string; banda_id: string; versao: number; dados: Json; pdf_caminho: string; pdf_emissao: string; criado_em: string }
        Insert: { id?: string; contrato_id: string; banda_id: string; versao: number; dados: Json; pdf_caminho: string; pdf_emissao: string; criado_em?: string }
        Update: { id?: string; contrato_id?: string; banda_id?: string; versao?: number; dados?: Json; pdf_caminho?: string; pdf_emissao?: string; criado_em?: string }
        Relationships: [
          { foreignKeyName: "contratos_versoes_contrato_id_fkey"; columns: ["contrato_id"]; isOneToOne: false; referencedRelation: "contratos_eventos"; referencedColumns: ["id"] },
          { foreignKeyName: "contratos_versoes_banda_id_fkey"; columns: ["banda_id"]; isOneToOne: false; referencedRelation: "bandas"; referencedColumns: ["id"] },
        ]
      }
      contratos_historico: {
        Row: { id: string; contrato_id: string; banda_id: string; usuario_id: string; versao: number; status_anterior: string; status_novo: string; criado_em: string }
        Insert: { id?: string; contrato_id: string; banda_id: string; usuario_id: string; versao: number; status_anterior: string; status_novo: string; criado_em?: string }
        Update: { id?: string; contrato_id?: string; banda_id?: string; usuario_id?: string; versao?: number; status_anterior?: string; status_novo?: string; criado_em?: string }
        Relationships: [
          { foreignKeyName: "contratos_historico_contrato_id_fkey"; columns: ["contrato_id"]; isOneToOne: false; referencedRelation: "contratos_eventos"; referencedColumns: ["id"] },
          { foreignKeyName: "contratos_historico_banda_id_fkey"; columns: ["banda_id"]; isOneToOne: false; referencedRelation: "bandas"; referencedColumns: ["id"] },
          { foreignKeyName: "contratos_historico_usuario_id_fkey"; columns: ["usuario_id"]; isOneToOne: false; referencedRelation: "app_usuarios"; referencedColumns: ["id"] },
        ]
      }
      cloud_setlists: {
        Row: {
          atualizado_em: string
          banda_id: string
          criado_em: string
          data: string
          id: string
          local: string
          nome: string
          ordem: number
          setlist_id: string
          song_ids: Json
        }
        Insert: {
          atualizado_em?: string
          banda_id: string
          criado_em?: string
          data?: string
          id?: string
          local?: string
          nome: string
          ordem?: number
          setlist_id: string
          song_ids?: Json
        }
        Update: {
          atualizado_em?: string
          banda_id?: string
          criado_em?: string
          data?: string
          id?: string
          local?: string
          nome?: string
          ordem?: number
          setlist_id?: string
          song_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cloud_setlists_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: false
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_exclusoes: {
        Row: { id: string; banda_id: string; item_id: string; tipo: string; atualizado_em: string }
        Insert: { id?: string; banda_id: string; item_id: string; tipo: string; atualizado_em: string }
        Update: { id?: string; banda_id?: string; item_id?: string; tipo?: string; atualizado_em?: string }
        Relationships: [{ foreignKeyName: "cloud_exclusoes_banda_id_fkey"; columns: ["banda_id"]; isOneToOne: false; referencedRelation: "bandas"; referencedColumns: ["id"] }]
      }
      cloud_songs: {
        Row: {
          anexos: Json
          artista: string
          atualizado_em: string
          banda_id: string
          bpm: string
          criado_em: string
          id: string
          letra: string
          observacoes: string
          ordem: number
          ritmo: string
          song_id: string
          titulo: string
          tom: string
        }
        Insert: {
          anexos?: Json
          artista?: string
          atualizado_em?: string
          banda_id: string
          bpm?: string
          criado_em?: string
          id?: string
          letra?: string
          observacoes?: string
          ordem?: number
          ritmo?: string
          song_id: string
          titulo: string
          tom?: string
        }
        Update: {
          anexos?: Json
          artista?: string
          atualizado_em?: string
          banda_id?: string
          bpm?: string
          criado_em?: string
          id?: string
          letra?: string
          observacoes?: string
          ordem?: number
          ritmo?: string
          song_id?: string
          titulo?: string
          tom?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_songs_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: false
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contratos_proxima_versao: { Args: { p_id: string; p_banda: string; p_usuario: string }; Returns: boolean }
      contratos_registrar_versao: { Args: Record<PropertyKey, never>; Returns: unknown }
      contratos_versoes_imutaveis: { Args: Record<PropertyKey, never>; Returns: unknown }
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
