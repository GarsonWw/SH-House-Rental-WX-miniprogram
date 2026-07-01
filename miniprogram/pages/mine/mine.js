// pages/mine/mine.js
const app = getApp()

Page({
  data: {
    // 登录状态
    isLoggedIn: false,
    userProfile: null,       // { nickName, avatarUrl }

    // 数据统计
    favoriteCount: 0,

    // 房东模式
    isLandlord: false,

    // 资料编辑弹窗
    showProfileModal: false,
    profileForm: { nickName: '', avatarUrl: '' }
  },

  onShow() {
    this.refreshState()
    app.onLoginReady(openid => {
      if (!openid) return
      app.refreshLandlordStatus(() => this.refreshState())
    })
  },

  noop() {},

  refreshState() {
    const openid    = app.globalData.openid
    const profile   = app.globalData.userProfile
    const isLandlord = app.globalData.isLandlord

    this.setData({
      isLoggedIn: !!openid,
      userProfile: profile,
      isLandlord,
      favoriteCount: app.globalData.favoriteIds.length
    })
  },

  // ── 登录 ─────────────────────────────────────────
  onLogin() {
    if (app.globalData.openid) {
      wx.showToast({ title: '已登录', icon: 'success' })
      this.refreshState()
      return
    }

    wx.showLoading({ title: '登录中...' })

    // 设置超时保护，避免永久转圈
    const timer = setTimeout(() => {
      wx.hideLoading()
      wx.showModal({
        title: '登录超时',
        content: '请检查：\n1. 网络是否正常\n2. login 云函数是否已部署\n（右键 cloudfunctions/login → 上传并部署）',
        showCancel: false, confirmText: '知道了'
      })
    }, 8000)

    app.retryLogin((openid, err) => {
      clearTimeout(timer)
      wx.hideLoading()
      if (openid) {
        this.refreshState()
        wx.showToast({ title: '登录成功 ✓', icon: 'success' })
      } else {
        const detail = app.getCloudErrorMessage
          ? app.getCloudErrorMessage(err, '未获取到 openid')
          : (err && (err.errMsg || err.message)) || '未获取到 openid'
        wx.showModal({
          title: '登录失败',
          content: `login 云函数调用失败。\n\n请确认：\n1. 云环境 ID 是 cloud1-d5gtn67zydd66b8de\n2. 云函数名称是 login\n3. 部署后已清缓存并重新预览\n\n错误详情：${detail}`,
          showCancel: false, confirmText: '知道了'
        })
      }
    })
  },

  onSetProfile() {
    const profile = app.globalData.userProfile || {}
    this.setData({
      showProfileModal: true,
      profileForm: {
        nickName: profile.nickName || '',
        avatarUrl: profile.avatarUrl || ''
      }
    })
  },

  onProfileNameInput(e) {
    this.setData({ 'profileForm.nickName': e.detail.value })
  },

  onChooseAvatar(e) {
    this.setData({ 'profileForm.avatarUrl': e.detail.avatarUrl })
  },

  onProfileCancel() {
    this.setData({ showProfileModal: false })
  },

  onProfileConfirm() {
    const nickName = this.data.profileForm.nickName.trim()
    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    const profile = {
      nickName,
      avatarUrl: this.data.profileForm.avatarUrl
    }
    app.setUserProfile(profile)
    this.setData({ userProfile: profile, showProfileModal: false })
    wx.showToast({ title: '设置成功', icon: 'success' })
  },

  // ── 功能导航 ─────────────────────────────────────
  onGoFavorites() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/favorites/favorites' })
  },

  // ── 房东入口 ─────────────────────────────────────
  onLandlordEntry() {
    wx.showLoading({ title: '验证身份...' })
    app.requireLandlord((isLandlord, error) => {
      wx.hideLoading()
      this.refreshState()
      if (isLandlord) {
        wx.navigateTo({ url: '/pages/landlord/landlord' })
        return
      }
      const openid = app.globalData.openid || '尚未获取'
      wx.showModal({
        title: error ? '管理员服务未就绪' : '当前账号不是房东',
        content: error
          ? `请确认 houseService 云函数已部署。\n\n${error.message || error}`
          : `请在云数据库 admins 集合中添加文档，文档 ID 使用当前账号 OPENID：\n\n${openid}`,
        confirmText: error ? '知道了' : '复制ID',
        showCancel: !error,
        success: res => {
          if (res.confirm && !error && openid !== '尚未获取') {
            wx.setClipboardData({ data: openid })
          }
        }
      })
    })
  },

  onAbout() {
    wx.showModal({
      title: '关于',
      content: '深港租房双城通\n版本 2.0.0（云开发版）\n\n3年沉淀 + 上千位真实用户服务 + 免中介费 + 深港生活经验。\n\n自2023年起，我们专注于深圳罗湖租房直租服务，坚持免中介费、真实房源、高效匹配的理念，致力于帮助来罗湖发展的港硕学生、香港高校学生以及深港通勤工作人群找到合适的居住空间。\n\n截至目前，我们已累计服务超过1000+位租客，深耕罗湖口岸、国贸、东门、黄贝岭、翠竹、笋岗等片区，帮助众多用户顺利完成从看房到入住的全过程。\n\n我们深知跨境学习、工作和生活的不易，因此不仅提供罗湖房源信息，更结合通勤时间、预算需求、生活配套等实际情况，为每位用户提供更合适的罗湖租房建议，让租房变得更加省心、高效、透明。',
      showCancel: false, confirmText: '知道了'
    })
  }
})
