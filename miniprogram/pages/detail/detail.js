// pages/detail/detail.js
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    houseId: '',
    house: null,
    isFavorited: false,
    showContactModal: false,
    wechatCopied: false,
    isGuideExpanded: false,
    favoritePending: false
  },

  normalizeHouse(house) {
    return {
      ...house,
      displayCreateTime: util.formatTime(house.createTime) || '刚刚'
    }
  },

  onLoad(options) {
    if (!options.id) return
    const id = options.id
    this._skipNextShow = true
    this.setData({ houseId: id })
    app.onHouseListReady(() => this.loadHouse(id))
  },

  onShow() {
    this.startStatusPolling()
    if (this._skipNextShow) {
      this._skipNextShow = false
      return
    }
    if (this.data.houseId) this.loadHouse(this.data.houseId)
  },

  onHide() {
    this.stopStatusPolling()
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
      this.setData({ house: this.normalizeHouse(house), isFavorited: app.isFavorited(id) })
      wx.setNavigationBarTitle({ title: house.neighborhood + ' · 房源详情' })
      if (error) wx.showToast({ title: '当前展示缓存信息', icon: 'none' })
    })
  },

  // 拨打电话
  onPhoneCall() {
    const { house } = this.data
    if (!house.landlordPhone) {
      wx.showToast({ title: '暂无电话', icon: 'none' })
      return
    }
    wx.showModal({
      title: `拨打 ${house.landlordName} 的电话`,
      content: `📞 ${house.landlordPhone}`,
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

  // 复制微信号
  onCopyWechat() {
    const { house } = this.data
    if (!house.landlordWechat) {
      wx.showToast({ title: '暂无微信号', icon: 'none' })
      return
    }
    this.setData({ showContactModal: true })
  },

  onConfirmWechat() {
    const { house } = this.data
    wx.setClipboardData({
      data: house.landlordWechat,
      success: () => {
        this.setData({ showContactModal: false, wechatCopied: true })
        wx.showToast({
          title: '微信号已复制',
          icon: 'success',
          duration: 2000
        })
        setTimeout(() => this.setData({ wechatCopied: false }), 3000)
      }
    })
  },

  onCloseModal() {
    this.setData({ showContactModal: false })
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
        title: nowFav ? '已收藏 ❤️' : '已取消收藏',
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
