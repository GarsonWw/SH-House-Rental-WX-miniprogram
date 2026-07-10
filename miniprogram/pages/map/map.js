// pages/map/map.js
const app = getApp()
const locationUtil = require('../../utils/location.js')
const houseMatch = require('../../utils/houseMatch.js')
const DEFAULT_CENTER = { latitude: 22.5550, longitude: 114.1200, scale: 12 }

// 各小区近似坐标（深圳罗湖）
const COORDS = {
  '京基东方都会': { latitude: 22.5433, longitude: 114.1030 },
  '松园小区':     { latitude: 22.5559, longitude: 114.1078 },
  '深业东岭':     { latitude: 22.5526, longitude: 114.1425 },
  '华润银湖蓝山': { latitude: 22.5735, longitude: 114.0964 },
  '合正锦湖逸园': { latitude: 22.5610, longitude: 114.1266 }
}

const getHouseCoord = house => {
  const profile = getApp().getNeighborhoodProfile(house.neighborhood)
  if (profile) {
    const latitude = Number(profile.latitude)
    const longitude = Number(profile.longitude)
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude && longitude) {
      return { latitude, longitude }
    }
  }
  const latitude = Number(house.latitude)
  const longitude = Number(house.longitude)
  if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude && longitude) {
    return { latitude, longitude }
  }
  return COORDS[house.neighborhood]
}

// 右侧快捷图层
const LAYERS = [
  { key: 'district', label: '片区', icon: 'map' }
]

Page({
  data: {
    // 地图基础
    mapLat: DEFAULT_CENTER.latitude,
    mapLng: DEFAULT_CENTER.longitude,
    scale: DEFAULT_CENTER.scale,
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
    sheetAllHouses: [],
    sheetHouses: [],
    sheetTotalCount: 0,
    sheetMatchCount: 0,
    hasSheetMatchSearched: false,
    priceRanges: houseMatch.priceRangeLabels,
    roomTypes: houseMatch.ROOM_TYPES,
    selectedPriceIdx: 0,
    selectedRoomType: '不限',
    sheetDistrict: '',
    sheetPriceText: '',
    sheetAddress: '',
    sheetHasLocation: false,
    sheetLat: '',
    sheetLng: '',

    // 搜索
    searchValue: '',

    // 缩放级别展示
    currentScale: DEFAULT_CENTER.scale
  },

  onLoad() {
    app.onHouseListReady(() => this.loadMarkers())
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setData({ selected: 3 })
    app.ensureHousesFresh(() => this.loadMarkers(this.data.selectedDistrict))
  },

  // ── 构建地图 Markers ──────────────────────────────
  loadMarkers(districtFilter) {
    const houseList = app.globalData.houseList
    const availableHouses = houseList.filter(h => h.available === true)
    const nbMap = {}

    availableHouses.forEach(h => {
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
    const districts = app.getDistrictFilterOptions(availableHouses, '全部')

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

  buildSheetSummary(name, houses, coord) {
    const profile = app.getNeighborhoodProfile(name) || {}
    const sampleHouse = houses[0] || {}
    const district = app.resolveHouseDistrict({
      neighborhood: name,
      district: profile.district || sampleHouse.district,
      address: profile.address || sampleHouse.address,
      locationName: profile.locationName || sampleHouse.locationName
    })
    const prices = houses.map(h => Number(h.price)).filter(Boolean)
    const minPrice = prices.length ? Math.min(...prices) : 0
    const maxPrice = prices.length ? Math.max(...prices) : 0
    let priceText = ''
    if (minPrice || maxPrice) {
      priceText = minPrice === maxPrice ? `${minPrice}元/月起` : `${minPrice}-${maxPrice}元/月`
    }

    let latitude = Number(profile.latitude)
    let longitude = Number(profile.longitude)
    let address = String(profile.address || profile.locationName || sampleHouse.address || sampleHouse.locationName || '').trim()
    if ((!latitude || !longitude) && coord) {
      latitude = Number(coord.latitude)
      longitude = Number(coord.longitude)
    }
    const hasLocation = Number.isFinite(latitude) && latitude && Number.isFinite(longitude) && longitude
    return {
      sheetDistrict: district,
      sheetPriceText: priceText,
      sheetAddress: address,
      sheetHasLocation: hasLocation,
      sheetLat: hasLocation ? latitude : '',
      sheetLng: hasLocation ? longitude : ''
    }
  },

  openNeighborhoodSheet(name, houses, coord) {
    const summary = this.buildSheetSummary(name, houses, coord)
    const sheetAllHouses = houses || []
    const matchResults = houseMatch.filterHouses(sheetAllHouses, {
      neighborhood: name,
      priceIdx: 0,
      roomType: '不限'
    })
    const nextData = {
      showSheet: true,
      sheetNeighborhood: name,
      sheetAllHouses,
      sheetHouses: matchResults,
      sheetTotalCount: sheetAllHouses.length,
      sheetMatchCount: matchResults.length,
      hasSheetMatchSearched: true,
      selectedPriceIdx: 0,
      selectedRoomType: '不限',
      ...summary
    }
    if (coord && coord.latitude && coord.longitude) {
      nextData.mapLat = coord.latitude
      nextData.mapLng = coord.longitude
      nextData.scale = 14
      nextData.currentScale = 14
    }
    this.setData(nextData)
  },

  runSheetMatch(priceIdx, roomType) {
    const selectedPriceIdx = priceIdx !== undefined ? Number(priceIdx) : Number(this.data.selectedPriceIdx)
    const selectedRoomType = roomType !== undefined ? roomType : this.data.selectedRoomType
    const results = houseMatch.filterHouses(this.data.sheetAllHouses, {
      neighborhood: this.data.sheetNeighborhood,
      priceIdx: selectedPriceIdx,
      roomType: selectedRoomType
    })
    this.setData({
      selectedPriceIdx,
      selectedRoomType,
      sheetHouses: results,
      sheetMatchCount: results.length,
      hasSheetMatchSearched: true
    })
  },

  onSheetPriceSelect(e) {
    this.runSheetMatch(Number(e.currentTarget.dataset.idx))
  },

  onSheetRoomTypeSelect(e) {
    this.runSheetMatch(undefined, e.currentTarget.dataset.type)
  },

  // ── 点击 Marker ───────────────────────────────────
  onMarkerTap(e) {
    const markerId = e.detail.markerId
    const marker = this.data.markers.find(m => m.id === markerId)
    if (!marker) return
    const name = marker._name
    const houses = app.globalData.houseList.filter(h => h.neighborhood === name && h.available === true)
    this.openNeighborhoodSheet(name, houses, {
      latitude: marker.latitude,
      longitude: marker.longitude
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

  onOpenSheetDetail() {
    const name = this.data.sheetNeighborhood
    if (!name) return
    wx.navigateTo({
      url: `/pages/neighborhood-detail/neighborhood-detail?name=${encodeURIComponent(name)}`
    })
  },

  onOpenSheetMap() {
    const { sheetNeighborhood, sheetHasLocation, sheetLat, sheetLng, sheetAddress } = this.data
    if (!sheetHasLocation) {
      wx.showToast({ title: '请先在小区配置中设置地图位置', icon: 'none' })
      return
    }
    locationUtil.openMapLocation({
      latitude: sheetLat,
      longitude: sheetLng,
      name: sheetNeighborhood,
      address: sheetAddress
    })
  },

  // ── 点击房源 → 详情 ───────────────────────────────
  onHouseTap(e) {
    const id = e.currentTarget.dataset.id
    app.incrementViewCount(id)
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  // ── 拨打电话 ──────────────────────────────────────
  onPhoneCall(e) {
    const phone = e.currentTarget.dataset.phone
    const name = e.currentTarget.dataset.name
    if (!phone) {
      wx.showToast({ title: '暂无联系电话', icon: 'none' })
      return
    }
    wx.showModal({
      title: `联系 ${name}`,
      content: phone,
      confirmText: '立即拨打',
      success: res => {
        if (res.confirm) wx.makePhoneCall({ phoneNumber: phone })
      }
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
    }
  },

  onResetMap() {
    this.setData({
      mapLat: DEFAULT_CENTER.latitude,
      mapLng: DEFAULT_CENTER.longitude,
      scale: DEFAULT_CENTER.scale,
      currentScale: DEFAULT_CENTER.scale,
      showSheet: false,
      showDistrictPanel: false,
      activeLayer: ''
    })
    const mapCtx = wx.createMapContext('myMap', this)
    if (mapCtx && mapCtx.moveToLocation) {
      mapCtx.moveToLocation({
        latitude: DEFAULT_CENTER.latitude,
        longitude: DEFAULT_CENTER.longitude
      })
    }
  },

  // ── 罗湖片区筛选 ──────────────────────────────────
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
    const house = app.globalData.houseList.find(h => h.available === true && (
      (h.neighborhood && h.neighborhood.includes(kw)) ||
        (h.locationName && h.locationName.includes(kw)) ||
        (h.address && h.address.includes(kw))
    ))
    const coord = house ? getHouseCoord(house) : null
    if (house && coord) {
      const name = house.neighborhood
      const houses = app.globalData.houseList.filter(h => h.neighborhood === name && h.available === true)
      this.openNeighborhoodSheet(name, houses, coord)
    } else {
      wx.showToast({ title: '未找到该小区', icon: 'none' })
    }
  }
})
