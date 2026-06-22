// pages/landlord/landlord.js
const app = getApp()

Page({
  data: {
    myHouseList: [],
    stats: { total: 0, available: 0, rented: 0, totalViews: 0 },
    loading: true,
    filterStatus: 'all',   // 'all' | 'available' | 'rented'
    // 编辑弹窗
    showEditModal: false,
    editForm: { id: '', title: '', price: '', description: '' }
  },

  onLoad() {
    // 验证房东权限
    if (!app.globalData.isLandlord) {
      wx.showModal({
        title: '无权访问',
        content: '请从"我的"页面输入房东访问码进入',
        showCancel: false,
        confirmText: '返回',
        success: () => wx.navigateBack()
      })
      return
    }
    this.loadMyHouses()
  },

  onShow() {
    if (app.globalData.isLandlord) {
      this.loadMyHouses()
    }
  },

  loadMyHouses() {
    this.setData({ loading: true })
    app.getMyHouses((list, err) => {
      if (err) {
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
        this.setData({ loading: false })
        return
      }
      const stats = {
        total: list.length,
        available: list.filter(h => h.available).length,
        rented: list.filter(h => !h.available).length,
        totalViews: list.reduce((s, h) => s + (h.viewCount || 0), 0)
      }
      this.setData({ myHouseList: list, stats, loading: false })
    })
  },

  get filteredList() {
    const { myHouseList, filterStatus } = this.data
    if (filterStatus === 'available') return myHouseList.filter(h => h.available)
    if (filterStatus === 'rented')    return myHouseList.filter(h => !h.available)
    return myHouseList
  },

  onFilterChange(e) {
    this.setData({ filterStatus: e.currentTarget.dataset.status })
  },

  onPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' })
  },

  onHouseTap(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  onToggleStatus(e) {
    const { id, available } = e.currentTarget.dataset
    const current = available === 'true' || available === true
    wx.showLoading({ title: '更新中...' })
    app.toggleHouseStatus(id, !current, err => {
      wx.hideLoading()
      if (err) { wx.showToast({ title: '更新失败', icon: 'none' }); return }
      wx.showToast({ title: !current ? '已设为可租' : '已设为已租', icon: 'success' })
      this.loadMyHouses()
    })
  },

  onDeleteHouse(e) {
    const { id, title } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: `确定删除"${title}"？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: res => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...' })
        app.deleteHouse(id, err => {
          wx.hideLoading()
          if (err) { wx.showToast({ title: '删除失败，请重试', icon: 'none' }); return }
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadMyHouses()
        })
      }
    })
  },

  onEditHouse(e) {
    const { id } = e.currentTarget.dataset
    const house = app.getHouseById(id) || this.data.myHouseList.find(h => h.id === id)
    if (!house) return
    this.setData({
      showEditModal: true,
      editForm: {
        id: house.id,
        title: house.title || '',
        price: String(house.price || ''),
        description: house.description || ''
      }
    })
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`editForm.${field}`]: e.detail.value })
  },

  onEditConfirm() {
    const { id, title, price, description } = this.data.editForm
    if (!title.trim()) { wx.showToast({ title: '标题不能为空', icon: 'none' }); return }
    if (!price || isNaN(price) || Number(price) <= 0) { wx.showToast({ title: '请填写正确的价格', icon: 'none' }); return }

    wx.showLoading({ title: '保存中...' })
    app.updateHouse(id, { title: title.trim(), price: Number(price), description: description.trim() }, err => {
      wx.hideLoading()
      if (err) { wx.showToast({ title: '保存失败，请重试', icon: 'none' }); return }
      this.setData({ showEditModal: false })
      wx.showToast({ title: '已保存', icon: 'success' })
      this.loadMyHouses()
    })
  },

  onEditCancel() {
    this.setData({ showEditModal: false })
  },

  onExitLandlord() {
    wx.showModal({
      title: '退出房东模式',
      content: '退出后需重新输入访问码',
      confirmText: '退出',
      success: res => {
        if (res.confirm) {
          app.exitLandlord()
          wx.navigateBack()
        }
      }
    })
  },

  onPullDownRefresh() {
    this.loadMyHouses()
    wx.stopPullDownRefresh()
  }
})
