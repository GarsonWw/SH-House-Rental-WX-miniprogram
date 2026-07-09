Component({
  data: {
    selected: 0,
    list: [
      { key: 'home', pagePath: '/pages/index/index', text: '找房' },
      { key: 'turn', pagePath: '/pages/neighborhood/neighborhood', text: '转转' },
      { key: 'messages', pagePath: '/pages/messages/messages', text: '消息', center: true },
      { key: 'map', pagePath: '/pages/map/map', text: '地图' },
      { key: 'mine', pagePath: '/pages/mine/mine', text: '我的' }
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
