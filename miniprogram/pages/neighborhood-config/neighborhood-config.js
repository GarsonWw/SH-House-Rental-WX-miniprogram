const app = getApp()

const CONFIG_FIELDS = [
  'neighborhoodNote',
  'neighborhoodReview',
  'neighborhoodCover',
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

const emptyForm = () => ({
  neighborhoodNote: '',
  neighborhoodReview: '',
  neighborhoodCover: '',
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
  const found = (houses || []).find(h => h && h[field])
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

Page({
  data: {
    loading: true,
    saving: false,
    neighborhoods: [],
    selectedName: '',
    selectedHouses: [],
    form: emptyForm(),
    completion: { filled: 0, total: CONFIG_FIELDS.length, percent: 0, width: '0%', missingText: '' },
    openSections: {
      basic: true,
      commute: false,
      conversion: false
    }
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
    this.loadNeighborhoods()
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
    app.getMyHouses((list, err) => {
      if (err) {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
        return
      }

      const grouped = {}
      ;(list || []).forEach(house => {
        const name = (house.neighborhood || '').trim()
        if (!name) return
        if (!grouped[name]) grouped[name] = []
        grouped[name].push(house)
      })

      const neighborhoods = Object.keys(grouped).map(name => {
        const houses = grouped[name]
        const cover = pickFirst(houses, 'neighborhoodCover') || pickFirst(houses, 'videoCover') || pickFirst(houses, 'images')
        const filledCount = CONFIG_FIELDS.filter(field => pickFirst(houses, field)).length
        return {
          name,
          district: pickFirst(houses, 'district') || '深圳罗湖',
          count: houses.length,
          available: houses.filter(h => h.available !== false).length,
          cover: Array.isArray(cover) ? cover[0] : cover,
          filledCount,
          progressText: filledCount ? `已配置 ${filledCount}/${CONFIG_FIELDS.length}` : '待配置'
        }
      })

      const selectedName = this.data.selectedName || (neighborhoods[0] && neighborhoods[0].name) || ''
      this.setData({ neighborhoods, loading: false, selectedName })
      if (selectedName) this.selectNeighborhood(selectedName, grouped[selectedName] || [])
    })
  },

  selectNeighborhood(name, houses) {
    const selectedHouses = houses || []
    const profile = app.getNeighborhoodProfile(name) || {}
    const form = emptyForm()
    CONFIG_FIELDS.forEach(field => {
      form[field] = profile[field] || pickFirst(selectedHouses, field) || form[field]
    })
    this.setData({
      selectedName: name,
      selectedHouses,
      form,
      completion: this.getCompletion(form)
    })
    wx.setNavigationBarTitle({ title: `${name}配置` })
  },

  onSelectNeighborhood(e) {
    const name = e.currentTarget.dataset.name
    const houses = this.data.neighborhoods.find(item => item.name === name)
    if (!houses) return
    app.getMyHouses((list) => {
      const selectedHouses = (list || []).filter(h => h.neighborhood === name)
      this.selectNeighborhood(name, selectedHouses)
    })
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    const form = { ...this.data.form, [field]: e.detail.value }
    this.setData({
      [`form.${field}`]: e.detail.value,
      completion: this.getCompletion(form)
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
    const types = roomTypeText(selectedHouses)
    const priceText = buildPriceText(selectedHouses)
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
      roomInsight: `${selectedName}已有${selectedHouses.length}套房源发布，可结合户型、楼层、朝向、照片和预算判断是否适合。`,
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

  onSave() {
    const { selectedName, selectedHouses, form, saving } = this.data
    if (saving) return
    if (!selectedName || !selectedHouses.length) {
      wx.showToast({ title: '请先选择小区', icon: 'none' })
      return
    }

    const payload = {}
    CONFIG_FIELDS.forEach(field => {
      payload[field] = (form[field] || '').trim ? form[field].trim() : form[field]
    })

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...' })

    app.saveNeighborhood(selectedName, payload, err => {
      if (!err) {
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: '已保存', icon: 'success' })
        this.loadNeighborhoods()
        return
      }
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: err.code === 'CONFLICT' ? '内容已更新，请刷新后重试' : '保存失败', icon: 'none' })
    })
  }
})
