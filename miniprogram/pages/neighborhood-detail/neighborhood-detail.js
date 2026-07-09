const app = getApp()
const houseMatch = require('../../utils/houseMatch')

const pick = (houses, field) => {
  const found = (houses || []).find(h => h && h[field])
  return found ? found[field] : ''
}

const withFallback = (value, fallback) => String(value || fallback).trim()
const toBulletItems = value => String(value || '')
  .split('\n')
  .map(item => item.trim())
  .filter(Boolean)
const buildRentReferenceItems = (profile) => [
  profile.priceReference,
  `水电：${withFallback(profile.waterElectricFee, '以实际账单为准，建议看房时确认民水民电或商水商电。')}`,
  `网费/宽带：${withFallback(profile.broadbandFee, '建议确认是否已包含在租金内，或是否需要租客自理。')}`,
  `停车费：${withFallback(profile.parkingFee, '如需停车，建议咨询管家确认固定车位月租和临停标准。')}`
].filter(Boolean)

const splitTags = text => {
  if (!text) return []
  return String(text)
    .replace(/#/g, ' ')
    .split(/[、,，/｜|\s]+/)
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 6)
}

const loadNeighborhoodMedia = (profile, houses) => {
  const source = profile || {}
  let images = Array.isArray(source.neighborhoodImages) ? [...source.neighborhoodImages] : []
  if (!images.length && source.neighborhoodCover) images = [source.neighborhoodCover]
  if (!images.length) {
    const cover = pick(houses, 'neighborhoodCover') || pick(houses, 'videoCover') || ''
    if (cover) images = [cover]
    else {
      const house = (houses || []).find(h => h.images && h.images.length)
      if (house) images = [house.images[0]]
    }
  }
  const videos = Array.isArray(source.neighborhoodVideos) && source.neighborhoodVideos.length
    ? [...source.neighborhoodVideos]
    : []
  return {
    images,
    videos,
    videoCover: source.neighborhoodVideoCover || '',
    cover: images[0] || ''
  }
}

const pickProfileField = (profile, houses, field, fallback = '') => {
  const profileValue = profile && profile[field]
  if (profileValue !== undefined && profileValue !== null && String(profileValue).trim()) {
    return profileValue
  }
  return pick(houses, field) || fallback
}

Page({
  data: {
    name: '',
    houses: [],
    availableHouses: [],
    profile: {},
    detailCards: [],
    guideSections: [],
    crowdTags: [],
    stats: { total: 0, available: 0, minPrice: 0, maxPrice: 0, roomTypes: '' },
    priceRanges: houseMatch.priceRangeLabels,
    selectedPriceIdx: 0,
    roomTypes: houseMatch.ROOM_TYPES,
    selectedRoomType: '不限',
    matchResults: [],
    matchCount: 0,
    hasMatchSearched: false
  },

  onLoad(options = {}) {
    const name = options.name ? decodeURIComponent(options.name) : ''
    this.setData({ name })
    app.onHouseListReady(() => this.loadNeighborhood(name))
  },

  onShow() {
    if (this.data.name) {
      app.ensureHousesFresh(() => this.loadNeighborhood(this.data.name))
    }
  },

  loadNeighborhood(name) {
    const houses = app.getHousesByNeighborhood(name) || []
    const nbProfile = app.getNeighborhoodProfile(name) || {}
    const availableHouses = houses.filter(h => h.available === true)
    const prices = availableHouses.map(h => Number(h.price)).filter(Boolean)
    const minPrice = prices.length ? Math.min(...prices) : 0
    const maxPrice = prices.length ? Math.max(...prices) : 0
    const roomTypes = [...new Set(availableHouses.map(h => h.roomType).filter(Boolean))].slice(0, 4).join(' / ')
    const district = nbProfile.district || pick(houses, 'district') || '深圳罗湖'
    const media = loadNeighborhoodMedia(nbProfile, houses)
    const profile = {
      name,
      district,
      cover: media.cover,
      images: media.images,
      videos: media.videos,
      videoCover: media.videoCover,
      slogan: pickProfileField(nbProfile, houses, 'neighborhoodSlogan', pickProfileField(nbProfile, houses, 'neighborhoodNote', '先看实地测评，再决定是否约看。')),
      commuteInfo: pickProfileField(nbProfile, houses, 'commuteInfo', '通勤信息待补充，可在线咨询管家确认到口岸、学校或公司的实际路线。'),
      commuteMode: pickProfileField(nbProfile, houses, 'commuteMode', '步行'),
      safetyInfo: pickProfileField(nbProfile, houses, 'safetyInfo', '门禁、保安和夜间出入情况建议看房时重点确认。'),
      propertyType: pickProfileField(nbProfile, houses, 'propertyType', '住宅小区'),
      parkingInfo: pickProfileField(nbProfile, houses, 'parkingInfo', '是否有停车场、固定车位和临停入口，建议看房时同步确认。'),
      deliveryInfo: pickProfileField(nbProfile, houses, 'deliveryInfo', '建议看房时确认外卖、快递是否可上楼，以及收件点位置。'),
      shortRentInfo: pickProfileField(nbProfile, houses, 'shortRentInfo', houses.some(h => (h.tags || []).includes('可短租')) ? '有房源支持短租' : '租期情况请在线咨询管家确认'),
      roomInsight: pickProfileField(nbProfile, houses, 'roomInsight', pickProfileField(nbProfile, houses, 'neighborhoodReview', '该小区已有房源发布，可结合户型、楼层、朝向和照片判断是否适合。')),
      priceReference: pickProfileField(nbProfile, houses, 'priceReference', this.buildPriceText(minPrice, maxPrice)),
      waterElectricFee: pickProfileField(nbProfile, houses, 'waterElectricFee'),
      broadbandFee: pickProfileField(nbProfile, houses, 'broadbandFee'),
      parkingFee: pickProfileField(nbProfile, houses, 'parkingFee'),
      surroundings: pickProfileField(nbProfile, houses, 'surroundings', '周边配套可结合地图和实地看房确认餐饮、商超、通勤动线。'),
      scoutTitle: pickProfileField(nbProfile, houses, 'scoutTitle', '深港租房实探笔记'),
      scoutSummary: pickProfileField(nbProfile, houses, 'scoutSummary', pickProfileField(nbProfile, houses, 'neighborhoodReview', '先判断通勤、预算和噪音接受度，再决定是否约看，可以明显提高看房效率。')),
      scoutAdvice: pickProfileField(nbProfile, houses, 'scoutAdvice', '建议优先确认：通勤时间、楼层采光、噪音来源、水电收费、是否可短租、押付方式。'),
      suitableCrowd: pickProfileField(nbProfile, houses, 'suitableCrowd', '通勤党 / 省心找房 / 预算明确')
    }
    const detailCards = [
      { title: '安保', value: profile.safetyInfo, sub: '门禁 / 保安 / 夜间出入' },
      { title: '周边配套', value: profile.surroundings, sub: '餐饮 / 商超 / 交通' },
      { title: '公区环境', value: profile.propertyType, sub: roomTypes || '户型待补充' },
      { title: '停车场', value: profile.parkingInfo, sub: '车位 / 临停 / 出入口' },
      { title: '电动车充电', value: pick(houses, 'chargingInfo') || pick(houses, 'evChargingInfo') || '充电桩与停车规范建议咨询管家确认', sub: '充电桩 / 停放' }
    ]
    const guideSections = [
      { title: '租金参考', items: buildRentReferenceItems(profile) },
      { title: '小区环境', items: toBulletItems(profile.roomInsight) },
      { title: '管家建议', items: toBulletItems(profile.scoutAdvice) }
    ]
    this.setData({
      houses,
      availableHouses,
      profile,
      detailCards,
      guideSections,
      crowdTags: splitTags(profile.suitableCrowd),
      stats: {
        total: houses.length,
        available: availableHouses.length,
        minPrice,
        maxPrice,
        roomTypes
      }
    })
    wx.setNavigationBarTitle({ title: name || '小区详情' })
    this.runNeighborhoodMatch(availableHouses, name)
  },

  runNeighborhoodMatch(sourceHouses, neighborhoodName) {
    const name = neighborhoodName || this.data.name
    const results = houseMatch.filterHouses(sourceHouses, {
      neighborhood: name,
      priceIdx: Number(this.data.selectedPriceIdx),
      roomType: this.data.selectedRoomType
    })
    this.setData({
      matchResults: results,
      matchCount: results.length,
      hasMatchSearched: true
    })
  },

  onNeighborhoodPriceSelect(e) {
    this.setData({ selectedPriceIdx: Number(e.currentTarget.dataset.idx) }, () => {
      this.runNeighborhoodMatch(this.data.availableHouses, this.data.name)
    })
  },

  onNeighborhoodRoomTypeSelect(e) {
    this.setData({ selectedRoomType: e.currentTarget.dataset.type }, () => {
      this.runNeighborhoodMatch(this.data.availableHouses, this.data.name)
    })
  },

  buildPriceText(minPrice, maxPrice) {
    if (!minPrice && !maxPrice) return '暂无价格参考'
    if (minPrice === maxPrice) return `${minPrice}元/月左右`
    return `${minPrice}-${maxPrice}元/月`
  },

  onHouseTap(e) {
    const { house } = e.detail
    if (!house || !house.id) return
    app.incrementViewCount(house.id)
    wx.navigateTo({ url: `/pages/detail/detail?id=${house.id}` })
  },

  onViewHouses() {
    if (!this.data.availableHouses.length) {
      wx.showToast({ title: '暂无在租房源', icon: 'none' })
      return
    }
    wx.pageScrollTo({ scrollTop: 1200, duration: 250 })
  },

  onCallFirstLandlord() {
    const house = this.data.availableHouses[0]
    if (!house || !house.landlordPhone) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: house.landlordPhone })
  },

  onConsultHousekeeper() {
    wx.switchTab({ url: '/pages/messages/messages' })
  },

  onOpenMap() {
    const profile = app.getNeighborhoodProfile(this.data.name) || {}
    const latitude = Number(profile.latitude)
    const longitude = Number(profile.longitude)
    if (latitude && longitude) {
      wx.openLocation({
        latitude,
        longitude,
        name: this.data.name,
        address: profile.address || profile.locationName || ''
      })
      return
    }
    const house = this.data.availableHouses.find(h => h.latitude && h.longitude)
    if (!house) {
      wx.showToast({ title: '请先在小区配置中设置地图位置', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: Number(house.latitude),
      longitude: Number(house.longitude),
      name: this.data.name,
      address: house.address || house.locationName || ''
    })
  }
})
