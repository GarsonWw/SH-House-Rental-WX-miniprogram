// pages/messages/messages.js
const app = getApp()

Page({
  data: {
    favoriteHouses: []
  },

  onLoad() {
    app.onHouseListReady(() => this.loadFavoriteHouses())
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setData({ selected: 2 })
    this.loadFavoriteHouses()
  },

  loadFavoriteHouses() {
    app.reloadFavorites(() => {
      app.ensureHousesFresh(() => {
        const houses = app.getFavoriteHouses()
          .filter(house => house && house.available === true)
          .map(house => ({
            ...house,
            cover: house.images && house.images.length ? house.images[0] : '',
            consultTitle: `想咨询收藏房源：${house.neighborhood || '罗湖好房'} ${house.price || ''}元/月`
          }))
        this.setData({ favoriteHouses: houses })
      })
    })
  },

  onHouseTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    app.incrementViewCount(id)
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  noop() {}
})
