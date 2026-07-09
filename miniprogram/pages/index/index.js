// pages/index/index.js
const app = getApp()
const houseMatch = require('../../utils/houseMatch')

const NEIGHBORHOOD_PROFILES = {
  '京基东方都会': {
    icon: '🚇', categoryLabel: '罗湖通勤', badge: '大剧院商圈',
    desc: '位于罗湖蔡屋围片区，靠近大剧院、红岭南等地铁站，去国贸、东门、蔡屋围和口岸方向都很方便。周边商业成熟，生活配套密集。',
    review: '这里适合在罗湖核心商圈和口岸方向通勤的上班族。地铁线路选择多，晚归也比较方便，楼下餐饮和便利店密度高。预算适中的租客可以优先看小户型和两房，通勤效率会很舒服。'
  },
  '深业东岭': {
    icon: '🏢', categoryLabel: '品质社区', badge: '黄贝岭片区',
    desc: '罗湖黄贝岭成熟居住区，靠近地铁 2/5 号线换乘站，去莲塘、东门、国贸和口岸方向都较顺。小区体量大，物业管理和生活配套相对完善。',
    review: '深业东岭适合希望兼顾居住品质和罗湖生活便利的人。黄贝岭片区烟火气足，买菜、餐饮、地铁都近，租金相比核心商圈更稳一些，适合长期居住。'
  },
  '华润银湖蓝山': {
    icon: '🌳', categoryLabel: '生态宜居', badge: '银湖山景',
    desc: '罗湖银湖片区的品质住宅，环境安静、绿化和景观条件更好，适合偏好安静居住氛围的人群。通勤可连接泥岗、笋岗、国贸和罗湖口岸方向。',
    review: '如果你更看重安静和居住质感，银湖片区会比东门、国贸一带从容很多。适合有车或接受短接驳通勤的租客，预算充足时可以重点看大两房和三房。'
  },
  '合正锦湖逸园': {
    icon: '🏫', categoryLabel: '生活便利', badge: '翠竹东门',
    desc: '罗湖翠竹片区成熟社区，周边学校、医院、菜市场和商业街都比较近，步行生活半径完整，适合家庭和稳定租住。',
    review: '翠竹片区的优势是生活便利和社区成熟，日常不用频繁跨区。对于在罗湖工作、希望住得踏实一点的租客，这里比纯商务区更有生活感，租房选择也更丰富。'
  }
}

const DEFAULT_PROFILE = {
  icon: '🏠', categoryLabel: '精选房源', badge: '',
  desc: '该片区房源充足，户型多样，直联房东，0中介费，随时可预约看房。',
  review: '房东均为个人直租，联系后可直接微信或电话沟通，看房灵活，无中介费用，价格也更有谈判空间。建议优先实地查看后再做决定。'
}

// 价格区间定义
const PRICE_RANGES = houseMatch.PRICE_RANGES

// 房型选项
const ROOM_TYPES = houseMatch.ROOM_TYPES

Page({
  data: {
    platformStats: { neighborhoods: 0, houses: 0, available: 0 },
    heroSlides: [],
    heroIndex: 0,
    activeTab: 'overview',
    filterDims: ['片区', '房型', '价格'],
    activeDim: '片区',
    districtList: [],
    selectedDistrict: '全部',
    overviewFilterOptions: [],
    overviewSelectedRoomType: '不限',
    overviewSelectedPriceIdx: 0,
    neighborhoodSections: [],

    // 智能匹配
    matchDistrictList: [],
    matchSelectedDistrict: '不限',
    matchNeighborhoodList: [],
    matchSelectedNeighborhood: '全选',
    priceRanges: PRICE_RANGES.map(r => r.label),
    selectedPriceIdx: 0,
    roomTypes: ROOM_TYPES,
    selectedRoomType: '不限',
    matchResults: [],
    matchCount: 0,
    hasSearched: false
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setData({ selected: 0 })
    app.ensureHousesFresh(() => this.loadData())
  },

  loadData() {
    const houseList = app.globalData.houseList || []
    const availableHouseList = houseList.filter(h => h && h.available === true)
    const neighborhoods = new Set(availableHouseList.map(h => h.neighborhood))
    const stats = {
      neighborhoods: neighborhoods.size,
      houses: availableHouseList.length,
      available: availableHouseList.length
    }
    const districts = app.getDistrictFilterOptions(availableHouseList, '全部')
    const matchDistricts = app.getDistrictFilterOptions(availableHouseList, '不限')
    let selectedDistrict = this.data.selectedDistrict
    if (selectedDistrict !== '全部' && !districts.includes(selectedDistrict)) {
      selectedDistrict = '全部'
    }
    let matchSelectedDistrict = this.data.matchSelectedDistrict
    if (matchSelectedDistrict !== '不限' && !matchDistricts.includes(matchSelectedDistrict)) {
      matchSelectedDistrict = '不限'
    }
    const matchNeighborhoodList = this.buildMatchNeighborhoodList(availableHouseList, matchSelectedDistrict)
    let matchSelectedNeighborhood = this.data.matchSelectedNeighborhood
    if (matchSelectedDistrict === '不限') {
      matchSelectedNeighborhood = '全选'
    } else if (!matchNeighborhoodList.includes(matchSelectedNeighborhood)) {
      matchSelectedNeighborhood = '全选'
    }
    const sections = this.buildSections(availableHouseList, selectedDistrict)
    const heroSlides = this.buildHeroSlides(availableHouseList)
    const heroChanged = JSON.stringify(heroSlides) !== JSON.stringify(this.data.heroSlides || [])
    const nextData = {
      platformStats: stats,
      districtList: districts,
      selectedDistrict,
      matchDistrictList: matchDistricts,
      matchSelectedDistrict,
      matchNeighborhoodList,
      matchSelectedNeighborhood,
      overviewFilterOptions: this.getOverviewFilterOptions(this.data.activeDim, districts, selectedDistrict),
      neighborhoodSections: sections
    }
    if (heroChanged) {
      nextData.heroSlides = heroSlides
      nextData.heroIndex = 0
    }
    this.setData(nextData)
    // 如果已在匹配tab，刷新结果
    if (this.data.activeTab === 'match') {
      this.runMatch()
    }
  },

  buildHeroSlides(houseList) {
    const candidates = (houseList || []).filter(h => {
      return h.available && h.images && h.images.length > 0 && h.images[0]
    })
    const selected = []
    const selectedIds = new Set()
    const neighborhoods = new Set()

    candidates.forEach(h => {
      if (selected.length >= 4 || neighborhoods.has(h.neighborhood)) return
      selected.push(h)
      selectedIds.add(h.id)
      neighborhoods.add(h.neighborhood)
    })

    candidates.forEach(h => {
      if (selected.length >= 4 || selectedIds.has(h.id)) return
      selected.push(h)
      selectedIds.add(h.id)
    })

    return selected.map(h => {
      const meta = [h.roomType || h.rentType, h.area ? `${h.area}㎡` : '面积待确认']
        .filter(Boolean)
        .join(' · ')
      return {
        id: h.id,
        image: h.images[0],
        neighborhood: h.neighborhood || '罗湖精选房源',
        meta,
        price: h.price || '面议',
        statusText: '可预约看房'
      }
    })
  },

  getOverviewFilterOptions(dim, districts = this.data.districtList, activeDistrict = this.data.selectedDistrict) {
    const { overviewSelectedRoomType, overviewSelectedPriceIdx } = this.data
    if (dim === '片区') {
      return districts.map((label, idx) => ({ label, idx, active: activeDistrict === label }))
    }
    if (dim === '房型') {
      return ROOM_TYPES.map((label, idx) => ({ label, idx, active: overviewSelectedRoomType === label }))
    }
    return PRICE_RANGES.map((r, idx) => ({ label: r.label, idx, active: overviewSelectedPriceIdx === idx }))
  },

  buildMatchNeighborhoodList(houseList, district) {
    return houseMatch.buildNeighborhoodOptions(houseList, district)
  },

  matchRoomType(h, selectedRoomType) {
    return houseMatch.matchRoomType(h, selectedRoomType)
  },

  buildSections(houseList, selectedDistrict = this.data.selectedDistrict) {
    const { overviewSelectedRoomType, overviewSelectedPriceIdx } = this.data
    const range = PRICE_RANGES[overviewSelectedPriceIdx] || PRICE_RANGES[0]
    const map = {}
    ;(houseList || []).forEach(h => {
      if (selectedDistrict !== '全部' && h.district !== selectedDistrict) return
      if (h.price < range.min || h.price > range.max) return
      if (!this.matchRoomType(h, overviewSelectedRoomType)) return
      const note = h.neighborhoodNote || h.neighborhoodDesc || ''
      const review = h.neighborhoodReview || ''
      if (!map[h.neighborhood]) {
        const p = NEIGHBORHOOD_PROFILES[h.neighborhood] || DEFAULT_PROFILE
        map[h.neighborhood] = {
          name: h.neighborhood, district: h.district || '',
          icon: p.icon, categoryLabel: p.categoryLabel,
          badge: p.badge, desc: note || p.desc, review: review || p.review,
          expanded: false, houses: []
        }
      } else {
        if (note) map[h.neighborhood].desc = note
        if (review) map[h.neighborhood].review = review
      }
      map[h.neighborhood].houses.push(h)
    })
    return Object.values(map)
  },

  // ── 浏览tab ──────────────────────────────────────
  onDimSelect(e) {
    const activeDim = e.currentTarget.dataset.dim
    this.setData({
      activeDim,
      overviewFilterOptions: this.getOverviewFilterOptions(activeDim)
    })
  },

  onOverviewFilterSelect(e) {
    const { value } = e.currentTarget.dataset
    const idx = Number(e.currentTarget.dataset.idx || 0)
    const data = {}
    if (this.data.activeDim === '片区') {
      data.selectedDistrict = value
    } else if (this.data.activeDim === '房型') {
      data.overviewSelectedRoomType = value
    } else {
      data.overviewSelectedPriceIdx = idx
    }
    this.setData(data, () => {
      this.setData({
        overviewFilterOptions: this.getOverviewFilterOptions(this.data.activeDim),
        neighborhoodSections: this.buildSections((app.globalData.houseList || []).filter(h => h && h.available === true))
      })
    })
  },

  onTabSwitch(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    if (tab === 'match') {
      this.runMatch()
    }
  },

  onExpandSection(e) {
    const idx = e.currentTarget.dataset.idx
    const sections = this.data.neighborhoodSections
    sections[idx].expanded = !sections[idx].expanded
    this.setData({ neighborhoodSections: sections })
  },

  // ── 智能匹配 ─────────────────────────────────────
  onMatchDistrictSelect(e) {
    const district = e.currentTarget.dataset.district
    const houseList = (app.globalData.houseList || []).filter(h => h && h.available === true)
    const matchNeighborhoodList = this.buildMatchNeighborhoodList(houseList, district)
    this.setData({
      matchSelectedDistrict: district,
      matchNeighborhoodList,
      matchSelectedNeighborhood: '全选'
    }, () => this.runMatch())
  },

  onMatchNeighborhoodSelect(e) {
    this.setData({ matchSelectedNeighborhood: e.currentTarget.dataset.name })
    this.runMatch()
  },

  onPriceSelect(e) {
    this.setData({ selectedPriceIdx: e.currentTarget.dataset.idx })
    this.runMatch()
  },

  onRoomTypeSelect(e) {
    this.setData({ selectedRoomType: e.currentTarget.dataset.type })
    this.runMatch()
  },

  runMatch() {
    const houseList = (app.globalData.houseList || []).filter(h => h && h.available === true)
    const { matchSelectedDistrict, matchSelectedNeighborhood, selectedPriceIdx, selectedRoomType } = this.data
    const results = houseMatch.filterHouses(houseList, {
      district: matchSelectedDistrict,
      neighborhood: matchSelectedNeighborhood,
      priceIdx: Number(selectedPriceIdx),
      roomType: selectedRoomType
    })
    this.setData({ matchResults: results, matchCount: results.length, hasSearched: true })
  },

  // ── 通用 ─────────────────────────────────────────
  onHouseTap(e) {
    const id = e.currentTarget.dataset.id
    app.incrementViewCount(id)
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  onNeighborhoodTap(e) {
    const name = e.currentTarget.dataset.name
    wx.navigateTo({ url: `/pages/neighborhood-detail/neighborhood-detail?name=${encodeURIComponent(name)}` })
  },

  onHeroChange(e) {
    this.setData({ heroIndex: e.detail.current })
  },

  onHeroTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    app.incrementViewCount(id)
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  onPullDownRefresh() {
    app.refreshHouses(() => {
      this.loadData()
      wx.stopPullDownRefresh()
    })
  }
})
