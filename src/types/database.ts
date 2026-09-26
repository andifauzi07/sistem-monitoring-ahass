// Tipe ditulis manual mengikuti supabase/migrations/0001_init_schema.sql dan 0002_kelola_service.sql.
// Bentuknya sama dengan hasil `supabase gen types typescript`, jadi bisa diganti langsung nanti.

export const STATUS_SERVIS = [
  'Menunggu Antrian',
  'Diperiksa',
  'Dikerjakan',
  'Selesai Dikerjakan',
  'Sudah Diambil',
] as const

export type StatusServis = (typeof STATUS_SERVIS)[number]

type Timestamp = string

export type Database = {
  public: {
    Tables: {
      service_advisors: {
        Row: {
          id: string
          nama: string
          email: string
          created_at: Timestamp
        }
        Insert: {
          id: string
          nama: string
          email: string
          created_at?: Timestamp
        }
        Update: {
          id?: string
          nama?: string
          email?: string
          created_at?: Timestamp
        }
        Relationships: []
      }
      mekanik: {
        Row: {
          id: string
          nama: string
          status_hadir: boolean
          is_active: boolean
          created_at: Timestamp
        }
        Insert: {
          id?: string
          nama: string
          status_hadir?: boolean
          is_active?: boolean
          created_at?: Timestamp
        }
        Update: {
          id?: string
          nama?: string
          status_hadir?: boolean
          is_active?: boolean
          created_at?: Timestamp
        }
        Relationships: []
      }
      pelanggan: {
        Row: {
          id: string
          nama_pembawa: string
          nomor_polisi: string
          nomor_wa: string
          created_at: Timestamp
        }
        Insert: {
          id?: string
          nama_pembawa: string
          nomor_polisi: string
          nomor_wa: string
          created_at?: Timestamp
        }
        Update: {
          id?: string
          nama_pembawa?: string
          nomor_polisi?: string
          nomor_wa?: string
          created_at?: Timestamp
        }
        Relationships: []
      }
      layanan_service: {
        Row: {
          id: string
          nomor_polisi: string
          nama_pembawa: string
          nomor_wa: string
          jenis_motor: string
          kilometer: number
          masalah: string
          status: StatusServis
          service_advisor_id: string
          pelanggan_id: string
          mekanik_id: string | null
          tanggal_masuk: Timestamp
          tanggal_selesai: Timestamp | null
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id?: string
          nomor_polisi: string
          nama_pembawa: string
          nomor_wa: string
          jenis_motor: string
          kilometer: number
          masalah: string
          status?: StatusServis
          service_advisor_id: string
          pelanggan_id: string
          mekanik_id?: string | null
          tanggal_masuk?: Timestamp
          tanggal_selesai?: Timestamp | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          nomor_polisi?: string
          nama_pembawa?: string
          nomor_wa?: string
          jenis_motor?: string
          kilometer?: number
          masalah?: string
          status?: StatusServis
          service_advisor_id?: string
          pelanggan_id?: string
          mekanik_id?: string | null
          tanggal_masuk?: Timestamp
          tanggal_selesai?: Timestamp | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Relationships: [
          {
            foreignKeyName: 'layanan_service_service_advisor_id_fkey'
            columns: ['service_advisor_id']
            isOneToOne: false
            referencedRelation: 'service_advisors'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'layanan_service_pelanggan_id_fkey'
            columns: ['pelanggan_id']
            isOneToOne: false
            referencedRelation: 'pelanggan'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'layanan_service_mekanik_id_fkey'
            columns: ['mekanik_id']
            isOneToOne: false
            referencedRelation: 'mekanik'
            referencedColumns: ['id']
          },
        ]
      }
      riwayat_status: {
        Row: {
          id: string
          layanan_service_id: string
          status_baru: StatusServis
          diubah_oleh: string | null
          waktu: Timestamp
        }
        Insert: {
          id?: string
          layanan_service_id: string
          status_baru: StatusServis
          diubah_oleh?: string | null
          waktu?: Timestamp
        }
        Update: {
          id?: string
          layanan_service_id?: string
          status_baru?: StatusServis
          diubah_oleh?: string | null
          waktu?: Timestamp
        }
        Relationships: [
          {
            foreignKeyName: 'riwayat_status_layanan_service_id_fkey'
            columns: ['layanan_service_id']
            isOneToOne: false
            referencedRelation: 'layanan_service'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'riwayat_status_diubah_oleh_fkey'
            columns: ['diubah_oleh']
            isOneToOne: false
            referencedRelation: 'service_advisors'
            referencedColumns: ['id']
          },
        ]
      }
      riwayat_penugasan_mekanik: {
        Row: {
          id: string
          layanan_service_id: string
          mekanik_id: string
          ditugaskan_oleh: string | null
          waktu: Timestamp
        }
        Insert: {
          id?: string
          layanan_service_id: string
          mekanik_id: string
          ditugaskan_oleh?: string | null
          waktu?: Timestamp
        }
        Update: {
          id?: string
          layanan_service_id?: string
          mekanik_id?: string
          ditugaskan_oleh?: string | null
          waktu?: Timestamp
        }
        Relationships: [
          {
            foreignKeyName: 'riwayat_penugasan_mekanik_layanan_service_id_fkey'
            columns: ['layanan_service_id']
            isOneToOne: false
            referencedRelation: 'layanan_service'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'riwayat_penugasan_mekanik_mekanik_id_fkey'
            columns: ['mekanik_id']
            isOneToOne: false
            referencedRelation: 'mekanik'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'riwayat_penugasan_mekanik_ditugaskan_oleh_fkey'
            columns: ['ditugaskan_oleh']
            isOneToOne: false
            referencedRelation: 'service_advisors'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      cek_status: {
        Args: { nopol: string }
        Returns: {
          nomor_polisi: string
          jenis_motor: string
          status: StatusServis
          tanggal_masuk: Timestamp
          tanggal_selesai: Timestamp | null
        }[]
      }
      normalize_nopol: {
        Args: { nopol: string }
        Returns: string
      }
      bersihkan_input_servis: {
        Args: {
          p_nomor_polisi: string
          p_nama_pembawa: string
          p_nomor_wa: string
          p_jenis_motor: string
          p_kilometer: number
          p_masalah: string
        }
        Returns: {
          nomor_polisi: string
          nama_pembawa: string
          nomor_wa: string
          jenis_motor: string
          kilometer: number
          masalah: string
        }
      }
      daftar_servis: {
        Args: {
          p_nomor_polisi: string
          p_nama_pembawa: string
          p_nomor_wa: string
          p_jenis_motor: string
          p_kilometer: number
          p_masalah: string
        }
        Returns: string
      }
      ubah_servis: {
        Args: {
          p_id: string
          p_nomor_polisi: string
          p_nama_pembawa: string
          p_nomor_wa: string
          p_jenis_motor: string
          p_kilometer: number
          p_masalah: string
        }
        Returns: undefined
      }
      hapus_servis: {
        Args: { p_id: string }
        Returns: undefined
      }
    }
    Enums: {
      status_servis: StatusServis
    }
    CompositeTypes: Record<never, never>
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type HasilCekStatus = PublicSchema['Functions']['cek_status']['Returns'][number]
