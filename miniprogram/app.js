// app.js
// 云开发环境 ID
const CLOUD_ENV = 'cloud1-d5gtn67zydd66b8de'
const getCloudConfig = () => CLOUD_ENV ? { env: CLOUD_ENV } : {}

// 房东访问码（可自行修改，用于房东专属页面的入口验证）
const LANDLORD_CODE = 'swt123'

App({
  globalData: {
    // 房源数据
    houseList: [],
    neighborhoodList: [],
    houseListLoaded: false,
    houseLoadCallbacks: [],

    // 用户登录
    openid: null,
    userProfile: null,       // { nickName, avatarUrl }
    loginReady: false,
    loginError: null,
    loginCallbacks: [],

    // 收藏（云同步）
    favoriteIds: [],         // [houseId, ...]，登录后从云端加载

    // 房东模式
    isLandlord: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库')
      return
    }
    wx.cloud.init({ ...getCloudConfig(), traceUser: true })

    // 恢复本地缓存的用户信息（避免每次冷启都等云函数）
    const cachedProfile = wx.getStorageSync('userProfile')
    const cachedOpenid  = wx.getStorageSync('openid')
    if (cachedOpenid) {
      this.globalData.openid      = cachedOpenid
      this.globalData.userProfile = cachedProfile || null
    }

    // 恢复房东状态
    this.globalData.isLandlord = !!wx.getStorageSync('isLandlord')

    // 并行启动：登录 + 加载房源
    this.silentLogin()
    this.loadHousesFromCloud()
  },

  // ── 登录 ────────────────────────────────────────────────
  silentLogin() {
    wx.cloud.callFunction({
      name: 'login',
      config: getCloudConfig()
    })
      .then(res => {
        const { openid } = res.result
        this.globalData.openid     = openid
        this.globalData.loginReady = true
        this.globalData.loginError = null
        wx.setStorageSync('openid', openid)
        this._flushLoginCallbacks()
        this._loadFavoriteIds()
      })
      .catch(err => {
        console.error('[Login] 登录失败', err)
        // 无论成功与否，都标记为就绪，避免回调永远挂起
        this.globalData.loginReady = true
        this.globalData.loginError = err
        this._flushLoginCallbacks()
        if (this.globalData.openid) {
          this._loadFavoriteIds()
        }
      })
  },

  retryLogin(cb) {
    this.globalData.loginReady = false
    this.globalData.loginError = null
    if (cb) this.globalData.loginCallbacks.push(cb)
    this.silentLogin()
  },

  onLoginReady(cb) {
    if (this.globalData.loginReady) {
      cb(this.globalData.openid, this.globalData.loginError)
    } else {
      this.globalData.loginCallbacks.push(cb)
    }
  },

  _flushLoginCallbacks() {
    this.globalData.loginCallbacks.forEach(cb => cb(this.globalData.openid, this.globalData.loginError))
    this.globalData.loginCallbacks = []
  },

  // 用户主动设置昵称/头像（wx.getUserProfile 需要用户手势触发）
  setUserProfile(profile) {
    this.globalData.userProfile = profile
    wx.setStorageSync('userProfile', profile)
  },

  getLandlordCode() {
    return LANDLORD_CODE
  },

  verifyLandlordCode(code) {
    if (code === LANDLORD_CODE) {
      this.globalData.isLandlord = true
      wx.setStorageSync('isLandlord', true)
      return true
    }
    return false
  },

  exitLandlord() {
    this.globalData.isLandlord = false
    wx.removeStorageSync('isLandlord')
  },

  // ── 房源数据 ────────────────────────────────────────────
  loadHousesFromCloud() {
    const db = wx.cloud.database()
    db.collection('houses').orderBy('createTime', 'desc').limit(100).get()
      .then(res => {
        const list = res.data.map(h => ({ ...h, id: h._id }))
        this.globalData.houseList      = list
        this.globalData.houseListLoaded = true
        this.refreshNeighborhoodList()
        this._flushHouseCallbacks()
        wx.setStorageSync('houseList_cache', list)
      })
      .catch(err => {
        console.error('[Cloud] 加载房源失败', err)
        const cached = wx.getStorageSync('houseList_cache') || []
        this.globalData.houseList      = cached
        this.globalData.houseListLoaded = true
        this.refreshNeighborhoodList()
        this._flushHouseCallbacks()
      })
  },

  refreshHouses(callback) {
    this.globalData.houseListLoaded = false
    if (callback) this.globalData.houseLoadCallbacks.push(callback)
    this.loadHousesFromCloud()
  },

  onHouseListReady(cb) {
    if (this.globalData.houseListLoaded) {
      cb()
    } else {
      this.globalData.houseLoadCallbacks.push(cb)
    }
  },

  _flushHouseCallbacks() {
    this.globalData.houseLoadCallbacks.forEach(cb => cb())
    this.globalData.houseLoadCallbacks = []
  },

  refreshNeighborhoodList() {
    const map = {}
    this.globalData.houseList.forEach(h => {
      if (!map[h.neighborhood]) {
        map[h.neighborhood] = {
          name: h.neighborhood, count: 0,
          district: h.district || '未知区域',
          coverImg: h.images && h.images[0] ? h.images[0] : ''
        }
      }
      map[h.neighborhood].count++
    })
    this.globalData.neighborhoodList = Object.values(map)
  },

  addHouse(data, callback) {
    const db = wx.cloud.database()
    const houseData = {
      ...data,
      price: Number(data.price),
      area: Number(data.area),
      viewCount: 0,
      available: data.available !== false,
      createTime: db.serverDate()
    }
    db.collection('houses').add({ data: houseData })
      .then(res => {
        const newHouse = { ...houseData, _id: res._id, id: res._id }
        this.globalData.houseList.unshift(newHouse)
        this.refreshNeighborhoodList()
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        if (callback) callback(newHouse, null)
      })
      .catch(err => {
        console.error('[Cloud] 发布失败', err)
        if (callback) callback(null, err)
      })
  },

  deleteHouse(id, callback) {
    const db = wx.cloud.database()
    db.collection('houses').doc(id).remove()
      .then(() => {
        this.globalData.houseList = this.globalData.houseList.filter(h => h.id !== id)
        this.refreshNeighborhoodList()
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        if (callback) callback(null)
      })
      .catch(err => {
        if (callback) callback(err)
      })
  },

  toggleHouseStatus(id, available, callback) {
    const db = wx.cloud.database()
    db.collection('houses').doc(id).update({ data: { available } })
      .then(() => {
        const house = this.getHouseById(id)
        if (house) house.available = available
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        if (callback) callback(null)
      })
      .catch(err => { if (callback) callback(err) })
  },

  incrementViewCount(id) {
    const db = wx.cloud.database()
    db.collection('houses').doc(id).update({ data: { viewCount: db.command.inc(1) } }).catch(() => {})
    const house = this.getHouseById(id)
    if (house) house.viewCount = (house.viewCount || 0) + 1
  },

  getHouseById(id) {
    return this.globalData.houseList.find(h => h.id === id)
  },

  getHousesByNeighborhood(name) {
    return this.globalData.houseList.filter(h => h.neighborhood === name)
  },

  getMyHouses(callback) {
    // 房东管理视图：获取所有房源（本小程序为个人房东平台，房东即管理员）
    const db = wx.cloud.database()
    db.collection('houses')
      .orderBy('createTime', 'desc')
      .limit(100)
      .get()
      .then(res => callback(res.data.map(h => ({ ...h, id: h._id })), null))
      .catch(err => { console.error('[Cloud] 获取房源失败', err); callback([], err) })
  },

  updateHouse(id, data, callback) {
    const db = wx.cloud.database()
    db.collection('houses').doc(id).update({ data })
      .then(() => {
        // 同步更新本地缓存
        const house = this.getHouseById(id)
        if (house) Object.assign(house, data)
        this.refreshNeighborhoodList()
        wx.setStorageSync('houseList_cache', this.globalData.houseList)
        if (callback) callback(null)
      })
      .catch(err => { if (callback) callback(err) })
  },

  getCloudErrorMessage(err, fallback = '云服务请求失败') {
    if (!err) return fallback
    return err.errMsg || err.message || JSON.stringify(err)
  },

  // ── 媒体上传 ────────────────────────────────────────────
  uploadImages(tempPaths, callback, folder = 'houses') {
    if (!tempPaths || tempPaths.length === 0) { callback([], null); return }
    Promise.all(tempPaths.map((filePath, index) => {
      const cleanPath = String(filePath || '').split('?')[0]
      const extMatch = cleanPath.match(/\.([a-zA-Z0-9]+)$/)
      const ext = extMatch ? extMatch[1] : 'jpg'
      const cloudPath = `${folder}/${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}.${ext}`
      return wx.cloud.uploadFile({
        cloudPath,
        filePath,
        config: getCloudConfig()
      }).then(r => r.fileID)
    }))
      .then(ids => callback(ids, null))
      .catch(err => {
        console.error('[Cloud] 媒体上传失败', err)
        callback([], err)
      })
  },

  // ── 收藏（云同步）──────────────────────────────────────
  _loadFavoriteIds() {
    // 只有登录后才能加载云收藏
    if (!this.globalData.openid) return
    const db = wx.cloud.database()
    db.collection('favorites').get()
      .then(res => {
        this.globalData.favoriteIds = res.data.map(d => d.houseId)
      })
      .catch(() => {
        // 降级到本地缓存
        this.globalData.favoriteIds = wx.getStorageSync('favorites') || []
      })
  },

  isFavorited(id) {
    return this.globalData.favoriteIds.includes(id)
  },

  toggleFavorite(id) {
    const ids = this.globalData.favoriteIds
    const idx = ids.indexOf(id)
    const db  = wx.cloud.database()
    if (idx > -1) {
      // 取消收藏
      ids.splice(idx, 1)
      this.globalData.favoriteIds = [...ids]
      db.collection('favorites').where({ houseId: id }).remove().catch(() => {})
      return false
    } else {
      // 添加收藏
      this.globalData.favoriteIds = [id, ...ids]
      db.collection('favorites').add({ data: { houseId: id, createdAt: db.serverDate() } }).catch(() => {})
      return true
    }
  },

  getFavoriteHouses() {
    return this.globalData.favoriteIds
      .map(id => this.getHouseById(id))
      .filter(Boolean)
  },

  // 重新从云端拉取收藏（用于收藏夹页面刷新）
  reloadFavorites(callback) {
    const db = wx.cloud.database()
    db.collection('favorites').get()
      .then(res => {
        this.globalData.favoriteIds = res.data.map(d => d.houseId)
        if (callback) callback()
      })
      .catch(() => { if (callback) callback() })
  }
})
