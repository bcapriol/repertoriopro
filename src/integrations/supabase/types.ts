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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agenda_eventos: {
        Row: {
          atualizado_em: string
          cidade: string
          cliente: string
          consumacao_pessoas: number | null
          consumacao_valor: number | null
          criado_em: string
          data: string
          data_fim: string | null
          descricao: string
          hora_fim: string
          hora_inicio: string
          id: string
          local: string
          mensagem_contratante: string
          status: string
          tipo: string
          tipo_valor: string
          usuario_id: string
          valor: number | null
        }
        Insert: {
          atualizado_em?: string
          cidade?: string
          cliente?: string
          consumacao_pessoas?: number | null
          consumacao_valor?: number | null
          criado_em?: string
          data: string
          data_fim?: string | null
          descricao?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          local?: string
          mensagem_contratante?: string
          status?: string
          tipo: string
          tipo_valor?: string
          usuario_id: string
          valor?: number | null
        }
        Update: {
          atualizado_em?: string
          cidade?: string
          cliente?: string
          consumacao_pessoas?: number | null
          consumacao_valor?: number | null
          criado_em?: string
          data?: string
          data_fim?: string | null
          descricao?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          local?: string
          mensagem_contratante?: string
          status?: string
          tipo?: string
          tipo_valor?: string
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
      agenda_push_aparelhos: {
        Row: {
          assinatura: string
          ativo: boolean
          atualizado_em: string
          token_hash: string
          usuario_id: string
        }
        Insert: {
          assinatura: string
          ativo?: boolean
          atualizado_em?: string
          token_hash: string
          usuario_id: string
        }
        Update: {
          assinatura?: string
          ativo?: boolean
          atualizado_em?: string
          token_hash?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_push_aparelhos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "app_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_push_config: {
        Row: {
          ativo: boolean
          atualizado_em: string
          avisar_dia: boolean
          avisar_vespera: boolean
          banda_id: string
          fuso: string
          hora_dia: string
          hora_vespera: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          avisar_dia?: boolean
          avisar_vespera?: boolean
          banda_id: string
          fuso?: string
          hora_dia?: string
          hora_vespera?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          avisar_dia?: boolean
          avisar_vespera?: boolean
          banda_id?: string
          fuso?: string
          hora_dia?: string
          hora_vespera?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_push_config_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: true
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_push_envios: {
        Row: {
          criado_em: string
          data_show: string
          enviado_em: string | null
          erro: string | null
          estado: string
          evento_id: string
          id: string
          momento: string
          onesignal_id: string | null
          previsto_em: string
          reservado_ate: string | null
          tentativas: number
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          data_show: string
          enviado_em?: string | null
          erro?: string | null
          estado?: string
          evento_id: string
          id?: string
          momento: string
          onesignal_id?: string | null
          previsto_em: string
          reservado_ate?: string | null
          tentativas?: number
          usuario_id: string
        }
        Update: {
          criado_em?: string
          data_show?: string
          enviado_em?: string | null
          erro?: string | null
          estado?: string
          evento_id?: string
          id?: string
          momento?: string
          onesignal_id?: string | null
          previsto_em?: string
          reservado_ate?: string | null
          tentativas?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_push_envios_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "agenda_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_push_envios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "app_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_push_servico: {
        Row: {
          atualizado_em: string
          id: boolean
          ultima_execucao: string | null
          ultimo_erro: string | null
          url: string
        }
        Insert: {
          atualizado_em?: string
          id?: boolean
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          url: string
        }
        Update: {
          atualizado_em?: string
          id?: boolean
          ultima_execucao?: string | null
          ultimo_erro?: string | null
          url?: string
        }
        Relationships: []
      }
      agenda_push_usuarios: {
        Row: {
          ativo: boolean
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_push_usuarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
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
          pode_copiar_mensagens_shows: boolean
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
          pode_copiar_mensagens_shows?: boolean
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
          pode_copiar_mensagens_shows?: boolean
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
      cloud_exclusoes: {
        Row: {
          atualizado_em: string
          banda_id: string
          id: string
          item_id: string
          tipo: string
        }
        Insert: {
          atualizado_em: string
          banda_id: string
          id?: string
          item_id: string
          tipo: string
        }
        Update: {
          atualizado_em?: string
          banda_id?: string
          id?: string
          item_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_exclusoes_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: false
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
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
      contratos_configuracoes: {
        Row: {
          atualizado_em: string
          banda_id: string
          dados: Json
        }
        Insert: {
          atualizado_em?: string
          banda_id: string
          dados?: Json
        }
        Update: {
          atualizado_em?: string
          banda_id?: string
          dados?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contratos_configuracoes_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: true
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_eventos: {
        Row: {
          ano: number
          atualizado_em: string
          banda_id: string
          criado_em: string
          dados: Json
          id: string
          numero: string
          pdf_caminho: string | null
          pdf_emissao: string | null
          sequencia: number
          status: string
          usuario_id: string
          versao: number
        }
        Insert: {
          ano: number
          atualizado_em?: string
          banda_id: string
          criado_em?: string
          dados?: Json
          id?: string
          numero: string
          pdf_caminho?: string | null
          pdf_emissao?: string | null
          sequencia: number
          status?: string
          usuario_id: string
          versao?: number
        }
        Update: {
          ano?: number
          atualizado_em?: string
          banda_id?: string
          criado_em?: string
          dados?: Json
          id?: string
          numero?: string
          pdf_caminho?: string | null
          pdf_emissao?: string | null
          sequencia?: number
          status?: string
          usuario_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_eventos_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: false
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_eventos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "app_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_historico: {
        Row: {
          banda_id: string
          contrato_id: string
          criado_em: string
          id: string
          status_anterior: string
          status_novo: string
          usuario_id: string
          versao: number
        }
        Insert: {
          banda_id: string
          contrato_id: string
          criado_em?: string
          id?: string
          status_anterior: string
          status_novo: string
          usuario_id: string
          versao: number
        }
        Update: {
          banda_id?: string
          contrato_id?: string
          criado_em?: string
          id?: string
          status_anterior?: string
          status_novo?: string
          usuario_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_historico_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: false
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_historico_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "app_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_versoes: {
        Row: {
          banda_id: string
          contrato_id: string
          criado_em: string
          dados: Json
          id: string
          pdf_caminho: string
          pdf_emissao: string
          versao: number
        }
        Insert: {
          banda_id: string
          contrato_id: string
          criado_em?: string
          dados: Json
          id?: string
          pdf_caminho: string
          pdf_emissao: string
          versao: number
        }
        Update: {
          banda_id?: string
          contrato_id?: string
          criado_em?: string
          dados?: Json
          id?: string
          pdf_caminho?: string
          pdf_emissao?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_versoes_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: false
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_versoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      presencas_online: {
        Row: {
          banda_id: string
          sessao_id: string
          usuario_id: string
          visto_em: string
        }
        Insert: {
          banda_id: string
          sessao_id: string
          usuario_id: string
          visto_em?: string
        }
        Update: {
          banda_id?: string
          sessao_id?: string
          usuario_id?: string
          visto_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "presencas_online_banda_id_fkey"
            columns: ["banda_id"]
            isOneToOne: false
            referencedRelation: "bandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_online_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "app_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agenda_push_configurar: {
        Args: { p_token: string; p_url: string }
        Returns: boolean
      }
      agenda_push_disparar: { Args: never; Returns: undefined }
      agenda_push_pendentes: {
        Args: never
        Returns: {
          criado_em: string
          data_show: string
          enviado_em: string | null
          erro: string | null
          estado: string
          evento_id: string
          id: string
          momento: string
          onesignal_id: string | null
          previsto_em: string
          reservado_ate: string | null
          tentativas: number
          usuario_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "agenda_push_envios"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      agenda_push_status: { Args: never; Returns: Json }
      contratos_proxima_versao: {
        Args: { p_banda: string; p_id: string; p_usuario: string }
        Returns: boolean
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
