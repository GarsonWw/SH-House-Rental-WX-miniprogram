const PRICE_RANGES = [
  { label: '不限', min: 0, max: Infinity },
  { label: '2000以下', min: 0, max: 2000 },
  { label: '2000-3500', min: 2000, max: 3500 },
  { label: '3500-5000', min: 3500, max: 5000 },
  { label: '5000-8000', min: 5000, max: 8000 },
  { label: '8000以上', min: 8000, max: Infinity }
]

const ROOM_TYPES = ['不限', '整租', '合租', '单间', '一室', '两室', '三室+']

const matchRoomType = (house, selectedRoomType) => {
  if (selectedRoomType === '不限') return true
  const roomType = String(house.roomType || '')
  const combined = `${roomType}${house.title || ''}`
  if (selectedRoomType === '合租') {
    return house.rentType === '合租' || combined.includes('合租')
  }
  if (selectedRoomType === '整租') {
    if (house.rentType) return house.rentType === '整租'
    return !combined.includes('合租')
  }
  if (selectedRoomType === '一室') return /^1室/.test(roomType)
  if (selectedRoomType === '两室') return /^2室/.test(roomType)
  if (selectedRoomType === '三室+') {
    const count = Number((roomType.match(/^(\d+)室/) || [])[1])
    return Number.isFinite(count) && count >= 3
  }
  return roomType.includes(selectedRoomType)
}

const filterHouses = (houseList, options = {}) => {
  const {
    district,
    neighborhood,
    priceIdx = 0,
    roomType = '不限'
  } = options
  const range = PRICE_RANGES[priceIdx] || PRICE_RANGES[0]
  return (houseList || []).filter(house => {
    if (!house || house.available !== true) return false
    if (district && district !== '不限' && house.district !== district) return false
    if (neighborhood && neighborhood !== '全选' && house.neighborhood !== neighborhood) return false
    if (house.price < range.min || house.price > range.max) return false
    if (roomType !== '不限' && !matchRoomType(house, roomType)) return false
    return true
  })
}

const buildNeighborhoodOptions = (houseList, district) => {
  if (!district || district === '不限') return []
  const names = new Set()
  ;(houseList || []).forEach(house => {
    if (house.available !== true || house.district !== district) return
    const name = String(house.neighborhood || '').trim()
    if (name) names.add(name)
  })
  return ['全选', ...Array.from(names).sort((a, b) => a.localeCompare(b, 'zh-CN'))]
}

module.exports = {
  PRICE_RANGES,
  ROOM_TYPES,
  matchRoomType,
  filterHouses,
  buildNeighborhoodOptions,
  priceRangeLabels: PRICE_RANGES.map(item => item.label)
}
