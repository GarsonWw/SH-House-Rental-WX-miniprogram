// pages/neighborhood/neighborhood.js
const app = getApp()

const PORT_GUIDES = [
  {
    name: '罗湖口岸',
    route: '罗湖口岸到港铁东铁线，适合香港中文大学、城市大学方向',
    duration: '约45-70分钟'
  },
  {
    name: '福田口岸',
    route: '福田口岸接驳落马洲，适合港岛、九龙塘方向',
    duration: '约55-85分钟'
  },
  {
    name: '深圳湾口岸',
    route: '巴士跨境到屯门、元朗、港岛，适合西部学校和实习通勤',
    duration: '约60-100分钟'
  },
  {
    name: '莲塘口岸',
    route: '罗湖东部过关选择，适合沙田、大埔及东铁线沿线',
    duration: '约50-80分钟'
  }
]

Page({
  data: {
    portGuides: PORT_GUIDES,
    featuredHouses: []
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setData({ selected: 1 })
    app.ensureHousesFresh(() => this.loadData())
  },

  loadData() {
    const houses = (app.globalData.houseList || [])
      .filter(h => h.available)
      .slice(0, 6)
    this.setData({
      featuredHouses: houses
    })
  },

  onScrollTo(e) {
    const target = e.currentTarget.dataset.target
    wx.pageScrollTo({ selector: `#${target}`, duration: 260 })
  },

  onGuideTap(e) {
    const name = e.currentTarget.dataset.name
    wx.showToast({ title: `${name}攻略待上传`, icon: 'none' })
  },

  onHouseTap(e) {
    const id = e.currentTarget.dataset.id
    app.incrementViewCount(id)
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  onPullDownRefresh() {
    app.refreshHouses(() => {
      this.loadData()
      wx.stopPullDownRefresh()
    })
  }
})
