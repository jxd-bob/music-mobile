import { bundledLegalHolidayData, type LegalHolidayYearData } from '@/config/legalHoliday'
import { storageDataPrefix } from '@/config/constant'
import { getData, saveData } from '@/plugins/storage'

interface HolidayCnResponse {
  year: number
  papers?: string[]
  days: Array<{
    date: string
    isOffDay: boolean
  }>
}

interface CachedLegalHolidayYearData extends LegalHolidayYearData {
  sourceUrl: string
  updatedAt: number
}

const requestMap = new Map<number, Promise<LegalHolidayYearData | null>>()

const remoteSources = [
  'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master',
  'https://raw.githubusercontent.com/NateScarlet/holiday-cn/master',
] as const

const getStorageKey = (year: number) => `${storageDataPrefix.legalHoliday}${year}`

const normalizeData = (data: HolidayCnResponse, sourceUrl: string): CachedLegalHolidayYearData => {
  return {
    year: data.year,
    offDays: data.days.filter(item => item.isOffDay).map(item => item.date),
    workdays: data.days.filter(item => !item.isOffDay).map(item => item.date),
    sourceUrl,
    updatedAt: Date.now(),
  }
}

const fetchLegalHolidayYear = async(year: number): Promise<LegalHolidayYearData | null> => {
  const currentRequest = requestMap.get(year)
  if (currentRequest) return currentRequest

  const request = (async() => {
    for (const source of remoteSources) {
      const sourceUrl = `${source}/${year}.json`
      try {
        const response = await fetch(sourceUrl)
        if (!response.ok) continue
        const result = await response.json() as HolidayCnResponse
        if (!result.days?.length) continue
        const normalized = normalizeData(result, sourceUrl)
        await saveData(getStorageKey(year), normalized)
        return normalized
      } catch {}
    }
    return null
  })()

  requestMap.set(year, request)
  return request.finally(() => {
    requestMap.delete(year)
  })
}

const getBundledLegalHolidayYearData = (year: number): LegalHolidayYearData | null => {
  return bundledLegalHolidayData[year] ?? null
}

export const getLegalHolidayYearData = async(year: number): Promise<LegalHolidayYearData | null> => {
  const cached = await getData<CachedLegalHolidayYearData>(getStorageKey(year))
  if (cached) {
    void fetchLegalHolidayYear(year)
    return cached
  }

  const bundled = getBundledLegalHolidayYearData(year)
  if (bundled) {
    void fetchLegalHolidayYear(year)
    return bundled
  }

  return fetchLegalHolidayYear(year)
}

const formatDate = (date: Date) => {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export const isLegalWorkday = async(date: Date) => {
  const target = formatDate(date)
  const yearData = await getLegalHolidayYearData(date.getFullYear())
  if (yearData) {
    if (yearData.workdays.includes(target)) return true
    if (yearData.offDays.includes(target)) return false
  }

  return ![0, 6].includes(date.getDay())
}

export const preloadLegalHolidayYears = async(years: number[]) => {
  await Promise.all(years.map(async year => getLegalHolidayYearData(year)))
}
