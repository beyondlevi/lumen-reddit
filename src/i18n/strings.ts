// Every user-facing string lives in this file. English is the default;
// Portuguese (pt-BR copy) is chosen for any `pt-*` browser language, including
// the glasses' pt-PT. Counted strings have `_one` and `_other` forms.

const en = {
  appName: 'Reddit',

  tabHome: 'Home',
  tabPopular: 'Popular',
  tabCommunities: 'Communities',
  tabInbox: 'Inbox',
  sectionsLabel: 'Reddit sections',
  homeFeedLabel: 'Home feed',
  popularFeedLabel: 'Popular posts',
  communitiesLabel: 'Your communities',
  inboxLabel: 'Inbox',

  homeEmptyTitle: 'Nothing here yet',
  homeEmptyBody: 'Posts from the communities you join show up here.',
  feedEmptyTitle: 'No posts',
  feedEmptyBody: 'This feed has no posts right now.',
  communitiesEmptyTitle: 'No communities',
  communitiesEmptyBody: 'Communities you join on Reddit show up here.',
  inboxEmptyTitle: 'Inbox is empty',
  inboxEmptyBody: 'Replies, mentions and messages show up here.',
  emptyLabel: 'Nothing to show',

  loadingHeader: 'Loading…',
  loadingLabel: 'Loading',
  retry: 'Try again',
  checkAgain: 'Check again',

  setupHeader: 'Sign in',
  setupLabel: 'Sign in required',
  setupTitle: 'Sign in on your phone',
  setupBody:
    'Open Rokid Lumen on your phone, go to Apps, Reddit, and paste your Reddit session: the token_v2 cookie of reddit.com, signed in.',
  setupInvalidTitle: 'That session looks wrong',
  setupInvalidBody:
    'The saved value is not a token_v2 cookie. Copy token_v2 from reddit.com, signed in, and paste it in Rokid Lumen on your phone.',
  setupStillMissing: 'Still missing',
  expiredTitle: 'Session expired',
  expiredBody:
    'Reddit ended this session. Copy a new token_v2 cookie from reddit.com and paste it in Rokid Lumen on your phone.',
  sessionEnding: 'Session ends in {time}',
  sessionEndingMeta: 'Renew on your phone',

  errorHeader: 'Reddit',
  errorLabel: 'Error',
  errNetworkTitle: "Can't reach Reddit",
  errNetworkBody: 'Check the internet connection and try again.',
  errRateTitle: 'Too many requests',
  errRateBody: 'Reddit asked the app to slow down. Try again in {time}.',
  errRateBodyNoTime: 'Reddit asked the app to slow down. Try again in a minute.',
  errServerTitle: 'Reddit is not answering',
  errServerBody: 'Try again in a moment.',
  errNotFoundTitle: 'Not found',
  errNotFoundBody: 'This post or community no longer exists.',
  errForbiddenTitle: 'Not available',
  errForbiddenBody: 'This community is private, quarantined or banned.',
  httpStatus: 'HTTP {status}',
  errorDetailLabel: 'DETAIL',

  reasonNetwork: 'no connection',
  reasonAuth: 'session expired',
  reasonRate: 'too many requests',
  reasonServer: 'Reddit error',
  reasonForbidden: 'not allowed',
  reasonNotFound: 'not found',
  voteFailed: 'Vote not sent',
  saveFailed: 'Not saved',
  saved: 'Saved',
  unsaved: 'Removed from saved',

  upvote: 'Upvote',
  downvote: 'Downvote',
  save: 'Save',
  unsave: 'Remove from saved',
  scoreHidden: 'Vote',
  scoreLabel: '{score} points',
  commentsAction: 'Comments',
  commentsCount_one: '{count} comment',
  commentsCount_other: '{count} comments',
  postLabel: 'Post',
  byAuthor: 'u/{author}',
  subredditName: 'r/{name}',
  linkDomain: 'Link to {domain}',
  tagNsfw: 'NSFW',
  tagSpoiler: 'Spoiler',
  tagPinned: 'Pinned',
  tagVideo: 'Video',
  tagGallery: 'Gallery',
  tagOp: 'OP',
  videoNote: 'Videos play on reddit.com.',
  galleryNote: 'This post has more pictures on reddit.com.',
  deletedBody: '[deleted]',
  imageLabel: 'Picture: {title}',

  photoHeader: 'Picture',
  photoLoading: 'Loading picture',
  photoFailed: "Couldn't load the picture",

  commentsHeader: 'Comments',
  repliesHeader: 'Replies',
  commentsLabel: 'Comments',
  noCommentsTitle: 'No comments yet',
  noCommentsBody: 'No one has commented on this post.',
  noRepliesTitle: 'No replies',
  noRepliesBody: 'There are no replies here.',
  moreOnReddit_one: '{count} more reply on reddit.com',
  moreOnReddit_other: '{count} more replies on reddit.com',
  commentLabel: 'Comment by u/{author}',
  repliesCount_one: '{count} reply',
  repliesCount_other: '{count} replies',

  sortHot: 'Hot',
  sortNew: 'New',
  sortTop: 'Top',
  sortRising: 'Rising',
  sortMenuLabel: 'Sort posts',

  messageHeader: 'Message',
  messageLabel: 'Message from {author}',
  viewPost: 'View post',
  inboxCount_one: '{count} new',
  inboxCount_other: '{count} new',

  yesterday: 'Yesterday',
  durationMinutes_one: '{count} minute',
  durationMinutes_other: '{count} minutes',
  durationHours_one: '{count} hour',
  durationHours_other: '{count} hours',
  durationSeconds_one: '{count} second',
  durationSeconds_other: '{count} seconds',
};

export type StringKey = keyof typeof en;
type Strings = Record<StringKey, string>;

const pt: Strings = {
  appName: 'Reddit',

  tabHome: 'Início',
  tabPopular: 'Popular',
  tabCommunities: 'Comunidades',
  tabInbox: 'Mensagens',
  sectionsLabel: 'Seções do Reddit',
  homeFeedLabel: 'Feed inicial',
  popularFeedLabel: 'Posts populares',
  communitiesLabel: 'Suas comunidades',
  inboxLabel: 'Caixa de entrada',

  homeEmptyTitle: 'Nada por aqui ainda',
  homeEmptyBody: 'Os posts das comunidades que você segue aparecem aqui.',
  feedEmptyTitle: 'Nenhum post',
  feedEmptyBody: 'Este feed não tem posts agora.',
  communitiesEmptyTitle: 'Nenhuma comunidade',
  communitiesEmptyBody: 'As comunidades que você segue no Reddit aparecem aqui.',
  inboxEmptyTitle: 'Caixa vazia',
  inboxEmptyBody: 'Respostas, menções e mensagens aparecem aqui.',
  emptyLabel: 'Nada para mostrar',

  loadingHeader: 'Carregando…',
  loadingLabel: 'Carregando',
  retry: 'Tentar de novo',
  checkAgain: 'Verificar de novo',

  setupHeader: 'Entrar',
  setupLabel: 'É preciso entrar',
  setupTitle: 'Entre pelo celular',
  setupBody:
    'Abra o Rokid Lumen no celular, vá em Apps, Reddit, e cole sua sessão do Reddit: o cookie token_v2 do reddit.com, já logado.',
  setupInvalidTitle: 'Essa sessão parece errada',
  setupInvalidBody:
    'O valor salvo não é um cookie token_v2. Copie o token_v2 do reddit.com, já logado, e cole no Rokid Lumen do celular.',
  setupStillMissing: 'Ainda falta',
  expiredTitle: 'Sessão expirada',
  expiredBody:
    'O Reddit encerrou esta sessão. Copie um novo cookie token_v2 do reddit.com e cole no Rokid Lumen do celular.',
  sessionEnding: 'A sessão acaba em {time}',
  sessionEndingMeta: 'Renove no celular',

  errorHeader: 'Reddit',
  errorLabel: 'Erro',
  errNetworkTitle: 'Sem acesso ao Reddit',
  errNetworkBody: 'Verifique a internet e tente de novo.',
  errRateTitle: 'Pedidos demais',
  errRateBody: 'O Reddit pediu para o app ir mais devagar. Tente de novo em {time}.',
  errRateBodyNoTime: 'O Reddit pediu para o app ir mais devagar. Tente de novo daqui a um minuto.',
  errServerTitle: 'O Reddit não está respondendo',
  errServerBody: 'Tente de novo daqui a pouco.',
  errNotFoundTitle: 'Não encontrado',
  errNotFoundBody: 'Este post ou comunidade não existe mais.',
  errForbiddenTitle: 'Indisponível',
  errForbiddenBody: 'Esta comunidade é privada, está em quarentena ou foi banida.',
  httpStatus: 'HTTP {status}',
  errorDetailLabel: 'DETALHE',

  reasonNetwork: 'sem conexão',
  reasonAuth: 'sessão expirada',
  reasonRate: 'pedidos demais',
  reasonServer: 'erro do Reddit',
  reasonForbidden: 'não permitido',
  reasonNotFound: 'não encontrado',
  voteFailed: 'Voto não enviado',
  saveFailed: 'Não salvo',
  saved: 'Salvo',
  unsaved: 'Removido dos salvos',

  upvote: 'Votar a favor',
  downvote: 'Votar contra',
  save: 'Salvar',
  unsave: 'Remover dos salvos',
  scoreHidden: 'Votar',
  scoreLabel: '{score} pontos',
  commentsAction: 'Comentários',
  commentsCount_one: '{count} comentário',
  commentsCount_other: '{count} comentários',
  postLabel: 'Post',
  byAuthor: 'u/{author}',
  subredditName: 'r/{name}',
  linkDomain: 'Link para {domain}',
  tagNsfw: 'NSFW',
  tagSpoiler: 'Spoiler',
  tagPinned: 'Fixado',
  tagVideo: 'Vídeo',
  tagGallery: 'Galeria',
  tagOp: 'OP',
  videoNote: 'Os vídeos tocam no reddit.com.',
  galleryNote: 'Este post tem mais fotos no reddit.com.',
  deletedBody: '[apagado]',
  imageLabel: 'Imagem: {title}',

  photoHeader: 'Imagem',
  photoLoading: 'Carregando imagem',
  photoFailed: 'Não foi possível carregar a imagem',

  commentsHeader: 'Comentários',
  repliesHeader: 'Respostas',
  commentsLabel: 'Comentários',
  noCommentsTitle: 'Nenhum comentário',
  noCommentsBody: 'Ninguém comentou neste post ainda.',
  noRepliesTitle: 'Nenhuma resposta',
  noRepliesBody: 'Não há respostas aqui.',
  moreOnReddit_one: 'Mais {count} resposta no reddit.com',
  moreOnReddit_other: 'Mais {count} respostas no reddit.com',
  commentLabel: 'Comentário de u/{author}',
  repliesCount_one: '{count} resposta',
  repliesCount_other: '{count} respostas',

  sortHot: 'Em alta',
  sortNew: 'Novos',
  sortTop: 'Melhores',
  sortRising: 'Subindo',
  sortMenuLabel: 'Ordenar posts',

  messageHeader: 'Mensagem',
  messageLabel: 'Mensagem de {author}',
  viewPost: 'Ver post',
  inboxCount_one: '{count} nova',
  inboxCount_other: '{count} novas',

  yesterday: 'Ontem',
  durationMinutes_one: '{count} minuto',
  durationMinutes_other: '{count} minutos',
  durationHours_one: '{count} hora',
  durationHours_other: '{count} horas',
  durationSeconds_one: '{count} segundo',
  durationSeconds_other: '{count} segundos',
};

const dictionaries = {en, pt} satisfies Record<string, Strings>;
export type Locale = keyof typeof dictionaries;

/** Picks the dictionary from the base language (`pt-PT` and `pt-BR` both map to `pt`). */
export function resolveLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base in dictionaries) {
      return base as Locale;
    }
  }
  return 'en';
}

function browserLanguages(): string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }
  return navigator.language ? [navigator.language] : [];
}

const deviceLocale: Locale = resolveLocale(browserLanguages());

/** Language in use: the device's, or English while demo mode forces it. */
export let locale: Locale = deviceLocale;

/** Forces a language (demo mode) or, with null, goes back to the device's. */
export function setLocaleOverride(next: Locale | null): void {
  locale = next ?? deviceLocale;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

type Params = Record<string, string | number>;

function fill(template: string, params?: Params): string {
  if (params == null) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function translate(target: Locale, key: StringKey, params?: Params): string {
  return fill(dictionaries[target][key], params);
}

export function t(key: StringKey, params?: Params): string {
  return translate(locale, key, params);
}

/** Keys that have `_one`/`_other` forms, without the suffix. */
export type PluralKey = {
  [K in StringKey]: K extends `${infer Base}_one` ? (`${Base}_other` extends StringKey ? Base : never) : never;
}[StringKey];

export function translatePlural(target: Locale, key: PluralKey, count: number, params?: Params): string {
  const form = new Intl.PluralRules(target).select(count) === 'one' ? 'one' : 'other';
  return translate(target, `${key}_${form}` as StringKey, {count: formatCount(count, target), ...params});
}

/** A counted string: `tp('commentsCount', 3)` → "3 comments". */
export function tp(key: PluralKey, count: number, params?: Params): string {
  return translatePlural(locale, key, count, params);
}

/** 1234 → "1.2K" (en) / "1,2 mil" (pt). */
export function formatCount(count: number, target: Locale = locale): string {
  return new Intl.NumberFormat(target === 'pt' ? 'pt-BR' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count);
}
