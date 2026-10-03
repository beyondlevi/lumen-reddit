export const postPath = (id: string) => `/post/${encodeURIComponent(id)}`;
export const picturePath = (id: string) => `${postPath(id)}/picture`;
export const commentsPath = (id: string) => `${postPath(id)}/comments`;
export const commentPath = (id: string, commentId: string) => `${postPath(id)}/comment/${encodeURIComponent(commentId)}`;
export const repliesPath = (id: string, commentId: string) => `${commentPath(id, commentId)}/replies`;
export const subredditPath = (name: string) => `/r/${encodeURIComponent(name)}`;
export const messagePath = (name: string) => `/message/${encodeURIComponent(name)}`;
