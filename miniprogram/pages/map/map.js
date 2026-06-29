// pages/map/map.js
const app = getApp()

// 各小区近似坐标（深圳罗湖）
const COORDS = {
  '京基东方都会': { latitude: 22.5433, longitude: 114.1030 },
  '松园小区':     { latitude: 22.5559, longitude: 114.1078 },
  '深业东岭':     { latitude: 22.5526, longitude: 114.1425 },
  '华润银湖蓝山': { latitude: 22.5735, longitude: 114.0964 },
  '合正锦湖逸园': { latitude: 22.5610, longitude: 114.1266 }
}

const getHouseCoord = house => {
  const latitude = Number(house.latitude)
  const longitude = Number(house.longitude)
  if (latitude && longitude) return { latitude, longitude }
  return COORDS[house.neighborhood]
}

// 右侧快捷图层
const LAYERS = [
  { key: 'filter',   label: '筛选', icon: '⚙️' },
  { key: 'district', label: '区域', icon: '📍' },
  { key: 'subway',   label: '地铁', icon: '🚇' },
  { key: 'around',   label: '周边', icon: '🔍' }
]

Page({
  data: {
    // 地图基础
    mapLat: 22.5550,
    mapLng: 114.1200,
    scale: 12,
    markers: [],
    polyline: [],

    // 筛选状态
    layers: LAYERS,
    activeLayer: '',
    districtList: [],
    selectedDistrict: '全部',
    showDistrictPanel: false,

    // 底部浮层（点击 Marker 后显示）
    showSheet: false,
    sheetNeighborhood: '',
    sheetHouses: [],

    // 搜索
    searchValue: '',

    // 缩放级别展示
    currentScale: 12
  },

  onLoad() {
    app.onHouseListReady(() => this.loadMarkers())
  },

  onShow() {
    app.onHouseListReady(() => this.loadMarkers())
  },

  // ── 构建地图 Markers ──────────────────────────────
  loadMarkers(districtFilter) {
    const houseList = app.globalData.houseList
    const nbMap = {}

    houseList.forEach(h => {
      if (districtFilter && districtFilter !== '全部' && h.district !== districtFilter) return
      const coord = getHouseCoord(h)
      if (!coord) return
      if (!nbMap[h.neighborhood]) {
        nbMap[h.neighborhood] = {
          name: h.neighborhood,
          district: h.district,
          count: 0,
          available: 0,
          lat: coord.latitude,
          lng: coord.longitude
        }
      }
      nbMap[h.neighborhood].count++
      if (h.available) nbMap[h.neighborhood].available++
    })

    // 获取区域列表
    const allHouses = app.globalData.houseList
    const districts = ['全部', ...new Set(allHouses.map(h => h.district).filter(Boolean))]

    const markers = Object.values(nbMap).map((n, idx) => ({
      id: idx + 1,
      _name: n.name,
      latitude: n.lat,
      longitude: n.lng,
      iconPath: '/images/marker_home.png',
      width: 32,
      height: 32,
      anchor: { x: 0.5, y: 1 },
      callout: {
        content: `${n.count}套房源`,
        color: '#FFFFFF',
        fontSize: 13,
        borderRadius: 8,
        bgColor: '#1A5FB4',
        padding: 7,
        display: 'ALWAYS',
        textAlign: 'center'
      },
      label: {
        content: n.name,
        color: '#333333',
        fontSize: 11,
        anchorX: 0,
        anchorY: -2,
        bgColor: '#FFFFFFCC',
        borderRadius: 4,
        padding: 3
      }
    }))

    this.setData({ markers, districtList: districts })
  },

  // ── 点击 Marker ───────────────────────────────────
  onMarkerTap(e) {
    const markerId = e.detail.markerId
    const marker = this.data.markers.find(m => m.id === markerId)
    if (!marker) return
    const name = marker._name
    const houses = app.globalData.houseList.filter(h => h.neighborhood === name)
    this.setData({
      showSheet: true,
      sheetNeighborhood: name,
      sheetHouses: houses
    })
  },

  onMapTap() {
    if (this.data.showSheet) {
      this.setData({ showSheet: false })
    }
    if (this.data.showDistrictPanel) {
      this.setData({ showDistrictPanel: false })
    }
  },

  onCloseSheet() {
    this.setData({ showSheet: false })
  },

  // ── 点击房源 → 详情 ───────────────────────────────
  onHouseTap(e) {
    const id = e.currentTarget.dataset.id
    app.incrementViewCount(id)
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  // ── 拨打电话 ──────────────────────────────────────
  onPhoneCall(e) {
    e.stopPropagation()
    const phone = e.currentTarget.dataset.phone
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: `联系 ${name}`,
      content: `📞 ${phone}`,
      confirmText: '立即拨打',
      success: res => {
        if (res.confirm) wx.makePhoneCall({ phoneNumber: phone })
      }
    })
  },

  // ── 复制微信号 ────────────────────────────────────
  onCopyWechat(e) {
    e.stopPropagation()
    const wechat = e.currentTarget.dataset.wechat
    wx.setClipboardData({
      data: wechat,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
    })
  },

  // ── 右侧图层按钮 ──────────────────────────────────
  onLayerTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'district') {
      this.setData({
        showDistrictPanel: !this.data.showDistrictPanel,
        activeLayer: key
      })
    } else if (key === 'filter') {
      this.setData({ showDistrictPanel: false, activeLayer: key })
      wx.showToast({ title: '高级筛选开发中', icon: 'none' })
    } else if (key === 'subway') {
      wx.showToast({ title: '地铁图层开发中', icon: 'none' })
    } else if (key === 'around') {
      wx.showToast({ title: '周边配套开发中', icon: 'none' })
    }
  },

  // ── 区域筛选 ──────────────────────────────────────
  onDistrictSelect(e) {
    const district = e.currentTarget.dataset.district
    this.setData({ selectedDistrict: district, showDistrictPanel: false })
    this.loadMarkers(district)
  },

  // ── 地图缩放变化 ──────────────────────────────────
  onRegionChange(e) {
    if (e.type === 'end' && e.causedBy === 'scale') {
      this.setData({ currentScale: e.scale ? e.scale.toFixed(1) : this.data.currentScale })
    }
  },

  // ── 搜索 ──────────────────────────────────────────
  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value })
  },

  onSearch() {
    const kw = this.data.searchValue.trim()
    if (!kw) return
    const house = app.globalData.houseList.find(h => {
      return (h.neighborhood && h.neighborhood.includes(kw)) ||
        (h.locationName && h.locationName.includes(kw)) ||
        (h.address && h.address.includes(kw))
    })
    const coord = house ? getHouseCoord(house) : null
    if (house && coord) {
      const name = house.neighborhood
      this.setData({ mapLat: coord.latitude, mapLng: coord.longitude, scale: 14 })
      const houses = app.globalData.houseList.filter(h => h.neighborhood === name)
      this.setData({ showSheet: true, sheetNeighborhood: name, sheetHouses: houses })
    } else {
      wx.showToast({ title: '未找到该小区', icon: 'none' })
    }
  }
})
