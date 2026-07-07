// pages/detail/detail.js
const app = getApp()
const util = require('../../utils/util')
const consult = require('../../utils/consult')

const textPoint = value => value ? { label: '', value } : null
const withFallback = (value, fallback) => String(value || fallback).trim()
const buildRentReferencePoints = (house, priceReference) => [
  { label: '租金', value: priceReference },
  { label: '水电', value: withFallback(house.waterElectricFee, '以实际账单为准，建议看房时确认民水民电或商水商电。') },
  { label: '网费/宽带', value: withFallback(house.broadbandFee, '建议确认是否已包含在租金内，或是否需要租客自理。') },
  { label: '停车费', value: withFallback(house.parkingFee, '如需停车，建议咨询管家确认固定车位月租和临停标准。') }
]

Page({
  data: {
    houseId: '',
    house: null,
    isFavorited: false,
    showConsultModal: false,
    isGuideExpanded: false,
    favoritePending: false
  },

  normalizeHouse(house) {
    const fallbackReview = house.detailGuideSummary || house.detailGuideContent || house.description || '管家已实地核对房源状态、照片和居住体验，建议结合预算、通勤和入住时间一起判断。'
    const commuteInfo = house.commuteInfo || house.detailGuideTip || '通勤信息待补充，可在线咨询管家确认到口岸、学校或公司的实际路线。'
    const priceReference = house.priceReference || `${house.price || '面议'}元/月，具体租金会结合楼层、朝向、租期和入住时间浮动。`
    const rentReferencePoints = buildRentReferencePoints(house, priceReference)
    const environmentPoints = [
      { label: '安保', value: house.safetyInfo || '门禁、保安和夜间出入情况建议看房时重点确认。' },
      { label: '周边配套', value: house.surroundings || '餐饮、商超、地铁和口岸动线可结合实地看房确认。' },
      { label: '公区环境', value: house.publicAreaInfo || house.propertyType || house.buildingAttribute || '公区卫生、电梯、楼道和快递点以实地情况为准。' },
      { label: '停车场', value: house.parkingInfo || '是否有停车场、固定车位和临停入口，建议看房时同步确认。' },
      { label: '电动车充电', value: house.chargingInfo || house.evChargingInfo || '是否有充电桩及停车规范，可在线咨询管家确认。' }
    ]
    const basicFacts = [
      house.roomType,
      house.area ? `${house.area}㎡` : '',
      house.floor,
      house.orientation
    ].filter(Boolean)

    return {
      ...house,
      displayCreateTime: util.formatTime(house.createTime) || '刚刚',
      housekeeperName: '管家居居侠',
      basicFacts,
      reviewSections: [
        {
          type: 'scout',
          label: '实地测评',
          title: house.detailGuideTitle || house.scoutTitle || '管家实地测评',
          value: fallbackReview,
          points: [
            textPoint(house.detailGuideTip),
            textPoint(house.scoutAdvice),
            textPoint(house.suitableCrowd ? `适合：${house.suitableCrowd}` : '')
          ].filter(Boolean)
        },
        {
          type: 'commute',
          label: '通勤',
          title: house.commuteMode ? `${house.commuteMode}通勤参考` : '口岸与日常通勤',
          value: commuteInfo,
          points: []
        },
        {
          type: 'rent',
          label: '租金参考',
          title: `${house.price || '面议'}元/月`,
          value: '',
          points: rentReferencePoints
        },
        {
          type: 'environment',
          label: '小区环境',
          title: house.neighborhood || '小区环境',
          value: house.neighborhoodReview || '重点看安保、周边配套、公区环境、停车场和电动车充电条件。',
          points: environmentPoints
        }
      ]
    }
  },

  onLoad(options) {
    if (!options.id) return
    const id = options.id
    this._skipNextShow = true
    this.setData({ houseId: id })
    app.onHouseListReady(() => this.loadHouse(id))
    this.trackConsultView()
  },

  onShow() {
    this.startStatusPolling()
    if (this._skipNextShow) {
      this._skipNextShow = false
      return
    }
    if (this.data.houseId) {
      this.loadHouse(this.data.houseId)
      this.trackConsultView()
    }
  },

  onHide() {
    this.stopStatusPolling()
    this._consultTrackedThisVisit = false
  },

  onUnload() {
    this.stopStatusPolling()
  },

  startStatusPolling() {
    this.stopStatusPolling()
    this._statusTimer = setInterval(() => {
      if (this.data.houseId) this.loadHouse(this.data.houseId)
    }, 15000)
  },

  stopStatusPolling() {
    if (!this._statusTimer) return
    clearInterval(this._statusTimer)
    this._statusTimer = null
  },

  loadHouse(id) {
    app.getHouseFresh(id, (freshHouse, error) => {
      const house = freshHouse || app.getHouseById(id)
      if (!house) {
        wx.showToast({ title: '房源不存在', icon: 'error' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
      if (house.available !== true) {
        wx.showToast({ title: '该房源已下架', icon: 'none' })
        const neighborhood = encodeURIComponent(house.neighborhood || '')
        setTimeout(() => {
          if (neighborhood) {
            wx.redirectTo({ url: `/pages/neighborhood-detail/neighborhood-detail?name=${neighborhood}` })
          } else {
            wx.navigateBack()
          }
        }, 900)
        return
      }
      this.setData({ house: this.normalizeHouse(house), isFavorited: app.isFavorited(id) })
      wx.setNavigationBarTitle({ title: house.neighborhood + ' · 房源详情' })
      if (error) wx.showToast({ title: '当前展示缓存信息', icon: 'none' })
    })
  },

  trackConsultView() {
    if (this._consultTrackedThisVisit) return

    consult.recordDetailView(({ counted, shouldShow }) => {
      if (!counted) return
      this._consultTrackedThisVisit = true
      if (shouldShow) {
        this.setData({ showConsultModal: true })
      }
    })
  },

  onConsultDismiss() {
    this.setData({ showConsultModal: false })
  },

  // 拨打电话
  onPhoneCall() {
    const { house } = this.data
    if (!house.landlordPhone) {
      wx.showToast({ title: '暂无电话', icon: 'none' })
      return
    }
    wx.showModal({
      title: '电话咨询管家',
      content: house.landlordPhone,
      confirmText: '立即拨打',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: house.landlordPhone,
            fail: () => {
              wx.showToast({ title: '拨号失败', icon: 'none' })
            }
          })
        }
      }
    })
  },

  onToggleGuide() {
    this.setData({ isGuideExpanded: !this.data.isGuideExpanded })
  },

  noop() {},

  // 分享
  onShareAppMessage() {
    const { house } = this.data
    return {
      title: `${house.title} - ${house.price}元/月`,
      path: `/pages/detail/detail?id=${house.id}`
    }
  },

  onFavorite() {
    const { house } = this.data
    if (!house || this.data.favoritePending) return
    if (!app.globalData.openid) {
      wx.showToast({ title: '请先登录后收藏', icon: 'none' })
      return
    }
    this.setData({ favoritePending: true })
    app.toggleFavorite(house.id, (nowFav, error) => {
      this.setData({ favoritePending: false })
      if (error) {
        wx.showToast({ title: '收藏失败，请检查网络后重试', icon: 'none' })
        return
      }
      this.setData({ isFavorited: nowFav })
      wx.showToast({
        title: nowFav ? '已收藏' : '已取消收藏',
        icon: 'none',
        duration: 1500
      })
    })
  },

  // 跳转到小区页面
  onNeighborhoodTap() {
    const { house } = this.data
    wx.navigateTo({
      url: `/pages/neighborhood-detail/neighborhood-detail?name=${encodeURIComponent(house.neighborhood)}`
    })
  }
})
