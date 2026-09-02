export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type AppUserRole = 'ADMIN' | 'USER'
export type AppUserStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED'
export type FormRequestStatus = 'PENDING' | 'SUBMITTED' | 'EXPIRED' | 'REVOKED'
export type SubmissionSource = 'PUBLIC_LINK' | 'INTERNAL'

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> }
export interface Database {
  public: {
    Tables: {
      app_users: Row<{
        id: string
        auth_user_id: string | null
        username: string
        display_name: string
        role: AppUserRole
        status: AppUserStatus
        created_by: string | null
        created_at: string
        updated_at: string
        deleted_at: string | null
      }>
      companies: Row<{
        id: string
        legal_name: string
        nickname: string | null
        cnpj: string
        created_by: string
        updated_by: string
        created_at: string
        updated_at: string
      }>
      expense_items: Row<{
        id: string
        name: string
        sort_order: number
        is_active: boolean
        created_by: string | null
        updated_by: string | null
        created_at: string
        updated_at: string
        deactivated_at: string | null
      }>
      company_expenses: Row<{
        company_id: string
        expense_item_id: string
        is_selected: boolean
        current_amount: string | null
        current_note: string | null
        updated_by: string | null
        updated_from_submission_id: string | null
        created_at: string
        updated_at: string
      }>
      form_content: Row<{
        id: boolean
        title: string
        introduction: string
        ibs_cbs_guidance: string
        tax_notice: string
        success_message: string
        updated_by: string | null
        updated_at: string
      }>
      form_requests: Row<{
        id: string
        company_id: string
        token_digest: string
        status: FormRequestStatus
        expires_at: string
        created_by: string
        created_at: string
        submitted_at: string | null
        revoked_at: string | null
      }>
      form_request_items: Row<{
        form_request_id: string
        expense_item_id: string
        initial_amount: string | null
        initial_note: string | null
        initial_updated_at: string | null
        sort_order: number
      }>
      form_submissions: Row<{
        id: string
        form_request_id: string | null
        company_id: string
        submitted_at: string
        content_snapshot: Json
        source: SubmissionSource
        created_by: string | null
      }>
      submission_items: Row<{
        submission_id: string
        expense_item_id: string
        amount: string | null
        note: string | null
      }>
      submission_revisions: Row<{
        id: string
        submission_id: string
        revision_number: number
        created_by: string
        created_at: string
      }>
      submission_revision_items: Row<{
        revision_id: string
        expense_item_id: string
        amount: string | null
        note: string | null
      }>
      audit_events: Row<{
        id: string
        actor_type: 'INTERNAL_USER' | 'RESPONDENT' | 'SYSTEM'
        actor_app_user_id: string | null
        action: string
        entity_type: string
        entity_id: string | null
        changes: Json
        correlation_id: string
        created_at: string
      }>
    }
    Functions: {
      inspect_expense_item_usage: {
        Args: { p_item_id: string; p_actor: string }
        Returns: { reference_count: number; can_delete: boolean }[]
      }
      delete_or_deactivate_expense_item: {
        Args: { p_item_id: string; p_actor: string; p_expected_action?: string | null }
        Returns: string
      }
      create_internal_submission_transaction: {
        Args: { p_company_id: string; p_actor: string; p_payload: Json }
        Returns: string
      }
      create_submission_revision_transaction: {
        Args: { p_submission_id: string; p_actor: string; p_payload: Json }
        Returns: string
      }
      import_submission_transaction: {
        Args: { p_submission_id: string; p_revision_id: string | null; p_actor: string }
        Returns: string
      }
      create_form_request_transaction: {
        Args: { p_company_id: string; p_token_digest: string; p_actor: string }
        Returns: { request_id: string; expires_at: string }[]
      }
      revoke_form_request_transaction: {
        Args: { p_request_id: string; p_actor: string }
        Returns: string
      }
      submit_form_transaction: {
        Args: { p_token_digest: string; p_payload: Json }
        Returns: string
      }
    }
    Views: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
