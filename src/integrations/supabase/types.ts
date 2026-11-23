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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      acciones_pendientes: {
        Row: {
          chat_id: string
          creada_en: string
          estado: string
          id: string
          payload: Json
          tipo: string
        }
        Insert: {
          chat_id: string
          creada_en?: string
          estado?: string
          id?: string
          payload?: Json
          tipo: string
        }
        Update: {
          chat_id?: string
          creada_en?: string
          estado?: string
          id?: string
          payload?: Json
          tipo?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          created_at: string
          descripcion: string | null
          entrada_url: string | null
          es_proximo: boolean | null
          estado: string
          fecha_cierre: string | null
          fecha_evento: string | null
          fecha_inauguracion: string | null
          fuente_url: string | null
          hora: string | null
          id: string
          imagen_url: string | null
          instagram_url: string | null
          lugar: string
          precio: string | null
          tipo_evento: string | null
          titulo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          entrada_url?: string | null
          es_proximo?: boolean | null
          estado?: string
          fecha_cierre?: string | null
          fecha_evento?: string | null
          fecha_inauguracion?: string | null
          fuente_url?: string | null
          hora?: string | null
          id?: string
          imagen_url?: string | null
          instagram_url?: string | null
          lugar: string
          precio?: string | null
          tipo_evento?: string | null
          titulo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          entrada_url?: string | null
          es_proximo?: boolean | null
          estado?: string
          fecha_cierre?: string | null
          fecha_evento?: string | null
          fecha_inauguracion?: string | null
          fuente_url?: string | null
          hora?: string | null
          id?: string
          imagen_url?: string | null
          instagram_url?: string | null
          lugar?: string
          precio?: string | null
          tipo_evento?: string | null
          titulo?: string
        }
        Relationships: []
      }
      eventos_pendientes: {
        Row: {
          accion: string
          campo_modificado: string | null
          created_at: string | null
          descripcion: string | null
          entrada_url: string | null
          es_proximo: boolean | null
          estado: string
          evento_id: string | null
          fecha_cierre: string | null
          fecha_evento: string | null
          fecha_inauguracion: string | null
          fuente_url: string | null
          hora: string | null
          id: string
          imagen_url: string | null
          instagram_url: string | null
          lugar: string
          precio: string | null
          tipo_evento: string | null
          titulo: string
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          accion: string
          campo_modificado?: string | null
          created_at?: string | null
          descripcion?: string | null
          entrada_url?: string | null
          es_proximo?: boolean | null
          estado?: string
          evento_id?: string | null
          fecha_cierre?: string | null
          fecha_evento?: string | null
          fecha_inauguracion?: string | null
          fuente_url?: string | null
          hora?: string | null
          id?: string
          imagen_url?: string | null
          instagram_url?: string | null
          lugar: string
          precio?: string | null
          tipo_evento?: string | null
          titulo: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          accion?: string
          campo_modificado?: string | null
          created_at?: string | null
          descripcion?: string | null
          entrada_url?: string | null
          es_proximo?: boolean | null
          estado?: string
          evento_id?: string | null
          fecha_cierre?: string | null
          fecha_evento?: string | null
          fecha_inauguracion?: string | null
          fuente_url?: string | null
          hora?: string | null
          id?: string
          imagen_url?: string | null
          instagram_url?: string | null
          lugar?: string
          precio?: string | null
          tipo_evento?: string | null
          titulo?: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_pendientes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_pendientes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_ordenados_popup"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos: {
        Row: {
          autor: string | null
          created_at: string
          id: string
          instagram: string | null
          lugar: string
          url: string
        }
        Insert: {
          autor?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          lugar: string
          url: string
        }
        Update: {
          autor?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          lugar?: string
          url?: string
        }
        Relationships: []
      }
      fuentes_eventos: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          lugar: string
          tipo: string
          url: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          lugar: string
          tipo?: string
          url: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          lugar?: string
          tipo?: string
          url?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          created_at: string | null
          cv_usado: string | null
          descripcion: string | null
          empresa: string
          estado: string | null
          fecha_aplicacion: string | null
          fecha_publicacion: string | null
          id: string
          nota_error: string | null
          titulo: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          cv_usado?: string | null
          descripcion?: string | null
          empresa: string
          estado?: string | null
          fecha_aplicacion?: string | null
          fecha_publicacion?: string | null
          id?: string
          nota_error?: string | null
          titulo: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          cv_usado?: string | null
          descripcion?: string | null
          empresa?: string
          estado?: string | null
          fecha_aplicacion?: string | null
          fecha_publicacion?: string | null
          id?: string
          nota_error?: string | null
          titulo?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      lugares: {
        Row: {
          categoria: string
          categoria_label: string | null
          created_at: string | null
          id: string
          instagram: string | null
          lat: number
          lng: number
          nombre: string
        }
        Insert: {
          categoria: string
          categoria_label?: string | null
          created_at?: string | null
          id?: string
          instagram?: string | null
          lat: number
          lng: number
          nombre: string
        }
        Update: {
          categoria?: string
          categoria_label?: string | null
          created_at?: string | null
          id?: string
          instagram?: string | null
          lat?: number
          lng?: number
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      eventos_ordenados_popup: {
        Row: {
          created_at: string | null
          descripcion: string | null
          entrada_url: string | null
          es_proximo: boolean | null
          fecha_evento: string | null
          fecha_inauguracion: string | null
          fecha_orden: string | null
          fuente_url: string | null
          hora: string | null
          id: string | null
          imagen_url: string | null
          instagram_url: string | null
          lugar: string | null
          orden_categoria: number | null
          precio: string | null
          tipo_evento: string | null
          titulo: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          entrada_url?: string | null
          es_proximo?: boolean | null
          fecha_evento?: string | null
          fecha_inauguracion?: string | null
          fecha_orden?: never
          fuente_url?: string | null
          hora?: string | null
          id?: string | null
          imagen_url?: string | null
          instagram_url?: string | null
          lugar?: string | null
          orden_categoria?: never
          precio?: string | null
          tipo_evento?: string | null
          titulo?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          entrada_url?: string | null
          es_proximo?: boolean | null
          fecha_evento?: string | null
          fecha_inauguracion?: string | null
          fecha_orden?: never
          fuente_url?: string | null
          hora?: string | null
          id?: string | null
          imagen_url?: string | null
          instagram_url?: string | null
          lugar?: string | null
          orden_categoria?: never
          precio?: string | null
          tipo_evento?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
