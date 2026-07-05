Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '找房' },
      { pagePath: '/pages/neighborhood/neighborhood', text: '小区' },
      { pagePath: '/pages/map/map', text: '地图' },
      { pagePath: '/pages/mine/mine', text: '我的' }
    ]
  },

  methods: {
    onSwitchTab(e) {
      const index = Number(e.currentTarget.dataset.index)
      const item = this.data.list[index]
      if (!item || index === this.data.selected) return
      wx.switchTab({ url: item.pagePath })
    }
  }
})
