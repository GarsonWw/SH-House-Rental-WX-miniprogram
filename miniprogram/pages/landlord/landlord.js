// pages/landlord/landlord.js
const app = getApp()

Page({
  data: {
    myHouseList: [],
    stats: { total: 0, available: 0, rented: 0, totalViews: 0 },
    loading: true,
    filterStatus: 'all',   // 'all' | 'available' | 'rented'
    roomTypeOptions: ['1室1厅1卫', '2室1厅1卫', '2室2厅1卫', '3室1厅1卫', '3室2厅1卫', '3室2厅2卫', '合租/主卧', '合租/次卧', '整套公寓'],
    orientationOptions: ['南', '北', '东', '西', '南北', '东南', '东北', '西南', '西北'],
    decorationOptions: ['毛坯', '简装', '中装', '精装修', '豪装'],
    tagOptions: ['近地铁', '拎包入住', '南北通透', '近商场', '学区房', '可短租', '停车方便', '独立卫生间', '合租友好', '宠物友好', '无中介', '家电齐全'],
    // 编辑弹窗
    showEditModal: false,
    editForm: {
      id: '',
      title: '',
      neighborhood: '',
      district: '',
      address: '',
      price: '',
      roomType: '',
      area: '',
      floor: '',
      orientation: '',
      decoration: '',
      description: '',
      landlordName: '',
      landlordPhone: '',
      landlordWechat: '',
      available: true,
      tags: []
    }
  },

  onLoad() {
    app.requireLandlord((isLandlord, error) => {
      if (!isLandlord) {
        wx.showModal({
          title: '无权访问',
          content: error ? error.message : '当前微信账号不在管理员名单中',
          showCancel: false,
          confirmText: '返回',
          success: () => wx.navigateBack()
        })
        return
      }
      this.loadMyHouses()
    })
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

  noop() {},

  onPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' })
  },

  onNeighborhoodConfig() {
    wx.navigateTo({ url: '/pages/neighborhood-config/neighborhood-config' })
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
      if (err) {
        wx.showToast({ title: err.code === 'CONFLICT' ? '状态已变化，正在刷新' : '更新失败', icon: 'none' })
        this.loadMyHouses()
        return
      }
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
          if (err) {
            wx.showToast({ title: err.code === 'CONFLICT' ? '房源已更新，请刷新后重试' : '删除失败，请重试', icon: 'none' })
            this.loadMyHouses()
            return
          }
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadMyHouses()
        })
      }
    })
  },

  onEditHouse(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/publish/publish?id=${id}` })
  },

  onEditNeighborhood(e) {
    const { name } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/neighborhood-config/neighborhood-config?name=${encodeURIComponent(name || '')}` })
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`editForm.${field}`]: e.detail.value })
  },

  onEditPickerChange(e) {
    const { field, options } = e.currentTarget.dataset
    const idx = e.detail.value
    const value = this.data[options][idx]
    this.setData({ [`editForm.${field}`]: value })
  },

  onEditStatusChange(e) {
    const available = e.currentTarget.dataset.available === 'true'
    this.setData({ 'editForm.available': available })
  },

  onPrefillEditLandlordInfo() {
    this.setData({
      'editForm.landlordName': '孙先生',
      'editForm.landlordPhone': '13520174107',
      'editForm.landlordWechat': 'weixin123'
    })
    wx.showToast({ title: '已填充房东信息', icon: 'success' })
  },

  onEditTagToggle(e) {
    const { tag } = e.currentTarget.dataset
    const tags = [...(this.data.editForm.tags || [])]
    const idx = tags.indexOf(tag)
    if (idx > -1) {
      tags.splice(idx, 1)
    } else {
      if (tags.length >= 5) {
        wx.showToast({ title: '最多选5个标签', icon: 'none' })
        return
      }
      tags.push(tag)
    }
    this.setData({ 'editForm.tags': tags })
  },

  onEditConfirm() {
    const {
      id, title, neighborhood, district, address, price, roomType, area, floor,
      orientation, decoration, description, landlordName, landlordPhone,
      landlordWechat, available, tags
    } = this.data.editForm
    if (!title.trim()) { wx.showToast({ title: '标题不能为空', icon: 'none' }); return }
    if (!neighborhood.trim()) { wx.showToast({ title: '小区名称不能为空', icon: 'none' }); return }
    if (!price || isNaN(price) || Number(price) <= 0) { wx.showToast({ title: '请填写正确的价格', icon: 'none' }); return }
    if (!roomType) { wx.showToast({ title: '请选择房型', icon: 'none' }); return }
    if (!area || isNaN(area) || Number(area) <= 0) { wx.showToast({ title: '请填写正确的面积', icon: 'none' }); return }
    if (!landlordName.trim()) { wx.showToast({ title: '请填写房东姓名', icon: 'none' }); return }
    if (!landlordPhone.trim()) { wx.showToast({ title: '请填写联系电话', icon: 'none' }); return }
    if (!landlordWechat.trim()) { wx.showToast({ title: '请填写微信号', icon: 'none' }); return }

    wx.showLoading({ title: '保存中...' })
    app.updateHouse(id, {
      title: title.trim(),
      neighborhood: neighborhood.trim(),
      district: district.trim(),
      address: address.trim(),
      price: Number(price),
      roomType,
      area: Number(area),
      floor: floor.trim(),
      orientation,
      decoration,
      description: description.trim(),
      landlordName: landlordName.trim(),
      landlordPhone: landlordPhone.trim(),
      landlordWechat: landlordWechat.trim(),
      available,
      tags: tags || []
    }, err => {
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
      content: '退出当前管理页面，之后仍可使用已授权的微信账号重新进入。',
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
