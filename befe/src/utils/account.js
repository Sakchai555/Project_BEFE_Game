export function userLabel(user) {
  return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'ผู้เล่น';
}

export function profileErrorMessage(error, fallback) {
  const message = String(error?.message || '');
  if (/already registered|already exists|email_exists|user_already_exists/i.test(message)) return 'อีเมลนี้สมัครไว้แล้ว';
  if (/DISPLAY_NAME_TAKEN|profiles_username_key_unique/i.test(message) || error?.code === '23505') return 'ชื่อนี้ถูกใช้แล้ว กรุณาเปลี่ยนชื่อ';
  return message || fallback;
}
