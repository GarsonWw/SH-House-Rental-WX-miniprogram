const app = getApp()
const locationUtil = require('../../utils/location')

const CONFIG_FIELDS = [
  'neighborhoodNote',
  'neighborhoodReview',
  'neighborhoodSlogan',
  'commuteInfo',
  'commuteMode',
  'safetyInfo',
  'propertyType',
  'parkingInfo',
  'deliveryInfo',
  'shortRentInfo',
  'roomInsight',
  'priceReference',
  'waterElectricFee',
  'broadbandFee',
  'parkingFee',
  'surroundings',
  'suitableCrowd',
  'scoutTitle',
  'scoutSummary',
  'scoutAdvice'
]

const RECOMMENDED_FIELDS = [
  'neighborhoodSlogan',
  'commuteInfo',
  'propertyType',
  'parkingInfo',
  'priceReference',
  'waterElectricFee',
  'broadbandFee',
  'parkingFee',
  'scoutSummary'
]

const FIELD_LABELS = {
  neighborhoodSlogan: '顶部宣传语',
  commuteInfo: '通勤信息',
  propertyType: '居住类型',
  parkingInfo: '停车场情况',
  priceReference: '价格参考',
  waterElectricFee: '水电费',
  broadbandFee: '网费宽带',
  parkingFee: '停车费',
  scoutSummary: '测评总结'
}

const DISTRICT_OPTIONS = ['罗湖口岸', '国贸', '东门', '黄贝岭', '翠竹', '笋岗', '银湖', '蔡屋围', '莲塘', '水贝', '布心', '清水河', '其他片区']
const MAX_NEIGHBORHOOD_IMAGES = 15
const MAX_VIDEO_DURATION = 120

const isCloudMedia = path => path && (path.startsWith('cloud://') || path.startsWith('http'))

const emptyMedia = () => ({
  images: [],
  videos: [],
  videoCover: ''
})

const emptyLocation = () => ({
  district: '',
  latitude: '',
  longitude: '',
  locationName: '',
  address: '',
  districtPickerIndex: 0
})

const loadLocationFromProfile = (profile, houses, neighborhoodName = '') => {
  const source = profile || {}
  const resolvedDistrict = app.resolveHouseDistrict({
    neighborhood: neighborhoodName,
    district: source.district || pickFirst(houses, 'district') || '',
    address: source.address || '',
    locationName: source.locationName || pickFirst(houses, 'locationName') || ''
  })
  const district = DISTRICT_OPTIONS.includes(resolvedDistrict) ? resolvedDistrict : ''
  const districtPickerIndex = district ? DISTRICT_OPTIONS.indexOf(district) : 0
  return {
    district,
    latitude: source.latitude !== undefined && source.latitude !== null && source.latitude !== ''
      ? String(source.latitude)
      : (pickFirst(houses, 'latitude') ? String(pickFirst(houses, 'latitude')) : ''),
    longitude: source.longitude !== undefined && source.longitude !== null && source.longitude !== ''
      ? String(source.longitude)
      : (pickFirst(houses, 'longitude') ? String(pickFirst(houses, 'longitude')) : ''),
    locationName: source.locationName || pickFirst(houses, 'locationName') || '',
    address: source.address || '',
    districtPickerIndex: districtPickerIndex >= 0 ? districtPickerIndex : 0
  }
}

const emptyForm = () => ({
  neighborhoodNote: '',
  neighborhoodReview: '',
  neighborhoodSlogan: '',
  commuteInfo: '',
  commuteMode: '步行',
  safetyInfo: '',
  propertyType: '',
  parkingInfo: '',
  deliveryInfo: '',
  shortRentInfo: '',
  roomInsight: '',
  priceReference: '',
  waterElectricFee: '',
  broadbandFee: '',
  parkingFee: '',
  surroundings: '',
  suitableCrowd: '',
  scoutTitle: '',
  scoutSummary: '',
  scoutAdvice: ''
})

const pickFirst = (houses, field) => {
  const found = (houses || []).find(h => {
    if (!h) return false
    const value = h[field]
    return value !== undefined && value !== null && value !== ''
  })
  return found ? found[field] : ''
}

const buildPriceText = houses => {
  const prices = (houses || []).map(h => Number(h.price)).filter(Boolean)
  if (!prices.length) return ''
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? `${min}元/月左右` : `${min}-${max}元/月`
}

const roomTypeText = houses => {
  const roomTypes = [...new Set((houses || []).map(h => h.roomType).filter(Boolean))]
  return roomTypes.slice(0, 4).join(' / ')
}

const loadMediaFromProfile = (profile, houses) => {
  const source = profile || {}
  let images = Array.isArray(source.neighborhoodImages) ? [...source.neighborhoodImages] : []
  if (!images.length && source.neighborhoodCover) images = [source.neighborhoodCover]
  if (!images.length) {
    const cover = pickFirst(houses, 'neighborhoodCover') || pickFirst(houses, 'videoCover') || pickFirst(houses, 'images')
    if (cover) images = Array.isArray(cover) ? [cover[0]] : [cover]
  }
  return {
    images,
    videos: Array.isArray(source.neighborhoodVideos) ? [...source.neighborhoodVideos] : [],
    videoCover: source.neighborhoodVideoCover || ''
  }
}

const countProfileFields = profile => CONFIG_FIELDS.filter(field => {
  const value = profile && profile[field]
  return value !== undefined && value !== null && String(value).trim()
}).length

Page({
  data: {
    loading: true,
    saving: false,
    deleting: false,
    neighborhoods: [],
    selectedName: '',
    selectedHouses: [],
    form: emptyForm(),
    media: emptyMedia(),
    location: emptyLocation(),
    completion: { filled: 0, total: CONFIG_FIELDS.length, percent: 0, width: '0%', missingText: '' },
    openSections: {
      basic: true,
      commute: false,
      conversion: false
    },
    showAddModal: false,
    addSaving: false,
    newNeighborhoodName: '',
    newNeighborhoodDistrict: '',
    newNeighborhoodDistrictIndex: 0,
    districtOptions: DISTRICT_OPTIONS,
    savingLocation: false,
    savingDistrict: false,
    savedDistrict: '',
    choosingLocation: false,
    editingName: '',
    renaming: false,
    nameDuplicateHint: ''
  },

  onLoad(options = {}) {
    const selectedName = options.name ? decodeURIComponent(options.name) : ''
    this.setData({ selectedName })
    app.requireLandlord((isLandlord, error) => {
      if (!isLandlord) {
        wx.showModal({
          title: '无权访问',
          content: error ? error.message : '当前微信账号不在管理员名单中',
          showCancel: false,
          success: () => wx.navigateBack()
        })
        return
      }
      this.loadNeighborhoods()
    })
  },

  onShow() {
    if (!app.globalData.isLandlord) return
    // 从地图选点返回时会触发 onShow，不能在这里全量刷新，否则刚选的位置会被旧数据覆盖
    if (this.data.choosingLocation) {
      this.setData({ choosingLocation: false })
      return
    }
  },

  loadNeighborhoods() {
    if (!app.globalData.isLandlord) {
      wx.showModal({
        title: '无权访问',
        content: '请先从“我的”页面进入管理模式。',
        showCancel: false,
        success: () => wx.navigateBack()
      })
      return
    }

    this.setData({ loading: true })
    app.ensureHousesFresh((err) => {
      if (err) {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
        return
      }

      const grouped = {}
      ;(app.globalData.houseList || []).forEach(house => {
        const name = (house.neighborhood || '').trim()
        if (!name) return
        if (!grouped[name]) grouped[name] = []
        grouped[name].push(house)
      })

      const neighborhoods = app.getMergedNeighborhoodSummaries().map(entry => {
        const houses = grouped[entry.name] || []
        const profile = app.getNeighborhoodProfile(entry.name) || {}
        const cover = (profile.neighborhoodImages && profile.neighborhoodImages[0])
          || profile.neighborhoodCover
          || pickFirst(houses, 'neighborhoodCover')
          || pickFirst(houses, 'videoCover')
          || pickFirst(houses, 'images')
        const filledCount = countProfileFields(profile)
        return {
          name: entry.name,
          district: entry.district || pickFirst(houses, 'district') || '深圳罗湖',
          count: entry.count,
          available: entry.available,
          hasProfile: entry.hasProfile,
          cover: Array.isArray(cover) ? cover[0] : cover,
          filledCount,
          progressText: filledCount ? `已配置 ${filledCount}/${CONFIG_FIELDS.length}` : '待配置'
        }
      })

      const selectedName = this.data.selectedName && neighborhoods.some(item => item.name === this.data.selectedName)
        ? this.data.selectedName
        : (neighborhoods[0] && neighborhoods[0].name) || ''
      this.setData({ neighborhoods, loading: false, selectedName })
      if (selectedName) this.selectNeighborhood(selectedName, grouped[selectedName] || [])
    }, 0)
  },

  selectNeighborhood(name, houses) {
    const selectedHouses = houses || []
    const profile = app.getNeighborhoodProfile(name) || {}
    const form = emptyForm()
    CONFIG_FIELDS.forEach(field => {
      form[field] = profile[field] || pickFirst(selectedHouses, field) || form[field]
    })
    const location = loadLocationFromProfile(profile, selectedHouses, name)
    this.setData({
      selectedName: name,
      editingName: name,
      nameDuplicateHint: '',
      selectedHouses,
      form,
      media: loadMediaFromProfile(profile, selectedHouses),
      location,
      savedDistrict: location.district,
      completion: this.getCompletion(form)
    })
    wx.setNavigationBarTitle({ title: `${name}配置` })
  },

  onSelectNeighborhood(e) {
    const name = e.currentTarget.dataset.name
    if (!name) return
    const selectedHouses = (app.globalData.houseList || []).filter(h => h.neighborhood === name)
    this.selectNeighborhood(name, selectedHouses)
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    const form = { ...this.data.form, [field]: e.detail.value }
    this.setData({
      [`form.${field}`]: e.detail.value,
      completion: this.getCompletion(form)
    })
  },

  onEditingNameInput(e) {
    const value = e.detail.value
    const duplicate = app.isNeighborhoodNameTaken(value, this.data.selectedName)
    this.setData({
      editingName: value,
      nameDuplicateHint: duplicate ? '该名称已存在，请换一个名称' : ''
    })
  },

  onSaveNeighborhoodName() {
    const { selectedName, editingName, renaming } = this.data
    if (renaming) return
    const nextName = (editingName || '').trim()
    if (!nextName) {
      wx.showToast({ title: '请输入小区名称', icon: 'none' })
      return
    }
    if (nextName === selectedName) {
      wx.showToast({ title: '名称未修改', icon: 'none' })
      return
    }
    if (app.isNeighborhoodNameTaken(nextName, selectedName)) {
      wx.showToast({ title: '该小区名称已存在', icon: 'none' })
      return
    }

    wx.showModal({
      title: '修改小区名称',
      content: `确定将「${selectedName}」改名为「${nextName}」吗？该小区下全部房源会同步更新。`,
      success: res => {
        if (!res.confirm) return
        this.setData({ renaming: true })
        wx.showLoading({ title: '保存名称中...' })
        app.renameNeighborhood(selectedName, nextName, err => {
          wx.hideLoading()
          this.setData({ renaming: false })
          if (err) {
            const tip = err.code === 'NAME_TAKEN'
              ? '该小区名称已存在'
              : (err.message || '改名失败')
            wx.showToast({ title: tip, icon: 'none', duration: 2500 })
            return
          }
          wx.showToast({ title: '名称已更新', icon: 'success' })
          this.setData({ selectedName: nextName, editingName: nextName }, () => this.loadNeighborhoods())
        })
      }
    })
  },

  onLocationAddressInput(e) {
    this.setData({ 'location.address': e.detail.value })
  },

  onEditorDistrictChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      'location.districtPickerIndex': idx,
      'location.district': DISTRICT_OPTIONS[idx] || ''
    })
  },

  onSaveDistrict() {
    if (this.data.savingDistrict || this.data.savingLocation || this.data.saving) return
    const { selectedName, location, savedDistrict } = this.data
    if (!selectedName) {
      wx.showToast({ title: '请先选择小区', icon: 'none' })
      return
    }
    if (!DISTRICT_OPTIONS.includes(location.district)) {
      wx.showToast({ title: '请选择罗湖片区', icon: 'none' })
      return
    }
    if (location.district === savedDistrict) {
      wx.showToast({ title: '片区未修改', icon: 'none' })
      return
    }
    this.setData({ savingDistrict: true })
    wx.showLoading({ title: '保存片区中...' })
    app.saveNeighborhood(selectedName, { district: location.district }, (err, profile) => {
      wx.hideLoading()
      this.setData({ savingDistrict: false })
      if (!err) {
        wx.showToast({ title: '片区已更新', icon: 'success' })
        const name = this.data.selectedName
        const selectedHouses = (app.globalData.houseList || []).filter(h => h.neighborhood === name)
        const nextLocation = loadLocationFromProfile(profile || app.getNeighborhoodProfile(name), selectedHouses, name)
        this.setData({
          savedDistrict: nextLocation.district,
          location: nextLocation
        }, () => this.loadNeighborhoods())
        return
      }
      const tip = err.code === 'CONFLICT'
        ? '内容已更新，请刷新后重试'
        : (err.message || '保存失败')
      wx.showToast({ title: tip, icon: 'none', duration: 2500 })
    })
  },

  onChooseNeighborhoodLocation() {
    if (!this.data.selectedName) {
      wx.showToast({ title: '请先选择小区', icon: 'none' })
      return
    }
    const location = this.data.location || emptyLocation()
    const latitude = Number(location.latitude) || locationUtil.DEFAULT_CENTER.latitude
    const longitude = Number(location.longitude) || locationUtil.DEFAULT_CENTER.longitude
    this.setData({ choosingLocation: true })
    locationUtil.chooseMapLocation({
      latitude,
      longitude,
      success: res => {
        const nextData = {
          choosingLocation: false,
          'location.latitude': String(res.latitude),
          'location.longitude': String(res.longitude),
          'location.locationName': res.name || location.locationName || this.data.selectedName || ''
        }
        const currentAddress = String(location.address || '').trim()
        if (!currentAddress && res.address) {
          nextData['location.address'] = res.address
        }
        this.setData(nextData)
        wx.showToast({ title: '位置已选择，请点击保存位置', icon: 'none', duration: 2200 })
      },
      fail: err => {
        this.setData({ choosingLocation: false })
        if (err && err.errMsg && err.errMsg.includes('cancel')) return
        const msg = (err && err.errMsg) || ''
        if (msg.includes('privacy') || msg.includes('Privacy')) {
          wx.showToast({ title: '需同意隐私政策后才能选点', icon: 'none', duration: 2500 })
          return
        }
        if (msg.includes('auth deny') || msg.includes('authorize')) {
          wx.showModal({
            title: '需要位置权限',
            content: '请允许「选择位置」权限，才能在地图上标注小区位置。',
            confirmText: '去设置',
            success: res => {
              if (res.confirm) wx.openSetting({})
            }
          })
          return
        }
        wx.showToast({ title: '选择位置失败，请在真机上重试', icon: 'none', duration: 2500 })
      }
    })
  },

  onPreviewLocation() {
    const { location, selectedName } = this.data
    const opened = locationUtil.openMapLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.locationName || selectedName,
      address: location.address
    })
    if (!opened) {
      wx.showToast({ title: '请先选择地图位置', icon: 'none' })
    }
  },

  buildLocationPayload() {
    const { selectedName, location } = this.data
    if (!selectedName) {
      wx.showToast({ title: '请先选择小区', icon: 'none' })
      return null
    }
    if (!DISTRICT_OPTIONS.includes(location.district)) {
      wx.showToast({ title: '请选择罗湖片区', icon: 'none' })
      return null
    }
    const latitude = Number(location.latitude)
    const longitude = Number(location.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      wx.showToast({ title: '请选择小区地图位置', icon: 'none' })
      return null
    }
    return {
      district: location.district,
      latitude,
      longitude,
      locationName: (location.locationName || selectedName).trim(),
      address: (location.address || '').trim()
    }
  },

  onSaveLocation() {
    if (this.data.savingLocation || this.data.saving) return
    const payload = this.buildLocationPayload()
    if (!payload) return
    this.setData({ savingLocation: true })
    wx.showLoading({ title: '保存位置中...' })
    app.saveNeighborhood(this.data.selectedName, payload, (err, profile) => {
      wx.hideLoading()
      this.setData({ savingLocation: false })
      if (!err) {
        wx.showToast({ title: '位置已保存', icon: 'success' })
        const name = this.data.selectedName
        const selectedHouses = (app.globalData.houseList || []).filter(h => h.neighborhood === name)
        const nextLocation = loadLocationFromProfile(profile || app.getNeighborhoodProfile(name), selectedHouses, name)
        this.setData({
          savedDistrict: nextLocation.district,
          location: nextLocation
        })
        return
      }
      const tip = err.code === 'CONFLICT'
        ? '内容已更新，请刷新后重试'
        : (err.message || '保存失败')
      wx.showToast({ title: tip, icon: 'none', duration: 2500 })
    })
  },

  onToggleSection(e) {
    const { section } = e.currentTarget.dataset
    this.setData({ [`openSections.${section}`]: !this.data.openSections[section] })
  },

  onPreviewNeighborhood() {
    if (!this.data.selectedName) return
    wx.navigateTo({
      url: `/pages/neighborhood-detail/neighborhood-detail?name=${encodeURIComponent(this.data.selectedName)}`
    })
  },

  onOpenAddModal() {
    this.setData({
      showAddModal: true,
      newNeighborhoodName: '',
      newNeighborhoodDistrict: DISTRICT_OPTIONS[0],
      newNeighborhoodDistrictIndex: 0
    })
  },

  onCloseAddModal() {
    if (this.data.addSaving) return
    this.setData({ showAddModal: false })
  },

  noop() {},

  onAddNameInput(e) {
    this.setData({ newNeighborhoodName: e.detail.value })
  },

  onAddDistrictChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      newNeighborhoodDistrictIndex: idx,
      newNeighborhoodDistrict: DISTRICT_OPTIONS[idx]
    })
  },

  onConfirmAddNeighborhood() {
    if (this.data.addSaving) return
    const name = (this.data.newNeighborhoodName || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入小区名称', icon: 'none' })
      return
    }
    if (app.isNeighborhoodNameTaken(name)) {
      wx.showToast({ title: '该小区已存在，请直接选择', icon: 'none' })
      return
    }

    const district = this.data.newNeighborhoodDistrict || DISTRICT_OPTIONS[0]
    this.setData({ addSaving: true })
    wx.showLoading({ title: '创建中...' })

    app.saveNeighborhood(name, { district }, (err) => {
      wx.hideLoading()
      this.setData({ addSaving: false })
      if (err) {
        wx.showToast({ title: '创建失败', icon: 'none' })
        return
      }
      this.setData({ showAddModal: false, selectedName: name })
      wx.showToast({ title: '小区已创建', icon: 'success' })
      this.loadNeighborhoods()
    })
  },

  onDeleteNeighborhood() {
    const { selectedName, selectedHouses, deleting } = this.data
    if (deleting || !selectedName) return

    if (selectedHouses.length > 0) {
      wx.showModal({
        title: '无法删除',
        content: `「${selectedName}」下仍有 ${selectedHouses.length} 套房源。请先在发布页修改这些房源的小区归属，再删除小区配置。`,
        showCancel: false
      })
      return
    }

    wx.showModal({
      title: '删除小区配置',
      content: `确定删除「${selectedName}」的配置资料吗？仅删除描述内容，不影响任何房源。`,
      confirmText: '删除',
      confirmColor: '#D64545',
      success: res => {
        if (!res.confirm) return
        this.setData({ deleting: true })
        wx.showLoading({ title: '删除中...' })
        app.deleteNeighborhood(selectedName, err => {
          wx.hideLoading()
          this.setData({ deleting: false })
          if (err) {
            const message = err.code === 'HAS_HOUSES'
              ? err.message
              : '删除失败'
            wx.showModal({ title: '删除失败', content: message, showCancel: false })
            return
          }
          wx.showToast({ title: '已删除', icon: 'success' })
          this.setData({ selectedName: '' })
          this.loadNeighborhoods()
        })
      }
    })
  },

  getCompletion(form = this.data.form) {
    const filled = CONFIG_FIELDS.filter(field => {
      const value = form[field]
      return value !== undefined && value !== null && String(value).trim()
    }).length
    const missing = RECOMMENDED_FIELDS
      .filter(field => !String(form[field] || '').trim())
      .map(field => FIELD_LABELS[field])
    const percent = Math.round(filled / CONFIG_FIELDS.length * 100)
    return {
      filled,
      total: CONFIG_FIELDS.length,
      percent,
      width: `${percent}%`,
      missingText: missing.length ? `建议优先补充：${missing.join('、')}` : '核心信息已经比较完整，可以按需继续补充细节。'
    }
  },

  buildStarterTemplate() {
    const { selectedName, selectedHouses } = this.data
    const district = pickFirst(selectedHouses, 'district') || '深圳罗湖'
    const priceText = buildPriceText(selectedHouses)
    const houseCountText = selectedHouses.length ? `已有${selectedHouses.length}套房源发布` : '可先完善小区介绍，再发布对应房源'
    return {
      neighborhoodNote: `${selectedName}位于${district}，适合先看通勤和预算再决定是否约看。`,
      neighborhoodSlogan: '罗湖直租 · 免中介费 · 适合深港通勤',
      commuteInfo: '建议结合地图位置确认到罗湖口岸、地铁站或上班地点的实际通勤时间。',
      commuteMode: '步行 / 地铁',
      safetyInfo: '建议看房时确认门禁、保安、夜间出入和楼栋公共区域情况。',
      propertyType: pickFirst(selectedHouses, 'buildingAttribute') || pickFirst(selectedHouses, 'propertyType') || '住宅小区房',
      parkingInfo: '停车场情况建议看房时确认，如是否有地下/地面停车场、固定车位和临停入口。',
      deliveryInfo: '外卖、快递情况建议看房时同步确认，可重点关注是否能送上楼。',
      shortRentInfo: '短租情况请以管家实际沟通为准。',
      roomInsight: `${selectedName}${houseCountText}，可结合户型、楼层、朝向、照片和预算判断是否适合。`,
      priceReference: priceText || '价格参考可结合当前在租房源更新。',
      waterElectricFee: '水电费以实际账单为准，建议确认民水民电或商水商电。',
      broadbandFee: '宽带/网费是否包含在租金内，建议看房时同步确认。',
      parkingFee: '如需停车，建议咨询管家确认固定车位月租和临停标准。',
      surroundings: '周边配套建议结合实地看房确认餐饮、超市、交通和生活便利度。',
      suitableCrowd: '罗湖上班族 / 深港通勤 / 预算明确 / 省心找房',
      scoutTitle: `${selectedName}实探说明`,
      scoutSummary: `${selectedName}适合优先关注罗湖通勤、预算和居住便利度的租客。建议先确认通勤时间、噪音、采光、水电收费和押付方式，再决定是否约看。`,
      scoutAdvice: '看房时建议重点确认：通勤路线、楼层采光、噪音来源、水电收费、押付方式和是否可短租。'
    }
  },

  applyTemplate(template, onlyEmpty = true) {
    const nextForm = { ...this.data.form }
    Object.keys(template).forEach(field => {
      if (!CONFIG_FIELDS.includes(field)) return
      if (onlyEmpty && String(nextForm[field] || '').trim()) return
      nextForm[field] = template[field]
    })
    this.setData({
      form: nextForm,
      completion: this.getCompletion(nextForm)
    })
  },

  onApplyStarterTemplate() {
    this.applyTemplate(this.buildStarterTemplate(), true)
    this.setData({
      openSections: { basic: true, commute: true, conversion: false }
    })
    wx.showToast({ title: '已填入空白项', icon: 'success' })
  },

  onApplyCommonDefaults() {
    this.applyTemplate({
      safetyInfo: '建议看房时确认门禁、保安、夜间出入和楼栋公共区域情况。',
      deliveryInfo: '外卖、快递情况建议看房时同步确认，可重点关注是否能送上楼。',
      shortRentInfo: '短租情况请以管家实际沟通为准。',
      suitableCrowd: '罗湖上班族 / 深港通勤 / 预算明确 / 省心找房'
    }, true)
    wx.showToast({ title: '已补充常用项', icon: 'success' })
  },

  onChooseCoverImage() {
    const current = this.data.media.images.length
    if (current >= MAX_NEIGHBORHOOD_IMAGES) {
      wx.showToast({ title: `最多上传${MAX_NEIGHBORHOOD_IMAGES}张`, icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: MAX_NEIGHBORHOOD_IMAGES - current,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ 'media.images': [...this.data.media.images, ...newImages] })
      },
      fail: err => {
        if (err && err.errMsg && err.errMsg.includes('cancel')) return
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    })
  },

  onDeleteCoverImage(e) {
    const { index } = e.currentTarget.dataset
    const images = [...this.data.media.images]
    images.splice(index, 1)
    this.setData({ 'media.images': images })
  },

  onChooseNeighborhoodVideo() {
    if ((this.data.media.videos || []).length >= 1) {
      wx.showToast({ title: '最多上传1个视频', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: MAX_VIDEO_DURATION,
      camera: 'back',
      success: res => {
        const file = res.tempFiles[0]
        if (file.duration > MAX_VIDEO_DURATION) {
          wx.showToast({ title: `视频不能超过${MAX_VIDEO_DURATION}秒`, icon: 'none', duration: 2000 })
          return
        }
        this.setData({
          'media.videos': [file.tempFilePath],
          'media.videoCover': file.thumbTempFilePath || ''
        })
      },
      fail: err => {
        if (err && err.errMsg && err.errMsg.includes('cancel')) return
        wx.showToast({ title: '选择视频失败', icon: 'none' })
      }
    })
  },

  onDeleteNeighborhoodVideo() {
    this.setData({ 'media.videos': [], 'media.videoCover': '' })
  },

  onSave() {
    const { selectedName, form, media, saving } = this.data
    if (saving) return
    const locationPayload = this.buildLocationPayload()
    if (!locationPayload) return

    const payload = { ...locationPayload }

    CONFIG_FIELDS.forEach(field => {
      payload[field] = (form[field] || '').trim ? form[field].trim() : form[field]
    })

    const tempImages = (media.images || []).filter(path => !isCloudMedia(path))
    const cloudImages = (media.images || []).filter(isCloudMedia)
    const tempVideos = (media.videos || []).filter(path => !isCloudMedia(path))
    const cloudVideos = (media.videos || []).filter(isCloudMedia)

    this.setData({ saving: true })
    wx.showLoading({ title: '上传封面中...' })

    app.uploadImages(tempImages, (imgIDs, imgErr) => {
      if (imgErr) {
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: '封面上传失败', icon: 'none' })
        return
      }

      wx.showLoading({ title: '上传视频中...' })
      app.uploadImages(tempVideos, (vidIDs, vidErr) => {
        if (vidErr) {
          wx.hideLoading()
          this.setData({ saving: false })
          app.deleteUploadedFiles(imgIDs, () => {
            wx.showToast({ title: '视频上传失败', icon: 'none' })
          })
          return
        }

        wx.showLoading({ title: '保存中...' })
        const finalImages = [...cloudImages, ...imgIDs]
        payload.neighborhoodImages = finalImages
        payload.neighborhoodCover = finalImages[0] || ''
        payload.neighborhoodVideos = [...cloudVideos, ...vidIDs]
        payload.neighborhoodVideoCover = isCloudMedia(media.videoCover) ? media.videoCover : ''

        app.saveNeighborhood(selectedName, payload, err => {
          wx.hideLoading()
          this.setData({ saving: false })
          if (!err) {
            wx.showToast({ title: '已保存', icon: 'success' })
            this.loadNeighborhoods()
            return
          }
          app.deleteUploadedFiles([...imgIDs, ...vidIDs], () => {})
          const tip = err.code === 'CONFLICT'
            ? '内容已更新，请刷新后重试'
            : (err.message || '保存失败')
          wx.showToast({ title: tip, icon: 'none', duration: 2500 })
        })
      }, 'neighborhoods')
    }, 'neighborhoods')
  }
})
