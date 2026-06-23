const app = getApp()

const pick = (houses, field) => {
  const found = (houses || []).find(h => h && h[field])
  return found ? found[field] : ''
}

const splitTags = text => {
  if (!text) return []
  return String(text)
    .replace(/#/g, ' ')
    .split(/[、,，/｜|\s]+/)
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 6)
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
    stats: { total: 0, available: 0, minPrice: 0, maxPrice: 0, roomTypes: '' }
  },

  onLoad(options = {}) {
    const name = options.name ? decodeURIComponent(options.name) : ''
    this.setData({ name })
    app.onHouseListReady(() => this.loadNeighborhood(name))
  },

  onShow() {
    if (this.data.name) {
      app.onHouseListReady(() => this.loadNeighborhood(this.data.name))
    }
  },

  loadNeighborhood(name) {
    const houses = app.getHousesByNeighborhood(name) || []
    const availableHouses = houses.filter(h => h.available !== false)
    const prices = houses.map(h => Number(h.price)).filter(Boolean)
    const minPrice = prices.length ? Math.min(...prices) : 0
    const maxPrice = prices.length ? Math.max(...prices) : 0
    const roomTypes = [...new Set(houses.map(h => h.roomType).filter(Boolean))].slice(0, 4).join(' / ')
    const district = pick(houses, 'district') || '深圳罗湖'
    const cover = pick(houses, 'neighborhoodCover') || pick(houses, 'videoCover') || this.findCover(houses)
    const profile = {
      name,
      district,
      cover,
      slogan: pick(houses, 'neighborhoodSlogan') || pick(houses, 'neighborhoodNote') || '直连房东，真实房源，适合先做小区判断再看房。',
      commuteInfo: pick(houses, 'commuteInfo') || '房东暂未填写通勤信息，可先查看地图位置与在租房源。',
      commuteMode: pick(houses, 'commuteMode') || '步行',
      safetyInfo: pick(houses, 'safetyInfo') || '房东暂未填写门禁与安保信息，建议看房时确认门禁、保安和夜间出入情况。',
      propertyType: pick(houses, 'propertyType') || '住宅小区',
      deliveryInfo: pick(houses, 'deliveryInfo') || '建议看房时确认外卖、快递是否可上楼，以及收件点位置。',
      shortRentInfo: pick(houses, 'shortRentInfo') || (houses.some(h => (h.tags || []).includes('可短租')) ? '有房源支持短租' : '短租情况请联系房东确认'),
      roomInsight: pick(houses, 'roomInsight') || pick(houses, 'neighborhoodReview') || '该小区已有房源发布，可结合户型、楼层、朝向和照片判断是否适合。',
      priceReference: pick(houses, 'priceReference') || this.buildPriceText(minPrice, maxPrice),
      surroundings: pick(houses, 'surroundings') || '房东暂未填写周边配套，可结合地图和实地看房确认餐饮、商超、通勤动线。',
      scoutTitle: pick(houses, 'scoutTitle') || '深港租房实探笔记',
      scoutSummary: pick(houses, 'scoutSummary') || pick(houses, 'neighborhoodReview') || '先判断通勤、预算和噪音接受度，再决定是否约看，可以明显提高看房效率。',
      scoutAdvice: pick(houses, 'scoutAdvice') || '建议优先确认：通勤时间、楼层采光、噪音来源、水电收费、是否可短租、押付方式。',
      suitableCrowd: pick(houses, 'suitableCrowd') || '通勤党 / 省心找房 / 预算明确'
    }
    const detailCards = [
      { title: '通勤', value: profile.commuteInfo, sub: profile.commuteMode },
      { title: '安全', value: profile.safetyInfo, sub: '门禁 / 保安 / 出入' },
      { title: '居住类型', value: profile.propertyType, sub: roomTypes || '户型待补充' },
      { title: '快递外卖', value: profile.deliveryInfo, sub: '生活便利度' },
      { title: '短租', value: profile.shortRentInfo, sub: '租期灵活度' }
    ]
    const guideSections = [
      { title: '房间', value: profile.roomInsight },
      { title: '户型参考', value: profile.priceReference },
      { title: '周边配套', value: profile.surroundings },
      { title: '学长建议', value: profile.scoutAdvice }
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
  },

  findCover(houses) {
    const house = (houses || []).find(h => h.images && h.images.length)
    return house ? house.images[0] : ''
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
    if (!this.data.houses.length) {
      wx.showToast({ title: '暂无在租房源', icon: 'none' })
      return
    }
    wx.pageScrollTo({ scrollTop: 1200, duration: 250 })
  },

  onCallFirstLandlord() {
    const house = this.data.availableHouses[0] || this.data.houses[0]
    if (!house || !house.landlordPhone) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: house.landlordPhone })
  },

  onCopyFirstWechat() {
    const house = this.data.availableHouses[0] || this.data.houses[0]
    if (!house || !house.landlordWechat) {
      wx.showToast({ title: '暂无微信号', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: house.landlordWechat,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
    })
  },

  onOpenMap() {
    const house = this.data.houses.find(h => h.latitude && h.longitude)
    if (!house) {
      wx.showToast({ title: '暂无地图坐标', icon: 'none' })
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
