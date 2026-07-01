// pages/favorites/favorites.js
const app = getApp()

Page({
  data: {
    favoriteHouses: [],
    loading: false
  },

  onShow() {
    this.loadFavorites()
  },

  loadFavorites() {
    this.setData({ loading: true })
    // 从云端重新拉取收藏 ID，再映射到本地缓存的房源数据
    app.reloadFavorites(() => {
      app.ensureHousesFresh(() => {
        const houses = app.getFavoriteHouses()
        this.setData({ favoriteHouses: houses, loading: false })
      })
    })
  },

  onHouseTap(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  onRemoveFavorite(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消收藏',
      content: '确定从收藏夹中移除该房源？',
      confirmText: '移除', confirmColor: '#FF3B30',
      success: res => {
        if (!res.confirm) return
        app.toggleFavorite(id, (isFavorited, error) => {
          if (error) {
            wx.showToast({ title: '移除失败，请检查网络后重试', icon: 'none' })
            return
          }
          const houses = app.getFavoriteHouses()
          this.setData({ favoriteHouses: houses })
          wx.showToast({ title: isFavorited ? '操作未完成' : '已取消收藏', icon: 'none' })
        })
      }
    })
  },

  onGoFind() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onPullDownRefresh() {
    this.loadFavorites()
    wx.stopPullDownRefresh()
  }
})
