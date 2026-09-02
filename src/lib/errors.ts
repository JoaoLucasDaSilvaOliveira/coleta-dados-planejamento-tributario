type ErrorWithContext = {
  context?: { status?: unknown }
}

function statusOf(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  const status = (error as ErrorWithContext).context?.status
  return typeof status === 'number' ? status : undefined
}

export function formRequestErrorMessage(error: unknown) {
  switch (statusOf(error)) {
    case 401:
      return 'Sua sessão expirou. Entre novamente para gerar um link.'
    case 405:
      return 'A origem local não está autorizada. Confira ALLOWED_ORIGINS nos secrets do Supabase.'
    case 409:
      return 'Não há despesas selecionadas ou já existe uma solicitação pendente para esta empresa.'
    case 500:
      return 'A configuração do link está incompleta. Confira PUBLIC_APP_URL nos secrets do Supabase.'
    default:
      return 'Não foi possível gerar o link. Tente novamente.'
  }
}

export function userManagementErrorMessage(error: unknown) {
  switch (statusOf(error)) {
    case 400:
      return 'Confira o usuário, nome e senha. O usuário aceita apenas letras, números, ponto, hífen ou sublinhado; a senha deve ter pelo menos 6 caracteres.'
    case 401:
      return 'Sua sessão expirou. Entre novamente para administrar usuários.'
    case 403:
      return 'Você não tem permissão para administrar usuários.'
    case 409:
      return 'Esse nome de usuário já está em uso.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
