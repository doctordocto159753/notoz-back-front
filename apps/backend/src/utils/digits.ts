// تبدیل اعداد فارسی/عربی به انگلیسی برای ذخیره‌سازی

const persian = '۰۱۲۳۴۵۶۷۸۹'
const arabic = '٠١٢٣٤٥٦٧٨٩'

export function normalizeDigitsToEnglish(input: string): string {
  let out = input
  for (let i = 0; i < 10; i++) {
    out = out.replaceAll(persian[i], String(i)).replaceAll(arabic[i], String(i))
  }
  return out
}
