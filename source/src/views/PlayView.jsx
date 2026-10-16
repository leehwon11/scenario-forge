// ===== 재생용 도우미 (세션 화면에서 씀) =====
// BGM: 유튜브 링크 판별, 음악 파일이면 오디오 플레이어로
export const ytId=u=>u?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)?.[1]||null;
export const isAudio=u=>/\.(mp3|ogg|wav|m4a|flac|aac)(\?.*)?$/i.test(u||'');
