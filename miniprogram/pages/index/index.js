// pages/index/index.js
const app = getApp()

const NEIGHBORHOOD_PROFILES = {
  '京基东方都会': {
    icon: '🚇', categoryLabel: '罗湖通勤', badge: '大剧院商圈',
    desc: '位于罗湖蔡屋围片区，靠近大剧院、红岭南等地铁站，去福田 CBD、国贸、东门都很方便。周边商业成熟，生活配套密集。',
    review: '这里适合在罗湖、福田两边通勤的上班族。地铁线路选择多，晚归也比较方便，楼下餐饮和便利店密度高。预算适中的租客可以优先看小户型和两房，通勤效率会很舒服。'
  },
  '深业东岭': {
    icon: '🏢', categoryLabel: '品质社区', badge: '黄贝岭片区',
    desc: '罗湖黄贝岭成熟居住区，靠近地铁 2/5 号线换乘站，去莲塘、东门、福田都较顺。小区体量大，物业管理和生活配套相对完善。',
    review: '深业东岭适合希望兼顾居住品质和罗湖生活便利的人。黄贝岭片区烟火气足，买菜、餐饮、地铁都近，租金相比核心商圈更稳一些，适合长期居住。'
  },
  '华润银湖蓝山': {
    icon: '🌳', categoryLabel: '生态宜居', badge: '银湖山景',
    desc: '罗湖银湖片区的品质住宅，环境安静、绿化和景观条件更好，适合偏好安静居住氛围的人群。通勤可连接泥岗、笋岗和福田方向。',
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
  desc: '该区域房源充足，户型多样，直联房东，0中介费，随时可预约看房。',
  review: '房东均为个人直租，联系后可直接微信或电话沟通，看房灵活，无中介费用，价格也更有谈判空间。建议优先实地查看后再做决定。'
}

// 价格区间定义
const PRICE_RANGES = [
  { label: '不限',    min: 0,    max: Infinity },
  { label: '2000以下', min: 0,    max: 2000 },
  { label: '2000-3500', min: 2000, max: 3500 },
  { label: '3500-5000', min: 3500, max: 5000 },
  { label: '5000-8000', min: 5000, max: 8000 },
  { label: '8000以上', min: 8000, max: Infinity },
]

// 房型选项
const ROOM_TYPES = ['不限', '整租', '合租', '单间', '一室', '两室', '三室+']

Page({
  data: {
    platformStats: { neighborhoods: 0, houses: 0, available: 0 },
    activeTab: 'overview',
    filterDims: ['区域', '房型', '价格'],
    activeDim: '区域',
    districtList: [],
    selectedDistrict: '全部',
    neighborhoodSections: [],

    // 智能匹配
    matchDistrictList: [],
    matchSelectedDistrict: '不限',
    priceRanges: PRICE_RANGES.map(r => r.label),
    selectedPriceIdx: 0,
    roomTypes: ROOM_TYPES,
    selectedRoomType: '不限',
    matchResults: [],
    matchCount: 0,
    hasSearched: false
  },

  onShow() {
    app.onHouseListReady(() => this.loadData())
  },

  loadData() {
    const houseList = app.globalData.houseList || []
    const neighborhoods = new Set(houseList.map(h => h.neighborhood))
    const stats = {
      neighborhoods: neighborhoods.size,
      houses: houseList.length,
      available: houseList.filter(h => h.available).length
    }
    const districts = ['全部', ...new Set(houseList.map(h => h.district).filter(Boolean))]
    const matchDistricts = ['不限', ...new Set(houseList.map(h => h.district).filter(Boolean))]
    const sections = this.buildSections(houseList, this.data.selectedDistrict)
    this.setData({
      platformStats: stats,
      districtList: districts,
      matchDistrictList: matchDistricts,
      neighborhoodSections: sections
    })
    // 如果已在匹配tab，刷新结果
    if (this.data.activeTab === 'match') {
      this.runMatch()
    }
  },

  buildSections(houseList, districtFilter) {
    const map = {}
    ;(houseList || []).forEach(h => {
      if (districtFilter && districtFilter !== '全部' && h.district !== districtFilter) return
      if (!map[h.neighborhood]) {
        const p = NEIGHBORHOOD_PROFILES[h.neighborhood] || DEFAULT_PROFILE
        map[h.neighborhood] = {
          name: h.neighborhood, district: h.district || '',
          icon: p.icon, categoryLabel: p.categoryLabel,
          badge: p.badge, desc: p.desc, review: p.review,
          expanded: false, houses: []
        }
      }
      map[h.neighborhood].houses.push(h)
    })
    return Object.values(map)
  },

  // ── 浏览tab ──────────────────────────────────────
  onDistrictSelect(e) {
    const district = e.currentTarget.dataset.district
    const sections = this.buildSections(app.globalData.houseList, district)
    this.setData({ selectedDistrict: district, neighborhoodSections: sections })
  },

  onDimSelect(e) {
    this.setData({ activeDim: e.currentTarget.dataset.dim })
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
    this.setData({ matchSelectedDistrict: e.currentTarget.dataset.district })
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
    const houseList = app.globalData.houseList || []
    const { matchSelectedDistrict, selectedPriceIdx, selectedRoomType } = this.data
    const range = PRICE_RANGES[selectedPriceIdx]

    const results = houseList.filter(h => {
      if (matchSelectedDistrict !== '不限' && h.district !== matchSelectedDistrict) return false
      if (h.price < range.min || h.price > range.max) return false
      if (selectedRoomType !== '不限') {
        // 房型匹配：整租/合租精确，其他按 roomType 包含
        if (selectedRoomType === '整租' || selectedRoomType === '合租') {
          if (!h.rentType || h.rentType !== selectedRoomType) {
            // 也尝试从 title/roomType 中匹配
            const combined = (h.roomType || '') + (h.title || '')
            if (!combined.includes(selectedRoomType)) return false
          }
        } else {
          // 一室、两室等按 roomType 字段匹配
          if (!(h.roomType || '').includes(selectedRoomType.replace('+', ''))) return false
        }
      }
      return true
    })

    // 按可租状态排序：可租的排前面
    results.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0))

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
    wx.navigateTo({ url: `/pages/neighborhood/neighborhood?name=${encodeURIComponent(name)}` })
  },

  onSelectNeighborhood() {
    wx.switchTab({ url: '/pages/neighborhood/neighborhood' })
  },

  onPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' })
  },

  onPullDownRefresh() {
    app.refreshHouses(() => {
      this.loadData()
      wx.stopPullDownRefresh()
    })
  }
})
