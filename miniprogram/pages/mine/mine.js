// pages/mine/mine.js
const app = getApp()

Page({
  data: {
    // 登录状态
    isLoggedIn: false,
    userProfile: null,       // { nickName, avatarUrl }

    // 数据统计
    favoriteCount: 0,
    hkustProgress: 0,
    hkuProgress: 0,
    selectedChecklistUni: '',
    checklistProgress: 0,
    checklistLabel: '未选择院校',
    checklistSummary: '先选择院校，再查看专属清单',

    // 房东模式
    isLandlord: false,

    // 房东入口弹窗
    showCodeModal: false,
    codeInput: '',

    // 资料编辑弹窗
    showProfileModal: false,
    profileForm: { nickName: '', avatarUrl: '' }
  },

  onShow() {
    this.refreshState()
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
    this.loadProgress()
  },

  loadProgress() {
    const openid = app.globalData.openid || ''
    const savedHkust = wx.getStorageSync(`checklist_hkust_${openid}`) || wx.getStorageSync('checklist_hkust') || {}
    const savedHku   = wx.getStorageSync(`checklist_hku_${openid}`)   || wx.getStorageSync('checklist_hku')   || {}
    const selectedChecklistUni = wx.getStorageSync('selectedChecklistUni') || ''
    const hkustProgress = Math.round(Object.keys(savedHkust).length / 20 * 100)
    const hkuProgress = Math.round(Object.keys(savedHku).length / 22 * 100)
    const checklistProgress = selectedChecklistUni === 'hkust'
      ? hkustProgress
      : selectedChecklistUni === 'hku'
        ? hkuProgress
        : 0
    const checklistLabel = selectedChecklistUni === 'hkust'
      ? '科大准备'
      : selectedChecklistUni === 'hku'
        ? '港大准备'
        : '选择院校'
    const checklistSummary = selectedChecklistUni
      ? `${checklistLabel} ${checklistProgress}%`
      : '先选择院校，再查看专属清单'
    this.setData({
      hkustProgress,
      hkuProgress,
      selectedChecklistUni,
      checklistProgress,
      checklistLabel,
      checklistSummary
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

  onGoChecklist() {
    wx.navigateTo({ url: '/pages/checklist/checklist' })
  },

  // ── 房东入口 ─────────────────────────────────────
  onLandlordEntry() {
    if (app.globalData.isLandlord) {
      wx.navigateTo({ url: '/pages/landlord/landlord' })
      return
    }
    this.setData({ showCodeModal: true, codeInput: '' })
  },

  onCodeInput(e) {
    this.setData({ codeInput: e.detail.value })
  },

  onCodeConfirm() {
    const code = this.data.codeInput.trim()
    if (!code) {
      wx.showToast({ title: '请输入访问码', icon: 'none' })
      return
    }
    if (app.verifyLandlordCode(code)) {
      this.setData({ showCodeModal: false, isLandlord: true })
      wx.showToast({ title: '验证成功，欢迎房东！', icon: 'success', duration: 1500 })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/landlord/landlord' })
      }, 1500)
    } else {
      wx.showToast({ title: '访问码错误', icon: 'error' })
    }
  },

  onCodeCancel() {
    this.setData({ showCodeModal: false, codeInput: '' })
  },

  onAbout() {
    wx.showModal({
      title: '关于',
      content: '深港租房双城通\n版本 2.0.0（云开发版）\n\n直连房东，0中介费\n数据实时同步云端',
      showCancel: false, confirmText: '知道了'
    })
  }
})
