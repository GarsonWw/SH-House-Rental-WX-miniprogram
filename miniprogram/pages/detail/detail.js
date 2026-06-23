// pages/detail/detail.js
const app = getApp()
const util = require('../../utils/util')

Page({
  data: {
    house: null,
    isFavorited: false,
    showContactModal: false,
    wechatCopied: false
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

    const tryLoad = () => {
      const house = app.getHouseById(id)
      if (house) {
        this.setData({ house: this.normalizeHouse(house), isFavorited: app.isFavorited(id) })
        wx.setNavigationBarTitle({ title: house.neighborhood + ' · 房源详情' })
      } else {
        // 缓存中没有，直接从云 DB 获取单条
        const db = wx.cloud.database()
        db.collection('houses').doc(id).get()
          .then(res => {
            const h = { ...res.data, id: res.data._id }
            this.setData({ house: this.normalizeHouse(h), isFavorited: app.isFavorited(id) })
            wx.setNavigationBarTitle({ title: h.neighborhood + ' · 房源详情' })
          })
          .catch(() => {
            wx.showToast({ title: '房源不存在', icon: 'error' })
            setTimeout(() => wx.navigateBack(), 1500)
          })
      }
    }

    app.onHouseListReady(tryLoad)
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
    if (!house) return
    const nowFav = app.toggleFavorite(house.id)
    this.setData({ isFavorited: nowFav })
    wx.showToast({
      title: nowFav ? '已收藏 ❤️' : '已取消收藏',
      icon: 'none',
      duration: 1500
    })
  },

  // 跳转到小区页面
  onNeighborhoodTap() {
    const { house } = this.data
    wx.navigateTo({
      url: `/pages/neighborhood/neighborhood?name=${encodeURIComponent(house.neighborhood)}`
    })
  }
})
